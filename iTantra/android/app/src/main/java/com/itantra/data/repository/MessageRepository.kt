package com.itantra.data.repository

import com.itantra.core.model.Message
import com.itantra.core.model.MessageStatus
import com.itantra.data.dao.MessageDao
import com.itantra.data.entity.MessageEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Persists message history and exposes reactive streams of it.
 */
class MessageRepository(
    private val messageDao: MessageDao
) {

    suspend fun save(message: Message): Message = saveEntity(MessageEntity.fromModel(message))

    suspend fun saveAll(messages: List<Message>): List<Message> {
        return messages.map { MessageEntity.fromModel(it) }
            .let { saved ->
                messageDao.upsertAll(saved)
                saved.map { it.toModel() }
            }
    }

    suspend fun saveEntity(entity: MessageEntity): Message {
        messageDao.upsert(entity)
        return entity.toModel()
    }

    suspend fun update(message: Message) {
        messageDao.update(MessageEntity.fromModel(message))
    }

    suspend fun updateStatus(messageId: Long, status: MessageStatus) {
        messageDao.updateStatus(messageId, status)
    }

    fun observeById(messageId: Long): Flow<Message?> =
        messageDao.observeById(messageId).map { it?.toModel() }

    fun observeAll(): Flow<List<Message>> =
        messageDao.observeAll().map { list -> list.map { it.toModel() } }

    fun observeByChannel(channelId: String): Flow<List<Message>> =
        messageDao.observeByChannel(channelId).map { list -> list.map { it.toModel() } }

    fun observeIncoming(channelId: String, selfNodeId: Int): Flow<List<Message>> =
        messageDao.observeIncoming(channelId, selfNodeId).map { list -> list.map { it.toModel() } }

    fun observeAllIncoming(selfNodeId: Int): Flow<List<Message>> =
        messageDao.observeAllIncoming(selfNodeId).map { list -> list.map { it.toModel() } }

    fun observeEmergency(): Flow<List<Message>> =
        messageDao.observeEmergency().map { list -> list.map { it.toModel() } }

    suspend fun getById(messageId: Long): Message? = messageDao.getById(messageId)?.toModel()

    suspend fun getAll(): List<Message> = messageDao.getAll().map { it.toModel() }

    suspend fun getByChannel(channelId: String): List<Message> =
        messageDao.getByChannel(channelId).map { it.toModel() }

    suspend fun getByStatus(vararg statuses: MessageStatus): List<Message> =
        messageDao.getByStatus(*statuses).map { it.toModel() }

    suspend fun getEmergencyByChannel(channelId: String): List<Message> =
        messageDao.getEmergencyByChannel(channelId).map { it.toModel() }

    suspend fun count(): Int = messageDao.count()

    suspend fun countByStatus(vararg statuses: MessageStatus): Int =
        messageDao.countByStatus(*statuses)

    suspend fun deleteById(messageId: Long) {
        messageDao.deleteById(messageId)
    }

    suspend fun prune(limit: Int, channelId: String? = null) {
        messageDao.prune(limit, channelId)
    }

    suspend fun clear() {
        messageDao.clear()
    }
}