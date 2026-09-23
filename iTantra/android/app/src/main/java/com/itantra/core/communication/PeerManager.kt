package com.itantra.core.communication

import com.itantra.core.model.Device
import com.itantra.core.model.TransportType
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Manages peer discovery, connection state, and peer metadata.
 * Works with TransportManager to provide a unified peer view.
 */
class PeerManager(
    private val transportManager: TransportManager,
    private val localNodeId: Int,
    private val maxPeers: Int = 50
) {
    // All known peers by nodeId
    private val peers = ConcurrentHashMap<Int, PeerInfo>()
    
    // Peer updates channel
    private val peerUpdatesChannel = Channel<PeerUpdate>(200)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val peersDiscovered = AtomicLong(0)
    private val peersConnected = AtomicLong(0)
    private val peersLost = AtomicLong(0)
    
    data class PeerInfo(
        val device: Device,
        var transportType: TransportType,
        var lastSeen: Long = System.currentTimeMillis(),
        var signalStrength: Int = 0, // 0-100
        var isFavorite: Boolean = false,
        var metadata: Map<String, String> = emptyMap()
    ) {
        fun updateLastSeen() {
            lastSeen = System.currentTimeMillis()
        }
        
        fun updateSignalStrength(strength: Int) {
            signalStrength = strength.coerceIn(0, 100)
        }
    }
    
    sealed class PeerUpdate {
        data class Discovered(val peer: PeerInfo) : PeerUpdate()
        data class Connected(val peer: PeerInfo) : PeerUpdate()
        data class Disconnected(val peer: PeerInfo) : PeerUpdate()
        data class Lost(val peer: PeerInfo) : PeerUpdate()
        data class SignalChanged(val peer: PeerInfo, val oldStrength: Int, val newStrength: Int) : PeerUpdate()
        data class MetadataUpdated(val peer: PeerInfo) : PeerUpdate()
    }
    
    init {
        // Wire up transport events
        wireUpTransports()
        startPeerCleanupJob()
    }
    
    /**
     * Get all known peers.
     */
    fun getAllPeers(): List<PeerInfo> {
        return peers.values.toList()
    }
    
    /**
     * Get connected peers.
     */
    fun getConnectedPeers(): List<PeerInfo> {
        return peers.values.filter { it.device.connectionState == com.itantra.core.model.ConnectionState.CONNECTED }.toList()
    }
    
    /**
     * Get discovered (not connected) peers.
     */
    fun getDiscoveredPeers(): List<PeerInfo> {
        return peers.values.filter { it.device.connectionState != com.itantra.core.model.ConnectionState.CONNECTED }.toList()
    }
    
    /**
     * Get peer by node ID.
     */
    fun getPeer(nodeId: Int): PeerInfo? {
        return peers[nodeId]
    }
    
    /**
     * Get peer updates channel.
     */
    fun peerUpdates(): ReceiveChannel<PeerUpdate> = peerUpdatesChannel
    
    /**
     * Mark a peer as favorite (persist across sessions).
     */
    fun setFavorite(nodeId: Int, favorite: Boolean) {
        val peer = peers[nodeId] ?: return
        peer.isFavorite = favorite
        peerUpdatesChannel.trySend(PeerUpdate.MetadataUpdated(peer))
    }
    
    /**
     * Update peer metadata.
     */
    fun updateMetadata(nodeId: Int, key: String, value: String) {
        val peer = peers[nodeId] ?: return
        peer.metadata = peer.metadata + (key to value)
        peerUpdatesChannel.trySend(PeerUpdate.MetadataUpdated(peer))
    }
    
    /**
     * Get statistics.
     */
    fun getStats(): PeerManagerStats {
        return PeerManagerStats(
            totalPeers = peers.size,
            connectedPeers = peers.values.count { it.device.connectionState == com.itantra.core.model.ConnectionState.CONNECTED },
            discoveredPeers = peers.values.count { it.device.connectionState != com.itantra.core.model.ConnectionState.CONNECTED },
            favoritePeers = peers.values.count { it.isFavorite },
            peersDiscovered = peersDiscovered.get(),
            peersConnected = peersConnected.get(),
            peersLost = peersLost.get()
        )
    }
    
    /**
     * Shutdown the manager.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        peerUpdatesChannel.close()
        peers.clear()
    }
    
    private fun wireUpTransports() {
        // Wire up connection state changes
        scope.launch {
            transportManager.connectionState().consumeEach { event ->
                handleConnectionStateChange(event)
            }
        }
        
        // Wire up discovered devices
        scope.launch {
            transportManager.discoveredDevices().consumeEach { device ->
                handleDeviceDiscovered(device)
            }
        }
        
        // Wire up incoming packets (update last seen)
        scope.launch {
            transportManager.incomingPackets().consumeEach { packet ->
                updatePeerLastSeen(packet.fromDevice.nodeId)
            }
        }
    }
    
    private fun handleDeviceDiscovered(device: Device) {
        val existing = peers[device.nodeId]
        val now = System.currentTimeMillis()
        
        if (existing == null) {
            val peerInfo = PeerInfo(
                device = device,
                transportType = device.transportType,
                lastSeen = now
            )
            peers[device.nodeId] = peerInfo
            peersDiscovered.incrementAndGet()
            peerUpdatesChannel.trySend(PeerUpdate.Discovered(peerInfo))
        } else {
            // Update existing peer
            existing.device = device
            existing.transportType = device.transportType
            existing.updateLastSeen()
        }
    }
    
    private fun handleConnectionStateChange(event: com.itantra.core.communication.ConnectionStateEvent) {
        val peerInfo = peers[event.device.nodeId] ?: PeerInfo(
            device = event.device,
            transportType = event.device.transportType
        ).also { peers[event.device.nodeId] = it }
        
        val oldState = peerInfo.device.connectionState
        peerInfo.device = event.device
        peerInfo.updateLastSeen()
        
        when {
            oldState != com.itantra.core.model.ConnectionState.CONNECTED && event.newState == com.itantra.core.model.ConnectionState.CONNECTED -> {
                peersConnected.incrementAndGet()
                peerUpdatesChannel.trySend(PeerUpdate.Connected(peerInfo))
            }
            oldState == com.itantra.core.model.ConnectionState.CONNECTED && event.newState != com.itantra.core.model.ConnectionState.CONNECTED -> {
                peersLost.incrementAndGet()
                peerUpdatesChannel.trySend(PeerUpdate.Disconnected(peerInfo))
            }
        }
    }
    
    private fun updatePeerLastSeen(nodeId: Int) {
        val peer = peers[nodeId]
        peer?.updateLastSeen()
    }
    
    private fun startPeerCleanupJob() {
        scope.launch {
            while (isActive) {
                delay(60000) // Every minute
                cleanupStalePeers()
            }
        }
    }
    
    private fun cleanupStalePeers() {
        val now = System.currentTimeMillis()
        val staleThreshold = 300000 // 5 minutes
        
        val toRemove = peers.entries
            .filter { entry ->
                val peer = entry.value
                peer.device.connectionState != com.itantra.core.model.ConnectionState.CONNECTED
                && now - peer.lastSeen > staleThreshold
                && !peer.isFavorite
            }
            .map { it.key }
        
        toRemove.forEach { nodeId ->
            val peer = peers.remove(nodeId)
            peer?.let {
                peersLost.incrementAndGet()
                peerUpdatesChannel.trySend(PeerUpdate.Lost(it))
            }
        }
        
        // Enforce max peers limit
        if (peers.size > maxPeers) {
            val excess = peers.size - maxPeers
            val sortedByLastSeen = peers.values.sortedBy { it.lastSeen }
            sortedByLastSeen.take(excess).forEach { peer ->
                if (!peer.isFavorite && peer.device.connectionState != com.itantra.core.model.ConnectionState.CONNECTED) {
                    peers.remove(peer.device.nodeId)
                    peersLost.incrementAndGet()
                    peerUpdatesChannel.trySend(PeerUpdate.Lost(peer))
                }
            }
        }
    }
    
    data class PeerManagerStats(
        val totalPeers: Int,
        val connectedPeers: Int,
        val discoveredPeers: Int,
        val favoritePeers: Int,
        val peersDiscovered: Long,
        val peersConnected: Long,
        val peersLost: Long
    )
}