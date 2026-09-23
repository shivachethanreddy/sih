package com.itantra.core.ai

import com.itantra.core.audio.MockVoiceActivityDetector
import com.itantra.core.audio.VadConfig
import com.itantra.core.audio.VoiceActivityDetector
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * Factory for creating AI components.
 * Allows switching between mock and real implementations.
 */
class AiFactory(
    private val useMocks: Boolean = true
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // Lazy initialization
    private var speechToText: SpeechToText? = null
    private var textToSpeech: TextToSpeechEngine? = null
    private var translator: Translator? = null
    private var vad: VoiceActivityDetector? = null
    
    /**
     * Get or create Speech-to-Text engine.
     */
    fun getSpeechToText(): SpeechToText {
        return speechToText ?: run {
            val stt = if (useMocks) {
                MockSpeechToText()
            } else {
                // TODO: Real implementation
                throw UnsupportedOperationException("Real STT not implemented yet")
            }
            speechToText = stt
            stt
        }
    }
    
    /**
     * Get or create Text-to-Speech engine.
     */
    fun getTextToSpeech(): TextToSpeechEngine {
        return textToSpeech ?: run {
            val tts = if (useMocks) {
                MockTextToSpeech()
            } else {
                throw UnsupportedOperationException("Real TTS not implemented yet")
            }
            textToSpeech = tts
            tts
        }
    }
    
    /**
     * Get or create Translator.
     */
    fun getTranslator(): Translator {
        return translator ?: run {
            val tr = if (useMocks) {
                MockTranslator()
            } else {
                throw UnsupportedOperationException("Real Translator not implemented yet")
            }
            translator = tr
            tr
        }
    }
    
    /**
     * Get or create Voice Activity Detector.
     */
    fun getVad(config: VadConfig = VadConfig()): VoiceActivityDetector {
        return vad ?: run {
            val detector = MockVoiceActivityDetector(config)
            vad = detector
            detector
        }
    }
    
    /**
     * Initialize all AI components.
     */
    suspend fun initializeAll(): Boolean {
        val results = awaitAll(
            getSpeechToText().initialize(),
            getTextToSpeech().initialize(),
            getTranslator().initialize()
        )
        return results.all { it }
    }
    
    /**
     * Release all AI components.
     */
    fun releaseAll() {
        speechToText?.release()
        textToSpeech?.release()
        translator?.release()
        scope.coroutineContext[Job]?.cancel()
        
        speechToText = null
        textToSpeech = null
        translator = null
        vad = null
    }
    
    /**
     * Set whether to use mock implementations.
     * Must be called before any get*() methods.
     */
    fun setUseMocks(useMocks: Boolean) {
        if (speechToText != null || textToSpeech != null || translator != null) {
            throw IllegalStateException("Cannot change useMocks after components created")
        }
        // Note: This would require re-initialization
    }
}