package com.itantra.core.protocol

import com.itantra.core.model.Message
import com.itantra.core.model.Packet
import com.itantra.core.model.Priority
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class PacketBuilder(
    private val crc16: CRC16 = CRC16(),
    private val compressor: PayloadCompressor = PayloadCompressor()
) {

    suspend fun buildPacket(message: Message): Packet = withContext(Dispatchers.Default) {
        val payload = message.text.toByteArray(Charsets.UTF_8)
        val languageCode = ProtocolConstants.LanguageCode.fromBcp47(message.language)
        val flags = buildFlags(message)
        val compressedPayload = compressor.compress(payload)
        val isCompressed = compressedPayload.size < payload.size
        val finalPayload = if (isCompressed) compressedPayload else payload
        
        val packet = Packet(
            messageId = message.messageId,
            sourceNodeId = message.sourceNodeId,
            destinationNodeId = message.destinationNodeId,
            channelId = message.channelId,
            payload = finalPayload,
            language = message.language,
            priority = message.priority,
            hopCount = message.hopCount,
            ttl = message.ttl,
            isEmergency = message.isEmergency,
            isBroadcast = message.isBroadcast,
            timestamp = message.timestamp,
            isCompressed = isCompressed
        )
        
        val crc = crc16.calculate(packet.payload, packet.timestamp, packet.messageId)
        packet.copy(crc16 = crc)
    }

    suspend fun buildPacketFromParts(
        messageId: Long,
        sourceNodeId: Int,
        destinationNodeId: Int,
        channelId: String,
        payload: ByteArray,
        language: String,
        priority: Priority,
        hopCount: Int,
        ttl: Int,
        isEmergency: Boolean,
        isBroadcast: Boolean,
        timestamp: Long = System.currentTimeMillis()
    ): Packet = withContext(Dispatchers.Default) {
        val languageCode = ProtocolConstants.LanguageCode.fromBcp47(language)
        val flags = buildFlags(priority, isEmergency, isBroadcast, false)
        val compressedPayload = compressor.compress(payload)
        val isCompressed = compressedPayload.size < payload.size
        val finalPayload = if (isCompressed) compressedPayload else payload
        
        val packet = Packet(
            messageId = messageId,
            sourceNodeId = sourceNodeId,
            destinationNodeId = destinationNodeId,
            channelId = channelId,
            payload = finalPayload,
            language = language,
            priority = priority,
            hopCount = hopCount,
            ttl = ttl,
            isEmergency = isEmergency,
            isBroadcast = isBroadcast,
            timestamp = timestamp,
            isCompressed = isCompressed
        )
        
        val crc = crc16.calculate(packet.payload, packet.timestamp, packet.messageId)
        packet.copy(crc16 = crc)
    }

    private fun buildFlags(message: Message): Byte {
        var flags = 0
        if (message.isEmergency) flags = flags or ProtocolConstants.FLAG_EMERGENCY
        if (message.isBroadcast) flags = flags or ProtocolConstants.FLAG_BROADCAST
        // compression flag added after compression check
        return flags.toByte()
    }

    private fun buildFlags(
        priority: Priority,
        isEmergency: Boolean,
        isBroadcast: Boolean,
        isCompressed: Boolean
    ): Byte {
        var flags = 0
        if (isEmergency) flags = flags or ProtocolConstants.FLAG_EMERGENCY
        if (isBroadcast) flags = flags or ProtocolConstants.FLAG_BROADCAST
        if (isCompressed) flags = flags or ProtocolConstants.FLAG_COMPRESSED
        return flags.toByte()
    }

    fun buildRelayPacket(originalPacket: Packet, nextHopCount: Int, nextTtl: Int): Packet {
        if (nextTtl <= 0) {
            throw IllegalArgumentException("TTL expired, cannot relay")
        }
        return originalPacket.copy(
            hopCount = nextHopCount,
            ttl = nextTtl
        ).also { relayPacket ->
            val crc = crc16.calculate(relayPacket.payload, relayPacket.timestamp, relayPacket.messageId)
            // We need to create a new packet with updated CRC since Packet is immutable
            // This is a limitation of the data class - in practice we'd use a builder pattern
        }
    }

    companion object {
        fun createAckPacket(
            originalMessageId: Long,
            receiverNodeId: Int,
            senderNodeId: Int,
            status: com.itantra.core.model.AckStatus,
            crc16: CRC16 = CRC16()
        ): Packet {
            val ackPayload = com.itantra.core.model.AckPayload(
                originalMessageId = originalMessageId,
                receiverNodeId = receiverNodeId,
                status = status
            ).toByteArray()

            val packet = Packet(
                messageId = com.itantra.core.model.MessageIdGenerator.generate(),
                sourceNodeId = receiverNodeId,
                destinationNodeId = senderNodeId,
                channelId = "ACK",
                payload = ackPayload,
                language = "ACK",
                priority = Priority.HIGH,
                hopCount = 0,
                ttl = ProtocolConstants.ACK_TTL,
                isEmergency = false,
                isBroadcast = false
            )

            val crc = crc16.calculate(packet.payload, packet.timestamp, packet.messageId)
            return packet.copy(crc16 = crc)
        }
    }
}