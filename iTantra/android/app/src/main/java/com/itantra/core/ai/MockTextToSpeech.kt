package com.itantra.core.ai

import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.Random

/**
 * Mock Text-to-Speech implementation for testing.
 * Generates silent audio with simulated timing.
 */
class MockTextToSpeech(
    private val config: TtsConfig = TtsConfig(),
    private val simulatedDelayMs: Long = 300,
    private val defaultVoice: String = "default"
) : TextToSpeechEngine {
    
    private val initialized = false
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val random = Random()
    
    // Pre-generated silent audio (1 second at 16kHz = 32000 bytes)
    private val silentAudio = ByteArray(32000)
    
    override suspend fun speak(text: String, language: String): TtsResult {
        // Simulate processing delay
        delay(simulatedDelayMs + random.nextLong(200))
        
        // Calculate duration based on text length (~150 words per minute)
        val wordsPerMinute = 150.0
        val wordCount = text.split("\\s+".toRegex()).size
        val estimatedDurationMs = ((wordCount / wordsPerMinute) * 60 * 1000).toLong()
        
        // Generate audio (silent for mock)
        val sampleRate = config.sampleRate
        val audioDurationSamples = (sampleRate * estimatedDurationMs / 1000).toInt()
        val audioBytes = audioDurationSamples * 2 // 16-bit = 2 bytes per sample
        val audioData = ByteArray(audioBytes.coerceAtMost(silentAudio.size * 10))
        
        return TtsResult(
            audioData = audioData,
            durationMs = estimatedDurationMs,
            language = language,
            voiceId = defaultVoice,
            sampleRate = sampleRate,
            success = true
        )
    }
    
    override fun speakStream(text: String, language: String): ReceiveChannel<TtsAudioChunk> {
        val chunkChannel = Channel<TtsAudioChunk>(50)
        
        scope.launch {
            val words = text.split("\\s+".toRegex())
            val wordsPerChunk = maxOf(1, words.size / 5)
            var sequenceNumber = 0
            
            for (i in 0 until words.size step wordsPerChunk) {
                delay(100) // Simulate chunk generation time
                
                val chunkWords = words.slice(i..minOf(i + wordsPerChunk - 1, words.size - 1))
                val chunkText = chunkWords.joinToString(" ")
                val estimatedDurationMs = ((chunkWords.size / 150.0) * 60 * 1000).toLong()
                val sampleRate = config.sampleRate
                val audioDurationSamples = (sampleRate * estimatedDurationMs / 1000).toInt()
                val audioData = ByteArray(audioDurationSamples * 2)
                
                val isLast = (i + wordsPerChunk) >= words.size
                
                chunkChannel.send(TtsAudioChunk(
                    audioData = audioData,
                    isLast = isLast,
                    sequenceNumber = sequenceNumber++,
                    sampleRate = sampleRate
                ))
            }
            
            chunkChannel.close()
        }
        
        return chunkChannel
    }
    
    override fun getSupportedVoices(): List<VoiceInfo> {
        return listOf(
            VoiceInfo("default-female-en", "en-IN", "Default Female (English)", VoiceGender.FEMALE, VoiceQuality.MEDIUM),
            VoiceInfo("default-male-en", "en-IN", "Default Male (English)", VoiceGender.MALE, VoiceQuality.MEDIUM),
            VoiceInfo("default-female-hi", "hi-IN", "Default Female (Hindi)", VoiceGender.FEMALE, VoiceQuality.MEDIUM),
            VoiceInfo("default-male-hi", "hi-IN", "Default Male (Hindi)", VoiceGender.MALE, VoiceQuality.MEDIUM),
            VoiceInfo("default-female-te", "te-IN", "Default Female (Telugu)", VoiceGender.FEMALE, VoiceQuality.MEDIUM),
            VoiceInfo("default-male-te", "te-IN", "Default Male (Telugu)", VoiceGender.MALE, VoiceQuality.MEDIUM),
            VoiceInfo("default-female-bn", "bn-IN", "Default Female (Bengali)", VoiceGender.FEMALE, VoiceQuality.MEDIUM),
            VoiceInfo("default-male-bn", "bn-IN", "Default Male (Bengali)", VoiceGender.MALE, VoiceQuality.MEDIUM)
        )
    }
    
    override fun getVoicesForLanguage(language: String): List<VoiceInfo> {
        return getSupportedVoices().filter { it.language == language }
    }
    
    override val isReady: Boolean = true
    
    override suspend fun initialize(): Boolean {
        delay(300) // Simulate model loading
        return true
    }
    
    override fun release() {
        scope.coroutineContext[Job]?.cancel()
    }
    
    override fun stop() {
        // No-op for mock
    }
}