package com.itantra.core.audio

/**
 * Audio configuration constants for the iTANTRA communication system.
 * Uses 16kHz mono PCM 16-bit as standard for voice communication.
 */
object AudioConfig {
    // Standard voice communication settings
    const val SAMPLE_RATE: Int = 16000 // 16 kHz
    const val CHANNEL_CONFIG: Int = android.media.AudioFormat.CHANNEL_IN_MONO
    const val AUDIO_FORMAT: Int = android.media.AudioFormat.ENCODING_PCM_16BIT
    
    // Buffer sizes
    const val RECORD_BUFFER_MS: Int = 100 // 100ms buffer
    const val PLAYBACK_BUFFER_MS: Int = 100
    
    // Calculated buffer sizes in bytes
    val RECORD_BUFFER_SIZE: Int = calculateBufferSize(SAMPLE_RATE, RECORD_BUFFER_MS)
    val PLAYBACK_BUFFER_SIZE: Int = calculateBufferSize(SAMPLE_RATE, PLAYBACK_BUFFER_MS)
    
    // Audio source for recording
    const val AUDIO_SOURCE: Int = android.media.MediaRecorder.AudioSource.VOICE_COMMUNICATION
    
    // Audio stream type for playback
    const val STREAM_TYPE: Int = android.media.AudioManager.STREAM_VOICE_CALL
    
    // Voice Activity Detection
    const val VAD_FRAME_MS: Int = 20 // 20ms frames for VAD
    const val VAD_FRAME_SIZE: Int = (SAMPLE_RATE * VAD_FRAME_MS / 1000) * 2 // bytes (16-bit)
    
    private fun calculateBufferSize(sampleRate: Int, durationMs: Int): Int {
        val bytesPerSample = 2 // 16-bit = 2 bytes
        val channels = 1 // mono
        return (sampleRate * durationMs / 1000) * channels * bytesPerSample
    }
    
    /**
     * Get minimum buffer size required by AudioRecord for this config.
     */
    fun getMinRecordBufferSize(): Int {
        return android.media.AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT
        )
    }
    
    /**
     * Get minimum buffer size required by AudioTrack for this config.
     */
    fun getMinPlaybackBufferSize(): Int {
        return android.media.AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            android.media.AudioFormat.CHANNEL_OUT_MONO,
            AUDIO_FORMAT
        )
    }
}