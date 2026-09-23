package com.itantra.core.communication

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pDeviceList
import android.net.wifi.p2p.WifiP2pInfo
import android.net.wifi.p2p.WifiP2pManager
import android.net.wifi.p2p.WifiP2pManager.Channel
import android.net.wifi.p2p.WifiP2pManager.ChannelListener
import android.net.wifi.p2p.WifiP2pManager.ConnectionInfoListener
import android.net.wifi.p2p.WifiP2pManager.PeerListListener
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
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.nio.ByteBuffer
import java.nio.charset.Charset
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/**
 * Wi-Fi Direct transport implementation using Android's WifiP2pManager.
 * Handles peer discovery, connection management, and socket-based communication.
 * 
 * This is a production implementation skeleton - actual Wi-Fi Direct integration
 * requires proper Android permissions and lifecycle handling.
 */
class WifiDirectTransport(
    private val context: Context,
    private val localNodeId: Int,
    private val port: Int = 8888,
    private val connectionTimeoutMs: Long = 10000
) : Transport {
    
    override val transportType: TransportType = TransportType.WIFI_DIRECT
    
    // Wi-Fi Direct manager
    private var wifiP2pManager: WifiP2pManager? = null
    private var wifiP2pChannel: Channel? = null
    private var broadcastReceiver: BroadcastReceiver? = null
    
    // Server socket for incoming connections
    private var serverSocket: ServerSocket? = null
    private val clientSockets = ConcurrentHashMap<Int, Socket>()
    private val clientOutputStreams = ConcurrentHashMap<Int, OutputStream>()
    private val clientInputStreams = ConcurrentHashMap<Int, InputStream>()
    
    // Connected peers
    private val connectedPeers = ConcurrentHashMap<Int, Device>()
    private val discoveredPeers = ConcurrentHashMap<Int, Device>()
    
    // Connection state tracking
    private val pendingConnections = ConcurrentHashMap<Int, CompletableDeferred<Device>>()
    
    // Channels
    private val incomingPacketsChannel = Channel<IncomingPacket>(500)
    private val discoveredDevicesChannel = Channel<Device>(200)
    private val connectionStateChannel = Channel<ConnectionStateEvent>(200)
    
    // State
    private val running = AtomicBoolean(false)
    private val discovering = AtomicBoolean(false)
    private val thisDevice = AtomicReference<WifiP2pDevice?>(null)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // Handler for main thread operations
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // Statistics
    private val packetsSent = AtomicLong(0)
    private val packetsReceived = AtomicLong(0)
    private val packetsDropped = AtomicLong(0)
    private val connectionFailures = AtomicLong(0)
    
    init {
        initializeWifiDirect()
    }
    
    private fun initializeWifiDirect() {
        wifiP2pManager = context.getSystemService(Context.WIFI_P2P_SERVICE) as WifiP2pManager?
        wifiP2pChannel = wifiP2pManager?.initialize(context, context.mainLooper, object : ChannelListener {
            override fun onChannelDisconnected() {
                Log.w("WifiDirectTransport", "Wi-Fi Direct channel disconnected")
            }
        })
        
        if (wifiP2pManager == null || wifiP2pChannel == null) {
            Log.e("WifiDirectTransport", "Wi-Fi Direct not available on this device")
        }
        
        // Register broadcast receiver for Wi-Fi Direct events
        registerBroadcastReceiver()
    }
    
    private fun registerBroadcastReceiver() {
        broadcastReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val action = intent.action
                when (action) {
                    WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION -> {
                        val state = intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1)
                        handleWifiStateChanged(state)
                    }
                    WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> {
                        requestPeers()
                    }
                    WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> {
                        handleConnectionChanged(intent)
                    }
                    WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION -> {
                        val device = intent.getParcelableExtra<WifiP2pDevice>(WifiP2pManager.EXTRA_WIFI_P2P_DEVICE_INFO)
                        device?.let { thisDevice.set(it) }
                    }
                }
            }
        }
        
        val intentFilter = IntentFilter().apply {
            addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION)
        }
        
        context.registerReceiver(broadcastReceiver, intentFilter)
    }
    
    private fun handleWifiStateChanged(state: Int) {
        val isEnabled = state == WifiP2pManager.WIFI_P2P_STATE_ENABLED
        Log.i("WifiDirectTransport", "Wi-Fi Direct state changed: ${if (isEnabled) "ENABLED" else "DISABLED"}")
    }
    
    private fun requestPeers() {
        wifiP2pManager?.requestPeers(wifiP2pChannel!!, object : PeerListListener {
            override fun onPeersAvailable(peerList: WifiP2pDeviceList) {
                handlePeersAvailable(peerList)
            }
        })
    }
    
    private fun handlePeersAvailable(peerList: WifiP2pDeviceList) {
        peerList.deviceList.forEach { wifiDevice ->
            val nodeId = deriveNodeId(wifiDevice.deviceName)
            val device = Device(
                nodeId = nodeId,
                deviceName = wifiDevice.deviceName ?: "Unknown",
                transportType = TransportType.WIFI_DIRECT,
                connectionState = if (wifiDevice.status == WifiP2pDevice.CONNECTED) {
                    com.itantra.core.model.ConnectionState.CONNECTED
                } else {
                    com.itantra.core.model.ConnectionState.DISCONNECTED
                }
            )
            
            if (wifiDevice.status == WifiP2pDevice.CONNECTED) {
                connectedPeers[nodeId] = device
            } else {
                discoveredPeers[nodeId] = device
            }
            
            discoveredDevicesChannel.trySend(device)
        }
    }
    
    private fun handleConnectionChanged(intent: Intent) {
        val networkInfo = intent.getParcelableExtra<android.net.NetworkInfo>(WifiP2pManager.EXTRA_NETWORK_INFO)
        val wifiP2pInfo = intent.getParcelableExtra<WifiP2pInfo>(WifiP2pManager.EXTRA_WIFI_P2P_INFO)
        
        if (networkInfo?.isConnected == true && wifiP2pInfo != null) {
            // Connected - request connection info
            wifiP2pManager?.requestConnectionInfo(wifiP2pChannel!!, object : ConnectionInfoListener {
                override fun onConnectionInfoAvailable(info: WifiP2pInfo) {
                    handleConnectionEstablished(info)
                }
            })
        } else {
            // Disconnected
            handleDisconnection()
        }
    }
    
    private fun handleConnectionEstablished(info: WifiP2pInfo) {
        val isGroupOwner = info.isGroupOwner
        val groupOwnerAddress = info.groupOwnerAddress?.hostAddress
        
        Log.i("WifiDirectTransport", "Connection established. Group owner: $isGroupOwner, Address: $groupOwnerAddress")
        
        if (isGroupOwner) {
            // Start server socket to accept connections
            startServerSocket()
        } else {
            // Connect to group owner
            groupOwnerAddress?.let { address ->
                connectToGroupOwner(address)
            }
        }
    }
    
    private fun handleDisconnection() {
        // Close all client sockets
        clientSockets.values.forEach { socket ->
            try { socket.close() } catch (e: IOException) { /* ignore */ }
        }
        clientSockets.clear()
        clientOutputStreams.clear()
        clientInputStreams.clear()
        
        // Update peer states
        connectedPeers.values.forEach { peer ->
            val disconnectedPeer = peer.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
            connectedPeers[peer.nodeId] = disconnectedPeer
            discoveredPeers[peer.nodeId] = disconnectedPeer
            
            connectionStateChannel.trySend(ConnectionStateEvent(
                device = disconnectedPeer,
                previousState = peer.connectionState,
                newState = com.itantra.core.model.ConnectionState.DISCONNECTED
            ))
        }
        connectedPeers.clear()
    }
    
    private fun startServerSocket() {
        scope.launch {
            try {
                serverSocket = ServerSocket(port)
                serverSocket?.setSoTimeout(0)
                
                while (running.get()) {
                    val clientSocket = serverSocket?.accept() ?: break
                    clientSocket.setSoTimeout(0)
                    
                    scope.launch {
                        handleClientConnection(clientSocket)
                    }
                }
            } catch (e: IOException) {
                Log.e("WifiDirectTransport", "Server socket error", e)
            }
        }
    }
    
    private fun connectToGroupOwner(address: String) {
        scope.launch {
            try {
                val socket = Socket()
                socket.connect(InetSocketAddress(address, port), connectionTimeoutMs.toInt())
                socket.setSoTimeout(0)
                
                handleClientConnection(socket)
            } catch (e: IOException) {
                Log.e("WifiDirectTransport", "Failed to connect to group owner", e)
                connectionFailures.incrementAndGet()
            }
        }
    }
    
    private fun handleClientConnection(socket: Socket) {
        val nodeId = deriveNodeId(socket.inetAddress.hostAddress)
        
        try {
            val inputStream = socket.getInputStream()
            val outputStream = socket.getOutputStream()
            
            clientSockets[nodeId] = socket
            clientOutputStreams[nodeId] = outputStream
            clientInputStreams[nodeId] = inputStream
            
            val peer = Device(
                nodeId = nodeId,
                deviceName = "Peer-$nodeId",
                transportType = TransportType.WIFI_DIRECT,
                connectionState = com.itantra.core.model.ConnectionState.CONNECTED
            )
            
            val previousState = connectedPeers[nodeId]?.connectionState ?: com.itantra.core.model.ConnectionState.DISCONNECTED
            connectedPeers[nodeId] = peer
            discoveredPeers[nodeId] = peer
            
            connectionStateChannel.trySend(ConnectionStateEvent(
                device = peer,
                previousState = previousState,
                newState = com.itantra.core.model.ConnectionState.CONNECTED
            ))
            
            // Read packets from this client
            scope.launch {
                readPacketsFromClient(nodeId, inputStream)
            }
            
        } catch (e: IOException) {
            Log.e("WifiDirectTransport", "Error handling client connection", e)
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
                    Log.w("WifiDirectTransport", "Packet too large: $packetLength")
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
                
                // Parse packet (this would use PacketSerializer in production)
                // For now, just forward raw bytes
                val packet = Packet(
                    messageId = 0, // Will be parsed
                    sourceNodeId = nodeId,
                    destinationNodeId = localNodeId,
                    channelId = "WIFI_DIRECT",
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
                    Log.w("WifiDirectTransport", "Read error from node $nodeId", e)
                }
                break
            } catch (e: Exception) {
                Log.e("WifiDirectTransport", "Unexpected error reading from node $nodeId", e)
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
            val disconnectedPeer = p.copy(connectionState = com.itantra.core.model.ConnectionState.DISCONNECTED)
            connectedPeers[nodeId] = disconnectedPeer
            discoveredPeers[nodeId] = disconnectedPeer
            
            connectionStateChannel.trySend(ConnectionStateEvent(
                device = disconnectedPeer,
                previousState = p.connectionState,
                newState = com.itantra.core.model.ConnectionState.DISCONNECTED
            ))
        }
    }
    
    private fun deriveNodeId(name: String?): Int {
        // Derive node ID from device name or address
        // In production, this would use a proper handshake protocol
        return name?.hashCode()?.abs()?.rem(0xFFFE)?.plus(1) ?: (Math.random() * 0xFFFE).toInt() + 1
    }
    
    // ==================== Transport Interface Implementation ====================
    
    override suspend fun start(): TransportResult {
        if (running.get()) return TransportResult.success("Already running")
        if (wifiP2pManager == null) return TransportResult.failure(TransportError.NOT_AVAILABLE, "Wi-Fi Direct not available")
        
        running.set(true)
        
        // Start server socket for incoming connections
        scope.launch { startServerSocket() }
        
        return TransportResult.success("Wi-Fi Direct transport started")
    }
    
    override suspend fun stop(): TransportResult {
        running.set(false)
        discovering.set(false)
        
        // Close server socket
        serverSocket?.close()
        serverSocket = null
        
        // Close all client sockets
        clientSockets.values.forEach { it.close() }
        clientSockets.clear()
        clientOutputStreams.clear()
        clientInputStreams.clear()
        
        // Disconnect Wi-Fi Direct
        wifiP2pManager?.removeGroup(wifiP2pChannel!!, object : WifiP2pManager.ActionListener {
            override fun onSuccess() { Log.i("WifiDirectTransport", "Group removed") }
            override fun onFailure(reason: Int) { Log.w("WifiDirectTransport", "Failed to remove group: $reason") }
        })
        
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
        
        return TransportResult.success("Wi-Fi Direct transport stopped")
    }
    
    override suspend fun discover(): TransportResult {
        if (!running.get()) return TransportResult.failure(TransportError.NOT_RUNNING, "Transport not running")
        if (!wifiP2pManager!!.isWifiP2pEnabled) return TransportResult.failure(TransportError.NOT_AVAILABLE, "Wi-Fi P2P not enabled")
        
        discovering.set(true)
        
        return suspendCancellableCoroutine { cont ->
            wifiP2pManager?.discoverPeers(wifiP2pChannel!!, object : WifiP2pManager.ActionListener {
                override fun onSuccess() {
                    cont.resume(TransportResult.success("Discovery started"))
                }
                override fun onFailure(reason: Int) {
                    discovering.set(false)
                    cont.resume(TransportResult.failure(TransportError.DISCOVERY_FAILED, "Discovery failed: $reason"))
                }
            })
        }
    }
    
    override suspend fun stopDiscovery(): TransportResult {
        discovering.set(false)
        wifiP2pManager?.stopPeerDiscovery(wifiP2pChannel!!, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {}
            override fun onFailure(reason: Int) {}
        })
        return TransportResult.success("Discovery stopped")
    }
    
    override suspend fun connect(device: Device): TransportResult {
        if (!running.get()) return TransportResult.failure(TransportError.NOT_RUNNING, "Transport not running")
        
        val wifiDevice = discoveredPeers[device.nodeId]?.let { 
            // Find actual WifiP2pDevice - simplified
            null 
        }
        
        if (wifiDevice == null) {
            return TransportResult.failure(TransportError.PEER_NOT_FOUND, "Peer not discovered")
        }
        
        val config = WifiP2pConfig().apply {
            // deviceAddress would be set from WifiP2pDevice
        }
        
        return suspendCancellableCoroutine { cont ->
            wifiP2pManager?.connect(wifiP2pChannel!!, config, object : WifiP2pManager.ActionListener {
                override fun onSuccess() {
                    // Connection initiated, actual result comes via broadcast
                    val pending = CompletableDeferred<Device>()
                    pendingConnections[device.nodeId] = pending
                    
                    scope.launch {
                        try {
                            val connectedDevice = pending.await()
                            cont.resume(TransportResult.success("Connected to ${connectedDevice.deviceName}"))
                        } catch (e: Exception) {
                            cont.resume(TransportResult.failure(TransportError.CONNECTION_FAILED, e.message ?: "Connection failed"))
                        }
                    }
                }
                override fun onFailure(reason: Int) {
                    connectionFailures.incrementAndGet()
                    cont.resume(TransportResult.failure(TransportError.CONNECTION_FAILED, "Connect failed: $reason"))
                }
            })
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
        
        wifiP2pManager?.removeGroup(wifiP2pChannel!!, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {}
            override fun onFailure(reason: Int) {}
        })
        
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
            // Serialize packet (simplified - use PacketSerializer in production)
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
            Log.e("WifiDirectTransport", "Send failed to ${device.deviceName}", e)
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
    
    override fun isAvailable(): Boolean = wifiP2pManager != null
    
    override val isRunning: Boolean
        get() = running.get()
    
    override fun getConnectedPeers(): List<Device> {
        return connectedPeers.values.filter { it.connectionState == com.itantra.core.model.ConnectionState.CONNECTED }.toList()
    }
    
    override fun getDiscoveredPeers(): List<Device> {
        return discoveredPeers.values.filter { it.connectionState != com.itantra.core.model.ConnectionState.CONNECTED }.toList()
    }
    
    fun getStats(): WifiDirectStats {
        return WifiDirectStats(
            packetsSent = packetsSent.get(),
            packetsReceived = packetsReceived.get(),
            packetsDropped = packetsDropped.get(),
            connectionFailures = connectionFailures.get(),
            connectedPeers = connectedPeers.size,
            discoveredPeers = discoveredPeers.size,
            isGroupOwner = thisDevice.get()?.isGroupOwner == true
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
    
    data class WifiDirectStats(
        val packetsSent: Long,
        val packetsReceived: Long,
        val packetsDropped: Long,
        val connectionFailures: Long,
        val connectedPeers: Int,
        val discoveredPeers: Int,
        val isGroupOwner: Boolean
    )
}