package com.itantra.data.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.itantra.core.model.ConnectionState
import com.itantra.data.entity.DeviceEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data access for persisted [DeviceEntity] (known peers).
 */
@Dao
interface DeviceDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(device: DeviceEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(devices: List<DeviceEntity>)

    @Update
    suspend fun update(device: DeviceEntity)

    @Query("SELECT * FROM devices WHERE node_id = :nodeId")
    fun observeById(nodeId: Int): Flow<DeviceEntity?>

    @Query("SELECT * FROM devices WHERE node_id = :nodeId")
    suspend fun getById(nodeId: Int): DeviceEntity?

    @Query("SELECT * FROM devices ORDER BY last_seen DESC")
    fun observeAll(): Flow<List<DeviceEntity>>

    @Query("SELECT * FROM devices ORDER BY last_seen DESC")
    suspend fun getAll(): List<DeviceEntity>

    @Query("SELECT * FROM devices WHERE is_known = 1 ORDER BY last_seen DESC")
    fun observeKnown(): Flow<List<DeviceEntity>>

    @Query("SELECT * FROM devices WHERE connection_state = :state ORDER BY last_seen DESC")
    suspend fun getByConnection(state: ConnectionState): List<DeviceEntity>

    @Query("SELECT * FROM devices WHERE is_known = 1")
    suspend fun getKnown(): List<DeviceEntity>

    @Query("UPDATE devices SET connection_state = :state WHERE node_id = :nodeId")
    suspend fun updateConnectionState(nodeId: Int, state: ConnectionState)

    @Query("UPDATE devices SET signal_strength = :strength, last_seen = :lastSeen WHERE node_id = :nodeId")
    suspend fun updateSignal(nodeId: Int, strength: Int, lastSeen: Long)

    @Query("UPDATE devices SET last_seen = :lastSeen WHERE node_id = :nodeId")
    suspend fun updateLastSeen(nodeId: Int, lastSeen: Long)

    @Delete
    suspend fun delete(device: DeviceEntity)

    @Query("DELETE FROM devices WHERE node_id = :nodeId")
    suspend fun deleteById(nodeId: Int)

    @Query("DELETE FROM devices")
    suspend fun clear()
}