package com.itantra.data.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.itantra.core.model.Channel
import com.itantra.data.entity.ChannelEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data access for persisted [ChannelEntity] definitions.
 */
@Dao
interface ChannelDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(channel: ChannelEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(channels: List<ChannelEntity>)

    @Update
    suspend fun update(channel: ChannelEntity)

    @Query("SELECT * FROM channels WHERE channel_id = :channelId")
    fun observeById(channelId: String): Flow<ChannelEntity?>

    @Query("SELECT * FROM channels WHERE channel_id = :channelId")
    suspend fun getById(channelId: String): ChannelEntity?

    @Query("SELECT * FROM channels ORDER BY type ASC")
    fun observeAll(): Flow<List<ChannelEntity>>

    @Query("SELECT * FROM channels ORDER BY type ASC")
    suspend fun getAll(): List<ChannelEntity>

    @Query("SELECT * FROM channels WHERE is_active = 1 ORDER BY type ASC")
    fun observeActive(): Flow<List<ChannelEntity>>

    @Query("SELECT * FROM channels WHERE is_active = 1 AND type = :type ORDER BY type ASC")
    suspend fun getActiveOfType(type: Channel.ChannelType): List<ChannelEntity>

    @Query("UPDATE channels SET is_active = :active WHERE channel_id = :channelId")
    suspend fun setActive(channelId: String, active: Boolean)

    @Delete
    suspend fun delete(channel: ChannelEntity)

    @Query("DELETE FROM channels WHERE channel_id = :channelId")
    suspend fun deleteById(channelId: String)

    @Query("DELETE FROM channels")
    suspend fun clear()
}