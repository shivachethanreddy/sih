package com.itantra.core.protocol

object ProtocolConstants {
    // Protocol identification
    const val MAGIC_BYTE: Byte = 0x54.toByte() // 'T' for iTANTRA
    const val PROTOCOL_VERSION: Byte = 1

    // Packet structure offsets
    const val OFFSET_MAGIC: Int = 0
    const val OFFSET_VERSION: Int = 1
    const val OFFSET_PRIORITY: Int = 2
    const val OFFSET_HOP_COUNT: Int = 3
    const val OFFSET_TTL: Int = 4
    const val OFFSET_MESSAGE_ID: Int = 5      // 8 bytes (Long)
    const val OFFSET_TIMESTAMP: Int = 13      // 8 bytes (Long)
    const val OFFSET_SOURCE_NODE: Int = 21    // 2 bytes (UShort)
    const val OFFSET_DEST_NODE: Int = 23      // 2 bytes (UShort)
    const val OFFSET_LANGUAGE_CODE: Int = 25  // 1 byte (index into language table)
    const val OFFSET_FLAGS: Int = 26          // 1 byte
    const val OFFSET_PAYLOAD_LENGTH: Int = 27 // 2 bytes (UShort)
    const val OFFSET_CRC16: Int = 29          // 2 bytes (UShort)
    const val OFFSET_PAYLOAD: Int = 31        // Variable

    const val HEADER_SIZE: Int = OFFSET_PAYLOAD

    // Flags
    const val FLAG_EMERGENCY: Byte = 0x01.toByte()
    const val FLAG_BROADCAST: Byte = 0x02.toByte()
    const val FLAG_COMPRESSED: Byte = 0x04.toByte()
    const val FLAG_ACK: Byte = 0x08.toByte()
    const val FLAG_RELAY: Byte = 0x10.toByte()

    // Special node IDs
    const val BROADCAST_NODE_ID: Int = 0xFFFF
    const val MAX_NODE_ID: Int = 0xFFFE

    // Payload limits
    const val MAX_PAYLOAD_SIZE: Int = 1024 // 1KB max payload
    const val MAX_PACKET_SIZE: Int = HEADER_SIZE + MAX_PAYLOAD_SIZE

    // TTL
    const val DEFAULT_TTL: Int = 8
    const val MAX_TTL: Int = 255
    const val ACK_TTL: Int = 1

    // Language codes (index into language table)
    // These correspond to the language list in the React Native app
    enum class LanguageCode(val code: Int, val bcp47: String, val name: String, val nativeName: String) {
        ENGLISH(0, "en-IN", "English", "English"),
        HINDI(1, "hi-IN", "Hindi", "हिंदी"),
        GUJARATI(2, "gu-IN", "Gujarati", "ગુજરાતી"),
        MARATHI(3, "mr-IN", "Marathi", "मराठी"),
        KANNADA(4, "kn-IN", "Kannada", "ಕನ್ನಡ"),
        MALAYALAM(5, "ml-IN", "Malayalam", "മലയാളം"),
        TAMIL(6, "ta-IN", "Tamil", "தமிழ்"),
        TELUGU(7, "te-IN", "Telugu", "తెలుగు"),
        ODIA(8, "or-IN", "Odia", "ଓଡ଼ିଆ"),
        BENGALI(9, "bn-IN", "Bengali", "বাংলা"),
        PUNJABI(10, "pa-IN", "Punjabi", "ਪੰਜਾਬੀ");

        companion object {
            fun fromBcp47(bcp47: String): LanguageCode = values().firstOrNull { it.bcp47 == bcp47 } ?: ENGLISH
            fun fromCode(code: Int): LanguageCode = values().firstOrNull { it.code == code } ?: ENGLISH
        }
    }

    // Channel IDs
    enum class ChannelId(val id: String, val label: String, val name: String, val frequency: String) {
        CH_1_5("ch_1_5", "CH 1/5", "Rescue Operations", "433.125 MHz"),
        CH_2_5("ch_2_5", "CH 2/5", "Medical Team", "433.250 MHz"),
        CH_3_10("ch_3_10", "CH 3/10", "Public Broadcast", "433.920 MHz"),
        CH_4_5("ch_4_5", "CH 4/5", "Logistics", "434.100 MHz"),
        CH_5_5("ch_5_5", "CH 5/5", "Command Center", "434.500 MHz");

        companion object {
            fun fromId(id: String): ChannelId = values().firstOrNull { it.id == id } ?: CH_3_10
        }
    }

    // Retry configuration
    const val DEFAULT_MAX_RETRIES: Int = 3
    const val EMERGENCY_MAX_RETRIES: Int = 5
    const val ACK_TIMEOUT_MS: Long = 5000
    const val EMERGENCY_ACK_TIMEOUT_MS: Long = 3000
    const val RETRY_BASE_DELAY_MS: Long = 1000

    // Mesh configuration
    const val MAX_RELAY_FANOUT: Int = 3
    const val GOSSIP_INTERVAL_MS: Long = 100
    const val DEDUP_CACHE_SIZE: Int = 1000
    const val DEDUP_CACHE_TTL_MS: Long = 300000 // 5 minutes

    // Store and forward
    const val STORE_FORWARD_EXPIRY_MS: Long = 3600000 // 1 hour
    const val MAX_STORED_MESSAGES: Int = 100

    // Audio
    const val SAMPLE_RATE: Int = 16000
    const val CHANNEL_CONFIG: Int = 16 // CHANNEL_OUT_MONO
    const val AUDIO_FORMAT: Int = 2 // ENCODING_PCM_16BIT
    const val RECORD_BUFFER_MS: Int = 100
}