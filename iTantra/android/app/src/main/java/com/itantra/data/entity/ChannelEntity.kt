package com.itantra.data.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.itantra.core.model.Channel
import kotlinx.serialization.Serializable

/**
 * Room entity mirroring [com.itantra.core.model.Channel].
 * Persists channel definitions so they survive app restarts.
 */
@Serializable
@Entity(tableName = "channels")
data class ChannelEntity(
    @PrimaryKey
    @ColumnInfo(name = "channel_id")
    val channelId: String,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "description")
    val description: String,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean,

    @ColumnInfo(name = "type")
    val type: Channel.ChannelType,

    @ColumnInfo(name = "stored_at")
    val storedAt: Long = System.currentTimeMillis()
) {
    fun toModel(): Channel = Channel(
        channelId = channelId,
        name = name,
        description = description,
        isActive = isActive,
        type = type
    )

    companion object {
        fun fromModel(channel: Channel): ChannelEntity = ChannelEntity(
            channelId = channel.channelId,
            name = channel.name,
            description = channel.description,
            isActive = channel.isActive,
            type = channel.type
        )
    }
}