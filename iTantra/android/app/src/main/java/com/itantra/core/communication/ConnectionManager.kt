package com.itantra.core.communication

import com.itantra.core.model.Device
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

/**
 * Manages connection lifecycle, quality monitoring, and automatic reconnection.
 * Coordinates with TransportManager and PeerManager.
 */
class ConnectionManager(
    private val transportManager: TransportManager,
    private val peerManager: PeerManager,
    private val localNodeId: Int,
    private val autoReconnect: Boolean = true,
    private val reconnectIntervalMs: Long = 5000,
    private val maxReconnectAttempts: Int = 10,
    private val connectionQualityThreshold: Int = 30 // minimum signal strength
) {
    // Active connections by nodeId
    private val connections = ConcurrentHashMap<Int, ConnectionInfo>()
    
    // Connection events channel
    private val connectionEventsChannel = Channel<ConnectionEvent>(200)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val totalConnections = AtomicLong(0)
    private val successfulConnections = AtomicLong(0)
    private val failedConnections = AtomicLong(0)
    private val reconnections = AtomicLong(0)
    
    data class ConnectionInfo(
        val peer: Device,
        var state: ConnectionState = ConnectionState.DISCONNECTED,
        var transportType: com.itantra.core.communication.TransportType = com.itantra.core.communication.TransportType.UNKNOWN,
        var connectedAt: Long = 0,
        var lastQualityCheck: Long = 0,
        var signalStrength: Int = 0,
        var packetLossRate: Double = 0.0,
        var reconnectAttempts: Int = 0,
        var lastError: String? = null
    )
    
    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED,
        RECONNECTING,
        FAILED
    }
    
    sealed class ConnectionEvent {
        data class Connected(val info: ConnectionInfo) : ConnectionEvent()
        data class Disconnected(val info: ConnectionInfo, val reason: String) : ConnectionEvent()
        data class Reconnecting(val info: ConnectionInfo, val attempt: Int) : ConnectionEvent()
        data class Reconnected(val info: ConnectionInfo) : ConnectionEvent()
        data class Failed(val info: ConnectionInfo, val reason: String) : ConnectionEvent()
        data class QualityChanged(val info: ConnectionInfo, val oldQuality: Int, val newQuality: Int) : ConnectionEvent()
    }
    
    init {
        wireUpEvents()
        startQualityMonitoring()
        if (autoReconnect) {
            startReconnectionJob()
        }
    }
    
    /**
     * Initiate connection to a peer.
     */
    suspend fun connect(peer: Device): Boolean {
        val existing = connections[peer.nodeId]
        if (existing != null && existing.state in setOf(ConnectionState.CONNECTED, ConnectionState.CONNECTING, ConnectionState.RECONNECTING)) {
            return existing.state == ConnectionState.CONNECTED
        }
        
        val info = ConnectionInfo(peer = peer, state = ConnectionState.CONNECTING)
        connections[peer.nodeId] = info
        
        connectionEventsChannel.trySend(ConnectionEvent.Connected(info))
        
        return suspendCancellableCoroutine { cont ->
            scope.launch {
                val result = transportManager.connect(peer)
                
                if (result is TransportResult.Success) {
                    info.state = ConnectionState.CONNECTED
                    info.connectedAt = System.currentTimeMillis()
                    info.reconnectAttempts = 0
                    info.lastError = null
                    successfulConnections.incrementAndGet()
                    
                    // Start quality monitoring for this connection
                    startConnectionQualityMonitoring(peer.nodeId)
                    
                    connectionEventsChannel.trySend(ConnectionEvent.Connected(info))
                    cont.resume(true)
                } else {
                    info.state = ConnectionState.FAILED
                    info.lastError = result.message
                    failedConnections.incrementAndGet()
                    
                    connectionEventsChannel.trySend(ConnectionEvent.Failed(info, result.message))
                    cont.resume(false)
                }
            }
        }
    }
    
    /**
     * Disconnect from a peer.
     */
    suspend fun disconnect(nodeId: Int, reason: String = "User requested"): Boolean {
        val info = connections[nodeId] ?: return false
        
        if (info.state == ConnectionState.DISCONNECTED) return true
        
        val result = transportManager.disconnect(info.peer)
        
        info.state = ConnectionState.DISCONNECTED
        info.lastError = reason
        
        connectionEventsChannel.trySend(ConnectionEvent.Disconnected(info, reason))
        
        return result is TransportResult.Success
    }
    
    /**
     * Force reconnection to a peer.
     */
    suspend fun reconnect(nodeId: Int): Boolean {
        val info = connections[nodeId] ?: return false
        
        if (info.state == ConnectionState.CONNECTED) {
            // Disconnect first
            disconnect(nodeId, "Forced reconnect")
        }
        
        info.state = ConnectionState.RECONNECTING
        info.reconnectAttempts++
        reconnections.incrementAndGet()
        
        connectionEventsChannel.trySend(ConnectionEvent.Reconnecting(info, info.reconnectAttempts))
        
        return connect(info.peer)
    }
    
    /**
     * Get connection info for a peer.
     */
    fun getConnection(nodeId: Int): ConnectionInfo? {
        return connections[nodeId]
    }
    
    /**
     * Get all connections.
     */
    fun getAllConnections(): List<ConnectionInfo> {
        return connections.values.toList()
    }
    
    /**
     * Get connected peers.
     */
    fun getConnectedPeers(): List<ConnectionInfo> {
        return connections.values.filter { it.state == ConnectionState.CONNECTED }.toList()
    }
    
    /**
     * Get connection events channel.
     */
    fun connectionEvents(): ReceiveChannel<ConnectionEvent> = connectionEventsChannel
    
    /**
     * Check if a peer is connected.
     */
    fun isConnected(nodeId: Int): Boolean {
        return connections[nodeId]?.state == ConnectionState.CONNECTED
    }
    
    /**
     * Get connection statistics.
     */
    fun getStats(): ConnectionManagerStats {
        val connected = connections.values.count { it.state == ConnectionState.CONNECTED }
        val connecting = connections.values.count { it.state in setOf(ConnectionState.CONNECTING, ConnectionState.RECONNECTING) }
        val failed = connections.values.count { it.state == ConnectionState.FAILED }
        
        val avgSignal = if (connected > 0) {
            connections.values.filter { it.state == ConnectionState.CONNECTED }.map { it.signalStrength }.average()
        } else 0.0
        
        val avgPacketLoss = if (connected > 0) {
            connections.values.filter { it.state == ConnectionState.CONNECTED }.map { it.packetLossRate }.average()
        } else 0.0
        
        return ConnectionManagerStats(
            totalConnections = totalConnections.get(),
            successfulConnections = successfulConnections.get(),
            failedConnections = failedConnections.get(),
            reconnections = reconnections.get(),
            currentlyConnected = connected,
            currentlyConnecting = connecting,
            currentlyFailed = failed,
            averageSignalStrength = avgSignal,
            averagePacketLoss = avgPacketLoss
        )
    }
    
    /**
     * Shutdown the manager.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        connectionEventsChannel.close()
        connections.clear()
    }
    
    private fun wireUpEvents() {
        // Monitor transport connection state
        scope.launch {
            transportManager.connectionState().consumeEach { event ->
                handleTransportConnectionEvent(event)
            }
        }
        
        // Monitor peer updates
        scope.launch {
            peerManager.peerUpdates().consumeEach { update ->
                handlePeerUpdate(update)
            }
        }
    }
    
    private fun handleTransportConnectionEvent(event: com.itantra.core.communication.ConnectionStateEvent) {
        val info = connections[event.device.nodeId]
            ?: ConnectionInfo(peer = event.device).also { connections[event.device.nodeId] = it }
        
        info.transportType = event.device.transportType
        
        when {
            event.previousState != com.itantra.core.model.ConnectionState.CONNECTED && event.newState == com.itantra.core.model.ConnectionState.CONNECTED -> {
                info.state = ConnectionState.CONNECTED
                info.connectedAt = System.currentTimeMillis()
                info.reconnectAttempts = 0
                info.lastError = null
                successfulConnections.incrementAndGet()
                connectionEventsChannel.trySend(ConnectionEvent.Connected(info))
            }
            event.previousState == com.itantra.core.model.ConnectionState.CONNECTED && event.newState != com.itantra.core.model.ConnectionState.CONNECTED -> {
                val oldState = info.state
                info.state = ConnectionState.DISCONNECTED
                info.lastError = "Transport disconnected"
                
                connectionEventsChannel.trySend(ConnectionEvent.Disconnected(info, "Transport disconnected"))
                
                // Trigger reconnection if auto-reconnect enabled
                if (autoReconnect && oldState == ConnectionState.CONNECTED) {
                    scheduleReconnect(event.device.nodeId)
                }
            }
        }
    }
    
    private fun handlePeerUpdate(update: PeerManager.PeerUpdate) {
        when (update) {
            is PeerManager.PeerUpdate.Lost -> {
                val info = connections[update.peer.device.nodeId]
                if (info != null && info.state == ConnectionState.CONNECTED) {
                    info.state = ConnectionState.FAILED
                    info.lastError = "Peer lost"
                    connectionEventsChannel.trySend(ConnectionEvent.Failed(info, "Peer lost"))
                }
            }
            is PeerManager.PeerUpdate.SignalChanged -> {
                val info = connections[update.peer.device.nodeId]
                if (info != null) {
                    val oldQuality = info.signalStrength
                    info.signalStrength = update.newStrength
                    
                    if (oldQuality != update.newStrength) {
                        connectionEventsChannel.trySend(ConnectionEvent.QualityChanged(info, oldQuality, update.newStrength))
                    }
                }
            }
        }
    }
    
    private fun scheduleReconnect(nodeId: Int) {
        val info = connections[nodeId] ?: return
        if (info.reconnectAttempts >= maxReconnectAttempts) {
            info.state = ConnectionState.FAILED
            info.lastError = "Max reconnect attempts reached"
            connectionEventsChannel.trySend(ConnectionEvent.Failed(info, "Max reconnect attempts reached"))
            return
        }
        
        scope.launch {
            delay(reconnectIntervalMs)
            if (connections[nodeId]?.state == ConnectionState.DISCONNECTED || connections[nodeId]?.state == ConnectionState.FAILED) {
                reconnect(nodeId)
            }
        }
    }
    
    private fun startConnectionQualityMonitoring(nodeId: Int) {
        scope.launch {
            while (connections[nodeId]?.state == ConnectionState.CONNECTED) {
                delay(10000) // Check every 10 seconds
                checkConnectionQuality(nodeId)
            }
        }
    }
    
    private fun checkConnectionQuality(nodeId: Int) {
        val info = connections[nodeId] ?: return
        
        // Get signal strength from peer manager
        val peer = peerManager.getPeer(nodeId)
        if (peer != null) {
            info.signalStrength = peer.signalStrength
            info.lastQualityCheck = System.currentTimeMillis()
            
            // Calculate packet loss rate (simplified)
            // In production, this would track actual packet loss
        }
        
        // Check if quality is below threshold
        if (info.signalStrength < connectionQualityThreshold) {
            // Could trigger proactive reconnection or transport switch
        }
    }
    
    private fun startQualityMonitoring() {
        scope.launch {
            while (isActive) {
                delay(30000) // Every 30 seconds
                connections.values.forEach { info ->
                    if (info.state == ConnectionState.CONNECTED) {
                        checkConnectionQuality(info.peer.nodeId)
                    }
                }
            }
        }
    }
    
    private fun startReconnectionJob() {
        scope.launch {
            while (isActive) {
                delay(reconnectIntervalMs)
                
                connections.values.forEach { info ->
                    if (info.state == ConnectionState.FAILED && info.reconnectAttempts < maxReconnectAttempts) {
                        scheduleReconnect(info.peer.nodeId)
                    }
                }
            }
        }
    }
    
    data class ConnectionManagerStats(
        val totalConnections: Long,
        val successfulConnections: Long,
        val failedConnections: Long,
        val reconnections: Long,
        val currentlyConnected: Int,
        val currentlyConnecting: Int,
        val currentlyFailed: Int,
        val averageSignalStrength: Double,
        val averagePacketLoss: Double
    )
}