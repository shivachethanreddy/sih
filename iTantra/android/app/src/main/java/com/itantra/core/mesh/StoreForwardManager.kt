package com.itantra.core.mesh

import com.itantra.core.model.Packet
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicInteger

/**
 * Store-and-forward manager for offline/disconnected peer message delivery.
 * Persists packets when destination is unavailable and retries when peer comes online.
 */
class StoreForwardManager(
    private val maxStoredMessages: Int = 100,
    private val messageExpiryMs: Long = 3600000, // 1 hour
    private val retryIntervalMs: Long = 30000, // 30 seconds
    private val maxRetriesPerMessage: Int = 3
) {
    // Stored messages: nodeId -> list of StoredMessage
    private val storedMessages = ConcurrentHashMap<Int, MutableList<StoredMessage>>()
    
    // Channel for messages ready to retry
    private val retryChannel = Channel<StoredMessage>(200)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val messagesStored = AtomicLong(0)
    private val messagesDelivered = AtomicLong(0)
    private val messagesExpired = AtomicLong(0)
    private val messagesFailed = AtomicLong(0)
    private val retriesAttempted = AtomicLong(0)
    
    data class StoredMessage(
        val packet: Packet,
        val targetNodeId: Int,
        val storedAt: Long = System.currentTimeMillis(),
        val expiresAt: Long = System.currentTimeMillis() + messageExpiryMs,
        var retryCount: Int = 0,
        var lastRetryAt: Long = 0,
        var status: StoreStatus = StoreStatus.PENDING
    )
    
    enum class StoreStatus {
        PENDING,
        RETRYING,
        DELIVERED,
        EXPIRED,
        FAILED
    }

    init {
        startRetryJob()
        startCleanupJob()
    }

    /**
     * Store a packet for later delivery to a specific peer.
     */
    fun store(packet: Packet, targetNodeId: Int): StoreResult {
        val now = System.currentTimeMillis()
        val storedMessage = StoredMessage(
            packet = packet,
            targetNodeId = targetNodeId,
            storedAt = now,
            expiresAt = now + messageExpiryMs
        )
        
        val peerList = storedMessages.getOrPut(targetNodeId) { mutableListOf() }
        
        synchronized(peerList) {
            // Check if already storing this message
            val existing = peerList.find { it.packet.messageId == packet.messageId }
            if (existing != null) {
                return StoreResult.AlreadyStored
            }
            
            // Check capacity
            if (peerList.size >= maxStoredMessages) {
                // Remove oldest expired or pending
                val toRemove = peerList.firstOrNull { it.status == StoreStatus.EXPIRED || it.status == StoreStatus.FAILED }
                    ?: peerList.firstOrNull()
                
                toRemove?.let { peerList.remove(it) }
            }
            
            peerList.add(storedMessage)
        }
        
        messagesStored.incrementAndGet()
        return StoreResult.Stored(storedMessage)
    }

    /**
     * Get all stored messages for a peer (when they come online).
     */
    fun getMessagesForPeer(nodeId: Int): List<StoredMessage> {
        val list = storedMessages.remove(nodeId)
        return list?.toList() ?: emptyList()
    }

    /**
     * Mark a message as delivered (remove from store).
     */
    fun markDelivered(nodeId: Int, messageId: Long): Boolean {
        val list = storedMessages[nodeId] ?: return false
        
        synchronized(list) {
            val index = list.indexOfFirst { it.packet.messageId == messageId }
            if (index >= 0) {
                list[index] = list[index].copy(status = StoreStatus.DELIVERED)
                list.removeAt(index)
                messagesDelivered.incrementAndGet()
                return true
            }
        }
        return false
    }

    /**
     * Mark a message as failed.
     */
    fun markFailed(nodeId: Int, messageId: Long): Boolean {
        val list = storedMessages[nodeId] ?: return false
        
        synchronized(list) {
            val index = list.indexOfFirst { it.packet.messageId == messageId }
            if (index >= 0) {
                list[index] = list[index].copy(status = StoreStatus.FAILED)
                messagesFailed.incrementAndGet()
                return true
            }
        }
        return false
    }

    /**
     * Get messages that are ready for retry.
     */
    fun getMessagesForRetry(): List<StoredMessage> {
        val now = System.currentTimeMillis()
        val retryable = mutableListOf<StoredMessage>()
        
        storedMessages.values.forEach { peerList ->
            synchronized(peerList) {
                peerList.forEach { msg ->
                    if (msg.status == StoreStatus.PENDING || msg.status == StoreStatus.RETRYING) {
                        if (msg.retryCount < maxRetriesPerMessage && now - msg.lastRetryAt >= retryIntervalMs) {
                            retryable.add(msg)
                        }
                    }
                }
            }
        }
        
        return retryable
    }

    /**
     * Trigger retry for all eligible messages.
     */
    fun triggerRetry(): Int {
        val messages = getMessagesForRetry()
        var retried = 0
        
        messages.forEach { msg ->
            val updatedMsg = msg.copy(
                retryCount = msg.retryCount + 1,
                lastRetryAt = System.currentTimeMillis(),
                status = StoreStatus.RETRYING
            )
            
            updateMessage(msg.targetNodeId, msg.packet.messageId, updatedMsg)
            scope.launch {
                retryChannel.send(updatedMsg)
            }
            retried++
            retriesAttempted.incrementAndGet()
        }
        
        return retried
    }

    /**
     * Get the channel of messages to retry.
     */
    fun messagesToRetry(): ReceiveChannel<StoredMessage> = retryChannel

    /**
     * Check if we have stored messages for a peer.
     */
    fun hasStoredMessages(nodeId: Int): Boolean {
        val list = storedMessages[nodeId]
        return list != null && list.isNotEmpty()
    }

    /**
     * Get count of stored messages for a peer.
     */
    fun getStoredCount(nodeId: Int): Int {
        return storedMessages[nodeId]?.size ?: 0
    }

    /**
     * Get total stored message count.
     */
    fun getTotalStoredCount(): Int {
        return storedMessages.values.sumOf { it.size }
    }

    /**
     * Get statistics.
     */
    fun getStats(): StoreForwardStats {
        val pending = storedMessages.values.sumOf { it.count { it.status == StoreStatus.PENDING } }
        val retrying = storedMessages.values.sumOf { it.count { it.status == StoreStatus.RETRYING } }
        
        return StoreForwardStats(
            totalStored = messagesStored.get(),
            delivered = messagesDelivered.get(),
            expired = messagesExpired.get(),
            failed = messagesFailed.get(),
            retriesAttempted = retriesAttempted.get(),
            currentlyPending = pending,
            currentlyRetrying = retrying,
            peersWithStoredMessages = storedMessages.size
        )
    }

    /**
     * Shutdown the manager.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        retryChannel.close()
        storedMessages.clear()
    }

    private fun updateMessage(nodeId: Int, messageId: Long, updated: StoredMessage) {
        val list = storedMessages[nodeId] ?: return
        synchronized(list) {
            val index = list.indexOfFirst { it.packet.messageId == messageId }
            if (index >= 0) {
                list[index] = updated
            }
        }
    }

    private fun startRetryJob() {
        scope.launch {
            while (isActive) {
                delay(retryIntervalMs)
                triggerRetry()
            }
        }
    }

    private fun startCleanupJob() {
        scope.launch {
            while (isActive) {
                delay(60000) // Every minute
                cleanupExpired()
            }
        }
    }

    private fun cleanupExpired() {
        val now = System.currentTimeMillis()
        
        storedMessages.values.forEach { peerList ->
            synchronized(peerList) {
                val expired = peerList.filter { it.expiresAt <= now && it.status != StoreStatus.DELIVERED }
                expired.forEach { msg ->
                    msg.copy(status = StoreStatus.EXPIRED)
                    messagesExpired.incrementAndGet()
                }
                peerList.removeAll { it.status == StoreStatus.EXPIRED || it.status == StoreStatus.FAILED }
            }
        }
        
        // Remove empty peer lists
        storedMessages.entries.removeIf { it.value.isEmpty() }
    }

    sealed class StoreResult {
        data class Stored(val message: StoredMessage) : StoreResult()
        object AlreadyStored : StoreResult()
        object CapacityExceeded : StoreResult()
    }

    data class StoreForwardStats(
        val totalStored: Long,
        val delivered: Long,
        val expired: Long,
        val failed: Long,
        val retriesAttempted: Long,
        val currentlyPending: Int,
        val currentlyRetrying: Int,
        val peersWithStoredMessages: Int
    )
}