package com.itantra.engine

import android.content.Context
import android.util.Log
import com.itantra.core.communication.BluetoothTransport
import com.itantra.core.communication.MockTransport
import com.itantra.core.communication.Transport
import com.itantra.core.communication.TransportManager
import com.itantra.core.communication.WifiDirectTransport
import com.itantra.core.mesh.MeshRouter
import com.itantra.core.model.ConnectionState
import com.itantra.core.model.Device
import com.itantra.core.model.EmergencyType
import com.itantra.core.model.Message
import com.itantra.core.model.MessageStatus
import com.itantra.core.model.NodeIdManager
import com.itantra.core.model.Priority
import com.itantra.core.model.TransportType
import com.itantra.core.protocol.PacketBuilder
import com.itantra.core.reliability.ReliabilityModule
import com.itantra.data.PersistenceManager
import com.itantra.data.entity.MessageEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Single facade used by the React Native module.
 * Real Wi-Fi Direct / Bluetooth are used when available; otherwise MockTransport
 * (explicit DEMO MODE) is used so mesh logic can still be demonstrated.
 */
class ITantraEngine(
    private val context: Context,
    private val emit: (type: String, payload: JSONObject) -> Unit
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val packetBuilder = PacketBuilder()
    private val reliability = ReliabilityModule(packetBuilder)

    private var nodeId: Int = 0
    private lateinit var transportManager: TransportManager
    private lateinit var meshRouter: MeshRouter

    private lateinit var persistence: PersistenceManager

    private val devices = ConcurrentHashMap<Int, Device>()
    private val recording = AtomicBoolean(false)
    private val initialized = AtomicBoolean(false)
    private val demoMode = AtomicBoolean(true)

    private val packetsSent = AtomicLong(0)
    private val packetsReceived = AtomicLong(0)
    private val packetsRelayed = AtomicLong(0)
    private val packetsDropped = AtomicLong(0)
    private val acks = AtomicLong(0)
    private val retries = AtomicLong(0)
    private val pending = AtomicLong(0)
    private val lastTx = AtomicLong(0)
    private val lastRx = AtomicLong(0)

    fun isInitialized(): Boolean = initialized.get()
    fun isDemoMode(): Boolean = demoMode.get()
    fun nodeId(): Int = nodeId

    suspend fun initialize() {
        if (initialized.get()) {
            emitReady()
            return
        }

        nodeId = NodeIdManager.init(context)
        meshRouter = MeshRouter(nodeId)

        persistence = PersistenceManager.getInstance(context)
        persistence.seedDefaultChannels()

        val mockPeers = listOf(
            Device(101, "FIELD NODE 01", TransportType.MOCK),
            Device(102, "FIELD NODE 02", TransportType.MOCK),
            Device(103, "FIELD NODE 03", TransportType.MOCK)
        )
        val mock = MockTransport(nodeId, mockPeers)
        val transports = mutableListOf<Transport>(mock)

        try {
            val wifi = WifiDirectTransport(context, nodeId)
            if (wifi.isAvailable()) transports.add(0, wifi)
        } catch (err: Exception) {
            Log.w(TAG, "Wi-Fi Direct unavailable: ${err.message}")
        }

        try {
            val bt = BluetoothTransport(context, nodeId)
            if (bt.isAvailable()) transports.add(if (transports.size > 1) 1 else 0, bt)
        } catch (err: Exception) {
            Log.w(TAG, "Bluetooth unavailable: ${err.message}")
        }

        transportManager = TransportManager(transports)
        transportManager.startAll()

        val primary = transportManager.getPrimaryTransport()?.transportType ?: TransportType.MOCK
        demoMode.set(primary == TransportType.MOCK)

        listenForTransportEvents()
        initialized.set(true)
        emitReady()
    }

    suspend fun startDiscovery() {
        ensureInit()
        emit("networkChanged", networkPayload("DISCOVERING"))
        transportManager.discoverAll()

        if (demoMode.get()) {
            delay(1200)
            val toConnect = devices.values.filter {
                it.connectionState != ConnectionState.CONNECTED
            }
            toConnect.forEach { device ->
                try {
                    transportManager.connect(device)
                } catch (err: Exception) {
                    Log.w(TAG, "Demo auto-connect failed: ${err.message}")
                }
            }
        }
    }

    suspend fun stopDiscovery() {
        ensureInit()
        transportManager.stopDiscoveryAll()
        emit("networkChanged", networkPayload(currentConnectionLabel()))
    }

    suspend fun connectDevice(id: String) {
        ensureInit()
        val device = findDevice(id) ?: throw IllegalArgumentException("Unknown device $id")
        emit("connectionChanged", JSONObject().put("status", "CONNECTING").put("deviceId", id))
        val result = transportManager.connect(device)
        if (result is com.itantra.core.communication.TransportResult.Failure) {
            emit("connectionChanged", JSONObject().put("status", "DISCONNECTED").put("deviceId", id).put("error", result.message))
            throw IllegalStateException(result.message)
        }
    }

    suspend fun disconnectDevice(id: String) {
        ensureInit()
        val device = findDevice(id) ?: return
        transportManager.disconnect(device)
    }

    suspend fun disconnectAll() {
        if (!initialized.get()) return
        transportManager.getAllConnectedPeers().forEach { transportManager.disconnect(it) }
        emit("connectionChanged", JSONObject().put("status", "DISCONNECTED"))
    }

    fun startRecording() {
        if (!recording.compareAndSet(false, true)) return
        emit("recordingStarted", JSONObject().put("hasAmplitude", false).put("ai", "MOCK"))
    }

    suspend fun stopRecording(): String {
        if (!recording.compareAndSet(true, false)) return ""
        emit("recordingStopped", JSONObject())
        emit("transcriptionStarted", JSONObject().put("ai", "MOCK"))
        delay(700)
        val text = "Water level is rising near the bridge. Please move to a safe zone."
        emit("transcriptionCompleted", JSONObject().put("text", text).put("ai", "MOCK"))
        return text
    }

    suspend fun sendText(
        text: String,
        language: String,
        channelId: String,
        emergency: Boolean,
        destinationId: String?
    ): JSONObject {
        ensureInit()
        val dest = destinationId?.toIntOrNull() ?: 0xFFFF
        val message = Message.createTextMessage(
            text = text,
            language = language,
            channelId = channelId,
            destinationNodeId = dest,
            priority = if (emergency) Priority.EMERGENCY else Priority.NORMAL,
            isEmergency = emergency
        )
        return transmit(message)
    }

    suspend fun sendAlert(type: String): JSONObject {
        ensureInit()
        val emergency = EmergencyType.values().firstOrNull {
            it.name.equals(type, true) || it.label.equals(type, true)
        } ?: EmergencyType.GENERAL_WARNING
        val message = Message.createEmergencyAlert(
            alertType = emergency,
            text = "${emergency.label} alert. Take protective action now.",
            language = "en-IN",
            channelId = "ch_3_10"
        )
        return transmit(message)
    }

    suspend fun sendSOS(): JSONObject = sendAlert("SOS")

    fun getNetworkStatus(): JSONObject = networkPayload(currentConnectionLabel())

    fun getDiagnostics(): JSONObject {
        val stats = if (initialized.get()) transportManager.getStats() else null
        val msgCount = runCatching { if (::persistence.isInitialized) persistence.messageRepository.count() else 0 }.getOrDefault(0)
        val deviceCount = runCatching { if (::persistence.isInitialized) persistence.deviceRepository.getAll().size else 0 }.getOrDefault(0)
        return JSONObject()
            .put("nodeId", nodeId)
            .put("demoMode", demoMode.get())
            .put("transport", stats?.primaryTransport?.name ?: "NONE")
            .put("initialized", initialized.get())
            .put("connectedPeers", if (initialized.get()) transportManager.getAllConnectedPeers().size else 0)
            .put("discoveredPeers", if (initialized.get()) transportManager.getAllDiscoveredPeers().size else 0)
            .put("packetsSent", packetsSent.get())
            .put("packetsReceived", packetsReceived.get())
            .put("packetsRelayed", packetsRelayed.get())
            .put("packetsDropped", packetsDropped.get())
            .put("acks", acks.get())
            .put("retries", retries.get())
            .put("pending", pending.get())
            .put("lastTransmission", lastTx.get())
            .put("lastReceived", lastRx.get())
            .put("aiStatus", "MOCK")
            .put("databaseStatus", if (::persistence.isInitialized) "READY" else "NOT_AVAILABLE")
            .put("storedMessages", msgCount)
            .put("storedDevices", deviceCount)
    }

    fun getMessages(channelId: String? = null): JSONArray {
        val messages = runCatching {
            if (::persistence.isInitialized) {
                if (channelId.isNullOrBlank()) persistence.messageRepository.getAll()
                else persistence.messageRepository.getByChannel(channelId)
            } else emptyList()
        }.getOrDefault(emptyList())
        val arr = JSONArray()
        messages.forEach { arr.put(messageJson(it)) }
        return arr
    }

    fun getDevicesJson(): JSONArray {
        val arr = JSONArray()
        devices.values.forEach { arr.put(deviceJson(it)) }
        return arr
    }

    fun shutdown() {
        if (!initialized.get()) return
        transportManager.shutdown()
        initialized.set(false)
    }

    private suspend fun transmit(message: Message): JSONObject {
        pending.incrementAndGet()
        val packet = packetBuilder.buildPacket(message)
        // Persist outbound message as SENDING
        runCatching {
            persistence.messageRepository.save(message.copyWithStatus(MessageStatus.SENDING))
        }
        emit("packetCreated", JSONObject()
            .put("messageId", message.messageId.toString())
            .put("channelId", message.channelId)
            .put("emergency", message.isEmergency)
            .put("hopCount", packet.hopCount)
        )
        emit("messageSending", JSONObject().put("messageId", message.messageId.toString()))

        val sent = transportManager.broadcast(packet)
        packetsSent.addAndGet(sent.toLong())
        lastTx.set(System.currentTimeMillis())
        pending.decrementAndGet()

        if (sent > 0) {
            runCatching {
                persistence.messageRepository.updateStatus(message.messageId, MessageStatus.DELIVERED)
            }
        } else {
            runCatching {
                persistence.messageRepository.updateStatus(message.messageId, MessageStatus.FAILED)
            }
        }

        val payload = JSONObject()
            .put("messageId", message.messageId.toString())
            .put("text", message.text)
            .put("language", message.language)
            .put("channelId", message.channelId)
            .put("priority", message.priority.name)
            .put("emergency", message.isEmergency)
            .put("from", "NODE $nodeId")
            .put("to", if (message.isBroadcast) "BROADCAST" else message.destinationNodeId.toString())
            .put("hops", packet.hopCount)
            .put("timestamp", message.timestamp)

        if (sent > 0) {
            acks.incrementAndGet()
            emit("ackReceived", JSONObject().put("messageId", message.messageId.toString()).put("peers", sent))
            emit("messageDelivered", payload.put("status", "DELIVERED").put("peers", sent))
        } else {
            emit("messageFailed", payload.put("status", "FAILED").put("error", "No connected peers"))
        }
        return payload
    }

    private fun listenForTransportEvents() {
        scope.launch {
            for (device in transportManager.discoveredDevices()) {
                devices[device.nodeId] = device
                runCatching { persistence.deviceRepository.save(device) }
                emit("deviceDiscovered", deviceJson(device))
                emit("networkChanged", networkPayload(currentConnectionLabel()))
            }
        }
        scope.launch {
            for (event in transportManager.connectionState()) {
                devices[event.device.nodeId] = event.device
                runCatching { persistence.deviceRepository.save(event.device) }
                val status = when (event.newState) {
                    ConnectionState.CONNECTED -> "CONNECTED"
                    ConnectionState.CONNECTING -> "CONNECTING"
                    ConnectionState.FAILED -> "DISCONNECTED"
                    else -> "DISCONNECTED"
                }
                emit(
                    "connectionChanged",
                    JSONObject()
                        .put("status", status)
                        .put("deviceId", event.device.nodeId.toString())
                        .put("device", deviceJson(event.device))
                )
                if (event.newState == ConnectionState.DISCONNECTED) {
                    emit("deviceLost", JSONObject().put("deviceId", event.device.nodeId.toString()))
                }
                emit("networkChanged", networkPayload(currentConnectionLabel()))
            }
        }
        scope.launch {
            for (incoming in transportManager.incomingPackets()) {
                packetsReceived.incrementAndGet()
                lastRx.set(System.currentTimeMillis())
                val text = runCatching { String(incoming.packet.payload, Charsets.UTF_8) }.getOrDefault("")
                val message = MessageEntity(
                    messageId = incoming.packet.messageId,
                    sourceNodeId = incoming.packet.sourceNodeId,
                    destinationNodeId = incoming.packet.destinationNodeId,
                    channelId = incoming.packet.channelId,
                    text = text,
                    language = incoming.packet.language,
                    timestamp = incoming.packet.timestamp,
                    priority = incoming.packet.priority,
                    status = MessageStatus.RECEIVED,
                    hopCount = incoming.packet.hopCount,
                    ttl = incoming.packet.ttl,
                    isEmergency = incoming.packet.isEmergency,
                    isBroadcast = incoming.packet.isBroadcast,
                    receivedAt = incoming.receivedAt,
                    translatedText = null,
                    translatedLanguage = null
                )
                runCatching { persistence.messageRepository.saveEntity(message) }
                emit(
                    "messageReceived",
                    JSONObject()
                        .put("messageId", incoming.packet.messageId.toString())
                        .put("text", text)
                        .put("from", incoming.fromDevice.deviceName)
                        .put("fromId", incoming.fromDevice.nodeId.toString())
                        .put("transport", incoming.transportType.name)
                        .put("hops", incoming.packet.hopCount)
                        .put("emergency", incoming.packet.isEmergency)
                        .put("channelId", incoming.packet.channelId)
                        .put("language", incoming.packet.language)
                        .put("timestamp", incoming.receivedAt)
                )
                if (incoming.packet.isEmergency) {
                    emit("emergencyReceived", JSONObject().put("messageId", incoming.packet.messageId.toString()))
                }
            }
        }
    }

    private fun emitReady() {
        emit(
            "backendReady",
            JSONObject()
                .put("nodeId", nodeId)
                .put("demoMode", demoMode.get())
                .put("transport", transportManager.getPrimaryTransport()?.transportType?.name ?: "MOCK")
        )
        emit("networkChanged", networkPayload(currentConnectionLabel()))
    }

    private fun currentConnectionLabel(): String {
        if (!initialized.get()) return "OFFLINE"
        val connected = transportManager.getAllConnectedPeers().size
        return when {
            connected > 0 -> "CONNECTED"
            transportManager.isAnyRunning -> "DISCOVERING"
            else -> "OFFLINE"
        }
    }

    private fun networkPayload(status: String): JSONObject {
        val connected = if (initialized.get()) transportManager.getAllConnectedPeers().size else 0
        val discovered = if (initialized.get()) transportManager.getAllDiscoveredPeers().size else 0
        return JSONObject()
            .put("status", status)
            .put("nodeId", nodeId)
            .put("demoMode", demoMode.get())
            .put("transport", if (initialized.get()) transportManager.getPrimaryTransport()?.transportType?.name ?: "NONE" else "NONE")
            .put("peers", connected)
            .put("discovered", discovered)
            .put("pending", pending.get())
            .put("lastTransmission", lastTx.get())
            .put("lastReceived", lastRx.get())
    }

    private fun deviceJson(device: Device): JSONObject {
        return JSONObject()
            .put("id", device.nodeId.toString())
            .put("name", device.deviceName)
            .put("nodeId", device.nodeId.toString())
            .put("transport", device.transportType.name)
            .put("connectionState", device.connectionState.name)
            .put("signalStrength", device.signalStrength)
            .put("lastSeen", device.lastSeen)
    }

    private fun messageJson(message: Message): JSONObject {
        return JSONObject()
            .put("messageId", message.messageId.toString())
            .put("sourceNodeId", message.sourceNodeId)
            .put("destinationNodeId", message.destinationNodeId)
            .put("channelId", message.channelId)
            .put("text", message.text)
            .put("language", message.language)
            .put("timestamp", message.timestamp)
            .put("priority", message.priority.name)
            .put("status", message.status.name)
            .put("hopCount", message.hopCount)
            .put("ttl", message.ttl)
            .put("emergency", message.isEmergency)
            .put("broadcast", message.isBroadcast)
            .put("receivedAt", message.receivedAt ?: JSONObject.NULL)
            .put("translatedText", message.translatedText ?: JSONObject.NULL)
            .put("translatedLanguage", message.translatedLanguage ?: JSONObject.NULL)
            .put("incoming", message.isIncoming)
            .put("self", message.isSelfMessage)
    }

    private fun findDevice(id: String): Device? {
        val nid = id.toIntOrNull()
        return devices[nid] ?: transportManager.getAllDiscoveredPeers().find { it.nodeId.toString() == id }
            ?: transportManager.getAllConnectedPeers().find { it.nodeId.toString() == id }
    }

    private fun ensureInit() {
        check(initialized.get()) { "Engine not initialized" }
    }

    companion object {
        private const val TAG = "ITantraEngine"
    }
}
