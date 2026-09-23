package com.itantra.core.protocol

import com.itantra.core.model.AckPayload
import com.itantra.core.model.LanguageCode
import com.itantra.core.model.Packet
import com.itantra.core.model.Priority

/**
 * Result of packet parsing operation.
 */
sealed class ParseResult {
    data class Success(val packet: Packet) : ParseResult()
    data class Failure(val error: ParseError) : ParseResult()
}

/**
 * Parse errors with structured codes.
 */
sealed class ParseError(val code: String, val message: String) {
    data class PacketTooSmall(val minSize: Int, val actualSize: Int) : 
        ParseError("PACKET_TOO_SMALL", "Packet too small: expected at least $minSize bytes, got $actualSize")
    
    data class InvalidMagic(val expected: Byte, val actual: Byte) : 
        ParseError("INVALID_MAGIC", "Invalid magic byte: expected 0x${expected.toInt().toString(16).uppercase()}, got 0x${actual.toInt().toString(16).uppercase()}")
    
    data class UnsupportedVersion(val expected: Byte, val actual: Byte) : 
        ParseError("UNSUPPORTED_VERSION", "Unsupported protocol version: expected $expected, got $actual")
    
    data class InvalidPayloadLength(val declared: Int, val actual: Int) : 
        ParseError("INVALID_PAYLOAD_LENGTH", "Payload length mismatch: declared $declared, actual $actual")
    
    data class CrcMismatch(val expected: Int, val actual: Int) : 
        ParseError("CRC_MISMATCH", "CRC verification failed: expected 0x${expected.toString(16).uppercase()}, got 0x${actual.toString(16).uppercase()}")
    
    data class PacketTooLarge(val maxSize: Int, val actualSize: Int) : 
        ParseError("PACKET_TOO_LARGE", "Packet exceeds maximum size: $actualSize > $maxSize")
    
    data class InvalidLanguageCode(val code: Int) : 
        ParseError("INVALID_LANGUAGE_CODE", "Invalid language code: $code")
    
    data class InvalidPriority(val value: Int) : 
        ParseError("INVALID_PRIORITY", "Invalid priority value: $value")
    
    data class UnknownError(val cause: String) : 
        ParseError("UNKNOWN", "Parse error: $cause")
}

/**
 * Packet parser that safely parses binary packets into Packet objects.
 * Never crashes on malformed data - returns structured errors.
 */
