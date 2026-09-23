package com.itantra.core.reliability

import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicLong

/**
 * Thread-safe deduplication cache for message IDs.
 * Uses LRU eviction with time-based expiry to prevent memory leaks.
 */
class DeduplicationCache(
    private val maxSize: Int = 1000,
    private val ttlMs: Long = 300000, // 5 minutes default
    private val cleanupIntervalMs: Long = 60000 // 1 minute
) {
    // Main cache: messageId -> entry
    private val cache = ConcurrentHashMap<Long, CacheEntry>()
    
    // Access order queue for LRU (messageIds in access order, oldest first)
    private val accessOrder = ConcurrentLinkedQueue<Long>()
    
    // Coroutine scope for background cleanup
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    // Statistics
    private val hits = AtomicLong(0)
    private val misses = AtomicLong(0)
    private val evictions = AtomicLong(0)
    private val expiredRemovals = AtomicLong(0)
    
    private data class CacheEntry(
        val messageId: Long,
        val receivedAt: Long,
        var lastAccessedAt: Long,
        val sourceNodeId: Int? = null,
        val hopCount: Int? = null
    )

    init {
        startCleanupJob()
    }

    /**
     * Check if a message ID is a duplicate.
     * Returns true if already seen, false if new.
     * Updates access time on hit.
     */
    fun checkAndAdd(messageId: Long, sourceNodeId: Int? = null, hopCount: Int? = null): Boolean {
        val now = System.currentTimeMillis()
        
        val existing = cache[messageId]
        if (existing != null) {
            // Check if expired
            if (now - existing.receivedAt > ttlMs) {
                // Expired - remove and treat as new
                removeEntry(messageId)
                addEntry(messageId, now, sourceNodeId, hopCount)
                misses.incrementAndGet()
                expiredRemovals.incrementAndGet()
                return false
            }
            
            // Hit - update access time
            cache[messageId] = existing.copy(lastAccessedAt = now)
            updateAccessOrder(messageId)
            hits.incrementAndGet()
            return true
        }
        
        // Miss - add new entry
        addEntry(messageId, now, sourceNodeId, hopCount)
        misses.incrementAndGet()
        return false
    }

    /**
     * Add a message ID without checking (for pre-populating).
     */
    fun add(messageId: Long, sourceNodeId: Int? = null, hopCount: Int? = null): Boolean {
        val now = System.currentTimeMillis()
        val existing = cache.putIfAbsent(messageId, CacheEntry(messageId, now, now, sourceNodeId, hopCount))
        if (existing == null) {
            accessOrder.add(messageId)
            enforceMaxSize()
            return true
        }
        return false
    }

    /**
     * Check if a message ID exists (without updating access time).
     */
    fun contains(messageId: Long): Boolean {
        val entry = cache[messageId]
        if (entry == null) return false
        
        val now = System.currentTimeMillis()
        if (now - entry.receivedAt > ttlMs) {
            removeEntry(messageId)
            expiredRemovals.incrementAndGet()
            return false
        }
        return true
    }

    /**
     * Remove a specific message ID.
     */
    fun remove(messageId: Long): Boolean {
        return removeEntry(messageId) != null
    }

    /**
     * Get cache statistics.
     */
    fun getStats(): CacheStats {
        val now = System.currentTimeMillis()
        val expiredCount = cache.values.count { now - it.receivedAt > ttlMs }
        
        return CacheStats(
            size = cache.size,
            maxSize = maxSize,
            hits = hits.get(),
            misses = misses.get(),
            hitRate = if ((hits.get() + misses.get()) > 0) {
                hits.get().toDouble() / (hits.get() + misses.get())
            } else 0.0,
            evictions = evictions.get(),
            expiredEntries = expiredCount,
            expiredRemovals = expiredRemovals.get()
        )
    }

    /**
     * Clear all entries.
     */
    fun clear() {
        cache.clear()
        accessOrder.clear()
    }

    /**
     * Shutdown the cache.
     */
    fun shutdown() {
        scope.coroutineContext[Job]?.cancel()
        clear()
    }

    private fun addEntry(messageId: Long, now: Long, sourceNodeId: Int?, hopCount: Int?) {
        val entry = CacheEntry(messageId, now, now, sourceNodeId, hopCount)
        cache[messageId] = entry
        accessOrder.add(messageId)
        enforceMaxSize()
    }

    private fun removeEntry(messageId: Long): CacheEntry? {
        val removed = cache.remove(messageId)
        if (removed != null) {
            // Note: ConcurrentLinkedQueue doesn't support efficient removal
            // We'll clean up stale entries during enforceMaxSize/cleanup
        }
        return removed
    }

    private fun updateAccessOrder(messageId: Long) {
        // Add to end (most recent)
        accessOrder.add(messageId)
        // Stale entries will be cleaned up during enforceMaxSize
    }

    private fun enforceMaxSize() {
        while (cache.size > maxSize) {
            // Remove oldest accessed entries
            var removed = false
            val iterator = accessOrder.iterator()
            while (iterator.hasNext() && cache.size > maxSize) {
                val oldest = iterator.next()
                val entry = cache[oldest]
                // Only remove if still the oldest access (not re-accessed)
                if (entry != null && entry.lastAccessedAt <= cache[oldest]?.lastAccessedAt ?: 0) {
                    if (cache.remove(oldest, entry)) {
                        iterator.remove()
                        evictions.incrementAndGet()
                        removed = true
                    }
                }
            }
            if (!removed) {
                // Fallback: remove any entry
                val firstKey = cache.keys.iterator().next()
                cache.remove(firstKey)
                evictions.incrementAndGet()
            }
        }
    }

    private fun cleanupExpired() {
        val now = System.currentTimeMillis()
        val cutoff = now - ttlMs
        
        val toRemove = cache.entries
            .filter { it.value.receivedAt < cutoff }
            .map { it.key }
        
        toRemove.forEach { messageId ->
            cache.remove(messageId)
            expiredRemovals.incrementAndGet()
        }
        
        // Also clean up access order queue
        val staleAccess = mutableListOf<Long>()
        val iterator = accessOrder.iterator()
        while (iterator.hasNext()) {
            val id = iterator.next()
            if (!cache.containsKey(id)) {
                staleAccess.add(id)
                iterator.remove()
            }
        }
    }

    private fun startCleanupJob() {
        scope.launch {
            while (isActive) {
                delay(cleanupIntervalMs)
                cleanupExpired()
            }
        }
    }

    data class CacheStats(
        val size: Int,
        val maxSize: Int,
        val hits: Long,
        val misses: Long,
        val hitRate: Double,
        val evictions: Long,
        val expiredEntries: Int,
        val expiredRemovals: Long
    )
}