package com.itantra.core.ai

import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.Random

/**
 * Mock Translator implementation for testing.
 * Simulates translation with configurable delay and mock translations.
 */
class MockTranslator(
    private val config: TranslatorConfig = TranslatorConfig(),
    private val simulatedDelayMs: Long = 800,
    private val defaultConfidence: Float = 0.88f
) : Translator {
    
    // Mock translation dictionary for common emergency phrases
    private val mockTranslations = mapOf(
        "en-IN" to mapOf(
            "hi-IN" to mapOf(
                "Flood warning. Move to a safe area immediately." to "बाढ़ की चेतावनी। तुरंत सुरक्षित क्षेत्र में जाएं।",
                "Medical assistance needed at this location." to "इस स्थान पर चिकित्सा सहायता की आवश्यकता है।",
                "Evacuate now to higher ground. Follow instructions." to "अब ऊंचे इलाके में खाली करें। निर्देशों का पालन करें।",
                "Fire reported in the area. Stay away and be safe." to "क्षेत्र में आग की सूचना। दूर रहें और सुरक्षित रहें।",
                "Strong tremors detected. Move to open area." to "मजबूत झटके महसूस किए गए। खुले क्षेत्र में जाएं।",
                "Water level is rising. Move to safe zone." to "जल स्तर बढ़ रहा है। सुरक्षित क्षेत्र में जाएं।",
                "Emergency! Send help immediately." to "आपातकाल! तुरंत मदद भेजें।"
            ),
            "te-IN" to mapOf(
                "Flood warning. Move to a safe area immediately." to "వెల్లువ కొత్తు. உடனडी సురక్షిత ప్రాంతానికి వెళ్ళండి.",
                "Medical assistance needed at this location." to "ఈ స్థానంలో ವೈద్య సాహాయం అవసరం.",
                "Evacuate now to higher ground. Follow instructions." to "ఇప్పుడు ఉన్నత భూమీదికి ਖాలీ చేయండి. నిర్దేశాలను అనుసరించండి.",
                "Fire reported in the area. Stay away and be safe." to "ప్రదేశంలో 報告. దూరంగా ఉండండి, సురక్షితంగా ఉండండి.",
                "Strong tremors detected. Move to open area." to "బలమైన తৰంగాలు గుర్తించబడ్డాయి. ખુले విస్తృతీకు వెళ்ளండి."
            ),
            "bn-IN" to mapOf(
                "Flood warning. Move to a safe area immediately." to "বন্যা সতর্কতা। অবিলম্বে নিরাপদ এলাকায় যান।",
                "Medical assistance needed at this location." to "এই অবস্থানে চিকিৎসা সহায়তা প্রয়োজন।",
                "Evacuate now to higher ground. Follow instructions." to "এখন উঁচু জমিতে খালি করুন। নির্দেশাবলী মানুন।"
            ),
            "mr-IN" to mapOf(
                "Flood warning. Move to a safe area immediately." to "पूर चेतावनी। तात्काळ सुरक्षित भागात जा।",
                "Medical assistance needed at this location." to "या ठिकाणी वैद्यकीय मदत आवश्यक आहे।"
            )
        ),
        "hi-IN" to mapOf(
            "en-IN" to mapOf(
                "बाढ़ की चेतावनी। तुरंत सुरक्षित क्षेत्र में जाएं।" to "Flood warning. Move to a safe area immediately.",
                "इस स्थान पर चिकित्सा सहायता की आवश्यकता है।" to "Medical assistance needed at this location."
            ),
            "te-IN" to mapOf(
                "बाढ़ की चेतावनी। तुरंत सुरक्षित क्षेत्र में जाएं।" to "వెల్లువ కొత్తు. உடனडी సురక్షిత ప్రాంతానికి వెళ్ళండి."
            )
        )
    )
    
    private val random = Random()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    override suspend fun translate(
        text: String,
        sourceLanguage: String,
        targetLanguage: String
    ): TranslationResult {
        // Simulate processing delay
        delay(simulatedDelayMs + random.nextLong(400))
        
        // Try to find mock translation
        val sourceMap = mockTranslations[sourceLanguage]
        val translatedText = sourceMap
            ?.get(targetLanguage)
            ?.get(text)
            ?: generateMockTranslation(text, sourceLanguage, targetLanguage)
        
        return TranslationResult(
            translatedText = translatedText,
            sourceLanguage = sourceLanguage,
            targetLanguage = targetLanguage,
            confidence = defaultConfidence,
            isPartial = false,
            alternatives = listOf(),
            detectedSourceLanguage = sourceLanguage
        )
    }
    
    private fun generateMockTranslation(text: String, sourceLang: String, targetLang: String): String {
        // Simple mock: add language prefix
        val prefixes = mapOf(
            "hi-IN" to "[Hindi] ",
            "te-IN" to "[Telugu] ",
            "bn-IN" to "[Bengali] ",
            "mr-IN" to "[Marathi] ",
            "ta-IN" to "[Tamil] ",
            "kn-IN" to "[Kannada] ",
            "ml-IN" to "[Malayalam] ",
            "gu-IN" to "[Gujarati] ",
            "or-IN" to "[Odia] ",
            "pa-IN" to "[Punjabi] ",
            "en-IN" to ""
        )
        val prefix = prefixes[targetLang] ?: "[${targetLang.substringBefore('-')}] "
        return "$prefix$text"
    }
    
    override fun translateStream(
        textSegments: ReceiveChannel<String>,
        sourceLanguage: String,
        targetLanguage: String
    ): ReceiveChannel<TranslationResult> {
        val resultChannel = Channel<TranslationResult>(50)
        
        scope.launch {
            textSegments.consumeEach { segment ->
                delay(200) // Simulate per-segment delay
                val result = translate(segment, sourceLanguage, targetLanguage).copy(isPartial = true)
                resultChannel.send(result)
            }
            
            // Send final marker
            resultChannel.send(TranslationResult(
                translatedText = "",
                sourceLanguage = sourceLanguage,
                targetLanguage = targetLanguage,
                confidence = 1f,
                isPartial = false
            ))
            
            resultChannel.close()
        }
        
        return resultChannel
    }
    
    override fun getSupportedLanguagePairs(): List<LanguagePair> {
        val languages = listOf("en-IN", "hi-IN", "te-IN", "bn-IN", "mr-IN", "ta-IN", "kn-IN", "ml-IN", "gu-IN", "or-IN", "pa-IN")
        val pairs = mutableListOf<LanguagePair>()
        
        languages.forEach { source ->
            languages.filter { it != source }.forEach { target ->
                pairs.add(LanguagePair(source, target, TranslationQuality.MEDIUM, "mock-model"))
            }
        }
        
        return pairs
    }
    
    override fun isLanguagePairSupported(sourceLanguage: String, targetLanguage: String): Boolean {
        return sourceLanguage != targetLanguage
    }
    
    override fun getTargetLanguages(sourceLanguage: String): List<String> {
        return listOf("en-IN", "hi-IN", "te-IN", "bn-IN", "mr-IN", "ta-IN", "kn-IN", "ml-IN", "gu-IN", "or-IN", "pa-IN")
            .filter { it != sourceLanguage }
    }
    
    override val isReady: Boolean = true
    
    override suspend fun initialize(): Boolean {
        delay(200) // Simulate model loading
        return true
    }
    
    override fun release() {
        scope.coroutineContext[Job]?.cancel()
    }
}