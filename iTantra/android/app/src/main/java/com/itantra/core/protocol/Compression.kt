package com.itantra.core.protocol

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.Deflater
import java.util.zip.DeflaterOutputStream
import java.util.zip.Inflater
import java.util.zip.InflaterInputStream

/**
 * Interface for payload compression implementations.
 * Allows different compression algorithms to be plugged in.
 */
interface PayloadCompressor {
    fun compress(data: ByteArray): ByteArray
    fun decompress(data: ByteArray): ByteArray
    val algorithmName: String
}

/**
 * Default compressor using Deflate (ZLIB).
 * Only uses compression if it reduces size.
 */
class PayloadCompressor(
    private val minSizeForCompression: Int = 50,
    private val compressionLevel: Int = Deflater.DEFAULT_COMPRESSION
) : PayloadCompressor {

    override val algorithmName: String = "DEFLATE"

    override fun compress(data: ByteArray): ByteArray {
        // Skip compression for small payloads
        if (data.size < minSizeForCompression) {
            return data
        }

        try {
            val outputStream = ByteArrayOutputStream()
            val deflater = Deflater(compressionLevel, true) // true = nowrap (raw deflate)
            val deflaterOutputStream = DeflaterOutputStream(outputStream, deflater)
            
            deflaterOutputStream.write(data)
            deflaterOutputStream.finish()
            deflaterOutputStream.close()
            
            val compressed = outputStream.toByteArray()
            
            // Only use compression if it actually reduces size
            return if (compressed.size < data.size) {
                compressed
            } else {
                data
            }
        } catch (e: Exception) {
            // On any compression error, return original data
            return data
        }
    }

    override fun decompress(data: ByteArray): ByteArray {
        // If data is very small, it's likely not compressed
        if (data.size < 2) {
            return data
        }

        try {
            val inputStream = ByteArrayInputStream(data)
            val inflater = Inflater(true) // true = nowrap (raw deflate)
            val inflaterInputStream = InflaterInputStream(inputStream, inflater)
            val outputStream = ByteArrayOutputStream()
            
            val buffer = ByteArray(1024)
            var bytesRead = inflaterInputStream.read(buffer)
            while (bytesRead != -1) {
                outputStream.write(buffer, 0, bytesRead)
                bytesRead = inflaterInputStream.read(buffer)
            }
            
            inflaterInputStream.close()
            return outputStream.toByteArray()
        } catch (e: Exception) {
            // If decompression fails, return data as-is
            // This handles the case where data wasn't actually compressed
            return data
        }
    }
}

/**
 * No-op compressor for testing or when compression is disabled.
 */
class NoOpCompressor : PayloadCompressor {
    override val algorithmName: String = "NONE"

    override fun compress(data: ByteArray): ByteArray = data

    override fun decompress(data: ByteArray): ByteArray = data
}

/**
 * Factory for creating compressors.
 */
object CompressorFactory {
    fun createDefault(): PayloadCompressor = PayloadCompressor()
    
    fun createNoOp(): PayloadCompressor = NoOpCompressor()
    
    fun createCustom(
        minSizeForCompression: Int = 50,
        compressionLevel: Int = Deflater.DEFAULT_COMPRESSION
    ): PayloadCompressor = PayloadCompressor(minSizeForCompression, compressionLevel)
}