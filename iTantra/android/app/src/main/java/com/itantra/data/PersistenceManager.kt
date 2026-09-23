package com.itantra.data

import android.content.Context
import com.itantra.core.model.Channel
import com.itantra.data.repository.ChannelRepository
import com.itantra.data.repository.DeviceRepository
import com.itantra.data.repository.MessageRepository

/**
 * Central facade for the iTANTRA offline persistence layer.
 * Bundles the Room database with its repositories.
 */
class PersistenceManager private constructor(
    val messageRepository: MessageRepository,
    val deviceRepository: DeviceRepository,
    val channelRepository: ChannelRepository
) {

    suspend fun seedDefaultChannels() {
        if (channelRepository.getAll().isNotEmpty()) return
        channelRepository.saveAll(DEFAULT_CHANNELS)
    }

    suspend fun clearAll() {
        messageRepository.clear()
        deviceRepository.clear()
        channelRepository.clear()
    }

    fun close() {
        AppDatabase.close()
    }

    companion object {
        private val DEFAULT_CHANNELS: List<Channel> = listOf(
            Channel("c1", "Rescue Operations", "Rescue and evacuation coordination", type = Channel.ChannelType.RESCUE),
            Channel("c2", "Medical Team", "Medical support and triage", type = Channel.ChannelType.MEDICAL),
            Channel("c3", "Public Broadcast", "General public announcements", type = Channel.ChannelType.GENERAL),
            Channel("c4", "Logistics", "Supply and logistics coordination", type = Channel.ChannelType.LOCAL),
            Channel("c5", "Command Center", "Central command and control", type = Channel.ChannelType.GENERAL),
            Channel(
                "ch_3_10",
                "Emergency Mesh 3/10",
                "High priority emergency mesh channel",
                type = Channel.ChannelType.EMERGENCY
            )
        )

        @Volatile
        private var instance: PersistenceManager? = null

        fun getInstance(context: Context): PersistenceManager {
            return instance ?: synchronized(this) {
                instance ?: let {
                    val db = AppDatabase.getInstance(context)
                    PersistenceManager(
                        messageRepository = MessageRepository(db.messageDao()),
                        deviceRepository = DeviceRepository(db.deviceDao()),
                        channelRepository = ChannelRepository(db.channelDao())
                    ).also { instance = it }
                }
            }
        }

        fun resetForTesting() {
            instance = null
        }
    }
}