package com.itantra.core.audio

import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.atomic.AtomicLong

/**
 * Mock Voice Activity Detector for testing.
 * Simulates voice detection based on energy threshold.
 * Can be configured to simulate various scenarios.
 */
class MockVoiceActivityDetector(
    private val config: VadConfig = VadConfig(),
    private val speechProbability: Double = 0.7, // Probability of detecting speech when energy is high
    private val falsePositiveRate: Double = 0.05,
    private val falseNegativeRate: Double = 0.1
) : VoiceActivityDetector, StreamingVoiceActivityDetector {
    
    private val frameCount = AtomicLong(0)
    private var lastWasSpeech = false
    private var speechFrameCount = 0
    private var silenceFrameCount = 0
    
    // For simulating speech segments
    private var inSpeechSegment = false
    private var speechSegmentStart = 0L
    
    override fun processFrame(frame: ByteArray): VadResult {
        frameCount.incrementAndGet()
        
        // Calculate energy
        val energy = calculateEnergy(frame)
        
        // Simple energy-based detection with configurable randomness
        val isHighEnergy = energy > config.energyThreshold
        
        var isSpeech = false
        var confidence = 0f
        
        if (isHighEnergy) {
            // High energy - likely speech
            val rand = Math.random()
            if (rand < speechProbability) {
                isSpeech = true
                confidence = (0.7 + rand * 0.3).toFloat() // 0.7-1.0
            } else {
                // False negative
                isSpeech = false
                confidence = (rand * 0.3).toFloat()
            }
        } else {
            // Low energy - likely silence
            val rand = Math.random()
            if (rand < falsePositiveRate) {
                isSpeech = true
                confidence = (rand * 0.5).toFloat()
            } else {
                isSpeech = false
                confidence = (0.8 + rand * 0.2).toFloat() // 0.8-1.0 confidence in silence
            }
        }
        
        // Track speech/silence runs
        if (isSpeech) {
            speechFrameCount++
            silenceFrameCount = 0
            if (!inSpeechSegment) {
                inSpeechSegment = true
                speechSegmentStart = frameCount.get()
            }
        } else {
            silenceFrameCount++
            speechFrameCount = 0
            inSpeechSegment = false
        }
        
        lastWasSpeech = isSpeech
        
        return VadResult(isSpeech, confidence, energy)
    }
    
    override fun reset() {
        frameCount.set(0)
        lastWasSpeech = false
        speechFrameCount = 0
        silenceFrameCount = 0
        inSpeechSegment = false
        speechSegmentStart = 0
    }
    
    override fun getConfig(): VadConfig = config
    
    override val isAvailable: Boolean = true
    
    override fun processStream(frames: ReceiveChannel<ByteArray>): ReceiveChannel<VadResult> {
        val resultChannel = Channel<VadResult>(100)
        
        CoroutineScope(Dispatchers.Default).launch {
            frames.consumeEach { frame ->
                val result = processFrame(frame)
                resultChannel.send(result)
            }
            resultChannel.close()
        }
        
        return resultChannel
    }
    
    override fun detectSpeechSegments(frames: ReceiveChannel<ByteArray>): ReceiveChannel<SpeechSegment> {
        val segmentChannel = Channel<SpeechSegment>(50)
        
        CoroutineScope(Dispatchers.Default).launch {
            var currentSegmentFrames = mutableListOf<VadResult>()
            var segmentStartFrame = 0L
            var segmentStartTime = System.currentTimeMillis()
            var frameIndex = 0L
            
            frames.consumeEach { frame ->
                val result = processFrame(frame)
                frameIndex++
                
                if (result.isSpeech) {
                    if (currentSegmentFrames.isEmpty()) {
                        segmentStartFrame = frameIndex
                        segmentStartTime = System.currentTimeMillis()
                    }
                    currentSegmentFrames.add(result)
                } else if (currentSegmentFrames.isNotEmpty()) {
                    // End of speech segment
                    val segment = SpeechSegment(
                        startFrameIndex = segmentStartFrame,
                        endFrameIndex = frameIndex - 1,
                        startTimeMs = segmentStartTime,
                        endTimeMs = System.currentTimeMillis(),
                        frames = currentSegmentFrames.toList(),
                        averageConfidence = currentSegmentFrames.map { it.confidence }.average()
                    )
                    
                    segmentChannel.send(segment)
                    currentSegmentFrames.clear()
                }
            }
            
            // Send final segment if any
            if (currentSegmentFrames.isNotEmpty()) {
                val segment = SpeechSegment(
                    startFrameIndex = segmentStartFrame,
                    endFrameIndex = frameIndex,
                    startTimeMs = segmentStartTime,
                    endTimeMs = System.currentTimeMillis(),
                    frames = currentSegmentFrames.toList(),
                    averageConfidence = currentSegmentFrames.map { it.confidence }.average()
                )
                segmentChannel.send(segment)
            }
            
            segmentChannel.close()
        }
        
        return segmentChannel
    }
    
    /**
     * Calculate RMS energy of audio frame.
     */
    private fun calculateEnergy(pcmData: ByteArray): Float {
        if (pcmData.size < 2) return 0f
        
        var sumSquares = 0L
        for (i in 0 until pcmData.size step 2) {
            val sample = (pcmData[i + 1].toInt() shl 8) or (pcmData[i].toInt() and 0xFF)
            val signedSample = if (sample > 32767) sample - 65536 else sample
            sumSquares += (signedSample.toLong() * signedSample)
        }
        
        val meanSquare = sumSquares.toDouble() / (pcmData.size / 2)
        val rms = Math.sqrt(meanSquare)
        return (rms / 32767.0).toFloat()
    }
    
    /**
     * Get current statistics.
     */
    fun getStats(): VadStats {
        return VadStats(
            totalFrames = frameCount.get(),
            speechFrames = speechFrameCount,
            silenceFrames = silenceFrameCount,
            speechRatio = if (frameCount.get() > 0) speechFrameCount.toDouble() / frameCount.get() else 0.0
        )
    }
    
    data class VadStats(
        val totalFrames: Long,
        val speechFrames: Int,
        val silenceFrames: Int,
        val speechRatio: Double
    )
}