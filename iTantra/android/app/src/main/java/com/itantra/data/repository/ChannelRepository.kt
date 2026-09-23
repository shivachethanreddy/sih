package com.itantra.data.repository

import com.itantra.core.model.Channel
import com.itantra.data.dao.ChannelDao
import com.itantra.data.entity.ChannelEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Persists channel definitions and exposes them as reactive streams.
 */
class ChannelRepository(
    private val channelDao: ChannelDao
) {

    suspend fun save(channel: Channel): Channel = saveEntity(ChannelEntity.fromModel(channel))

    suspend fun saveAll(channels: List<Channel>): List<Channel> {
        return channels.map { ChannelEntity.fromModel(it) }
            .let { saved ->
                channelDao.upsertAll(saved)
                saved.map { it.toModel() }
            }
    }

    suspend fun saveEntity(entity: ChannelEntity): Channel {
        channelDao.upsert(entity)
        return entity.toModel()
    }

    suspend fun update(channel: Channel) {
        channelDao.update(ChannelEntity.fromModel(channel))
    }

    fun observeById(channelId: String): Flow<Channel?> =
        channelDao.observeById(channelId).map { it?.toModel() }

    fun observeAll(): Flow<List<Channel>> =
        channelDao.observeAll().map { list -> list.map { it.toModel() } }

    fun observeActive(): Flow<List<Channel>> =
        channelDao.observeActive().map { list -> list.map { it.toModel() } }

    suspend fun getById(channelId: String): Channel? = channelDao.getById(channelId)?.toModel()

    suspend fun getAll(): List<Channel> = channelDao.getAll().map { it.toModel() }

    suspend fun getActiveOfType(type: Channel.ChannelType): List<Channel> =
        channelDao.getActiveOfType(type).map { it.toModel() }

    suspend fun setActive(channelId: String, active: Boolean) {
        channelDao.setActive(channelId, active)
    }

    suspend fun delete(channelId: String) {
        channelDao.deleteById(channelId)
    }

    suspend fun clear() {
        channelDao.clear()
    }
}