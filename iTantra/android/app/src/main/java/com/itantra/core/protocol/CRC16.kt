package com.itantra.core.protocol

/**
 * CRC-16-CCITT implementation for packet integrity verification.
 * Polynomial: 0x1021 (x^16 + x^12 + x^5 + 1)
 * Initial value: 0xFFFF
 * No reflection, no final XOR
 */
class CRC16 {
    companion object {
        private const val POLYNOMIAL: Int = 0x1021
        private const val INITIAL_VALUE: Int = 0xFFFF

        // Precomputed lookup table for performance
        private val TABLE: IntArray = IntArray(256) { index ->
            var crc = index shl 8
            repeat(8) {
                crc = if ((crc and 0x8000) != 0) {
                    (crc shl 1) xor POLYNOMIAL
                } else {
                    crc shl 1
                }
            }
            crc and 0xFFFF
        }
    }

    /**
     * Calculate CRC-16 over the given data.
     * Includes payload, timestamp, and messageId in the calculation.
     */
    fun calculate(payload: ByteArray, timestamp: Long, messageId: Long): Int {
        var crc = INITIAL_VALUE
        
        // Include payload
        for (byte in payload) {
            crc = updateCrc(crc, byte)
        }
        
        // Include timestamp (8 bytes, big-endian)
        for (i in 7 downTo 0) {
            crc = updateCrc(crc, (timestamp shr (i * 8)).toByte())
        }
        
        // Include messageId (8 bytes, big-endian)
        for (i in 7 downTo 0) {
            crc = updateCrc(crc, (messageId shr (i * 8)).toByte())
        }
        
        return crc and 0xFFFF
    }

    /**
     * Calculate CRC-16 over just the payload bytes.
     */
    fun calculatePayload(payload: ByteArray): Int {
        var crc = INITIAL_VALUE
        for (byte in payload) {
            crc = updateCrc(crc, byte)
        }
        return crc and 0xFFFF
    }

    /**
     * Update CRC with a single byte using lookup table.
     */
    private fun updateCrc(crc: Int, byte: Byte): Int {
        val index = ((crc shr 8) xor (byte.toInt() and 0xFF)) and 0xFF
        return ((crc shl 8) xor TABLE[index]) and 0xFFFF
    }

    /**
     * Verify CRC matches expected value.
     */
    fun verify(payload: ByteArray, timestamp: Long, messageId: Long, expectedCrc: Int): Boolean {
        return calculate(payload, timestamp, messageId) == expectedCrc
    }

    /**
     * Format CRC as hex string for logging.
     */
    fun toHexString(crc: Int): String {
        return "0x${(crc and 0xFFFF).toString(16).uppercase().padStart(4, '0')}"
    }
}