package com.itantra.bridge

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.itantra.ai.AiFactory
import com.itantra.ai.MockSpeechToText
import com.itantra.ai.MockTextToSpeech
import com.itantra.ai.MockTranslator
import com.itantra.ai.SpeechToText
import com.itantra.ai.TextToSpeechEngine
import com.itantra.ai.Translator
import com.itantra.audio.AudioConfig
import com.itantra.audio.AudioPlayer
import com.itantra.audio.AudioRecorder
import com.itantra.core.ai.SttConfig
import com.itantra.core.ai.TtsConfig
import com.itantra.core.ai.TranslatorConfig
import com.itantra.core.audio.VadConfig
import com.itantra.core.audio.VoiceActivityDetector
import com.itantra.core.communication.BluetoothTransport
import com.itantra.core.communication.MockTransport
import com.itantra.core.communication.Transport
import com.itantra.core.communication.TransportManager
import com.itantra.core.communication.WifiDirectTransport
import com.itantra.core.mesh.MeshRouter
import com.itantra.core.model.ConnectionState
import com.itantra.core.model.Device
import com.itantra.core.model.EmergencyType
import com.itantra.core.model.Message
import com.itantra.core.model.NodeIdManager
import com.itantra.core.model.Priority
import com.itantra.core.model.TransportType
import com.itantra.core.protocol.PacketBuilder
import com.itantra.core.reliability.ReliabilityModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.Charsets
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * iTANTRA React Native Bridge Module
 * Exposes the iTANTRA communication engine to React Native
 */
class ITantraModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val engine = ITantraEngine(reactContext.applicationContext) { type, payload ->
        val map = jsonToMap(payload)
        map.putString("type", type)
        sendEvent("ITantraEvent", map)
    }

    // AI Components
    private val aiFactory = AiFactory(true)
    private val speechToText: SpeechToText = MockSpeechToText()
    private val textToSpeech: TextToSpeechEngine = MockTextToSpeech()
    private val translator: Translator = MockTranslator()
    private val vad: VoiceActivityDetector = aiFactory.getVad(VadConfig())
    
    // Audio Components
    private val audioRecorder = AudioRecorder(AudioConfig)
    private val audioPlayer = AudioPlayer(AudioConfig)
    
    // Recording state
    private val isRecording = AtomicBoolean(false)
    private val recordingChannel = Channel<ByteArray>(100)
    private val audioLevelChannel = Channel<Float>(50)
    private val recordingScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    override fun getName(): String = "ITantraModule"

    @ReactMethod
    fun initialize(promise: Promise) {
        scope.launch {
            try {
                engine.initialize()
                // Initialize AI components
                speechToText.initialize()
                textToSpeech.initialize()
                translator.initialize()
                promise.resolve(jsonToMap(engine.getNetworkStatus()))
            } catch (err: Exception) {
                sendEvent("ITantraEvent", Arguments.createMap().apply {
                    putString("type", "backendError")
                    putString("error", err.message ?: "Initialization failed")
                })
                promise.reject("INIT_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun connect(promise: Promise) {
        scope.launch {
            try {
                engine.startDiscovery()
                promise.resolve(jsonToMap(engine.getNetworkStatus()))
            } catch (err: Exception) {
                promise.reject("CONNECT_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        scope.launch {
            try {
                engine.disconnectAll()
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("DISCONNECT_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun startDiscovery(promise: Promise) {
        connect(promise)
    }

    @ReactMethod
    fun stopDiscovery(promise: Promise) {
        scope.launch {
            try {
                engine.stopDiscovery()
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("STOP_DISCOVERY_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun connectDevice(id: String, promise: Promise) {
        scope.launch {
            try {
                engine.connectDevice(id)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("CONNECT_DEVICE_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun disconnectDevice(id: String, promise: Promise) {
        scope.launch {
            try {
                engine.disconnectDevice(id)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("DISCONNECT_DEVICE_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun startRecording(promise: Promise) {
        try {
            if (audioRecorder.startRecording()) {
                // Start audio level monitoring
                recordingScope.launch {
                    audioRecorder.audioLevels().consumeEach { level ->
                        sendEvent("ITantraEvent", Arguments.createMap().apply {
                            putString("type", "audioLevel")
                            putDouble("level", level.toDouble())
                        })
                    }
                }
                
                // Process audio frames for VAD
                recordingScope.launch {
                    audioRecorder.audioFrames().consumeEach { frame ->
                        recordingChannel.trySend(frame)
                        val vadResult = vad.processFrame(frame)
                        if (vadResult.isSpeech) {
                            sendEvent("ITantraEvent", Arguments.createMap().apply {
                                putString("type", "voiceActivity")
                                putBoolean("isSpeech", true)
                                putDouble("confidence", vadResult.confidence.toDouble())
                            })
                        }
                    }
                }
                
                promise.resolve(true)
            } else {
                promise.reject("RECORD_FAILED", "Failed to start recording")
            }
        } catch (err: Exception) {
            promise.reject("RECORD_FAILED", err)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        scope.launch {
            try {
                audioRecorder.stopRecording()
                
                // Process recorded audio through VAD
                var hasVoiceActivity = false
                var totalFrames = 0
                while (recordingChannel.tryReceive() != null) {
                    totalFrames++
                }
                
                sendEvent("ITantraEvent", Arguments.createMap().apply {
                    putString("type", "recordingStopped")
                    putInt("framesRecorded", totalFrames)
                })
                
                // Transcribe
                sendEvent("ITantraEvent", Arguments.createMap().apply {
                    putString("type", "transcriptionStarted")
                    putString("ai", "MOCK")
                })
                
                // Simulate transcription (use recorded audio)
                scope.launch {
                    delay(1200)
                    val transcription = speechToText.transcribe(ByteArray(0), "en-IN") // In real impl, pass recorded audio
                    sendEvent("ITantraEvent", Arguments.createMap().apply {
                        putString("type", "transcriptionCompleted")
                        putString("text", transcription.text)
                        putString("language", transcription.language)
                        putDouble("confidence", transcription.confidence.toDouble())
                        putString("ai", "MOCK")
                    })
                    promise.resolve(transcription.text)
                }
            } catch (err: Exception) {
                promise.reject("STOP_RECORD_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun sendMessage(text: String, language: String, channelId: String, emergency: Boolean, destinationId: String?, promise: Promise) {
        scope.launch {
            try {
                val result = engine.sendText(text, language, channelId, emergency, destinationId)
                promise.resolve(jsonToMap(result))
            } catch (err: Exception) {
                promise.reject("SEND_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun sendSOS(promise: Promise) {
        scope.launch {
            try {
                promise.resolve(jsonToMap(engine.sendSOS()))
            } catch (err: Exception) {
                promise.reject("SOS_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun sendAlert(type: String, promise: Promise) {
        scope.launch {
            try {
                promise.resolve(jsonToMap(engine.sendAlert(type)))
            } catch (err: Exception) {
                promise.reject("ALERT_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun playTTS(text: String, lang: String?, promise: Promise) {
        val language = lang ?: "en-IN"
        
        sendEvent("ITantraEvent", Arguments.createMap().apply {
            putString("type", "ttsStarted")
            putString("text", text)
            putString("language", language)
            putString("ai", "MOCK")
        })
        
        scope.launch {
            try {
                val result = textToSpeech.speak(text, language)
                if (result.success) {
                    // Play the audio
                    audioPlayer.startPlayback()
                    audioPlayer.queueAudioData(result.audioData)
                    audioPlayer.flushAndWait()
                    
                    sendEvent("ITantraEvent", Arguments.createMap().apply {
                        putString("type", "ttsCompleted")
                        putString("ai", "MOCK")
                    })
                    promise.resolve(true)
                } else {
                    sendEvent("ITantraEvent", Arguments.createMap().apply {
                        putString("type", "ttsError")
                        putString("error", result.error ?: "TTS failed")
                    })
                    promise.reject("TTS_FAILED", result.error ?: "TTS failed")
                }
            } catch (err: Exception) {
                promise.reject("TTS_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun translate(text: String, src: String, tgt: String, promise: Promise) {
        sendEvent("ITantraEvent", Arguments.createMap().apply {
            putString("type", "translationStarted")
            putString("sourceLanguage", src)
            putString("targetLanguage", tgt)
            putString("ai", "MOCK")
        })
        
        scope.launch {
            try {
                val result = translator.translate(text, src, tgt)
                val translated = result.translatedText
                
                sendEvent("ITantraEvent", Arguments.createMap().apply {
                    putString("type", "translationCompleted")
                    putString("text", translated)
                    putString("sourceLanguage", result.sourceLanguage)
                    putString("targetLanguage", result.targetLanguage)
                    putDouble("confidence", result.confidence.toDouble())
                    putString("ai", "MOCK")
                })
                promise.resolve(translated)
            } catch (err: Exception) {
                promise.reject("TRANSLATE_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun getNetworkStatus(promise: Promise) {
        promise.resolve(jsonToMap(engine.getNetworkStatus()))
    }

    @ReactMethod
    fun getDiagnostics(promise: Promise) {
        promise.resolve(jsonToMap(engine.getDiagnostics()))
    }

    @ReactMethod
    fun getDevices(promise: Promise) {
        promise.resolve(jsonArrayToArray(engine.getDevicesJson()))
    }

    @ReactMethod
    fun getMessages(channelId: String?, promise: Promise) {
        promise.resolve(jsonArrayToArray(engine.getMessages(channelId)))
    }

    @ReactMethod
    fun setMode(mode: String, promise: Promise) {
        // In a real implementation, this would switch between public/private modes
        promise.resolve(mode)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required by NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required by NativeEventEmitter
    }

    @ReactMethod
    fun getSupportedLanguages(promise: Promise) {
        scope.launch {
            try {
                val languages = speechToText.getSupportedLanguages()
                val arr = Arguments.createArray()
                languages.forEach { lang ->
                    arr.pushMap(Arguments.createMap().apply {
                        putString("code", lang.code)
                        putString("name", lang.name)
                        putString("nativeName", lang.nativeName)
                    })
                }
                promise.resolve(arr)
            } catch (err: Exception) {
                promise.reject("LANG_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun getSupportedVoices(promise: Promise) {
        scope.launch {
            try {
                val voices = textToSpeech.getSupportedVoices()
                val arr = Arguments.createArray()
                voices.forEach { voice ->
                    arr.pushMap(Arguments.createMap().apply {
                        putString("id", voice.id)
                        putString("language", voice.language)
                        putString("name", voice.name)
                        putString("gender", voice.gender.name)
                        putString("quality", voice.quality.name)
                    })
                }
                promise.resolve(arr)
            } catch (err: Exception) {
                promise.reject("VOICES_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun getSupportedLanguagePairs(promise: Promise) {
        scope.launch {
            try {
                val pairs = translator.getSupportedLanguagePairs()
                val arr = Arguments.createArray()
                pairs.forEach { pair ->
                    arr.pushMap(Arguments.createMap().apply {
                        putString("sourceLanguage", pair.sourceLanguage)
                        putString("targetLanguage", pair.targetLanguage)
                        putString("quality", pair.quality.name)
                    })
                }
                promise.resolve(arr)
            } catch (err: Exception) {
                promise.reject("LANG_PAIRS_FAILED", err)
            }
        }
    }

    @ReactMethod
    fun shutdown(promise: Promise) {
        scope.launch {
            try {
                engine.shutdown()
                audioRecorder.release()
                audioPlayer.release()
                speechToText.release()
                textToSpeech.release()
                translator.release()
                aiFactory.releaseAll()
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("SHUTDOWN_FAILED", err)
            }
        }
    }

    private fun sendEvent(name: String, params: WritableMap) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    private fun jsonToMap(obj: JSONObject): WritableMap {
        val map = Arguments.createMap()
        obj.keys().forEach { key ->
            when (val value = obj.get(key)) {
                is Boolean -> map.putBoolean(key, value)
                is Int -> map.putInt(key, value)
                is Long -> map.putDouble(key, value.toDouble())
                is Double -> map.putDouble(key, value)
                is JSONObject -> map.putMap(key, jsonToMap(value))
                JSONObject.NULL -> map.putNull(key)
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }

    private fun jsonArrayToArray(arr: JSONArray): com.facebook.react.bridge.WritableArray {
        val out = Arguments.createArray()
        for (i in 0 until arr.length()) {
            out.pushMap(jsonToMap(arr.getJSONObject(i)))
        }
        return out
    }
}
