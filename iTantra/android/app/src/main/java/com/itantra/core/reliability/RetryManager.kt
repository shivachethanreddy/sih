package com.itantra.core.reliability

import com.itantra.core.model.Packet
import com.itantra.core.model.Priority
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
 * Manages packet retransmission with exponential backoff.
 * Handles retry scheduling, max retry limits, and priority-based policies.
 */
class RetryManager(
    private val maxRetries: Int = 3,
    private val emergencyMaxRetries: Int = 5,
    private val baseDelayMs: Long = 1000,
    private val maxDelayMs: Long = 30000,
    private val jitterFactor: Double = 0.1
) {
    // Tracks retry state for each message
    private val retryStates = ConcurrentHashMap<Long, RetryState>()
    
    // Channel for packets that need to be retried
    private val retryChannel = Channel<RetryPacket>(100)
    
    // Coroutine scope
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val totalRetries = AtomicLong(0)
    private val successfulRetries = AtomicLong(0)
    private val failedRetries = AtomicLong(0)
    
    data class RetryState(
        val messageId: Long,
        val packet: Packet,
        val maxRetries: Int,
        var attemptCount: Int = 0,
        var lastAttemptAt: Long = 0,
        var nextRetryAt: Long = 0,
        val isEmergency: Boolean
    )
    
    data class RetryPacket(
        val messageId: Long,
        val packet: Packet,
        val attemptNumber: Int
    )

    /**
     * Register a packet for potential retry.
     * Returns true if this is a new registration, false if already registered.
     */
    fun registerForRetry(packet: Packet, customMaxRetries: Int? = null): Boolean {
        val maxAllowed = if (packet.isEmergency) {
            customMaxRetries ?: emergencyMaxRetries
        } else {
            customMaxRetries ?: maxRetries
        }
        
        val state = RetryState(
            messageId = packet.messageId,
            packet = packet,
            maxRetries = maxAllowed,
            isEmergency = packet.isEmergency
        )
        
        val previous = retryStates.putIfAbsent(packet.messageId, state)
        return previous == null
    }

    /**
     * Record a send attempt for a packet.
     * Schedules the next retry if needed.
     */
    fun recordAttempt(messageId: Long): Boolean {
        val state = retryStates[messageId] ?: return false
        
        state.attemptCount++
        state.lastAttemptAt = System.currentTimeMillis()
        
        if (state.attemptCount <= state.maxRetries) {
            // Schedule next retry
            val delay = calculateBackoff(state.attemptCount)
            state.nextRetryAt = System.currentTimeMillis() + delay
            
            scope.launch {
                delay(delay)
                // Check if still needs retry (might have been ACKed)
                val currentState = retryStates[messageId]
                if (currentState != null && currentState.attemptCount == state.attemptCount) {
                    retryChannel.send(RetryPacket(messageId, state.packet, state.attemptCount))
                    totalRetries.incrementAndGet()
                }
            }
            return true // Will retry
        } else {
            // Max retries reached
            retryStates.remove(messageId)
            failedRetries.incrementAndGet()
            return false // No more retries
        }
    }

    /**
     * Mark a packet as successfully delivered (ACK received).
     * Cancels any pending retries.
     */
    fun markDelivered(messageId: Long): Boolean {
        val removed = retryStates.remove(messageId)
        if (removed != null) {
            successfulRetries.incrementAndGet()
            return true
        }
        return false
    }

    /**
     * Mark a packet as permanently failed.
     */
    fun markFailed(messageId: Long): Boolean {
        val removed = retryStates.remove(messageId)
        if (removed != null) {
            failedRetries.incrementAndGet()
            return true
        }
        return false
    }

    /**
     * Check if a packet is currently being retried.
     */
    fun isRetrying(messageId: Long): Boolean {
        return retryStates.containsKey(messageId)
    }

    /**
     * Get the current retry state for a message.
     */
    fun getRetryState(messageId: Long): RetryState? {
        return retryStates[messageId]
    }

    /**
     * Get the channel of packets that need to be retried.
     */
    fun packetsToRetry(): ReceiveChannel<RetryPacket> = retryChannel

    /**
     * Calculate exponential backoff with jitter.
     */
    private fun calculateBackoff(attemptNumber: Int): Long {
        val exponentialDelay = baseDelayMs * (2.0.pow(attemptNumber - 1)).toLong()
        val cappedDelay = exponentialDelay.coerceAtMost(maxDelayMs)
        
        // Add jitter
        val jitter = (cappedDelay * jitterFactor * (Math.random() * 2 - 1)).toLong()
        return (cappedDelay + jitter).coerceAtLeast(baseDelayMs)
    }

    /**
     * Get statistics.
     */
    fun getStats(): RetryStats {
        return RetryStats(
            activeRetries = retryStates.size,
            totalRetries = totalRetries.get(),
            successfulRetries = successfulRetries.get(),
            failedRetries = failedRetries.get()
        )
    }

    /**
     * Manually trigger a retry for a message (e.g., after network reconnect).
     */
    fun triggerRetry(messageId: Long): Boolean {
        val state = retryStates[messageId] ?: return false
        if (state.attemptCount < state.maxRetries) {
            retryChannel.send(RetryPacket(messageId, state.packet, state.attemptCount + 1))
            totalRetries.incrementAndGet()
            return true
        }
        return false
    }

    /**
     * Shutdown the manager.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        retryChannel.close()
        retryStates.clear()
    }

    data class RetryStats(
        val activeRetries: Int,
        val totalRetries: Long,
        val successfulRetries: Long,
        val failedRetries: Long
    )
}