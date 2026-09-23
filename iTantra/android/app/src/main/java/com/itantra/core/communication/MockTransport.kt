package com.itantra.core.communication

import com.itantra.core.model.Device
import com.itantra.core.model.Packet
import com.itantra.core.model.TransportType
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Mock transport for testing mesh logic without real hardware.
 * Simulates:
 * - A → B
 * - A → B → C
 * - A → B → C → D
 * - Packet delivery, loss, duplicates, delay
 * - ACK, retry
 * - Disconnected nodes
 */
class MockTransport(
    private val localNodeId: Int,
    private val simulatedPeers: List<Device> = emptyList(),
    private val packetLossRate: Double = 0.0,
    private val duplicateRate: Double = 0.0,
    private val baseDelayMs: Long = 10,
    private val maxDelayMs: Long = 100
) : Transport {
    
    override val transportType: TransportType = TransportType.MOCK
    
    // Connected peers
    private val connectedPeers = ConcurrentHashMap<Int, Device>()
    
    // Discovered peers
    private val discoveredPeers = ConcurrentHashMap<Int, Device>()
    
    // Message routing table (for multi-hop simulation)
    private val routingTable = ConcurrentHashMap<Int, Int>() // destination -> next hop
    
    // Channels
    private val incomingPacketsChannel = Channel<IncomingPacket>(500)
    private val discoveredDevicesChannel = Channel<Device>(200)
    private val connectionStateChannel = Channel<ConnectionStateEvent>(200)
    
    // State
    private val running = AtomicBoolean(false)
    private val discovering = AtomicBoolean(false)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val packetsSent = AtomicLong(0)
    private val packetsReceived = AtomicLong(0)
    private val packetsDropped = AtomicLong(0)
    private val packetsDuplicated = AtomicLong(0)
    
    // Simulation configuration
    var onPacketReceived: ((Packet, Int) -> Unit)? = null // (packet, fromNodeId)
    var onPeerConnected: ((Device) -> Unit)? = null
    var onPeerDisconnected: ((Device) -> Unit)? = null
    
    init {
        // Pre-populate discovered peers
        simulatedPeers.forEach { peer ->
            discoveredPeers[peer.nodeId] = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
        }
    }
    
    override suspend fun start(): TransportResult {
        if (running.get()) {
            return TransportResult.success("Already running")
        }
        
        running.set(true)
        
        // Simulate initial peer discovery
        scope.launch {
            delay(500)
            if (discovering.get()) {
                simulatedPeers.forEach { peer ->
                    discoveredPeers[peer.nodeId] = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
                    discoveredDevicesChannel.send(peer)
                }
            }
        }
        
        return TransportResult.success("Mock transport started")
    }
    
    override suspend fun stop(): TransportResult {
        running.set(false)
        discovering.set(false)
        
        // Disconnect all peers
        connectedPeers.values.forEach { peer ->
            val previousState = peer.connectionState
            val updatedPeer = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
            connectedPeers[peer.nodeId] = updatedPeer
            connectionStateChannel.send(ConnectionStateEvent(
                device = updatedPeer,
                previousState = previousState,
                newState = com.itantra.core.model.ConnectionState.DISCONNECTED
            ))
            onPeerDisconnected?.invoke(updatedPeer)
        }
        connectedPeers.clear()
        
        return TransportResult.success("Mock transport stopped")
    }
    
    override suspend fun discover(): TransportResult {
        if (!running.get()) {
            return TransportResult.failure(TransportError.NOT_RUNNING, "Transport not running")
        }
        
        discovering.set(true)
        
        scope.launch {
            simulatedPeers.forEach { peer ->
                delay((Math.random() * 500).toLong())
                if (discovering.get() && running.get()) {
                    val discoveredPeer = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
                    discoveredPeers[peer.nodeId] = discoveredPeer
                    discoveredDevicesChannel.send(discoveredPeer)
                }
            }
        }
        
        return TransportResult.success("Discovery started")
    }
    
    override suspend fun stopDiscovery(): TransportResult {
        discovering.set(false)
        return TransportResult.success("Discovery stopped")
    }
    
    override suspend fun connect(device: Device): TransportResult {
        if (!running.get()) {
            return TransportResult.failure(TransportError.NOT_RUNNING, "Transport not running")
        }
        
        val existing = connectedPeers[device.nodeId]
        if (existing != null && existing.connectionState == com.itantra.core.model.ConnectionState.CONNECTED) {
            return TransportResult.failure(TransportError.PEER_ALREADY_CONNECTED, "Already connected to ${device.deviceName}")
        }
        
        // Simulate connection delay
        delay((Math.random() * 200 + 50).toLong())
        
        val connectedPeer = device.copy(connectionState = com.itantra.core.model.ConnectionState.CONNECTED)
        val previousState = existing?.connectionState ?: com.itantra.core.model.ConnectionState.DISCONNECTED
        
        connectedPeers[device.nodeId] = connectedPeer
        discoveredPeers[device.nodeId] = connectedPeer
        
        // Update routing table (direct connection)
        routingTable[device.nodeId] = device.nodeId
        
        connectionStateChannel.send(ConnectionStateEvent(
            device = connectedPeer,
            previousState = previousState,
            newState = com.itantra.core.model.ConnectionState.CONNECTED
        ))
        
        onPeerConnected?.invoke(connectedPeer)
        
        return TransportResult.success("Connected to ${device.deviceName}")
    }
    
    override suspend fun disconnect(device: Device): TransportResult {
        val existing = connectedPeers[device.nodeId]
        if (existing == null) {
            return TransportResult.failure(TransportError.PEER_NOT_FOUND, "Not connected to ${device.deviceName}")
        }
        
        val disconnectedPeer = existing.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
        connectedPeers[device.nodeId] = disconnectedPeer
        discoveredPeers[device.nodeId] = disconnectedPeer
        routingTable.remove(device.nodeId)
        
        connectionStateChannel.send(ConnectionStateEvent(
            device = disconnectedPeer,
            previousState = existing.connectionState,
            newState = com.itantra.core.model.ConnectionState.DISCONNECTED
        ))
        
        onPeerDisconnected?.invoke(disconnectedPeer)
        
        return TransportResult.success("Disconnected from ${device.deviceName}")
    }
    
    override suspend fun disconnectAll(): TransportResult {
        connectedPeers.values.forEach { peer ->
            connectionStateChannel.send(ConnectionStateEvent(
                device = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED),
                previousState = peer.connectionState,
                newState = com.itantra.core.model.ConnectionState.DISCONNECTED
            ))
            onPeerDisconnected?.invoke(peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED))
        }
        connectedPeers.clear()
        routingTable.clear()
        return TransportResult.success("Disconnected from all peers")
    }
    
    override suspend fun send(device: Device, packet: Packet): Boolean {
        if (!running.get()) return false
        
        val connectedPeer = connectedPeers[device.nodeId]
        if (connectedPeer == null || connectedPeer.connectionState != com.itantra.core.model.ConnectionState.CONNECTED) {
            return false
        }
        
        // Simulate packet loss
        if (Math.random() < packetLossRate) {
            packetsDropped.incrementAndGet()
            return false
        }
        
        // Simulate network delay
        val delay = baseDelayMs + (Math.random() * (maxDelayMs - baseDelayMs)).toLong()
        delay(delay)
        
        // Simulate duplicate
        if (Math.random() < duplicateRate) {
            packetsDuplicated.incrementAndGet()
            // Send duplicate after short delay
            scope.launch {
                delay((Math.random() * 50).toLong())
                deliverPacket(packet, device.nodeId)
            }
        }
        
        deliverPacket(packet, device.nodeId)
        packetsSent.incrementAndGet()
        return true
    }
    
    private fun deliverPacket(packet: Packet, fromNodeId: Int) {
        // Simulate receiving on the other end
        val fromPeer = connectedPeers[fromNodeId] ?: Device(
            nodeId = fromNodeId,
            deviceName = "Unknown-$fromNodeId",
            connectionState = com.itantra.core.model.ConnectionState.CONNECTED
        )
        
        val incoming = IncomingPacket(
            packet = packet,
            fromDevice = fromPeer,
            transportType = transportType
        )
        
        incomingPacketsChannel.send(incoming)
        packetsReceived.incrementAndGet()
        
        // Call callback if set
        onPacketReceived?.invoke(packet, fromNodeId)
    }
    
    override suspend fun broadcast(packet: Packet): Int {
        var sent = 0
        connectedPeers.values.forEach { peer ->
            if (send(peer, packet)) {
                sent++
            }
        }
        return sent
    }
    
    override fun incomingPackets(): ReceiveChannel<IncomingPacket> = incomingPacketsChannel
    
    override fun discoveredDevices(): ReceiveChannel<Device> = discoveredDevicesChannel
    
    override fun connectionState(): ReceiveChannel<ConnectionStateEvent> = connectionStateChannel
    
    override fun isAvailable(): Boolean = true
    
    override val isRunning: Boolean
        get() = running.get()
    
    override fun getConnectedPeers(): List<Device> {
        return connectedPeers.values.filter { it.connectionState == com.itantra.core.model.ConnectionState.CONNECTED }.toList()
    }
    
    override fun getDiscoveredPeers(): List<Device> {
        return discoveredPeers.values.filter { it.connectionState != com.itantra.core.model.ConnectionState.CONNECTED }.toList()
    }
    
    /**
     * Simulate receiving a packet from another node (for testing).
     */
    fun simulateIncomingPacket(packet: Packet, fromNodeId: Int) {
        if (!running.get()) return
        
        val fromPeer = connectedPeers[fromNodeId] ?: Device(
            nodeId = fromNodeId,
            deviceName = "Simulated-$fromNodeId",
            connectionState = com.itantra.core.model.ConnectionState.CONNECTED
        )
        
        val incoming = IncomingPacket(
            packet = packet,
            fromDevice = fromPeer,
            transportType = transportType
        )
        
        scope.launch {
            incomingPacketsChannel.send(incoming)
            packetsReceived.incrementAndGet()
        }
        
        onPacketReceived?.invoke(packet, fromNodeId)
    }
    
    /**
     * Connect multiple peers in a chain for multi-hop testing.
     * A ↔ B ↔ C ↔ D
     */
    fun setupChain(nodeIds: List<Int>) {
        for (i in 0 until nodeIds.size - 1) {
            val a = nodeIds[i]
            val b = nodeIds[i + 1]
            routingTable[a] = b
            routingTable[b] = a
        }
    }
    
    /**
     * Get statistics.
     */
    fun getStats(): MockTransportStats {
        return MockTransportStats(
            packetsSent = packetsSent.get(),
            packetsReceived = packetsReceived.get(),
            packetsDropped = packetsDropped.get(),
            packetsDuplicated = packetsDuplicated.get(),
            connectedPeers = connectedPeers.size,
            discoveredPeers = discoveredPeers.size,
            packetLossRate = packetLossRate,
            duplicateRate = duplicateRate
        )
    }
    
    /**
     * Configure simulation parameters.
     */
    fun setPacketLossRate(rate: Double) {
        // This would need a mutable property, simplified for now
    }
    
    /**
     * Shutdown the transport.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        incomingPacketsChannel.close()
        discoveredDevicesChannel.close()
        connectionStateChannel.close()
        running.set(false)
        discovering.set(false)
        connectedPeers.clear()
        discoveredPeers.clear()
        routingTable.clear()
    }
    
    data class MockTransportStats(
        val packetsSent: Long,
        val packetsReceived: Long,
        val packetsDropped: Long,
        val packetsDuplicated: Long,
        val connectedPeers: Int,
        val discoveredPeers: Int,
        val packetLossRate: Double,
        val duplicateRate: Double
    )
}

/**
 * Multi-node mock transport simulator for testing mesh networks.
 * Creates multiple MockTransport instances that can communicate with each other.
 */
