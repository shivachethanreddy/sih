package com.itantra.core.reliability

import com.itantra.core.model.Message
import com.itantra.core.model.MessageStatus
import com.itantra.core.model.Packet
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicInteger

/**
 * Tracks delivery status of messages through the network.
 * Provides visibility into message lifecycle from send to delivery/ACK.
 */
class DeliveryTracker(
    private val maxTrackedMessages: Int = 500,
    private val deliveryTimeoutMs: Long = 30000
) {
    // Tracks all messages by messageId
    private val messageStates = ConcurrentHashMap<Long, DeliveryState>()
    
    // Channel for delivery status updates
    private val statusChannel = Channel<DeliveryUpdate>(100)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val totalTracked = AtomicLong(0)
    private val deliveredCount = AtomicLong(0)
    private val failedCount = AtomicLong(0)
    private val pendingCount = AtomicLong(0)
    
    data class DeliveryState(
        val messageId: Long,
        val sourceNodeId: Int,
        val destinationNodeId: Int,
        var status: MessageStatus = MessageStatus.PENDING,
        var hopCount: Int = 0,
        var relayPath: MutableList<Int> = mutableListOf(),
        var sentAt: Long? = null,
        var deliveredAt: Long? = null,
        var ackedAt: Long? = null,
        var failedAt: Long? = null,
        var failureReason: String? = null,
        var lastActivityAt: Long = System.currentTimeMillis()
    )
    
    data class DeliveryUpdate(
        val messageId: Long,
        val previousStatus: MessageStatus,
        val newStatus: MessageStatus,
        val timestamp: Long = System.currentTimeMillis(),
        val hopCount: Int,
        val relayNodeId: Int? = null,
        val failureReason: String? = null
    )

    /**
     * Start tracking a new message.
     */
    fun trackMessage(message: Message): DeliveryState {
        val state = DeliveryState(
            messageId = message.messageId,
            sourceNodeId = message.sourceNodeId,
            destinationNodeId = message.destinationNodeId,
            status = message.status,
            hopCount = message.hopCount
        )
        
        val previous = messageStates.putIfAbsent(message.messageId, state)
        if (previous == null) {
            totalTracked.incrementAndGet()
            pendingCount.incrementAndGet()
            emitUpdate(DeliveryUpdate(
                messageId = message.messageId,
                previousStatus = MessageStatus.PENDING,
                newStatus = state.status,
                hopCount = state.hopCount
            ))
            
            // Start delivery timeout
            if (message.priority != com.itantra.core.model.Priority.EMERGENCY) {
                startDeliveryTimeout(message.messageId)
            }
        }
        
        return state
    }

    /**
     * Update status when message is sent.
     */
    fun markSent(messageId: Long): Boolean {
        val state = messageStates[messageId] ?: return false
        updateStatus(messageId, MessageStatus.SENDING) { it.copy(sentAt = System.currentTimeMillis()) }
        return true
    }

    /**
     * Update status when message is queued for transmission.
     */
    fun markQueued(messageId: Long): Boolean {
        return updateStatus(messageId, MessageStatus.PENDING)
    }

    /**
     * Update status when message transmission starts.
     */
    fun markTransmitting(messageId: Long): Boolean {
        return updateStatus(messageId, MessageStatus.SENDING)
    }

    /**
     * Update status when message is acknowledged.
     */
    fun markDelivered(messageId: Long, relayPath: List<Int> = emptyList()): Boolean {
        val success = updateStatus(messageId, MessageStatus.DELIVERED) { state ->
            state.copy(
                deliveredAt = System.currentTimeMillis(),
                relayPath = state.relayPath.toMutableList().apply { addAll(relayPath) },
                hopCount = relayPath.size
            )
        }
        if (success) {
            deliveredCount.incrementAndGet()
            pendingCount.decrementAndGet()
        }
        return success
    }

    /**
     * Update status when ACK received.
     */
    fun markAcknowledged(messageId: Long): Boolean {
        val success = updateStatus(messageId, MessageStatus.ACKNOWLEDGED) { state ->
            state.copy(ackedAt = System.currentTimeMillis())
        }
        return success
    }

    /**
     * Update status when message delivery fails.
     */
    fun markFailed(messageId: Long, reason: String): Boolean {
        val success = updateStatus(messageId, MessageStatus.FAILED) { state ->
            state.copy(
                failedAt = System.currentTimeMillis(),
                failureReason = reason
            )
        }
        if (success) {
            failedCount.incrementAndGet()
            pendingCount.decrementAndGet()
        }
        return success
    }

    /**
     * Update status when message is relayed through a node.
     */
    fun markRelayed(messageId: Long, relayNodeId: Int, newHopCount: Int): Boolean {
        val state = messageStates[messageId] ?: return false
        
        val updatedPath = state.relayPath.toMutableList().apply { add(relayNodeId) }
        
        return updateStatus(messageId, MessageStatus.SENT) { state ->
            state.copy(
                hopCount = newHopCount,
                relayPath = updatedPath,
                lastActivityAt = System.currentTimeMillis()
            )
        }
    }

    /**
     * Update status when message is received locally.
     */
    fun markReceived(messageId: Long): Boolean {
        return updateStatus(messageId, MessageStatus.RECEIVED)
    }

    /**
     * Get current delivery state for a message.
     */
    fun getState(messageId: Long): DeliveryState? {
        return messageStates[messageId]
    }

    /**
     * Get all tracked messages.
     */
    fun getAllStates(): List<DeliveryState> {
        return messageStates.values.toList()
    }

    /**
     * Get messages by status.
     */
    fun getMessagesByStatus(status: MessageStatus): List<DeliveryState> {
        return messageStates.values.filter { it.status == status }.toList()
    }

    /**
     * Get pending messages (not yet delivered/failed).
     */
    fun getPendingMessages(): List<DeliveryState> {
        return messageStates.values
            .filter { it.status !in setOf(MessageStatus.DELIVERED, MessageStatus.ACKNOWLEDGED, MessageStatus.FAILED, MessageStatus.EXPIRED) }
            .toList()
    }

    /**
     * Get the channel of delivery status updates.
     */
    fun deliveryUpdates(): ReceiveChannel<DeliveryUpdate> = statusChannel

    /**
     * Get delivery statistics.
     */
    fun getStats(): DeliveryStats {
        val states = messageStates.values
        val avgHops = if (states.isNotEmpty()) {
            states.map { it.hopCount }.average()
        } else 0.0
        
        return DeliveryStats(
            totalTracked = totalTracked.get(),
            currentlyTracked = messageStates.size,
            delivered = deliveredCount.get(),
            failed = failedCount.get(),
            pending = pendingCount.get(),
            averageHops = avgHops
        )
    }

    /**
     * Clean up old completed deliveries.
     */
    fun cleanupOldDeliveries(maxAgeMs: Long = 3600000): Int { // 1 hour default
        val now = System.currentTimeMillis()
        val cutoff = now - maxAgeMs
        
        val toRemove = messageStates.entries
            .filter { entry ->
                val state = entry.value
                state.status in setOf(MessageStatus.DELIVERED, MessageStatus.ACKNOWLEDGED, MessageStatus.FAILED, MessageStatus.EXPIRED)
                && (state.ackedAt ?: state.deliveredAt ?: state.failedAt ?: state.lastActivityAt) < cutoff
            }
            .map { it.key }
        
        toRemove.forEach { messageStates.remove(it) }
        return toRemove.size
    }

    /**
     * Shutdown the tracker.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        statusChannel.close()
        messageStates.clear()
    }

    private fun updateStatus(
        messageId: Long,
        newStatus: MessageStatus,
        modifier: (DeliveryState) -> DeliveryState = { it }
    ): Boolean {
        val state = messageStates[messageId] ?: return false
        
        val previousStatus = state.status
        if (previousStatus == newStatus) return true
        
        // Don't allow backward transitions from terminal states
        if (previousStatus in setOf(MessageStatus.DELIVERED, MessageStatus.ACKNOWLEDGED, MessageStatus.FAILED, MessageStatus.EXPIRED)
            && newStatus !in setOf(MessageStatus.DELIVERED, MessageStatus.ACKNOWLEDGED, MessageStatus.FAILED, MessageStatus.EXPIRED)) {
            return false
        }
        
        val updatedState = modifier(state.copy(
            status = newStatus,
            lastActivityAt = System.currentTimeMillis()
        ))
        
        messageStates[messageId] = updatedState
        
        emitUpdate(DeliveryUpdate(
            messageId = messageId,
            previousStatus = previousStatus,
            newStatus = newStatus,
            hopCount = updatedState.hopCount
        ))
        
        return true
    }

    private fun emitUpdate(update: DeliveryUpdate) {
        scope.launch {
            statusChannel.send(update)
        }
    }

    private fun startDeliveryTimeout(messageId: Long) {
        scope.launch {
            delay(deliveryTimeoutMs)
            val state = messageStates[messageId]
            if (state != null && state.status !in setOf(MessageStatus.DELIVERED, MessageStatus.ACKNOWLEDGED, MessageStatus.FAILED, MessageStatus.EXPIRED)) {
                updateStatus(messageId, MessageStatus.EXPIRED) { it.copy(
                    failedAt = System.currentTimeMillis(),
                    failureReason = "Delivery timeout"
                )}
                failedCount.incrementAndGet()
                pendingCount.decrementAndGet()
            }
        }
    }

    data class DeliveryStats(
        val totalTracked: Long,
        val currentlyTracked: Int,
        val delivered: Long,
        val failed: Long,
        val pending: Long,
        val averageHops: Double
    )
}