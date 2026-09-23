package com.itantra.data.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.itantra.core.model.Message
import com.itantra.core.model.MessageStatus
import com.itantra.core.model.Priority
import kotlinx.serialization.Serializable

/**
 * Room entity mirroring [com.itantra.core.model.Message].
 * Persists outbound and inbound messages for offline history.
 */
@Serializable
@Entity(
    tableName = "messages",
    indices = [
        Index(value = ["channel_id"]),
        Index(value = ["source_node_id"]),
        Index(value = ["timestamp"]),
        Index(value = ["status"])
    ]
)
data class MessageEntity(
    @PrimaryKey
    @ColumnInfo(name = "message_id")
    val messageId: Long,

    @ColumnInfo(name = "source_node_id")
    val sourceNodeId: Int,

    @ColumnInfo(name = "destination_node_id")
    val destinationNodeId: Int,

    @ColumnInfo(name = "channel_id")
    val channelId: String,

    @ColumnInfo(name = "text")
    val text: String,

    @ColumnInfo(name = "language")
    val language: String,

    @ColumnInfo(name = "timestamp")
    val timestamp: Long,

    @ColumnInfo(name = "priority")
    val priority: Priority,

    @ColumnInfo(name = "status")
    val status: MessageStatus,

    @ColumnInfo(name = "hop_count")
    val hopCount: Int,

    @ColumnInfo(name = "ttl")
    val ttl: Int,

    @ColumnInfo(name = "is_emergency")
    val isEmergency: Boolean,

    @ColumnInfo(name = "is_broadcast")
    val isBroadcast: Boolean,

    @ColumnInfo(name = "received_at")
    val receivedAt: Long?,

    @ColumnInfo(name = "translated_text")
    val translatedText: String?,

    @ColumnInfo(name = "translated_language")
    val translatedLanguage: String?,

    @ColumnInfo(name = "stored_at")
    val storedAt: Long = System.currentTimeMillis()
) {
    fun toModel(): Message = Message(
        messageId = messageId,
        sourceNodeId = sourceNodeId,
        destinationNodeId = destinationNodeId,
        channelId = channelId,
        text = text,
        language = language,
        timestamp = timestamp,
        priority = priority,
        status = status,
        hopCount = hopCount,
        ttl = ttl,
        isEmergency = isEmergency,
        isBroadcast = isBroadcast,
        receivedAt = receivedAt,
        translatedText = translatedText,
        translatedLanguage = translatedLanguage
    )

    companion object {
        fun fromModel(message: Message): MessageEntity = MessageEntity(
            messageId = message.messageId,
            sourceNodeId = message.sourceNodeId,
            destinationNodeId = message.destinationNodeId,
            channelId = message.channelId,
            text = message.text,
            language = message.language,
            timestamp = message.timestamp,
            priority = message.priority,
            status = message.status,
            hopCount = message.hopCount,
            ttl = message.ttl,
            isEmergency = message.isEmergency,
            isBroadcast = message.isBroadcast,
            receivedAt = message.receivedAt,
            translatedText = message.translatedText,
            translatedLanguage = message.translatedLanguage
        )
    }
}