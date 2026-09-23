package com.itantra.core.audio

import kotlinx.coroutines.channels.ReceiveChannel

/**
 * Voice Activity Detection interface.
 * Detects speech presence in audio frames.
 * 
 * Implementations can use:
 * - WebRTC VAD
 * - Silero VAD (ONNX)
 * - Custom energy-based VAD
 * - Mock for testing
 */
interface VoiceActivityDetector {
    /**
     * Process an audio frame and return voice activity result.
     * Frame should be 20ms at 16kHz (320 samples = 640 bytes for 16-bit).
     */
    fun processFrame(frame: ByteArray): VadResult
    
    /**
     * Reset the VAD state (e.g., between utterances).
     */
    fun reset()
    
    /**
     * Get VAD configuration info.
     */
    fun getConfig(): VadConfig
    
    /**
     * Check if VAD is available/initialized.
     */
    val isAvailable: Boolean
}

/**
 * VAD processing result.
 */
data class VadResult(
    val isSpeech: Boolean,
    val confidence: Float, // 0.0 to 1.0
    val frameEnergy: Float // RMS energy level
) {
    companion object {
        val SILENCE = VadResult(false, 0f, 0f)
    }
}

/**
 * VAD configuration.
 */
data class VadConfig(
    val sampleRate: Int = 16000,
    val frameMs: Int = 20,
    val frameSize: Int = 640, // bytes (320 samples * 2 bytes)
    val aggressiveness: Int = 2, // 0-3 for WebRTC VAD
    val energyThreshold: Float = 0.01f
)

/**
 * VAD that works with audio frame streams.
 */
interface StreamingVoiceActivityDetector : VoiceActivityDetector {
    /**
     * Process a stream of audio frames.
     */
    fun processStream(frames: ReceiveChannel<ByteArray>): ReceiveChannel<VadResult>
    
    /**
     * Detect speech segments (continuous speech regions).
     */
    fun detectSpeechSegments(frames: ReceiveChannel<ByteArray>): ReceiveChannel<SpeechSegment>
}

/**
 * Represents a detected speech segment.
 */
data class SpeechSegment(
    val startFrameIndex: Long,
    val endFrameIndex: Long,
    val startTimeMs: Long,
    val endTimeMs: Long,
    val frames: List<VadResult>,
    val averageConfidence: Float
)