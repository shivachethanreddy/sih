package com.itantra.data.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.itantra.core.model.MessageStatus
import com.itantra.data.entity.MessageEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data access for persisted [MessageEntity] records.
 */
@Dao
interface MessageDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(message: MessageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(messages: List<MessageEntity>)

    @Update
    suspend fun update(message: MessageEntity)

    @Query("SELECT * FROM messages WHERE message_id = :messageId")
    fun observeById(messageId: Long): Flow<MessageEntity?>

    @Query("SELECT * FROM messages WHERE message_id = :messageId")
    suspend fun getById(messageId: Long): MessageEntity?

    @Query("SELECT * FROM messages ORDER BY timestamp DESC")
    fun observeAll(): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages ORDER BY timestamp DESC")
    suspend fun getAll(): List<MessageEntity>

    @Query("SELECT * FROM messages WHERE channel_id = :channelId ORDER BY timestamp DESC")
    fun observeByChannel(channelId: String): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE channel_id = :channelId ORDER BY timestamp DESC")
    suspend fun getByChannel(channelId: String): List<MessageEntity>

    @Query("SELECT * FROM messages WHERE channel_id = :channelId AND source_node_id != :selfNodeId ORDER BY timestamp DESC")
    fun observeIncoming(channelId: String, selfNodeId: Int): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE source_node_id != :selfNodeId ORDER BY timestamp DESC")
    fun observeAllIncoming(selfNodeId: Int): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE is_emergency = 1 ORDER BY timestamp DESC")
    fun observeEmergency(): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE status IN (:statuses) ORDER BY timestamp DESC")
    suspend fun getByStatus(vararg statuses: MessageStatus): List<MessageEntity>

    @Query("SELECT * FROM messages WHERE channel_id = :channelId AND is_emergency = 1 ORDER BY timestamp DESC")
    suspend fun getEmergencyByChannel(channelId: String): List<MessageEntity>

    @Query("UPDATE messages SET status = :status WHERE message_id = :messageId")
    suspend fun updateStatus(messageId: Long, status: MessageStatus)

    @Query("SELECT COUNT(*) FROM messages")
    suspend fun count(): Int

    @Query("SELECT COUNT(*) FROM messages WHERE status IN (:statuses)")
    suspend fun countByStatus(vararg statuses: MessageStatus): Int

    @Query("DELETE FROM messages WHERE message_id = :messageId")
    suspend fun deleteById(messageId: Long)

    @Delete
    suspend fun delete(message: MessageEntity)

    /**
     * Prunes the persisted history to the newest [limit] records,
     * optionally restricted to a single channel.
     */
    @Query(
        "DELETE FROM messages WHERE message_id IN (" +
            "SELECT message_id FROM messages " +
            "WHERE (:channelId IS NULL OR channel_id = :channelId) " +
            "ORDER BY timestamp DESC LIMIT -1 OFFSET :limit)"
    )
    suspend fun prune(limit: Int, channelId: String?)

    @Query("DELETE FROM messages")
    suspend fun clear()
}