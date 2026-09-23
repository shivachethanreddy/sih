package com.itantra.core.audio

import android.media.AudioTrack
import android.media.AudioFormat
import android.media.AudioManager
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Audio player using Android's AudioTrack API.
 * Plays 16kHz mono PCM 16-bit audio for voice communication.
 * Supports streaming playback with buffering.
 */
class AudioPlayer(
    private val config: AudioConfig = AudioConfig
) {
    private var audioTrack: AudioTrack? = null
    private val isPlaying = AtomicBoolean(false)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // Playback data channel
    private val playbackChannel = Channel<ByteArray>(100)
    
    // Statistics
    private val totalFramesPlayed = AtomicLong(0)
    private val totalBytesPlayed = AtomicLong(0)
    private val playbackStartTime = AtomicLong(0)
    private val bufferUnderruns = AtomicLong(0)
    
    // Callbacks
    var onPlaybackError: ((String) -> Unit)? = null
    var onPlaybackComplete: (() -> Unit)? = null
    
    /**
     * Start the audio player.
     * Returns true if started successfully.
     */
    fun startPlayback(): Boolean {
        if (isPlaying.get()) return true
        
        return try {
            val minBufferSize = config.getMinPlaybackBufferSize()
            if (minBufferSize == AudioTrack.ERROR_BAD_VALUE || minBufferSize == AudioTrack.ERROR) {
                throw IllegalStateException("Invalid audio config for playback")
            }
            
            val bufferSize = maxOf(minBufferSize, config.PLAYBACK_BUFFER_SIZE * 4) // Larger buffer for smooth playback
            
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(config.AUDIO_FORMAT)
                        .setSampleRate(config.SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            
            val state = audioTrack?.state ?: AudioTrack.STATE_UNINITIALIZED
            if (state != AudioTrack.STATE_INITIALIZED) {
                throw IllegalStateException("AudioTrack initialization failed: $state")
            }
            
            audioTrack?.play()
            isPlaying.set(true)
            playbackStartTime.set(System.currentTimeMillis())
            totalFramesPlayed.set(0)
            totalBytesPlayed.set(0)
            bufferUnderruns.set(0)
            
            // Start playback loop
            scope.launch { playbackLoop() }
            
            true
        } catch (e: Exception) {
            onPlaybackError?.invoke("Failed to start playback: ${e.message}")
            cleanup()
            false
        }
    }
    
    /**
     * Stop playback.
     */
    fun stopPlayback(): Boolean {
        if (!isPlaying.get()) return true
        
        isPlaying.set(false)
        
        // Wait for playback loop to finish
        scope.coroutineContext[Job]?.join()
        
        cleanup()
        return true
    }
    
    /**
     * Queue audio data for playback.
     * Returns true if data was queued, false if buffer full.
     */
    fun queueAudioData(data: ByteArray): Boolean {
        return if (isPlaying.get()) {
            playbackChannel.trySend(data)
        } else {
            false
        }
    }
    
    /**
     * Queue multiple audio frames for playback.
     */
    fun queueAudioFrames(frames: List<ByteArray>): Int {
        var queued = 0
        frames.forEach { frame ->
            if (queueAudioData(frame)) {
                queued++
            } else {
                bufferUnderruns.incrementAndGet()
            }
        }
        return queued
    }
    
    /**
     * Flush remaining queued audio and wait for playback to complete.
     */
    suspend fun flushAndWait(): Boolean {
        playbackChannel.close()
        
        // Wait for all queued data to play
        while (isPlaying.get() && (audioTrack?.playbackState == AudioTrack.PLAYSTATE_PLAYING)) {
            delay(10)
        }
        
        return true
    }
    
    /**
     * Check if currently playing.
     */
    fun getIsPlaying(): Boolean = isPlaying.get()
    
    /**
     * Get current playback duration in milliseconds.
     */
    fun getPlaybackDurationMs(): Long {
        val start = playbackStartTime.get()
        return if (start > 0 && isPlaying.get()) {
            System.currentTimeMillis() - start
        } else 0
    }
    
    /**
     * Get playback statistics.
     */
    fun getStats(): PlaybackStats {
        return PlaybackStats(
            isPlaying = isPlaying.get(),
            durationMs = getPlaybackDurationMs(),
            totalFrames = totalFramesPlayed.get(),
            totalBytes = totalBytesPlayed.get(),
            bufferUnderruns = bufferUnderruns.get(),
            queuedFrames = playbackChannel.size
        )
    }
    
    /**
     * Release resources.
     */
    fun release() {
        stopPlayback()
        scope.coroutineContext[Job]?.cancel()
        playbackChannel.close()
    }
    
    private fun playbackLoop() {
        val audioTrack = this.audioTrack ?: return
        
        while (isPlaying.get()) {
            try {
                val frame = playbackChannel.receiveOrNull()
                
                if (frame == null) {
                    // Channel closed, flush remaining
                    break
                }
                
                var written = 0
                while (written < frame.size && isPlaying.get()) {
                    val result = audioTrack.write(frame, written, frame.size - written)
                    
                    if (result < 0) {
                        onPlaybackError?.invoke("AudioTrack write error: $result")
                        break
                    }
                    
                    written += result
                }
                
                if (written == frame.size) {
                    totalFramesPlayed.incrementAndGet()
                    totalBytesPlayed.addAndGet(frame.size)
                } else {
                    bufferUnderruns.incrementAndGet()
                }
                
            } catch (e: Exception) {
                onPlaybackError?.invoke("Playback error: ${e.message}")
                break
            }
        }
        
        // Flush remaining data
        audioTrack.flush()
        
        isPlaying.set(false)
        onPlaybackComplete?.invoke()
    }
    
    private fun cleanup() {
        audioTrack?.let {
            try {
                if (it.playState == AudioTrack.PLAYSTATE_PLAYING) {
                    it.stop()
                }
            } catch (e: Exception) {
                // Ignore
            }
            it.release()
        }
        audioTrack = null
    }
    
    data class PlaybackStats(
        val isPlaying: Boolean,
        val durationMs: Long,
        val totalFrames: Long,
        val totalBytes: Long,
        val bufferUnderruns: Long,
        val queuedFrames: Int
    )
}