package com.itantra.core.ai

import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.Random

/**
 * Mock Speech-to-Text implementation for testing.
 * Simulates transcription with configurable delay and results.
 */
class MockSpeechToText(
    private val config: SttConfig = SttConfig(),
    private val simulatedDelayMs: Long = 1200,
    private val defaultConfidence: Float = 0.92f
) : SpeechToText {
    
    private val initialized = false
    private val mockTranscriptions = mapOf(
        "en" to listOf(
            "Flood warning. Move to a safe area immediately.",
            "Medical assistance needed at this location.",
            "Evacuate now to higher ground. Follow instructions.",
            "Fire reported in the area. Stay away and be safe.",
            "Strong tremors detected. Move to open area."
        ),
        "hi" to listOf(
            "बाढ़ की चेतावनी। तुरंत सुरक्षित क्षेत्र में जाएं।",
            "इस स्थान पर चिकित्सा सहायता की आवश्यकता है।",
            "अब ऊंचे इलाके में खाली करें। निर्देशों का पालन करें।",
            "क्षेत्र में आग की सूचना। दूर रहें और सुरक्षित रहें।",
            "मजबूत झटके महसूस किए गए। खुले क्षेत्र में जाएं।"
        ),
        "te" to listOf(
            "వెల్లువ కొత్తు. உடனडी సురక్షిత ప్రాంతానికి వెళ்ளండి.",
            "ఈ స్థానంలో వైద్య సహాయం అవసరం.",
            "ఇప్పుడు ఉన్నత భూమికు ਖాలీ చేయండి. నిర్దేశాలను అనుసరించండి.",
            "ప్రదేశంలో آگ nhânंदా. దూరంగా ఉండండి, సురక్షితంగా ఉండండి.",
            "బలమైన కంప/pull coclasss şirketler. खुले क्षेत्र में जाएं."
        ),
        "bn" to listOf(
            "বন্যা সতর্কতা। অবিলম্বে নিরাপদ এলাকায় যান।",
            "এই অবস্থানে চিকিৎসা সহায়তা প্রয়োজন।",
            "এখন উঁচু জমিতে খালি করুন। নির্দেশাবলী মানুন।",
            "এলাকায় আগুন সংবাদ। দূরে থাকুন এবং নিরাপদ থাকুন।",
            "শক্তিশালী কম্পন সনাক্ত। খুলামাঠে যান।"
        )
    )
    
    private val random = Random()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    override suspend fun transcribe(audio: ByteArray, language: String): TranscriptionResult {
        // Simulate processing delay
        delay(simulatedDelayMs + random.nextLong(500))
        
        val transcriptions = mockTranscriptions[language] ?: mockTranscriptions["en"]!!
        val text = transcriptions.random()
        
        return TranscriptionResult(
            text = text,
            language = language,
            confidence = defaultConfidence,
            isPartial = false,
            durationMs = simulatedDelayMs,
            startTimeMs = System.currentTimeMillis() - simulatedDelayMs,
            endTimeMs = System.currentTimeMillis()
        )
    }
    
    override fun transcribeStream(audioFrames: ReceiveChannel<ByteArray>, language: String): ReceiveChannel<TranscriptionResult> {
        val resultChannel = Channel<TranscriptionResult>(50)
        
        scope.launch {
            var frameCount = 0
            audioFrames.consumeEach { frame ->
                frameCount++
                // Send partial result every 10 frames
                if (frameCount % 10 == 0) {
                    val partialText = mockTranscriptions[language]?.random()?.take(frameCount * 2) ?: "Processing..."
                    resultChannel.send(TranscriptionResult(
                        text = partialText,
                        language = language,
                        confidence = 0.5f,
                        isPartial = true,
                        startTimeMs = System.currentTimeMillis() - 1000,
                        endTimeMs = System.currentTimeMillis()
                    ))
                }
            }
            
            // Send final result
            val finalText = mockTranscriptions[language]?.random() ?: "Transcription complete"
            resultChannel.send(TranscriptionResult(
                text = finalText,
                language = language,
                confidence = defaultConfidence,
                isPartial = false,
                durationMs = simulatedDelayMs,
                startTimeMs = System.currentTimeMillis() - simulatedDelayMs,
                endTimeMs = System.currentTimeMillis()
            ))
            
            resultChannel.close()
        }
        
        return resultChannel
    }
    
    override fun getSupportedLanguages(): List<LanguageInfo> {
        return listOf(
            LanguageInfo("en-IN", "English", "English", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("hi-IN", "Hindi", "हिंदी", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("te-IN", "Telugu", "తెలుగు", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("bn-IN", "Bengali", "বাংলা", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("mr-IN", "Marathi", "मराठी", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("ta-IN", "Tamil", "தமிழ்", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("kn-IN", "Kannada", "ಕನ್ನಡ", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("ml-IN", "Malayalam", "മലയാളം", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("gu-IN", "Gujarati", "ગુજરાતી", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("or-IN", "Odia", "ଓଡ଼ିଆ", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION)),
            LanguageInfo("pa-IN", "Punjabi", "ਪੰਜਾਬੀ", setOf(SttFeature.STREAMING, SttFeature.PUNCTUATION))
        )
    }
    
    override val isReady: Boolean = true
    
    override suspend fun initialize(): Boolean {
        delay(500) // Simulate model loading
        return true
    }
    
    override fun release() {
        scope.coroutineContext[Job]?.cancel()
    }
}