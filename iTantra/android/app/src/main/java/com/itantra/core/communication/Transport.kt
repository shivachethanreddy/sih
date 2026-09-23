package com.itantra.core.communication

import com.itantra.core.model.Device
import com.itantra.core.model.Packet
import com.itantra.core.model.TransportType
import kotlinx.coroutines.channels.ReceiveChannel

/**
 * Transport interface for device-to-device communication.
 * Abstracts the underlying transport technology (Wi-Fi Direct, Bluetooth, etc.)
 */
interface Transport {
    /**
     * Start the transport (begin discovery, listening, etc.)
     */
    suspend fun start(): TransportResult
    
    /**
     * Stop the transport (cleanup connections, stop discovery)
     */
    suspend fun stop(): TransportResult
    
    /**
     * Start peer discovery.
     */
    suspend fun discover(): TransportResult
    
    /**
     * Stop peer discovery.
     */
    suspend fun stopDiscovery(): TransportResult
    
    /**
     * Connect to a specific peer device.
     */
    suspend fun connect(device: Device): TransportResult
    
    /**
     * Disconnect from a specific peer device.
     */
    suspend fun disconnect(device: Device): TransportResult
    
    /**
     * Disconnect from all peers.
     */
    suspend fun disconnectAll(): TransportResult
    
    /**
     * Send a packet to a specific device.
     * Returns true if queued for sending, false if failed immediately.
     */
    suspend fun send(device: Device, packet: Packet): Boolean
    
    /**
     * Broadcast a packet to all connected peers.
     */
    suspend fun broadcast(packet: Packet): Int // returns count of peers sent to
    
    /**
     * Get incoming packets as a flow.
     */
    fun incomingPackets(): ReceiveChannel<IncomingPacket>
    
    /**
     * Get discovered devices as a flow.
     */
    fun discoveredDevices(): ReceiveChannel<Device>
    
    /**
     * Get connection state changes as a flow.
     */
    fun connectionState(): ReceiveChannel<ConnectionStateEvent>
    
    /**
     * Get the transport type.
     */
    val transportType: TransportType
    
    /**
     * Check if transport is available on this device.
     */
    fun isAvailable(): Boolean
    
    /**
     * Check if transport is currently running.
     */
    val isRunning: Boolean
    
    /**
     * Get currently connected peers.
     */
    fun getConnectedPeers(): List<Device>
    
    /**
     * Get currently discovered (but not connected) peers.
     */
    fun getDiscoveredPeers(): List<Device>
}

/**
 * Result of a transport operation.
 */
sealed class TransportResult {
    data class Success(val message: String = "") : TransportResult()
    data class Failure(val error: TransportError, val message: String) : TransportResult()
    
    companion object {
        fun success(message: String = "") = Success(message)
        fun failure(error: TransportError, message: String) = Failure(error, message)
    }
}

/**
 * Transport-specific errors.
 */
enum class TransportError(val code: String) {
    NOT_AVAILABLE("NOT_AVAILABLE"),
    ALREADY_RUNNING("ALREADY_RUNNING"),
    NOT_RUNNING("NOT_RUNNING"),
    PERMISSION_DENIED("PERMISSION_DENIED"),
    DISCOVERY_FAILED("DISCOVERY_FAILED"),
    CONNECTION_FAILED("CONNECTION_FAILED"),
    CONNECTION_TIMEOUT("CONNECTION_TIMEOUT"),
    PEER_NOT_FOUND("PEER_NOT_FOUND"),
    PEER_ALREADY_CONNECTED("PEER_ALREADY_CONNECTED"),
    SEND_FAILED("SEND_FAILED"),
    SOCKET_ERROR("SOCKET_ERROR"),
    INVALID_STATE("INVALID_STATE"),
    UNSUPPORTED_OPERATION("UNSUPPORTED_OPERATION"),
    UNKNOWN("UNKNOWN")
}

/**
 * Connection state change events.
 */
data class ConnectionStateEvent(
    val device: Device,
    val previousState: com.itantra.core.model.ConnectionState,
    val newState: com.itantra.core.model.ConnectionState,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Incoming packet with metadata.
 */
data class IncomingPacket(
    val packet: Packet,
    val fromDevice: Device,
    val receivedAt: Long = System.currentTimeMillis(),
    val rssi: Int? = null,
    val transportType: TransportType
)
