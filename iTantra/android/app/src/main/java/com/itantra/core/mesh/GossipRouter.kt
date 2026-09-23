package com.itantra.core.mesh

import com.itantra.core.model.Device
import com.itantra.core.model.Packet
import com.itantra.core.protocol.ProtocolConstants
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Implements controlled gossip-style packet forwarding.
 * When a node receives a valid new broadcast packet:
 * 1. Validates
 * 2. Deduplicates
 * 3. Delivers locally
 * 4. Decrements TTL
 * 5. Increments hop count
 * 6. Forwards to eligible connected peers
 */
class GossipRouter(
    private val ttlManager: TTLManager = TTLManager(),
    private val maxFanout: Int = ProtocolConstants.MAX_RELAY_FANOUT,
    private val gossipIntervalMs: Long = ProtocolConstants.GOSSIP_INTERVAL_MS,
    private val dedupCacheSize: Int = ProtocolConstants.DEDUP_CACHE_SIZE,
    private val dedupTtlMs: Long = ProtocolConstants.DEDUP_CACHE_TTL_MS
) {
    // Track recently seen packets for deduplication
    private val recentPackets = ConcurrentHashMap<Long, Long>() // messageId -> timestamp
    private val recentPacketOrder = mutableListOf<Long>()
    
    // Connected peers (nodeId -> Device)
    private val connectedPeers = ConcurrentHashMap<Int, Device>()
    
    // Channel for packets to forward
    private val forwardChannel = Channel<ForwardPacket>(200)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val packetsForwarded = AtomicLong(0)
    private val packetsDropped = AtomicLong(0)
    private val duplicatesRejected = AtomicLong(0)
    private val ttlExpired = AtomicLong(0)
    private val noPeersToForward = AtomicLong(0)
    
    data class ForwardPacket(
        val packet: Packet,
        val fromNodeId: Int, // The node we received it from (don't forward back)
        val relayNodeId: Int, // Our node ID
        val receivedAt: Long = System.currentTimeMillis()
    )

    init {
        startCleanupJob()
    }

    /**
     * Set the connected peers for forwarding decisions.
     */
    fun updateConnectedPeers(peers: List<Device>) {
        connectedPeers.clear()
        peers.forEach { connectedPeers[it.nodeId] = it }
    }

    /**
     * Process an incoming packet for potential gossip forwarding.
     * Returns true if packet was accepted for forwarding.
     */
    fun processIncoming(packet: Packet, fromNodeId: Int, localNodeId: Int): Boolean {
        // Don't process our own packets
        if (packet.sourceNodeId == localNodeId) {
            return false
        }
        
        // Check deduplication
        val now = System.currentTimeMillis()
        val existing = recentPackets.putIfAbsent(packet.messageId, now)
        
        if (existing != null) {
            duplicatesRejected.incrementAndGet()
            return false // Duplicate
        }
        
        recentPacketOrder.add(packet.messageId)
        
        // Check TTL
        if (ttlManager.isExpired(packet)) {
            ttlExpired.incrementAndGet()
            return false
        }
        
        // Check if we can relay
        if (!ttlManager.canRelay(packet)) {
            ttlExpired.incrementAndGet()
            return false
        }
        
        // Decrement TTL and increment hop count
        val relayedPacket = ttlManager.decrementTtl(packet) ?: return false
        
        // Queue for forwarding
        scope.launch {
            forwardChannel.send(ForwardPacket(
                packet = relayedPacket,
                fromNodeId = fromNodeId,
                relayNodeId = localNodeId
            ))
            packetsForwarded.incrementAndGet()
        }
        
        return true
    }

    /**
     * Get the channel of packets to forward to peers.
     */
    fun packetsToForward(): ReceiveChannel<ForwardPacket> = forwardChannel

    /**
     * Select peers to forward a packet to (controlled gossip).
     * Excludes the node we received it from.
     * Limits to maxFanout peers.
     */
    fun selectForwardPeers(
        packet: Packet,
        fromNodeId: Int,
        localNodeId: Int
    ): List<Device> {
        val candidates = connectedPeers.values
            .filter { it.nodeId != fromNodeId && it.nodeId != localNodeId }
            .filter { it.connectionState == com.itantra.core.model.ConnectionState.CONNECTED }
            .toList()
        
        if (candidates.isEmpty()) {
            noPeersToForward.incrementAndGet()
            return emptyList()
        }
        
        // Sort by signal strength (best first) and take maxFanout
        return candidates
            .sortedByDescending { it.signalStrength }
            .take(maxFanout)
    }

    /**
     * Check if a packet was recently seen.
     */
    fun isRecent(messageId: Long): Boolean {
        val entry = recentPackets[messageId]
        if (entry == null) return false
        
        val now = System.currentTimeMillis()
        if (now - entry > dedupTtlMs) {
            recentPackets.remove(messageId)
            return false
        }
        return true
    }

    /**
     * Get statistics.
     */
    fun getStats(): GossipStats {
        return GossipStats(
            packetsForwarded = packetsForwarded.get(),
            packetsDropped = packetsDropped.get(),
            duplicatesRejected = duplicatesRejected.get(),
            ttlExpired = ttlExpired.get(),
            noPeersToForward = noPeersToForward.get(),
            trackedPackets = recentPackets.size,
            connectedPeers = connectedPeers.size,
            maxFanout = maxFanout
        )
    }

    /**
     * Shutdown the router.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        forwardChannel.close()
        recentPackets.clear()
        recentPacketOrder.clear()
        connectedPeers.clear()
    }

    private fun startCleanupJob() {
        scope.launch {
            while (isActive) {
                delay(gossipIntervalMs * 10) // Cleanup less frequently
                cleanupOldPackets()
            }
        }
    }

    private fun cleanupOldPackets() {
        val now = System.currentTimeMillis()
        val cutoff = now - dedupTtlMs
        
        val toRemove = recentPackets.entries
            .filter { it.value < cutoff }
            .map { it.key }
        
        toRemove.forEach { recentPackets.remove(it) }
        
        // Clean up order list
        recentPacketOrder.removeAll { it in toRemove }
        
        // Trim order list if too large
        if (recentPacketOrder.size > dedupCacheSize * 2) {
            val excess = recentPacketOrder.size - dedupCacheSize
            val toRemoveFromOrder = recentPacketOrder.take(excess)
            toRemoveFromOrder.forEach { recentPackets.remove(it) }
            recentPacketOrder = recentPacketOrder.drop(excess).toMutableList()
        }
    }

    data class GossipStats(
        val packetsForwarded: Long,
        val packetsDropped: Long,
        val duplicatesRejected: Long,
        val ttlExpired: Long,
        val noPeersToForward: Long,
        val trackedPackets: Int,
        val connectedPeers: Int,
        val maxFanout: Int
    )
}