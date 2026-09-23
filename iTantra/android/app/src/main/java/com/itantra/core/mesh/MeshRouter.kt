package com.itantra.core.mesh

import com.itantra.core.model.Device
import com.itantra.core.model.Message
import com.itantra.core.model.Packet
import com.itantra.core.protocol.ProtocolConstants
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Main mesh routing coordinator.
 * Combines TTL management, gossip forwarding, and peer management.
 * Coordinates packet flow through the mesh network.
 */
class MeshRouter(
    private val localNodeId: Int,
    private val ttlManager: TTLManager = TTLManager(),
    private val gossipRouter: GossipRouter = GossipRouter(),
    private val maxStoreForwardMessages: Int = ProtocolConstants.MAX_STORED_MESSAGES
) {
    // Connected peers
    private val connectedPeers = ConcurrentHashMap<Int, Device>()
    
    // Pending packets per peer (for store-and-forward)
    private val pendingPerPeer = ConcurrentHashMap<Int, MutableList<Packet>>()
    
    // Channel for packets ready to send to transport
    private val outboundChannel = Channel<OutboundPacket>(500)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val packetsRouted = AtomicLong(0)
    private val packetsDeliveredLocally = AtomicLong(0)
    private val packetsForwarded = AtomicLong(0)
    private val packetsStored = AtomicLong(0)
    private val packetsDropped = AtomicLong(0)
    
    data class OutboundPacket(
        val packet: Packet,
        val targetNodeId: Int, // Specific peer to send to, or 0xFFFF for broadcast
        val isLocalDelivery: Boolean = false, // For local app delivery
        val isRelay: Boolean = false
    )

    init {
        // Wire up gossip router
        wireUpGossip()
    }

    /**
     * Update the list of connected peers.
     */
    fun updatePeers(peers: List<Device>) {
        connectedPeers.clear()
        peers.forEach { connectedPeers[it.nodeId] = it }
        gossipRouter.updateConnectedPeers(peers)
    }

    /**
     * Get currently connected peers.
     */
    fun getConnectedPeers(): List<Device> {
        return connectedPeers.values.toList()
    }

    /**
     * Check if a node is connected.
     */
    fun isConnected(nodeId: Int): Boolean {
        return connectedPeers.containsKey(nodeId)
    }

    /**
     * Process an incoming packet from the transport layer.
     * Routes to local delivery or gossip forwarding.
     */
    fun processIncoming(packet: Packet, fromNodeId: Int): ProcessResult {
        packetsRouted.incrementAndGet()
        
        // Check if packet is for us
        val isForUs = packet.isDestination(localNodeId)
        
        if (isForUs) {
            // Local delivery
            packetsDeliveredLocally.incrementAndGet()
            
            // Also process for gossip if broadcast
            if (packet.isBroadcast && ttlManager.canRelay(packet)) {
                val forwarded = gossipRouter.processIncoming(packet, fromNodeId, localNodeId)
                if (forwarded) {
                    packetsForwarded.incrementAndGet()
                }
            }
            
            return ProcessResult.LocalDelivery(packet)
        } else if (packet.isBroadcast) {
            // Broadcast packet - process for gossip forwarding
            val forwarded = gossipRouter.processIncoming(packet, fromNodeId, localNodeId)
            if (forwarded) {
                packetsForwarded.incrementAndGet()
            }
            return ProcessResult.Forwarded
        } else {
            // Unicast packet not for us - drop
            packetsDropped.incrementAndGet()
            return ProcessResult.Dropped("Not for this node")
        }
    }

    /**
     * Send a packet originating from this node.
     */
    fun sendPacket(packet: Packet): SendResult {
        packetsRouted.incrementAndGet()
        
        // Initialize TTL
        val initializedPacket = ttlManager.initializeTtl(packet)
        
        if (initializedPacket.isBroadcast) {
            // Broadcast - send to all connected peers
            val peers = connectedPeers.values
                .filter { it.connectionState == com.itantra.core.model.ConnectionState.CONNECTED }
                .toList()
            
            if (peers.isEmpty()) {
                packetsDropped.incrementAndGet()
                return SendResult.NoPeers
            }
            
            peers.forEach { peer ->
                scope.launch {
                    outboundChannel.send(OutboundPacket(
                        packet = initializedPacket,
                        targetNodeId = peer.nodeId,
                        isRelay = false
                    ))
                }
            }
            
            return SendResult.BroadcastSent(peers.size)
        } else {
            // Unicast - send to specific peer
            val targetPeer = connectedPeers[initializedPacket.destinationNodeId]
            
            if (targetPeer == null || targetPeer.connectionState != com.itantra.core.model.ConnectionState.CONNECTED) {
                // Store for later delivery
                storeForForward(initializedPacket)
                packetsStored.incrementAndGet()
                return SendResult.Stored
            }
            
            scope.launch {
                outboundChannel.send(OutboundPacket(
                    packet = initializedPacket,
                    targetNodeId = initializedPacket.destinationNodeId,
                    isRelay = false
                ))
            }
            
            return SendResult.UnicastSent(initializedPacket.destinationNodeId)
        }
    }

    /**
     * Forward a packet (called by gossip router).
     */
    fun forwardPacket(forwardPacket: GossipRouter.ForwardPacket): List<OutboundPacket> {
        val peers = gossipRouter.selectForwardPeers(
            forwardPacket.packet,
            forwardPacket.fromNodeId,
            forwardPacket.relayNodeId
        )
        
        val outboundPackets = mutableListOf<OutboundPacket>()
        
        peers.forEach { peer ->
            val outbound = OutboundPacket(
                packet = forwardPacket.packet,
                targetNodeId = peer.nodeId,
                isRelay = true
            )
            outboundPackets.add(outbound)
            scope.launch {
                outboundChannel.send(outbound)
            }
        }
        
        packetsForwarded.incrementAndGet()
        return outboundPackets
    }

    /**
     * Get the channel of packets to send via transport.
     */
    fun outboundPackets(): ReceiveChannel<OutboundPacket> = outboundChannel

    /**
     * Store a packet for later forwarding when peer becomes available.
     */
    fun storeForForward(packet: Packet): Boolean {
        val peerList = pendingPerPeer.getOrPut(packet.destinationNodeId) { mutableListOf() }
        
        synchronized(peerList) {
            if (peerList.size >= maxStoreForwardMessages) {
                // Remove oldest
                peerList.removeAt(0)
            }
            peerList.add(packet)
        }
        return true
    }

    /**
     * Get stored packets for a peer (when they come online).
     */
    fun getStoredPackets(nodeId: Int): List<Packet> {
        val list = pendingPerPeer.remove(nodeId)
        return list?.toList() ?: emptyList()
    }

    /**
     * Handle peer connection established.
     * Flushes stored packets for that peer.
     */
    fun onPeerConnected(nodeId: Int): List<Packet> {
        return getStoredPackets(nodeId)
    }

    /**
     * Handle peer disconnection.
     */
    fun onPeerDisconnected(nodeId: Int) {
        connectedPeers.remove(nodeId)
        // Keep stored packets for when they reconnect
    }

    /**
     * Get statistics.
     */
    fun getStats(): MeshStats {
        val totalStored = pendingPerPeer.values.sumOf { it.size }
        
        return MeshStats(
            packetsRouted = packetsRouted.get(),
            packetsDeliveredLocally = packetsDeliveredLocally.get(),
            packetsForwarded = packetsForwarded.get(),
            packetsStored = packetsStored.get(),
            packetsDropped = packetsDropped.get(),
            connectedPeers = connectedPeers.size,
            storedPackets = totalStored,
            gossipStats = gossipRouter.getStats(),
            ttlStats = ttlManager.getStats()
        )
    }

    /**
     * Shutdown the router.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        outboundChannel.close()
        connectedPeers.clear()
        pendingPerPeer.clear()
        gossipRouter.shutdown()
    }

    private fun wireUpGossip() {
        scope.launch {
            gossipRouter.packetsToForward().consumeEach { forwardPacket ->
                forwardPacket(forwardPacket)
            }
        }
    }

    sealed class ProcessResult {
        data class LocalDelivery(val packet: Packet) : ProcessResult()
        object Forwarded : ProcessResult()
        data class Dropped(val reason: String) : ProcessResult()
    }

    sealed class SendResult {
        data class BroadcastSent(val peerCount: Int) : SendResult()
        data class UnicastSent(val targetNodeId: Int) : SendResult()
        object Stored : SendResult()
        object NoPeers : SendResult()
    }

    data class MeshStats(
        val packetsRouted: Long,
        val packetsDeliveredLocally: Long,
        val packetsForwarded: Long,
        val packetsStored: Long,
        val packetsDropped: Long,
        val connectedPeers: Int,
        val storedPackets: Int,
        val gossipStats: GossipRouter.GossipStats,
        val ttlStats: TTLManager.TtlStats
    )
}