package com.itantra.core.ai

import kotlinx.coroutines.channels.ReceiveChannel

/**
 * Translation interface for offline translation.
 * 
 * Implementations can use:
 * - MarianMT (ONNX)
 * - NLLB (ONNX)
 * - M2M100 (ONNX)
 * - Custom ONNX models
 * - Rule-based for specific language pairs
 */
interface Translator {
    /**
     * Translate text from source to target language.
     */
    suspend fun translate(
        text: String,
        sourceLanguage: String,
        targetLanguage: String
    ): TranslationResult
    
    /**
     * Stream translation for real-time processing.
     */
    fun translateStream(
        textSegments: ReceiveChannel<String>,
        sourceLanguage: String,
        targetLanguage: String
    ): ReceiveChannel<TranslationResult>
    
    /**
     * Get supported language pairs.
     */
    fun getSupportedLanguagePairs(): List<LanguagePair>
    
    /**
     * Check if a specific language pair is supported.
     */
    fun isLanguagePairSupported(sourceLanguage: String, targetLanguage: String): Boolean
    
    /**
     * Get supported target languages for a source language.
     */
    fun getTargetLanguages(sourceLanguage: String): List<String>
    
    /**
     * Check if translator is ready.
     */
    val isReady: Boolean
    
    /**
     * Initialize the translator (load models, etc.).
     */
    suspend fun initialize(): Boolean
    
    /**
     * Release resources.
     */
    fun release()
}

/**
 * Translation result.
 */
data class TranslationResult(
    val translatedText: String,
    val sourceLanguage: String,
    val targetLanguage: String,
    val confidence: Float, // 0.0 to 1.0
    val isPartial: Boolean = false,
    val alternatives: List<String> = emptyList(),
    val detectedSourceLanguage: String? = null
)

/**
 * Language pair information.
 */
data class LanguagePair(
    val sourceLanguage: String,
    val targetLanguage: String,
    val quality: TranslationQuality = TranslationQuality.MEDIUM,
    val modelSize: String = "unknown"
)

enum class TranslationQuality {
    LOW, MEDIUM, HIGH
}

/**
 * Translator configuration.
 */
data class TranslatorConfig(
    val modelPath: String? = null,
    val defaultSourceLanguage: String = "en",
    val defaultTargetLanguage: String = "hi",
    val enableStreaming: Boolean = false,
    val maxInputLength: Int = 512,
    val beamSize: Int = 1
)