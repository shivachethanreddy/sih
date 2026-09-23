package com.itantra.core.model

import kotlinx.serialization.Serializable

@Serializable
data class NetworkState(
    val isInitialized: Boolean = false,
    val isDiscovering: Boolean = false,
    val connectedDevices: List<Device> = emptyList(),
    val discoveredDevices: List<Device> = emptyList(),
    val currentTransport: TransportType = TransportType.MOCK,
    val activeChannel: Channel? = null,
    val pendingMessagesCount: Int = 0,
    val lastSuccessfulTransmission: Long? = null,
    val packetLossRate: Double = 0.0,
    val error: String? = null
) {
    fun copyWithError(error: String?): NetworkState = copy(error = error)
    fun copyWithDiscovery(isDiscovering: Boolean): NetworkState = copy(isDiscovering = isDiscovering)
    fun copyWithDevices(discovered: List<Device>, connected: List<Device>): NetworkState =
        copy(discoveredDevices = discovered, connectedDevices = connected)
    fun copyWithTransport(transport: TransportType): NetworkState = copy(currentTransport = transport)
    fun copyWithChannel(channel: Channel?): NetworkState = copy(activeChannel = channel)
    fun incrementPending(): NetworkState = copy(pendingMessagesCount = pendingMessagesCount + 1)
    fun decrementPending(): NetworkState = copy(pendingMessagesCount = (pendingMessagesCount - 1).coerceAtLeast(0))
    fun recordSuccess(): NetworkState = copy(lastSuccessfulTransmission = System.currentTimeMillis())
    fun recordPacketLoss(rate: Double): NetworkState = copy(packetLossRate = rate)
}

@Serializable
data class RecordingState(
    val state: RecordingStateEnum = RecordingStateEnum.IDLE,
    val audioLevel: Float = 0.0f,
    val durationMs: Long = 0,
    val error: String? = null
) {
    enum class RecordingStateEnum(val value: Int, val label: String) {
        IDLE(0, "Idle"),
        RECORDING(1, "Recording"),
        PROCESSING(2, "Processing"),
        SENDING(3, "Sending"),
        DELIVERED(4, "Delivered"),
        FAILED(5, "Failed");

        companion object {
            fun fromValue(value: Int): RecordingStateEnum = values().firstOrNull { it.value == value } ?: IDLE
        }
    }
}

@Serializable
data class TranslationRequest(
    val messageId: Long,
    val sourceText: String,
    val sourceLanguage: String,
    val targetLanguage: String
)

@Serializable
data class TranslationResult(
    val messageId: Long,
    val translatedText: String,
    val sourceLanguage: String,
    val targetLanguage: String,
    val success: Boolean = true,
    val error: String? = null
)