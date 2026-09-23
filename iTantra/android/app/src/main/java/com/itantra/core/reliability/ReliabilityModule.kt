package com.itantra.core.reliability

import com.itantra.core.model.Message
import com.itantra.core.model.MessageStatus
import com.itantra.core.model.NodeIdManager
import com.itantra.core.model.Packet
import com.itantra.core.protocol.CRC16
import com.itantra.core.protocol.PacketBuilder
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.nio.charset.Charsets
import java.util.concurrent.atomic.AtomicLong

/**
 * Combined reliability module that coordinates ACK, Retry, Deduplication, and Delivery Tracking.
 * This is the main entry point for the reliability layer.
 */
class ReliabilityModule(
    private val packetBuilder: PacketBuilder = PacketBuilder(),
    private val crc16: CRC16 = CRC16(),
    private val ackTimeoutMs: Long = 5000,
    private val maxRetries: Int = 3,
    private val emergencyMaxRetries: Int = 5,
    private val baseRetryDelayMs: Long = 1000,
    private val dedupCacheSize: Int = 1000,
    private val dedupTtlMs: Long = 300000,
    private val deliveryTimeoutMs: Long = 30000
) {
    // Sub-components
    val ackManager = AckManager(
        packetBuilder = packetBuilder,
        crc16 = crc16,
        ackTimeoutMs = ackTimeoutMs
    )
    
    val retryManager = RetryManager(
        maxRetries = maxRetries,
        emergencyMaxRetries = emergencyMaxRetries,
        baseDelayMs = baseRetryDelayMs
    )
    
    val deduplicationCache = DeduplicationCache(
        maxSize = dedupCacheSize,
        ttlMs = dedupTtlMs
    )
    
    val deliveryTracker = DeliveryTracker(
        maxTrackedMessages = 500,
        deliveryTimeoutMs = deliveryTimeoutMs
    )
    
    // Channel for packets that need to be sent (including retries and ACKs)
    private val outboundPacketChannel = Channel<OutboundPacket>(200)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Combined stats
    private val packetsProcessed = AtomicLong(0)
    private val duplicatesRejected = AtomicLong(0)
    
    data class OutboundPacket(
        val packet: Packet,
        val destinationNodeId: Int,
        val isRetry: Boolean = false,
        val isAck: Boolean = false,
        val attemptNumber: Int = 1
    )
    
    sealed class ProcessResult {
        data class Success(val packet: Packet) : ProcessResult()
        data class Duplicate(val messageId: Long) : ProcessResult()
        data class Delivered(val messageId: Long) : ProcessResult()
        data class Failed(val messageId: Long, val reason: String) : ProcessResult()
    }

    init {
        // Wire up sub-component channels
        wireUpChannels()
    }

    /**
     * Process an outgoing message for sending.
     * Returns the packet to send and registers for ACK/retry.
     */
    fun processOutgoing(message: Message): OutboundPacket {
        packetsProcessed.incrementAndGet()
        
        // Check for duplicate
        if (deduplicationCache.checkAndAdd(message.messageId)) {
            duplicatesRejected.incrementAndGet()
            return OutboundPacket(
                packet = Packet(messageId = message.messageId, payload = ByteArray(0)),
                destinationNodeId = message.destinationNodeId,
                isRetry = false
            )
        }
        
        // Build packet
        val packet = runBlocking { packetBuilder.buildPacket(message) }
        
        // Track delivery
        deliveryTracker.trackMessage(message)
        deliveryTracker.markSent(message.messageId)
        
        // Register for ACK if not broadcast
        if (!message.isBroadcast) {
            ackManager.registerSentPacket(
                messageId = message.messageId,
                destinationNodeId = message.destinationNodeId,
                priority = message.priority,
                originalPacket = packet
            )
        }
        
        // Register for retry
        retryManager.registerForRetry(packet)
        
        return OutboundPacket(
            packet = packet,
            destinationNodeId = message.destinationNodeId,
            isRetry = false
        )
    }

    /**
     * Process an incoming packet.
     * Returns the message if it should be delivered, null if duplicate/invalid.
     */
    fun processIncoming(packet: Packet, fromNodeId: Int): Message? {
        packetsProcessed.incrementAndGet()
        
        // Check deduplication
        if (deduplicationCache.checkAndAdd(packet.messageId, fromNodeId, packet.hopCount)) {
            duplicatesRejected.incrementAndGet()
            // Send DUPLICATE ACK if not broadcast
            if (!packet.isBroadcast) {
                scope.launch {
                    ackManager.sendAck(
                        originalMessageId = packet.messageId,
                        receiverNodeId = NodeIdManager.getNodeId(),
                        senderNodeId = fromNodeId,
                        status = com.itantra.core.model.AckStatus.DUPLICATE
                    )
                }
            }
            return null
        }
        
        // Mark as received
        deliveryTracker.markReceived(packet.messageId)
        
        // Convert to Message
        val message = packetToMessage(packet, fromNodeId)
        
        // Track delivery
        deliveryTracker.trackMessage(message)
        deliveryTracker.markReceived(message.messageId)
        
        // Send ACK if not broadcast
        if (!packet.isBroadcast && !packet.channelId == "ACK") {
            scope.launch {
                ackManager.sendAck(
                    originalMessageId = packet.messageId,
                    receiverNodeId = NodeIdManager.getNodeId(),
                    senderNodeId = fromNodeId,
                    status = com.itantra.core.model.AckStatus.DELIVERED
                )
            }
        }
        
        return message
    }

    /**
     * Handle an incoming ACK packet.
     */
    fun handleAck(ackPacket: Packet): Boolean {
        val ackProcessed = ackManager.processAck(ackPacket)
        
        if (ackProcessed) {
            val ackPayload = com.itantra.core.model.AckPayload.fromByteArray(ackPacket.payload)
            ackPayload?.let { payload ->
                val messageId = payload.originalMessageId
                when (payload.status) {
                    com.itantra.core.model.AckStatus.DELIVERED -> {
                        deliveryTracker.markDelivered(messageId)
                        retryManager.markDelivered(messageId)
                    }
                    com.itantra.core.model.AckStatus.DUPLICATE -> {
                        // Already handled
                    }
                    com.itantra.core.model.AckStatus.REJECTED -> {
                        deliveryTracker.markFailed(messageId, "Rejected by receiver")
                        retryManager.markFailed(messageId)
                    }
                    com.itantra.core.model.AckStatus.EXPIRED -> {
                        deliveryTracker.markFailed(messageId, "ACK expired")
                        retryManager.markFailed(messageId)
                    }
                }
            }
        }
        
        return ackProcessed
    }

    /**
     * Get the next packet to send (new, retry, or ACK).
     */
    fun outboundPackets(): ReceiveChannel<OutboundPacket> = outboundPacketChannel

    /**
     * Get delivery status updates.
     */
    fun deliveryUpdates() = deliveryTracker.deliveryUpdates()

    /**
     * Get ACK packets to send.
     */
    fun ackPacketsToSend() = ackManager.ackPacketsToSend()

    /**
     * Get retry packets to send.
     */
    fun retryPacketsToSend() = retryManager.packetsToRetry()

    /**
     * Mark a packet as sent (called after successful transmission).
     */
    fun markPacketSent(messageId: Long) {
        deliveryTracker.markTransmitting(messageId)
    }

    /**
     * Manually trigger retry for a message.
     */
    fun triggerRetry(messageId: Long): Boolean {
        return retryManager.triggerRetry(messageId)
    }

    /**
     * Get combined statistics.
     */
    fun getStats(): ReliabilityStats {
        return ReliabilityStats(
            packetsProcessed = packetsProcessed.get(),
            duplicatesRejected = duplicatesRejected.get(),
            ackStats = ackManager.getStats(),
            retryStats = retryManager.getStats(),
            dedupStats = deduplicationCache.getStats(),
            deliveryStats = deliveryTracker.getStats()
        )
    }

    /**
     * Shutdown all components.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        outboundPacketChannel.close()
        ackManager.shutdown()
        retryManager.shutdown()
        deduplicationCache.shutdown()
        deliveryTracker.shutdown()
    }

    private fun wireUpChannels() {
        // Forward ACK packets to outbound
        scope.launch {
            ackManager.ackPacketsToSend().consumeEach { ackPacket ->
                outboundPacketChannel.send(OutboundPacket(
                    packet = ackPacket,
                    destinationNodeId = ackPacket.destinationNodeId,
                    isAck = true
                ))
            }
        }
        
        // Forward retry packets to outbound
        scope.launch {
            retryManager.packetsToRetry().consumeEach { retryPacket ->
                deliveryTracker.markRelayed(
                    messageId = retryPacket.messageId,
                    relayNodeId = NodeIdManager.getNodeId(),
                    newHopCount = retryPacket.packet.hopCount
                )
                outboundPacketChannel.send(OutboundPacket(
                    packet = retryPacket.packet,
                    destinationNodeId = retryPacket.packet.destinationNodeId,
                    isRetry = true,
                    attemptNumber = retryPacket.attemptNumber
                ))
            }
        }
    }

    private fun packetToMessage(packet: Packet, fromNodeId: Int): Message {
        val text = String(packet.payload, Charsets.UTF_8)
        return Message(
            messageId = packet.messageId,
            sourceNodeId = packet.sourceNodeId,
            destinationNodeId = packet.destinationNodeId,
            channelId = packet.channelId,
            text = text,
            language = packet.language,
            timestamp = packet.timestamp,
            priority = packet.priority,
            status = MessageStatus.RECEIVED,
            hopCount = packet.hopCount,
            ttl = packet.ttl,
            isEmergency = packet.isEmergency,
            isBroadcast = packet.isBroadcast,
            receivedAt = System.currentTimeMillis()
        )
    }

    data class ReliabilityStats(
        val packetsProcessed: Long,
        val duplicatesRejected: Long,
        val ackStats: AckManager.AckStats,
        val retryStats: RetryManager.RetryStats,
        val dedupStats: DeduplicationCache.CacheStats,
        val deliveryStats: DeliveryTracker.DeliveryStats
    )
}