package com.itantra.core.mesh

import com.itantra.core.model.Packet
import kotlinx.coroutines.*

/**
 * Manages TTL (Time To Live) for packets in the mesh network.
 * Handles TTL decrement, expiration checking, and hop count tracking.
 */
class TTLManager(
    private val defaultTtl: Int = 8,
    private val maxTtl: Int = 255,
    private val ackTtl: Int = 1
) {

    /**
     * Check if a packet has expired (TTL <= 0).
     */
    fun isExpired(packet: Packet): Boolean {
        return packet.ttl <= 0
    }

    /**
     * Decrement TTL and increment hop count for relay.
     * Returns a new packet with updated values, or null if TTL would expire.
     */
    fun decrementTtl(packet: Packet): Packet? {
        val newTtl = packet.ttl - 1
        val newHopCount = packet.hopCount + 1
        
        if (newTtl <= 0) {
            return null // Packet expired
        }
        
        return packet.copy(
            ttl = newTtl,
            hopCount = newHopCount
        )
    }

    /**
     * Create a new packet with initial TTL based on priority and type.
     */
    fun initializeTtl(packet: Packet): Packet {
        val ttl = when {
            packet.isEmergency -> maxTtl.coerceAtLeast(defaultTtl)
            packet.channelId == "ACK" -> ackTtl
            packet.isBroadcast -> defaultTtl
            else -> defaultTtl
        }
        
        return packet.copy(
            ttl = ttl.coerceIn(1, maxTtl),
            hopCount = 0
        )
    }

    /**
     * Get remaining TTL as percentage (0.0 to 1.0).
     */
    fun getTtlPercentage(packet: Packet): Double {
        return (packet.ttl.toDouble() / defaultTtl).coerceIn(0.0, 1.0)
    }

    /**
     * Check if packet can be relayed further.
     */
    fun canRelay(packet: Packet): Boolean {
        return packet.ttl > 1 // Need at least 1 TTL after decrement
    }

    /**
     * Get maximum allowed hops for a packet.
     */
    fun getMaxHops(packet: Packet): Int {
        return packet.ttl
    }

    /**
     * Calculate TTL for a specific hop distance.
     */
    fun calculateRequiredTtl(hopDistance: Int): Int {
        return (hopDistance + 1).coerceIn(1, maxTtl)
    }

    /**
     * Get statistics.
     */
    fun getStats(): TtlStats {
        return TtlStats(
            defaultTtl = defaultTtl,
            maxTtl = maxTtl,
            ackTtl = ackTtl
        )
    }

    data class TtlStats(
        val defaultTtl: Int,
        val maxTtl: Int,
        val ackTtl: Int
    )
}