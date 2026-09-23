package com.itantra.core.audio

import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Audio recorder using Android's AudioRecord API.
 * Records 16kHz mono PCM 16-bit audio for voice communication.
 * Provides audio level monitoring and VAD integration points.
 */
class AudioRecorder(
    private val config: AudioConfig = AudioConfig
) {
    private var audioRecord: AudioRecord? = null
    private val isRecording = AtomicBoolean(false)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // Audio data channel (raw PCM bytes)
    private val audioChannel = Channel<ByteArray>(100)
    
    // Audio level monitoring
    private val audioLevelChannel = Channel<Float>(50)
    
    // Statistics
    private val totalFramesRecorded = AtomicLong(0)
    private val totalBytesRecorded = AtomicLong(0)
    private val recordingStartTime = AtomicLong(0)
    private val bufferOverruns = AtomicLong(0)
    
    // Callbacks
    var onAudioLevel: ((Float) -> Unit)? = null
    var onRecordingError: ((String) -> Unit)? = null
    
    /**
     * Start recording audio.
     * Returns true if recording started successfully.
     */
    fun startRecording(): Boolean {
        if (isRecording.get()) return true
        
        return try {
            // Calculate buffer size
            val minBufferSize = config.getMinRecordBufferSize()
            if (minBufferSize == AudioRecord.ERROR_BAD_VALUE || minBufferSize == AudioRecord.ERROR) {
                throw IllegalStateException("Invalid audio config for recording")
            }
            
            val bufferSize = maxOf(minBufferSize, config.RECORD_BUFFER_SIZE)
            
            audioRecord = AudioRecord(
                config.AUDIO_SOURCE,
                config.SAMPLE_RATE,
                config.CHANNEL_CONFIG,
                config.AUDIO_FORMAT,
                bufferSize
            )
            
            val state = audioRecord?.state ?: AudioRecord.STATE_UNINITIALIZED
            if (state != AudioRecord.STATE_INITIALIZED) {
                throw IllegalStateException("AudioRecord initialization failed: $state")
            }
            
            audioRecord?.startRecording()
            isRecording.set(true)
            recordingStartTime.set(System.currentTimeMillis())
            totalFramesRecorded.set(0)
            totalBytesRecorded.set(0)
            bufferOverruns.set(0)
            
            // Start recording loop
            scope.launch { recordingLoop() }
            
            true
        } catch (e: Exception) {
            onRecordingError?.invoke("Failed to start recording: ${e.message}")
            cleanup()
            false
        }
    }
    
    /**
     * Stop recording audio.
     */
    fun stopRecording(): Boolean {
        if (!isRecording.get()) return true
        
        isRecording.set(false)
        
        // Wait for recording loop to finish
        scope.coroutineContext[Job]?.join()
        
        cleanup()
        return true
    }
    
    /**
     * Get the audio data channel for consuming recorded frames.
     */
    fun audioFrames(): ReceiveChannel<ByteArray> = audioChannel
    
    /**
     * Get the audio level channel for monitoring.
     */
    fun audioLevels(): ReceiveChannel<Float> = audioLevelChannel
    
    /**
     * Check if currently recording.
     */
    fun getIsRecording(): Boolean = isRecording.get()
    
    /**
     * Get current recording duration in milliseconds.
     */
    fun getRecordingDurationMs(): Long {
        val start = recordingStartTime.get()
        return if (start > 0 && isRecording.get()) {
            System.currentTimeMillis() - start
        } else 0
    }
    
    /**
     * Get recording statistics.
     */
    fun getStats(): RecordingStats {
        return RecordingStats(
            isRecording = isRecording.get(),
            durationMs = getRecordingDurationMs(),
            totalFrames = totalFramesRecorded.get(),
            totalBytes = totalBytesRecorded.get(),
            bufferOverruns = bufferOverruns.get(),
            averageLevel = 0f // Would need to track separately
        )
    }
    
    /**
     * Release resources.
     */
    fun release() {
        stopRecording()
        scope.coroutineContext[Job]?.cancel()
        audioChannel.close()
        audioLevelChannel.close()
    }
    
    private fun recordingLoop() {
        val buffer = ByteArray(config.RECORD_BUFFER_SIZE)
        
        while (isRecording.get()) {
            val audioRecord = this.audioRecord ?: break
            
            try {
                val read = audioRecord.read(buffer, 0, buffer.size)
                
                if (read > 0) {
                    // Copy only the read portion
                    val frame = buffer.copyOf(read)
                    
                    totalFramesRecorded.incrementAndGet()
                    totalBytesRecorded.addAndGet(read)
                    
                    // Calculate audio level (RMS)
                    val level = calculateRmsLevel(frame)
                    audioLevelChannel.trySend(level)
                    onAudioLevel?.invoke(level)
                    
                    // Send to channel (backpressure handled by channel capacity)
                    val sent = audioChannel.trySend(frame)
                    if (!sent) {
                        bufferOverruns.incrementAndGet()
                    }
                } else if (read == AudioRecord.ERROR_INVALID_OPERATION) {
                    // Recording stopped
                    break
                } else if (read == AudioRecord.ERROR_BAD_VALUE) {
                    onRecordingError?.invoke("Invalid audio buffer")
                    break
                }
            } catch (e: Exception) {
                onRecordingError?.invoke("Recording error: ${e.message}")
                break
            }
        }
    }
    
    private fun calculateRmsLevel(pcmData: ByteArray): Float {
        if (pcmData.size < 2) return 0f
        
        var sumSquares = 0L
        for (i in 0 until pcmData.size step 2) {
            val sample = (pcmData[i + 1].toInt() shl 8) or (pcmData[i].toInt() and 0xFF)
            val signedSample = if (sample > 32767) sample - 65536 else sample
            sumSquares += (signedSample.toLong() * signedSample)
        }
        
        val meanSquare = sumSquares.toDouble() / (pcmData.size / 2)
        val rms = Math.sqrt(meanSquare)
        
        // Normalize to 0-1 range (16-bit max is 32767)
        return (rms / 32767.0).toFloat().coerceIn(0f, 1f)
    }
    
    private fun cleanup() {
        audioRecord?.let {
            try {
                if (it.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                    it.stop()
                }
            } catch (e: Exception) {
                // Ignore
            }
            it.release()
        }
        audioRecord = null
    }
    
    data class RecordingStats(
        val isRecording: Boolean,
        val durationMs: Long,
        val totalFrames: Long,
        val totalBytes: Long,
        val bufferOverruns: Long,
        val averageLevel: Float
    )
}