package com.itantra.core.model

import com.itantra.core.protocol.ProtocolConstants
import kotlinx.serialization.Serializable

@Serializable
data class Packet(
    val messageId: Long,
    val sourceNodeId: Int,
    val destinationNodeId: Int,
    val channelId: String,
    val payload: ByteArray,
    val language: String,
    val priority: Priority = Priority.NORMAL,
    val hopCount: Int = 0,
    val ttl: Int = 8,
    val isEmergency: Boolean = false,
    val isBroadcast: Boolean = false,
    val timestamp: Long = System.currentTimeMillis(),
    val isCompressed: Boolean = false,
    val crc16: Int = 0
) {
    val payloadLength: Int
        get() = payload.size

    val totalSize: Int
        get() = ProtocolConstants.HEADER_SIZE + payloadLength

    fun copyWithHopCount(newHopCount: Int): Packet = copy(hopCount = newHopCount)
    fun copyWithTtl(newTtl: Int): Packet = copy(ttl = newTtl)
    fun copyWithCrc(crc: Int): Packet = copy(crc16 = crc)
    fun copyAsCompressed(compressedPayload: ByteArray): Packet = copy(
        payload = compressedPayload,
        isCompressed = true
    )

    fun isExpired(): Boolean = ttl <= 0
    fun isDestination(nodeId: Int): Boolean = destinationNodeId == nodeId || isBroadcast
    fun isSource(nodeId: Int): Boolean = sourceNodeId == nodeId

    companion object {
        fun createAckPacket(
            originalMessageId: Long,
            receiverNodeId: Int,
            senderNodeId: Int,
            status: AckStatus
        ): Packet {
            val ackPayload = AckPayload(
                originalMessageId = originalMessageId,
                receiverNodeId = receiverNodeId,
                status = status
            ).toByteArray()
            return Packet(
                messageId = MessageIdGenerator.generate(),
                sourceNodeId = receiverNodeId,
                destinationNodeId = senderNodeId,
                channelId = "ACK",
                payload = ackPayload,
                language = "ACK",
                priority = Priority.HIGH,
                hopCount = 0,
                ttl = 1,
                isEmergency = false,
                isBroadcast = false
            )
        }
    }
}

@Serializable
data class AckPayload(
    val originalMessageId: Long,
    val receiverNodeId: Int,
    val status: AckStatus
) {
    fun toByteArray(): ByteArray {
        val buffer = ByteArray(12)
        buffer[0] = (originalMessageId shr 56).toByte()
        buffer[1] = (originalMessageId shr 48).toByte()
        buffer[2] = (originalMessageId shr 40).toByte()
        buffer[3] = (originalMessageId shr 32).toByte()
        buffer[4] = (originalMessageId shr 24).toByte()
        buffer[5] = (originalMessageId shr 16).toByte()
        buffer[6] = (originalMessageId shr 8).toByte()
        buffer[7] = originalMessageId.toByte()
        buffer[8] = (receiverNodeId shr 8).toByte()
        buffer[9] = receiverNodeId.toByte()
        buffer[10] = status.value.toByte()
        buffer[11] = 0 // reserved
        return buffer
    }

    companion object {
        fun fromByteArray(data: ByteArray): AckPayload? {
            if (data.size < 12) return null
            val originalMessageId = ((data[0].toLong() and 0xFF) shl 56) or
                ((data[1].toLong() and 0xFF) shl 48) or
                ((data[2].toLong() and 0xFF) shl 40) or
                ((data[3].toLong() and 0xFF) shl 32) or
                ((data[4].toLong() and 0xFF) shl 24) or
                ((data[5].toLong() and 0xFF) shl 16) or
                ((data[6].toLong() and 0xFF) shl 8) or
                (data[7].toLong() and 0xFF)
            val receiverNodeId = ((data[8].toInt() and 0xFF) shl 8) or (data[9].toInt() and 0xFF)
            val status = AckStatus.fromValue(data[10].toInt())
            return AckPayload(originalMessageId, receiverNodeId, status)
        }
    }
}

enum class AckStatus(val value: Int, val label: String) {
    DELIVERED(0, "Delivered"),
    DUPLICATE(1, "Duplicate"),
    REJECTED(2, "Rejected"),
    EXPIRED(3, "Expired");

    companion object {
        fun fromValue(value: Int): AckStatus = values().firstOrNull { it.value == value } ?: REJECTED
    }
}

@Serializable
data class IncomingPacket(
    val packet: Packet,
    val fromDevice: Device,
    val receivedAt: Long = System.currentTimeMillis(),
    val rssi: Int? = null
)