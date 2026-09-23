package com.itantra.core.model

import kotlinx.serialization.Serializable

@Serializable
data class Message(
    val messageId: Long,
    val sourceNodeId: Int,
    val destinationNodeId: Int,
    val channelId: String,
    val text: String,
    val language: String,
    val timestamp: Long = System.currentTimeMillis(),
    val priority: Priority = Priority.NORMAL,
    val status: MessageStatus = MessageStatus.PENDING,
    val hopCount: Int = 0,
    val ttl: Int = 8,
    val isEmergency: Boolean = false,
    val isBroadcast: Boolean = false,
    val receivedAt: Long? = null,
    val translatedText: String? = null,
    val translatedLanguage: String? = null
) {
    val isIncoming: Boolean
        get() = !isSelfMessage

    val isSelfMessage: Boolean
        get() = sourceNodeId == NodeIdManager.getNodeId()

    val displayText: String
        get() = translatedText?.takeIf { it.isNotBlank() } ?: text

    fun copyWithStatus(newStatus: MessageStatus): Message = copy(status = newStatus)
    fun copyWithTranslation(translatedText: String, targetLanguage: String): Message = copy(
        translatedText = translatedText,
        translatedLanguage = targetLanguage
    )
    fun copyWithHopCount(newHopCount: Int): Message = copy(hopCount = newHopCount)
    fun copyWithTtl(newTtl: Int): Message = copy(ttl = newTtl)
    fun copyAsReceived(): Message = copy(
        status = MessageStatus.RECEIVED,
        receivedAt = System.currentTimeMillis()
    )

    fun toPacket(): Packet = Packet(
        messageId = messageId,
        sourceNodeId = sourceNodeId,
        destinationNodeId = destinationNodeId,
        channelId = channelId,
        payload = text.toByteArray(charset = Charsets.UTF_8),
        language = language,
        priority = priority,
        hopCount = hopCount,
        ttl = ttl,
        isEmergency = isEmergency,
        isBroadcast = isBroadcast,
        timestamp = timestamp
    )

    companion object {
        fun createTextMessage(
            text: String,
            language: String,
            channelId: String,
            destinationNodeId: Int = 0xFFFF,
            priority: Priority = Priority.NORMAL,
            isEmergency: Boolean = false
        ): Message {
            return Message(
                messageId = MessageIdGenerator.generate(),
                sourceNodeId = NodeIdManager.getNodeId(),
                destinationNodeId = destinationNodeId,
                channelId = channelId,
                text = text,
                language = language,
                priority = priority,
                isEmergency = isEmergency,
                isBroadcast = destinationNodeId == 0xFFFF
            )
        }

        fun createEmergencyAlert(
            alertType: EmergencyType,
            text: String,
            language: String,
            channelId: String
        ): Message {
            return createTextMessage(
                text = text,
                language = language,
                channelId = channelId,
                priority = Priority.EMERGENCY,
                isEmergency = true
            ).copy(
                messageId = MessageIdGenerator.generate()
            )
        }
    }
}

enum class EmergencyType(val value: Int, val label: String) {
    FLOOD(0, "Flood"),
    FIRE(1, "Fire"),
    EARTHQUAKE(2, "Earthquake"),
    EVACUATION(3, "Evacuation"),
    MEDICAL(4, "Medical"),
    GENERAL_WARNING(5, "General Warning"),
    SOS(6, "SOS");

    companion object {
        fun fromValue(value: Int): EmergencyType = values().firstOrNull { it.value == value } ?: GENERAL_WARNING
    }
}