package com.itantra.core.model

import android.content.Context
import android.content.SharedPreferences
import java.util.Random
import java.util.concurrent.atomic.AtomicLong

object NodeIdManager {
    private const val PREFS_NAME = "itantra_node_id"
    private const val KEY_NODE_ID = "node_id"
    private var cachedNodeId: Int? = null

    fun getNodeId(): Int {
        if (cachedNodeId != null) return cachedNodeId!!
        // This will be initialized properly when init() is called with context
        // For now, return a temporary random ID
        return Random.nextInt(0xFFFE) + 1 // 1 to 65534 (0xFFFF reserved for broadcast)
    }

    fun init(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var nodeId = prefs.getInt(KEY_NODE_ID, -1)
        if (nodeId == -1) {
            nodeId = Random.nextInt(0xFFFE) + 1
            prefs.edit().putInt(KEY_NODE_ID, nodeId).apply()
        }
        cachedNodeId = nodeId
        return nodeId
    }

    fun reset(context: Context): Int {
        val newNodeId = Random.nextInt(0xFFFE) + 1
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putInt(KEY_NODE_ID, newNodeId).apply()
        cachedNodeId = newNodeId
        return newNodeId
    }

    fun clearCache() {
        cachedNodeId = null
    }
}

object MessageIdGenerator {
    private val counter = AtomicLong(System.currentTimeMillis() * 1000)

    fun generate(): Long {
        return counter.incrementAndGet()
    }

    fun generateWithTimestamp(): Long {
        return (System.currentTimeMillis() * 1000) + (counter.incrementAndGet() % 1000)
    }
}