class PacketParser(
    private val crc16: CRC16 = CRC16(),
    private val compressor: PayloadCompressor = PayloadCompressor()
) {

    fun parse(data: ByteArray): ParseResult {
        // 1. Check minimum packet size
        if (data.size < ProtocolConstants.HEADER_SIZE) {
            return ParseResult.Failure(
                ParseError.PacketTooSmall(ProtocolConstants.HEADER_SIZE, data.size)
            )
        }

        // 2. Check maximum packet size
        if (data.size > ProtocolConstants.MAX_PACKET_SIZE) {
            return ParseResult.Failure(
                ParseError.PacketTooLarge(ProtocolConstants.MAX_PACKET_SIZE, data.size)
            )
        }

        // 3. Check magic byte
        val magic = data[ProtocolConstants.OFFSET_MAGIC]
        if (magic != ProtocolConstants.MAGIC_BYTE) {
            return ParseResult.Failure(
                ParseError.InvalidMagic(ProtocolConstants.MAGIC_BYTE, magic)
            )
        }

        // 4. Check version
        val version = data[ProtocolConstants.OFFSET_VERSION]
        if (version != ProtocolConstants.PROTOCOL_VERSION) {
            return ParseResult.Failure(
                ParseError.UnsupportedVersion(ProtocolConstants.PROTOCOL_VERSION, version)
            )
        }

        // 5. Parse header fields
        val priority = parsePriority(data[ProtocolConstants.OFFSET_PRIORITY])
        val hopCount = data[ProtocolConstants.OFFSET_HOP_COUNT].toInt() and 0xFF
        val ttl = data[ProtocolConstants.OFFSET_TTL].toInt() and 0xFF
        
        val messageId = readLong(data, ProtocolConstants.OFFSET_MESSAGE_ID)
        val timestamp = readLong(data, ProtocolConstants.OFFSET_TIMESTAMP)
        val sourceNodeId = readUShort(data, ProtocolConstants.OFFSET_SOURCE_NODE)
        val destinationNodeId = readUShort(data, ProtocolConstants.OFFSET_DEST_NODE)
        val languageCode = data[ProtocolConstants.OFFSET_LANGUAGE_CODE].toInt() and 0xFF
        val flags = data[ProtocolConstants.OFFSET_FLAGS].toInt() and 0xFF
        val payloadLength = readUShort(data, ProtocolConstants.OFFSET_PAYLOAD_LENGTH)
        val crc16Value = readUShort(data, ProtocolConstants.OFFSET_CRC16)

        // 6. Validate payload length
        val actualPayloadSize = data.size - ProtocolConstants.HEADER_SIZE
        if (payloadLength != actualPayloadSize) {
            return ParseResult.Failure(
                ParseError.InvalidPayloadLength(payloadLength, actualPayloadSize)
            )
        }

        // 7. Extract payload
        val payload = data.copyOfRange(ProtocolConstants.HEADER_SIZE, data.size)

        // 8. Verify CRC (calculate over payload + timestamp + messageId)
        val calculatedCrc = crc16.calculate(payload, timestamp, messageId)
        if (calculatedCrc != crc16Value) {
            return ParseResult.Failure(
                ParseError.CrcMismatch(crc16Value, calculatedCrc)
            )
        }

        // 9. Parse flags
        val isEmergency = (flags and ProtocolConstants.FLAG_EMERGENCY) != 0
        val isBroadcast = (flags and ProtocolConstants.FLAG_BROADCAST) != 0
        val isCompressed = (flags and ProtocolConstants.FLAG_COMPRESSED) != 0
        val isAck = (flags and ProtocolConstants.FLAG_ACK) != 0

        // 10. Decompress payload if needed
        val finalPayload = if (isCompressed) {
            compressor.decompress(payload)
        } else {
            payload
        }

        // 11. Validate language code
        val language = if (languageCode < LanguageCode.values().size) {
            LanguageCode.values()[languageCode].bcp47
        } else {
            LanguageCode.ENGLISH.bcp47
        }

        // 12. Build packet
        val packet = Packet(
            messageId = messageId,
            sourceNodeId = sourceNodeId,
            destinationNodeId = destinationNodeId,
            channelId = if (isAck) "ACK" else "DEFAULT", // Will be resolved by caller
            payload = finalPayload,
            language = language,
            priority = priority,
            hopCount = hopCount,
            ttl = ttl,
            isEmergency = isEmergency,
            isBroadcast = isBroadcast,
            timestamp = timestamp,
            isCompressed = isCompressed,
            crc16 = crc16Value
        )

        return ParseResult.Success(packet)
    }

    /**
     * Parse an ACK packet specifically.
     */
    fun parseAck(data: ByteArray): ParseResult {
        val result = parse(data)
        return when (result) {
            is ParseResult.Success -> {
                val ackPayload = AckPayload.fromByteArray(result.packet.payload)
                if (ackPayload != null) {
                    result
                } else {
                    ParseResult.Failure(ParseError.UnknownError("Invalid ACK payload"))
                }
            }
            is ParseResult.Failure -> result
        }
    }

    private fun parsePriority(value: Byte): Priority {
        return when (value.toInt() and 0xFF) {
            0 -> Priority.NORMAL
            1 -> Priority.HIGH
            2 -> Priority.EMERGENCY
            else -> {
                // Return NORMAL for unknown values but could also return error
                Priority.NORMAL
            }
        }
    }

    private fun readLong(data: ByteArray, offset: Int): Long {
        var value = 0L
        for (i in 0..7) {
            value = (value shl 8) or (data[offset + i].toLong() and 0xFF)
        }
        return value
    }

    private fun readUShort(data: ByteArray, offset: Int): Int {
        return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
    }
}