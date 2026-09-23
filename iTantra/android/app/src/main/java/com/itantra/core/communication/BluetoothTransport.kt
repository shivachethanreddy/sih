package com.itantra.core.communication

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.itantra.core.model.Device
import com.itantra.core.model.Packet
import com.itantra.core.model.TransportType
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import java.util.UUID

/**
 * Bluetooth transport implementation using Android's Bluetooth APIs.
 * Supports Bluetooth Classic (RFCOMM) for reliable socket communication.
 * 
 * This is a production implementation skeleton - requires proper Android
 * permissions (BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT, etc.)
 * and runtime permission handling for Android 12+.
 */
class BluetoothTransport(
    private val context: Context,
    private val localNodeId: Int,
    private val serviceUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"), // SPP UUID
    private val connectionTimeoutMs: Long = 10000
) : Transport {
    
    override val transportType: TransportType = TransportType.BLUETOOTH
    
    // Bluetooth adapter
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothServerSocket: BluetoothServerSocket? = null
    
    // Connected clients
    private val clientSockets = ConcurrentHashMap<Int, BluetoothSocket>()
    private val clientOutputStreams = ConcurrentHashMap<Int, OutputStream>()
    private val clientInputStreams = ConcurrentHashMap<Int, InputStream>()
    
    // Discovered/connected peers
    private val connectedPeers = ConcurrentHashMap<Int, Device>()
    private val discoveredPeers = ConcurrentHashMap<Int, Device>()
    private val pendingConnections = ConcurrentHashMap<Int, CompletableDeferred<Device>>()
    
    // Channels
    private val incomingPacketsChannel = Channel<IncomingPacket>(500)
    private val discoveredDevicesChannel = Channel<Device>(200)
    private val connectionStateChannel = Channel<ConnectionStateEvent>(200)
    
    // State
    private val running = AtomicBoolean(false)
    private val discovering = AtomicBoolean(false)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // Broadcast receiver for Bluetooth events
    private var broadcastReceiver: BroadcastReceiver? = null
    
    // Statistics
    private val packetsSent = AtomicLong(0)
    private val packetsReceived = AtomicLong(0)
    private val packetsDropped = AtomicLong(0)
    private val connectionFailures = AtomicLong(0)
    
    init {
        initializeBluetooth()
    }
    
    private fun initializeBluetooth() {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as android.bluetooth.BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        
        if (bluetoothAdapter == null) {
            Log.e("BluetoothTransport", "Bluetooth not supported on this device")
        }
        
        registerBroadcastReceiver()
    }
    
    private fun registerBroadcastReceiver() {
        broadcastReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val action = intent.action
                when (action) {
                    BluetoothDevice.ACTION_FOUND -> {
                        val device = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                        device?.let { handleDeviceFound(it) }
                    }
                    BluetoothDevice.ACTION_BOND_STATE_CHANGED -> {
                        val device = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                        val bondState = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, -1)
                        val prevBondState = intent.getIntExtra(BluetoothDevice.EXTRA_PREVIOUS_BOND_STATE, -1)
                        device?.let { handleBondStateChanged(it, bondState, prevBondState) }
                    }
                    BluetoothAdapter.ACTION_DISCOVERY_STARTED -> {
                        discovering.set(true)
                    }
                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                        discovering.set(false)
                    }
                    BluetoothAdapter.ACTION_STATE_CHANGED -> {
                        val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, -1)
                        handleBluetoothStateChanged(state)
                    }
                }
            }
        }
        
        val intentFilter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_STARTED)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
            addAction(BluetoothAdapter.ACTION_STATE_CHANGED)
        }
        
        context.registerReceiver(broadcastReceiver, intentFilter)
    }
    
    private fun handleDeviceFound(device: BluetoothDevice) {
        val nodeId = deriveNodeId(device.address)
        val peer = Device(
            nodeId = nodeId,
            deviceName = device.name ?: "Unknown",
            transportType = TransportType.BLUETOOTH,
            connectionState = if (device.bondState == BluetoothDevice.BOND_BONDED) {
                com.itantra.core.model.ConnectionState.CONNECTED
            } else {
                com.itantra.core.model.ConnectionState.DISCONNECTED
            }
        )
        
        if (device.bondState == BluetoothDevice.BOND_BONDED) {
            connectedPeers[nodeId] = peer
        } else {
            discoveredPeers[nodeId] = peer
        }
        
        discoveredDevicesChannel.trySend(peer)
    }
    
    private fun handleBondStateChanged(device: BluetoothDevice, bondState: Int, prevBondState: Int) {
        val nodeId = deriveNodeId(device.address)
        
        when (bondState) {
            BluetoothDevice.BOND_BONDED -> {
                val peer = Device(
                    nodeId = nodeId,
                    deviceName = device.name ?: "Unknown",
                    transportType = TransportType.BLUETOOTH,
                    connectionState = com.itantra.core.model.ConnectionState.CONNECTED
                )
                
                val previous = connectedPeers[nodeId]?.connectionState ?: com.itantra.core.model.ConnectionState.DISCONNECTED
                connectedPeers[nodeId] = peer
                discoveredPeers[nodeId] = peer
                
                connectionStateChannel.trySend(ConnectionStateEvent(
                    device = peer,
                    previousState = previous,
                    newState = com.itantra.core.model.ConnectionState.CONNECTED
                ))
                
                // Complete pending connection
                pendingConnections[nodeId]?.complete(peer)
            }
            BluetoothDevice.BOND_NONE -> {
                val peer = connectedPeers.remove(nodeId)
                peer?.let { p ->
                    val disconnected = p.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
                    connectedPeers[nodeId] = disconnected
                    discoveredPeers[nodeId] = disconnected
                    
                    connectionStateChannel.trySend(ConnectionStateEvent(
                        device = disconnected,
                        previousState = p.connectionState,
                        newState = com.itantra.core.model.ConnectionState.DISCONNECTED
                    ))
                }
                pendingConnections[nodeId]?.completeExceptionally(IOException("Bond removed"))
            }
        }
    }
    
    private fun handleBluetoothStateChanged(state: Int) {
        val enabled = state == BluetoothAdapter.STATE_ON
        Log.i("BluetoothTransport", "Bluetooth state: ${if (enabled) "ON" else "OFF"}")
        
        if (!enabled) {
            // Bluetooth turned off - disconnect all
            connectedPeers.values.forEach { peer ->
                val disconnected = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
                connectedPeers[peer.nodeId] = disconnected
                discoveredPeers[peer.nodeId] = disconnected
                
                connectionStateChannel.trySend(ConnectionStateEvent(
                    device = disconnected,
                    previousState = peer.connectionState,
                    newState = com.itantra.core.model.ConnectionState.DISCONNECTED
                ))
            }
            connectedPeers.clear()
        }
    }
    
    private fun deriveNodeId(address: String?): Int {
        return address?.replace(":", "")?.let { Long.parseLong(it, 16) }?.rem(0xFFFE)?.plus(1)?.toInt()
            ?: (Math.random() * 0xFFFE).toInt() + 1
    }
    
    // ==================== Transport Interface Implementation ====================
    
    override suspend fun start(): TransportResult {
        if (running.get()) return TransportResult.success("Already running")
        
        bluetoothAdapter?.let { adapter ->
            if (!adapter.isEnabled) {
                // Can't auto-enable on Android 12+ without user consent
                return TransportResult.failure(TransportError.NOT_AVAILABLE, "Bluetooth not enabled")
            }
        } ?: return TransportResult.failure(TransportError.NOT_AVAILABLE, "Bluetooth not supported")
        
        running.set(true)
        
        // Start server socket for incoming connections
        scope.launch { startServerSocket() }
        
        return TransportResult.success("Bluetooth transport started")
    }
    
    override suspend fun stop(): TransportResult {
        running.set(false)
        discovering.set(false)
        
        // Close server socket
        bluetoothServerSocket?.close()
        bluetoothServerSocket = null
        
        // Close all client sockets
        clientSockets.values.forEach { socket ->
            try { socket.close() } catch (e: IOException) { /* ignore */ }
        }
        clientSockets.clear()
        clientOutputStreams.clear()
        clientInputStreams.clear()
        
        // Cancel discovery
        bluetoothAdapter?.cancelDiscovery()
        
        // Update peer states
        connectedPeers.values.forEach { peer ->
            val disconnected = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
            connectedPeers[peer.nodeId] = disconnected
            discoveredPeers[peer.nodeId] = disconnected
            
            connectionStateChannel.trySend(ConnectionStateEvent(
                device = disconnected,
                previousState = peer.connectionState,
                newState = com.itantra.core.model.ConnectionState.DISCONNECTED
            ))
        }
        connectedPeers.clear()
        
        return TransportResult.success("Bluetooth transport stopped")
    }
    
    override suspend fun discover(): TransportResult {
        if (!running.get()) return TransportResult.failure(TransportError.NOT_RUNNING, "Transport not running")
        
        bluetoothAdapter?.let { adapter ->
            if (!adapter.isEnabled) {
                return TransportResult.failure(TransportError.NOT_AVAILABLE, "Bluetooth not enabled")
            }
            if (adapter.isDiscovering) {
                adapter.cancelDiscovery()
            }
            val started = adapter.startDiscovery()
            if (!started) {
                return TransportResult.failure(TransportError.DISCOVERY_FAILED, "Failed to start discovery")
            }
        } ?: return TransportResult.failure(TransportError.NOT_AVAILABLE, "Bluetooth adapter not available")
        
        discovering.set(true)
        return TransportResult.success("Bluetooth discovery started")
    }
    
    override suspend fun stopDiscovery(): TransportResult {
        bluetoothAdapter?.cancelDiscovery()
        discovering.set(false)
        return TransportResult.success("Discovery stopped")
    }
    
    override suspend fun connect(device: Device): TransportResult {
        if (!running.get()) return TransportResult.failure(TransportError.NOT_RUNNING, "Transport not running")
        
        val bluetoothDevice = findBluetoothDevice(device.nodeId)
            ?: return TransportResult.failure(TransportError.PEER_NOT_FOUND, "Device not discovered")
        
        // Check if already bonded
        if (bluetoothDevice.bondState == BluetoothDevice.BOND_BONDED) {
            return connectToBondedDevice(bluetoothDevice)
        }
        
        // Initiate bonding
        val bonded = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            bluetoothDevice.createBond()
        } else {
            // Legacy method
            bluetoothDevice.createBond()
        }
        
        if (!bonded) {
            return TransportResult.failure(TransportError.CONNECTION_FAILED, "Failed to initiate bonding")
        }
        
        // Wait for bonding to complete
        return suspendCancellableCoroutine { cont ->
            val pending = CompletableDeferred<Device>()
            pendingConnections[device.nodeId] = pending
            
            scope.launch {
                try {
                    val connectedDevice = pending.await()
                    cont.resume(TransportResult.success("Bonded and connected to ${connectedDevice.deviceName}"))
                } catch (e: Exception) {
                    connectionFailures.incrementAndGet()
                    cont.resume(TransportResult.failure(TransportError.CONNECTION_FAILED, e.message ?: "Bonding failed"))
                }
            }
        }
    }
    
    private suspend fun connectToBondedDevice(bluetoothDevice: BluetoothDevice): TransportResult {
        return suspendCancellableCoroutine { cont ->
            scope.launch {
                try {
                    val socket = bluetoothDevice.createRfcommSocketToServiceRecord(serviceUuid)
                    socket.connect()
                    
                    val nodeId = deriveNodeId(bluetoothDevice.address)
                    handleClientConnection(socket, nodeId)
                    
                    val peer = Device(
                        nodeId = nodeId,
                        deviceName = bluetoothDevice.name ?: "Unknown",
                        transportType = TransportType.BLUETOOTH,
                        connectionState = com.itantra.core.model.ConnectionState.CONNECTED
                    )
                    
                    connectedPeers[nodeId] = peer
                    discoveredPeers[nodeId] = peer
                    
                    cont.resume(TransportResult.success("Connected to ${peer.deviceName}"))
                } catch (e: IOException) {
                    connectionFailures.incrementAndGet()
                    cont.resume(TransportResult.failure(TransportError.CONNECTION_FAILED, e.message ?: "Connection failed"))
                }
            }
        }
    }
    
    private fun findBluetoothDevice(nodeId: Int): BluetoothDevice? {
        return bluetoothAdapter?.bondedDevices?.find { deriveNodeId(it.address) == nodeId }
            ?: bluetoothAdapter?.bondedDevices?.find { it.name?.let { name -> deriveNodeId(name) } == nodeId }
    }
    
    private fun startServerSocket() {
        bluetoothAdapter?.let { adapter ->
            try {
                bluetoothServerSocket = adapter.listenUsingRfcommWithServiceRecord("iTantra", serviceUuid)
                
                while (running.get()) {
                    val socket = bluetoothServerSocket?.accept()
                    socket?.let {
                        scope.launch {
                            handleClientConnection(it)
                        }
                    }
                }
            } catch (e: IOException) {
                Log.e("BluetoothTransport", "Server socket error", e)
            }
        }
    }
    
    private fun handleClientConnection(socket: BluetoothSocket) {
        val nodeId = deriveNodeId(socket.remoteDevice.address)
        
        try {
            val inputStream = socket.getInputStream()
            val outputStream = socket.getOutputStream()
            
            clientSockets[nodeId] = socket
            clientOutputStreams[nodeId] = outputStream
            clientInputStreams[nodeId] = inputStream
            
            val peer = Device(
                nodeId = nodeId,
                deviceName = socket.remoteDevice.name ?: "Unknown",
                transportType = TransportType.BLUETOOTH,
                connectionState = com.itantra.core.model.ConnectionState.CONNECTED
            )
            
            val previous = connectedPeers[nodeId]?.connectionState ?: com.itantra.core.model.ConnectionState.DISCONNECTED
            connectedPeers[nodeId] = peer
            discoveredPeers[nodeId] = peer
            
            connectionStateChannel.trySend(ConnectionStateEvent(
                device = peer,
                previousState = previous,
                newState = com.itantra.core.model.ConnectionState.CONNECTED
            ))
            
            // Read packets from this client
            scope.launch {
                readPacketsFromClient(nodeId, inputStream)
            }
            
        } catch (e: IOException) {
            Log.e("BluetoothTransport", "Error handling client connection", e)
            handleClientDisconnect(nodeId)
        }
    }
    
    private fun readPacketsFromClient(nodeId: Int, inputStream: InputStream) {
        val buffer = ByteBuffer.allocate(4096)
        
        while (running.get() && clientSockets[nodeId] != null) {
            try {
                // Read packet length (2 bytes)
                val lengthBytes = ByteArray(2)
                var read = 0
                while (read < 2) {
                    val result = inputStream.read(lengthBytes, read, 2 - read)
                    if (result == -1) throw IOException("Stream closed")
                    read += result
                }
                
                val packetLength = ((lengthBytes[0].toInt() and 0xFF) shl 8) or (lengthBytes[1].toInt() and 0xFF)
                
                if (packetLength > 4096) {
                    Log.w("BluetoothTransport", "Packet too large: $packetLength")
                    continue
                }
                
                // Read packet data
                val packetData = ByteArray(packetLength)
                read = 0
                while (read < packetLength) {
                    val result = inputStream.read(packetData, read, packetLength - read)
                    if (result == -1) throw IOException("Stream closed")
                    read += result
                }
                
                val packet = Packet(
                    messageId = 0,
                    sourceNodeId = nodeId,
                    destinationNodeId = localNodeId,
                    channelId = "BLUETOOTH",
                    payload = packetData,
                    language = "en"
                )
                
                val incoming = IncomingPacket(
                    packet = packet,
                    fromDevice = connectedPeers[nodeId] ?: Device(nodeId = nodeId, deviceName = "Unknown"),
                    transportType = transportType
                )
                
                incomingPacketsChannel.trySend(incoming)
                packetsReceived.incrementAndGet()
                
            } catch (e: IOException) {
                if (running.get()) {
                    Log.w("BluetoothTransport", "Read error from node $nodeId", e)
                }
                break
            } catch (e: Exception) {
                Log.e("BluetoothTransport", "Unexpected error reading from node $nodeId", e)
                break
            }
        }
        
        handleClientDisconnect(nodeId)
    }
    
    private fun handleClientDisconnect(nodeId: Int) {
        clientSockets.remove(nodeId)?.close()
        clientOutputStreams.remove(nodeId)
        clientInputStreams.remove(nodeId)
        
        val peer = connectedPeers.remove(nodeId)
        peer?.let { p ->
            val disconnected = p.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
            connectedPeers[nodeId] = disconnected
            discoveredPeers[nodeId] = disconnected
            
            connectionStateChannel.trySend(ConnectionStateEvent(
                device = disconnected,
                previousState = p.connectionState,
                newState = com.itantra.core.model.ConnectionState.DISCONNECTED
            ))
        }
    }
    
    override suspend fun disconnect(device: Device): TransportResult {
        val socket = clientSockets.remove(device.nodeId)
        socket?.close()
        clientOutputStreams.remove(device.nodeId)
        clientInputStreams.remove(device.nodeId)
        
        val peer = connectedPeers.remove(device.nodeId)
        peer?.let { p ->
            val disconnected = p.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
            connectedPeers[device.nodeId] = disconnected
            discoveredPeers[device.nodeId] = disconnected
            
            connectionStateChannel.trySend(ConnectionStateEvent(
                device = disconnected,
                previousState = p.connectionState,
                newState = com.itantra.core.model.ConnectionState.DISCONNECTED
            ))
        }
        
        return TransportResult.success("Disconnected from ${device.deviceName}")
    }
    
    override suspend fun disconnectAll(): TransportResult {
        clientSockets.values.forEach { it.close() }
        clientSockets.clear()
        clientOutputStreams.clear()
        clientInputStreams.clear()
        
        connectedPeers.values.forEach { peer ->
            val disconnected = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
            connectedPeers[peer.nodeId] = disconnected
            discoveredPeers[peer.nodeId] = disconnected
            
            connectionStateChannel.trySend(ConnectionStateEvent(
                device = disconnected,
                previousState = peer.connectionState,
                newState = com.itantra.core.model.ConnectionState.DISCONNECTED
            ))
        }
        connectedPeers.clear()
        
        return TransportResult.success("Disconnected from all peers")
    }
    
    override suspend fun send(device: Device, packet: Packet): Boolean {
        val outputStream = clientOutputStreams[device.nodeId] ?: return false
        
        try {
            val payload = packet.payload
            val length = payload.size
            
            if (length > 0xFFFF) {
                packetsDropped.incrementAndGet()
                return false
            }
            
            val lengthBytes = byteArrayOf(
                (length shr 8).toByte(),
                length.toByte()
            )
            
            outputStream.write(lengthBytes)
            outputStream.write(payload)
            outputStream.flush()
            
            packetsSent.incrementAndGet()
            return true
        } catch (e: IOException) {
            Log.e("BluetoothTransport", "Send failed to ${device.deviceName}", e)
            handleClientDisconnect(device.nodeId)
            packetsDropped.incrementAndGet()
            return false
        }
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
    
    override fun isAvailable(): Boolean = bluetoothAdapter != null
    
    override val isRunning: Boolean
        get() = running.get()
    
    override fun getConnectedPeers(): List<Device> {
        return connectedPeers.values.filter { it.connectionState == com.itantra.core.model.ConnectionState.CONNECTED }.toList()
    }
    
    override fun getDiscoveredPeers(): List<Device> {
        return discoveredPeers.values.filter { it.connectionState != com.itantra.core.model.ConnectionState.CONNECTED }.toList()
    }
    
    fun getStats(): BluetoothStats {
        return BluetoothStats(
            packetsSent = packetsSent.get(),
            packetsReceived = packetsReceived.get(),
            packetsDropped = packetsDropped.get(),
            connectionFailures = connectionFailures.get(),
            connectedPeers = connectedPeers.size,
            discoveredPeers = discoveredPeers.size,
            isEnabled = bluetoothAdapter?.isEnabled == true
        )
    }
    
    fun shutdown() {
        runBlocking { stop() }
        scope.coroutineContext[Job]?.cancel()
        broadcastReceiver?.let { context.unregisterReceiver(it) }
        incomingPacketsChannel.close()
        discoveredDevicesChannel.close()
        connectionStateChannel.close()
    }
    
    data class BluetoothStats(
        val packetsSent: Long,
        val packetsReceived: Long,
        val packetsDropped: Long,
        val connectionFailures: Long,
        val connectedPeers: Int,
        val discoveredPeers: Int,
        val isEnabled: Boolean
    )
}