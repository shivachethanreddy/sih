package com.itantra.core.reliability

import com.itantra.core.model.AckPayload
import com.itantra.core.model.AckStatus
import com.itantra.core.model.Packet
import com.itantra.core.protocol.CRC16
import com.itantra.core.protocol.PacketBuilder
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Manages ACK sending and tracking for outgoing packets.
 * Handles ACK timeout, retry coordination, and duplicate detection.
 */
class AckManager(
    private val packetBuilder: PacketBuilder = PacketBuilder(),
    private val crc16: CRC16 = CRC16(),
    private val ackTimeoutMs: Long = 5000,
    private val maxPendingAcks: Int = 1000
) {
    // Tracks sent packets waiting for ACK
    private val pendingAcks = ConcurrentHashMap<Long, AckContext>()
    
    // Tracks received message IDs for duplicate detection
    private val receivedMessageIds = ConcurrentHashMap<Long, Long>() // messageId -> receivedAt
    private val receivedIdsAccessOrder = mutableListOf<Long>()
    
    // Channel for outgoing ACK packets to be sent
    private val ackSendChannel = Channel<Packet>(100)
    
    // Coroutine scope for background tasks
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val ackSentCount = AtomicLong(0)
    private val ackReceivedCount = AtomicLong(0)
    private val duplicateCount = AtomicLong(0)
    
    data class AckContext(
        val messageId: Long,
        val destinationNodeId: Int,
        val priority: com.itantra.core.model.Priority,
        val sentAt: Long = System.currentTimeMillis(),
        val retryCount: Int = 0,
        val originalPacket: Packet? = null,
        val completer: CompletableDeferred<AckStatus> = CompletableDeferred()
    )

    /**
     * Register a sent packet that expects an ACK.
     * Returns a Deferred that completes when ACK is received or times out.
     */
    fun registerSentPacket(
        messageId: Long,
        destinationNodeId: Int,
        priority: com.itantra.core.model.Priority,
        originalPacket: Packet? = null
    ): Deferred<AckStatus> {
        val context = AckContext(
            messageId = messageId,
            destinationNodeId = destinationNodeId,
            priority = priority,
            originalPacket = originalPacket
        )
        
        val previous = pendingAcks.putIfAbsent(messageId, context)
        if (previous != null) {
            // Already tracking this message ID
            return previous.completer
        }
        
        // Start timeout coroutine
        scope.launch {
            delay(getAckTimeout(priority))
            val removed = pendingAcks.remove(messageId)
            if (removed != null && !removed.completer.isCompleted) {
                removed.completer.complete(AckStatus.EXPIRED)
            }
        }
        
        // Cleanup old entries if needed
        if (pendingAcks.size > maxPendingAcks) {
            cleanupOldEntries()
        }
        
        return context.completer
    }

    /**
     * Process an incoming ACK packet.
     * Completes the corresponding pending ACK context.
     */
    fun processAck(ackPacket: Packet): Boolean {
        val ackPayload = AckPayload.fromByteArray(ackPacket.payload)
        if (ackPayload == null) return false
        
        val originalMessageId = ackPayload.originalMessageId
        val context = pendingAcks.remove(originalMessageId)
        
        if (context != null) {
            if (!context.completer.isCompleted) {
                context.completer.complete(ackPayload.status)
                ackReceivedCount.incrementAndGet()
            }
            return true
        }
        
        // No pending ACK for this message - could be duplicate or late ACK
        return false
    }

    /**
     * Check if a message ID has been received recently (duplicate detection).
     * Returns true if this is a duplicate.
     */
    fun isDuplicate(messageId: Long): Boolean {
        val now = System.currentTimeMillis()
        val existing = receivedMessageIds.putIfAbsent(messageId, now)
        
        if (existing != null) {
            duplicateCount.incrementAndGet()
            return true
        }
        
        receivedIdsAccessOrder.add(messageId)
        cleanupOldReceivedIds(now)
        return false
    }

    /**
     * Mark a message as received (for duplicate detection).
     */
    fun markReceived(messageId: Long) {
        val now = System.currentTimeMillis()
        receivedMessageIds.putIfAbsent(messageId, now)
        receivedIdsAccessOrder.add(messageId)
        cleanupOldReceivedIds(now)
    }

    /**
     * Create and queue an ACK packet for sending.
     */
    suspend fun sendAck(
        originalMessageId: Long,
        receiverNodeId: Int,
        senderNodeId: Int,
        status: AckStatus
    ): Packet {
        val ackPacket = PacketBuilder.createAckPacket(
            originalMessageId = originalMessageId,
            receiverNodeId = receiverNodeId,
            senderNodeId = senderNodeId,
            status = status,
            crc16 = crc16
        )
        ackSendChannel.send(ackPacket)
        ackSentCount.incrementAndGet()
        return ackPacket
    }

    /**
     * Get the channel of ACK packets to be sent.
     */
    fun ackPacketsToSend(): ReceiveChannel<Packet> = ackSendChannel

    /**
     * Get timeout based on priority.
     */
    private fun getAckTimeout(priority: com.itantra.core.model.Priority): Long {
        return when (priority) {
            com.itantra.core.model.Priority.EMERGENCY -> 3000L
            com.itantra.core.model.Priority.HIGH -> 4000L
            else -> ackTimeoutMs
        }
    }

    /**
     * Remove oldest pending ACK entries.
     */
    private fun cleanupOldEntries() {
        val now = System.currentTimeMillis()
        val toRemove = pendingAcks.entries
            .filter { now - it.value.sentAt > ackTimeoutMs * 3 }
            .map { it.key }
            .take(pendingAcks.size / 4)
        
        toRemove.forEach { pendingAcks.remove(it) }
    }

    /**
     * Clean up old received message IDs.
     */
    private fun cleanupOldReceivedIds(now: Long) {
        val cutoff = now - 300000 // 5 minutes
        val toRemove = receivedMessageIds.entries
            .filter { it.value < cutoff }
            .map { it.key }
        
        toRemove.forEach { receivedMessageIds.remove(it) }
        receivedIdsAccessOrder.removeAll { it in toRemove }
        
        // Also trim access order list if too large
        if (receivedIdsAccessOrder.size > 2000) {
            val excess = receivedIdsAccessOrder.size - 2000
            val toRemoveFromOrder = receivedIdsAccessOrder.take(excess)
            toRemoveFromOrder.forEach { receivedMessageIds.remove(it) }
            receivedIdsAccessOrder = receivedIdsAccessOrder.drop(excess).toMutableList()
        }
    }

    /**
     * Get statistics.
     */
    fun getStats(): AckStats {
        return AckStats(
            pendingAcks = pendingAcks.size,
            ackSent = ackSentCount.get(),
            ackReceived = ackReceivedCount.get(),
            duplicates = duplicateCount.get(),
            trackedReceivedIds = receivedMessageIds.size
        )
    }

    /**
     * Shutdown the manager.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        ackSendChannel.close()
        pendingAcks.clear()
        receivedMessageIds.clear()
    }

    data class AckStats(
        val pendingAcks: Int,
        val ackSent: Long,
        val ackReceived: Long,
        val duplicates: Long,
        val trackedReceivedIds: Int
    )
}