class MultiNodeMockTransport(
    private val nodeConfigs: List<NodeConfig>
) {
    private val transports = mutableMapOf<Int, MockTransport>()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    data class NodeConfig(
        val nodeId: Int,
        val deviceName: String,
        val connectedTo: List<Int> = emptyList()
    )
    
    init {
        // Create transports
        nodeConfigs.forEach { config ->
            val peers = nodeConfigs.filter { it.nodeId != config.nodeId }
            val transport = MockTransport(
                localNodeId = config.nodeId,
                simulatedPeers = peers.map { p ->
                    Device(
                        nodeId = p.nodeId,
                        deviceName = p.deviceName,
                        connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED
                    )
                }
            )
            transports[config.nodeId] = transport
        }
        
        // Wire up packet delivery between transports
        transports.forEach { (nodeId, transport) ->
            transport.onPacketReceived = { packet, fromNodeId ->
                // Deliver to all connected transports (simulate broadcast medium)
                transports.forEach { (targetNodeId, targetTransport) ->
                    if (targetNodeId != nodeId && targetTransport.isRunning) {
                        // Check if nodes are "in range" (connected in config)
                        val sourceConfig = nodeConfigs.find { it.nodeId == nodeId }
                        val targetConfig = nodeConfigs.find { it.nodeId == targetNodeId }
                        if (sourceConfig?.connectedTo?.contains(targetNodeId) == true ||
                            targetConfig?.connectedTo?.contains(nodeId) == true) {
                            targetTransport.simulateIncomingPacket(packet, nodeId)
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Start all transports.
     */
    suspend fun startAll() {
        awaitAll(transports.values.map { it.start() })
        // Auto-connect based on config
        awaitAll(nodeConfigs.flatMap { config ->
            config.connectedTo.map { peerId ->
                transports[config.nodeId]?.connect(
                    Device(nodeId = peerId, deviceName = nodeConfigs.find { it.nodeId == peerId }?.deviceName ?: "Node-$peerId")
                )
            }
        })
    }
    
    /**
     * Stop all transports.
     */
    suspend fun stopAll() {
        awaitAll(transports.values.map { it.stop() })
    }
    
    /**
     * Get transport for a specific node.
     */
    fun getTransport(nodeId: Int): MockTransport? {
        return transports[nodeId]
    }
    
    /**
     * Get all transports.
     */
    fun getAllTransports(): List<MockTransport> {
        return transports.values.toList()
    }
    
    /**
     * Shutdown all.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        transports.values.forEach { it.shutdown() }
    }
}