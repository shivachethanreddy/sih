package com.itantra.core.communication

import com.itantra.core.model.Device
import com.itantra.core.model.Packet
import com.itantra.core.model.TransportType
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference

/**
 * Manages multiple transports and selects the best available one.
 * Handles transport failover and unified API for the communication engine.
 */
class TransportManager(
    private val transports: List<Transport> = emptyList(),
    private val preferredOrder: List<TransportType> = listOf(TransportType.WIFI_DIRECT, TransportType.BLUETOOTH)
) {
    // Active transports by type
    private val activeTransports = ConcurrentHashMap<TransportType, Transport>()
    
    // Current primary transport
    private val primaryTransport = AtomicReference<Transport?>(null)
    
    // Channels for unified events
    private val incomingPacketsChannel = Channel<com.itantra.core.communication.IncomingPacket>(500)
    private val discoveredDevicesChannel = Channel<Device>(200)
    private val connectionStateChannel = Channel<com.itantra.core.communication.ConnectionStateEvent>(200)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val transportSwitches = java.util.concurrent.atomic.AtomicLong(0)
    
    init {
        // Register all provided transports
        transports.forEach { registerTransport(it) }
    }
    
    /**
     * Register a transport implementation.
     */
    fun registerTransport(transport: Transport) {
        activeTransports[transport.transportType] = transport
        wireUpTransport(transport)
        
        // Auto-select primary if not set
        if (primaryTransport.get() == null) {
            selectPrimaryTransport()
        }
    }
    
    /**
     * Unregister a transport.
     */
    fun unregisterTransport(type: TransportType) {
        val transport = activeTransports.remove(type)
        transport?.let {
            if (primaryTransport.get() == it) {
                primaryTransport.set(null)
                selectPrimaryTransport()
            }
        }
    }
    
    /**
     * Get the currently active primary transport.
     */
    fun getPrimaryTransport(): Transport? {
        return primaryTransport.get()
    }
    
    /**
     * Get all registered transports.
     */
    fun getAllTransports(): List<Transport> {
        return activeTransports.values.toList()
    }
    
    /**
     * Get a specific transport by type.
     */
    fun getTransport(type: TransportType): Transport? {
        return activeTransports[type]
    }
    
    /**
     * Start all available transports.
     */
    suspend fun startAll(): Map<TransportType, TransportResult> {
        val results = mutableMapOf<TransportType, TransportResult>()
        
        activeTransports.forEach { (type, transport) ->
            if (transport.isAvailable()) {
                results[type] = transport.start()
                if (results[type] is TransportResult.Success) {
                    wireUpTransport(transport)
                }
            } else {
                results[type] = TransportResult.failure(TransportError.NOT_AVAILABLE, "$type not available on this device")
            }
        }
        
        selectPrimaryTransport()
        return results
    }
    
    /**
     * Stop all transports.
     */
    suspend fun stopAll(): Map<TransportType, TransportResult> {
        val results = mutableMapOf<TransportType, TransportResult>()
        
        activeTransports.forEach { (type, transport) ->
            results[type] = transport.stop()
        }
        
        primaryTransport.set(null)
        return results
    }
    
    /**
     * Start discovery on all transports.
     */
    suspend fun discoverAll(): Map<TransportType, TransportResult> {
        val results = mutableMapOf<TransportType, TransportResult>()
        
        activeTransports.forEach { (type, transport) ->
            if (transport.isRunning) {
                results[type] = transport.discover()
            } else {
                results[type] = TransportResult.failure(TransportError.NOT_RUNNING, "$type not running")
            }
        }
        
        return results
    }
    
    /**
     * Stop discovery on all transports.
     */
    suspend fun stopDiscoveryAll(): Map<TransportType, TransportResult> {
        val results = mutableMapOf<TransportType, TransportResult>()
        
        activeTransports.forEach { (type, transport) ->
            if (transport.isRunning) {
                results[type] = transport.stopDiscovery()
            } else {
                results[type] = TransportResult.failure(TransportError.NOT_RUNNING, "$type not running")
            }
        }
        
        return results
    }
    
    /**
     * Connect to a device using the best available transport.
     */
    suspend fun connect(device: Device): TransportResult {
        val transport = selectTransportForDevice(device)
        if (transport == null) {
            return TransportResult.failure(TransportError.NOT_AVAILABLE, "No suitable transport for device")
        }
        return transport.connect(device)
    }
    
    /**
     * Disconnect from a device.
     */
    suspend fun disconnect(device: Device): TransportResult {
        val transport = activeTransports.values.find { it.getConnectedPeers().any { it.nodeId == device.nodeId } }
        if (transport == null) {
            return TransportResult.failure(TransportError.PEER_NOT_FOUND, "Device not connected on any transport")
        }
        return transport.disconnect(device)
    }
    
    /**
     * Send a packet to a device using the appropriate transport.
     */
    suspend fun send(device: Device, packet: Packet): Boolean {
        // Try to find which transport the device is connected on
        val transport = activeTransports.values.find { it.getConnectedPeers().any { it.nodeId == device.nodeId } }
        
        if (transport != null) {
            return transport.send(device, packet)
        }
        
        // Fall back to primary transport
        val primary = primaryTransport.get()
        return primary?.send(device, packet) ?: false
    }
    
    /**
     * Broadcast a packet to all connected peers on all transports.
     */
    suspend fun broadcast(packet: Packet): Int {
        var totalSent = 0
        
        activeTransports.values.forEach { transport ->
            if (transport.isRunning) {
                totalSent += transport.broadcast(packet)
            }
        }
        
        return totalSent
    }
    
    /**
     * Get unified incoming packets channel.
     */
    fun incomingPackets(): ReceiveChannel<com.itantra.core.communication.IncomingPacket> = incomingPacketsChannel
    
    /**
     * Get unified discovered devices channel.
     */
    fun discoveredDevices(): ReceiveChannel<Device> = discoveredDevicesChannel
    
    /**
     * Get unified connection state channel.
     */
    fun connectionState(): ReceiveChannel<com.itantra.core.communication.ConnectionStateEvent> = connectionStateChannel
    
    /**
     * Get all connected peers across all transports.
     */
    fun getAllConnectedPeers(): List<Device> {
        return activeTransports.values.flatMap { it.getConnectedPeers() }.distinctBy { it.nodeId }
    }
    
    /**
     * Get all discovered peers across all transports.
     */
    fun getAllDiscoveredPeers(): List<Device> {
        return activeTransports.values.flatMap { it.getDiscoveredPeers() }.distinctBy { it.nodeId }
    }
    
    /**
     * Check if any transport is running.
     */
    val isAnyRunning: Boolean
        get() = activeTransports.values.any { it.isRunning }
    
    /**
     * Get statistics.
     */
    fun getStats(): TransportManagerStats {
        val transportStats = activeTransports.mapValues { (type, transport) ->
            type to TransportStats(
                type = type,
                isRunning = transport.isRunning,
                isAvailable = transport.isAvailable(),
                connectedPeers = transport.getConnectedPeers().size,
                discoveredPeers = transport.getDiscoveredPeers().size
            )
        }
        
        return TransportManagerStats(
            primaryTransport = primaryTransport.get()?.transportType,
            transportSwitches = transportSwitches.get(),
            transports = transportStats
        )
    }
    
    /**
     * Shutdown the manager.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        incomingPacketsChannel.close()
        discoveredDevicesChannel.close()
        connectionStateChannel.close()
        activeTransports.clear()
        primaryTransport.set(null)
    }
    
    private fun selectPrimaryTransport() {
        // Select based on preferred order
        preferredOrder.forEach { type ->
            val transport = activeTransports[type]
            if (transport != null && transport.isAvailable() && transport.isRunning) {
                if (primaryTransport.compareAndSet(null, transport)) {
                    return
                }
            }
        }
        
        // Fallback: any running transport
        val anyRunning = activeTransports.values.find { it.isRunning }
        primaryTransport.compareAndSet(null, anyRunning)
    }
    
    private fun selectTransportForDevice(device: Device): Transport? {
        // Check which transport the device is connected on
        return activeTransports.values.find { it.getConnectedPeers().any { it.nodeId == device.nodeId } }
            ?: primaryTransport.get()
    }
    
    private fun wireUpTransport(transport: Transport) {
        // Forward incoming packets
        scope.launch {
            transport.incomingPackets().consumeEach { packet ->
                incomingPacketsChannel.send(packet)
            }
        }
        
        // Forward discovered devices
        scope.launch {
            transport.discoveredDevices().consumeEach { device ->
                discoveredDevicesChannel.send(device)
            }
        }
        
        // Forward connection state changes
        scope.launch {
            transport.connectionState().consumeEach { event ->
                connectionStateChannel.send(event)
            }
        }
    }
    
    data class TransportManagerStats(
        val primaryTransport: TransportType?,
        val transportSwitches: Long,
        val transports: Map<TransportType, TransportStats>
    )
    
    data class TransportStats(
        val type: TransportType,
        val isRunning: Boolean,
        val isAvailable: Boolean,
        val connectedPeers: Int,
        val discoveredPeers: Int
    )
}