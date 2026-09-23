package com.itantra.core.ai

import kotlinx.coroutines.channels.ReceiveChannel

/**
 * Speech-to-Text interface for offline transcription.
 * 
 * Implementations can use:
 * - Sherpa-ONNX
 * - IndicConformer (ONNX)
 * - Whisper.cpp (ONNX)
 * - Vosk
 * - Custom ONNX models
 */
interface SpeechToText {
    /**
     * Transcribe audio to text.
     * Audio should be 16kHz mono PCM 16-bit.
     */
    suspend fun transcribe(audio: ByteArray, language: String): TranscriptionResult
    
    /**
     * Stream transcription for real-time processing.
     * Returns partial results as they become available.
     */
    fun transcribeStream(audioFrames: ReceiveChannel<ByteArray>, language: String): ReceiveChannel<TranscriptionResult>
    
    /**
     * Get supported languages.
     */
    fun getSupportedLanguages(): List<LanguageInfo>
    
    /**
     * Check if STT engine is ready.
     */
    val isReady: Boolean
    
    /**
     * Initialize the STT engine (load models, etc.).
     */
    suspend fun initialize(): Boolean
    
    /**
     * Release resources.
     */
    fun release()
}

/**
 * Transcription result.
 */
data class TranscriptionResult(
    val text: String,
    val language: String,
    val confidence: Float, // 0.0 to 1.0
    val isPartial: Boolean = false, // true for interim results
    val durationMs: Long = 0,
    val startTimeMs: Long = 0,
    val endTimeMs: Long = 0,
    val words: List<WordTiming> = emptyList()
)

/**
 * Word-level timing information.
 */
data class WordTiming(
    val word: String,
    val startMs: Long,
    val endMs: Long,
    val confidence: Float
)

/**
 * Language information.
 */
data class LanguageInfo(
    val code: String, // BCP-47 code (e.g., "hi-IN", "te-IN")
    val name: String,
    val nativeName: String,
    val supportedFeatures: Set<SttFeature> = emptySet()
)

enum class SttFeature {
    STREAMING,
    WORD_TIMING,
    PUNCTUATION,
    SPEAKER_DIARIZATION
}

/**
 * STT configuration.
 */
data class SttConfig(
    val modelPath: String? = null,
    val sampleRate: Int = 16000,
    val enableStreaming: Boolean = true,
    val enablePunctuation: Boolean = true,
    val enableWordTiming: Boolean = false,
    val maxAlternatives: Int = 1,
    val vadThreshold: Float = 0.5f
)