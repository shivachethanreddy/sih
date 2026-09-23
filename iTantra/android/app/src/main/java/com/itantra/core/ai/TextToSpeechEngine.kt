package com.itantra.core.ai

import kotlinx.coroutines.channels.ReceiveChannel

/**
 * Text-to-Speech interface for offline synthesis.
 * 
 * Implementations can use:
 * - Sherpa-ONNX TTS
 * - VITS / Piper (ONNX)
 * - MMS-TTS (ONNX)
 * - Coqui TTS (ONNX)
 * - Custom ONNX models
 */
interface TextToSpeechEngine {
    /**
     * Synthesize text to speech audio.
     * Returns 16kHz mono PCM 16-bit audio.
     */
    suspend fun speak(text: String, language: String): TtsResult
    
    /**
     * Stream synthesis for real-time playback.
     * Returns audio chunks as they are generated.
     */
    fun speakStream(text: String, language: String): ReceiveChannel<TtsAudioChunk>
    
    /**
     * Get supported languages/voices.
     */
    fun getSupportedVoices(): List<VoiceInfo>
    
    /**
     * Get available voices for a specific language.
     */
    fun getVoicesForLanguage(language: String): List<VoiceInfo>
    
    /**
     * Check if TTS engine is ready.
     */
    val isReady: Boolean
    
    /**
     * Initialize the TTS engine (load models, etc.).
     */
    suspend fun initialize(): Boolean
    
    /**
     * Release resources.
     */
    fun release()
    
    /**
     * Stop current synthesis.
     */
    fun stop()
}

/**
 * TTS synthesis result.
 */
data class TtsResult(
    val audioData: ByteArray, // 16kHz mono PCM 16-bit
    val durationMs: Long,
    val language: String,
    val voiceId: String,
    val sampleRate: Int = 16000,
    val success: Boolean = true,
    val error: String? = null
)

/**
 * Audio chunk for streaming TTS.
 */
data class TtsAudioChunk(
    val audioData: ByteArray,
    val isLast: Boolean,
    val sequenceNumber: Int,
    val sampleRate: Int = 16000
)

/**
 * Voice information.
 */
data class VoiceInfo(
    val id: String,
    val language: String, // BCP-47 code
    val name: String,
    val gender: VoiceGender = VoiceGender.NEUTRAL,
    val quality: VoiceQuality = VoiceQuality.MEDIUM,
    val sampleRate: Int = 16000
)

enum class VoiceGender {
    MALE, FEMALE, NEUTRAL
}

enum class VoiceQuality {
    LOW, MEDIUM, HIGH, ULTRA
}

/**
 * TTS configuration.
 */
data class TtsConfig(
    val modelPath: String? = null,
    val defaultVoice: String? = null,
    val sampleRate: Int = 16000,
    val enableStreaming: Boolean = true,
    val speakingRate: Float = 1.0f, // 0.5 - 2.0
    val pitch: Float = 1.0f, // 0.5 - 2.0
    val volume: Float = 1.0f // 0.0 - 1.0
)