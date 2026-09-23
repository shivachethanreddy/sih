package com.itantra.core.protocol

import com.itantra.core.model.LanguageCode
import com.itantra.core.model.Packet
import com.itantra.core.model.Priority

/**
 * Serializes and deserializes packets to/from byte arrays.
 * This is the low-level binary format handler.
 */
class PacketSerializer(
    private val crc16: CRC16 = CRC16(),
    private val compressor: PayloadCompressor = PayloadCompressor()
) {

    /**
     * Serialize a packet to a byte array.
     * Calculates and includes CRC.
     */
    fun serialize(packet: Packet): ByteArray {
        val payload = if (packet.isCompressed) {
            packet.payload
        } else {
            packet.payload
        }

        val payloadLength = payload.size
        if (payloadLength > ProtocolConstants.MAX_PAYLOAD_SIZE) {
            throw IllegalArgumentException("Payload too large: $payloadLength > ${ProtocolConstants.MAX_PAYLOAD_SIZE}")
        }

        val buffer = ByteArray(ProtocolConstants.HEADER_SIZE + payloadLength)
        var offset = 0

        // Magic byte
        buffer[offset++] = ProtocolConstants.MAGIC_BYTE

        // Version
        buffer[offset++] = ProtocolConstants.PROTOCOL_VERSION

        // Priority
        buffer[offset++] = when (packet.priority) {
            Priority.NORMAL -> 0
            Priority.HIGH -> 1
            Priority.EMERGENCY -> 2
        }.toByte()

        // Hop count
        buffer[offset++] = (packet.hopCount and 0xFF).toByte()

        // TTL
        buffer[offset++] = (packet.ttl and 0xFF).toByte()

        // Message ID (8 bytes, big-endian)
        writeLong(buffer, offset, packet.messageId)
        offset += 8

        // Timestamp (8 bytes, big-endian)
        writeLong(buffer, offset, packet.timestamp)
        offset += 8

        // Source node ID (2 bytes, big-endian)
        writeUShort(buffer, offset, packet.sourceNodeId)
        offset += 2

        // Destination node ID (2 bytes, big-endian)
        writeUShort(buffer, offset, packet.destinationNodeId)
        offset += 2

        // Language code
        val languageCode = LanguageCode.fromBcp47(packet.language).code
        buffer[offset++] = (languageCode and 0xFF).toByte()

        // Flags
        var flags = 0
        if (packet.isEmergency) flags = flags or ProtocolConstants.FLAG_EMERGENCY
        if (packet.isBroadcast) flags = flags or ProtocolConstants.FLAG_BROADCAST
        if (packet.isCompressed) flags = flags or ProtocolConstants.FLAG_COMPRESSED
        buffer[offset++] = (flags and 0xFF).toByte()

        // Payload length (2 bytes, big-endian)
        writeUShort(buffer, offset, payloadLength)
        offset += 2

        // CRC16 placeholder (2 bytes) - will be calculated and written at the end
        val crcOffset = offset
        offset += 2

        // Payload
        payload.copyInto(buffer, offset)

        // Calculate and write CRC
        val crc = crc16.calculate(payload, packet.timestamp, packet.messageId)
        writeUShort(buffer, crcOffset, crc)

        return buffer
    }

    /**
     * Deserialize a packet from a byte array.
     * Returns the packet and any remaining bytes.
     */
    fun deserialize(data: ByteArray): Packet? {
        val parser = PacketParser(crc16, compressor)
        val result = parser.parse(data)
        return when (result) {
            is ParseResult.Success -> result.packet
            is ParseResult.Failure -> {
                // Log error in production
                null
            }
        }
    }

    private fun writeLong(buffer: ByteArray, offset: Int, value: Long) {
        for (i in 7 downTo 0) {
            buffer[offset + i] = (value and 0xFF).toByte()
            value = value shr 8
        }
    }

    private fun writeUShort(buffer: ByteArray, offset: Int, value: Int) {
        buffer[offset] = ((value shr 8) and 0xFF).toByte()
        buffer[offset + 1] = (value and 0xFF).toByte()
    }
}