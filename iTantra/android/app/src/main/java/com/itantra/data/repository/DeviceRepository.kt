package com.itantra.data.repository

import com.itantra.core.model.ConnectionState
import com.itantra.core.model.Device
import com.itantra.data.dao.DeviceDao
import com.itantra.data.entity.DeviceEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Persists known peers and exposes them as reactive streams.
 */
class DeviceRepository(
    private val deviceDao: DeviceDao
) {

    suspend fun save(device: Device, isKnown: Boolean = false): Device =
        saveEntity(DeviceEntity.fromModel(device, isKnown))

    suspend fun saveKnown(device: Device): Device = save(device, isKnown = true)

    suspend fun saveAll(devices: List<Device>, isKnown: Boolean = false): List<Device> {
        return devices.map { DeviceEntity.fromModel(it, isKnown) }
            .let { saved ->
                deviceDao.upsertAll(saved)
                saved.map { it.toModel() }
            }
    }

    suspend fun saveEntity(entity: DeviceEntity): Device {
        deviceDao.upsert(entity)
        return entity.toModel()
    }

    suspend fun update(device: Device, isKnown: Boolean = false) {
        deviceDao.update(DeviceEntity.fromModel(device, isKnown))
    }

    fun observeById(nodeId: Int): Flow<Device?> =
        deviceDao.observeById(nodeId).map { it?.toModel() }

    fun observeAll(): Flow<List<Device>> =
        deviceDao.observeAll().map { list -> list.map { it.toModel() } }

    fun observeKnown(): Flow<List<Device>> =
        deviceDao.observeKnown().map { list -> list.map { it.toModel() } }

    suspend fun getById(nodeId: Int): Device? = deviceDao.getById(nodeId)?.toModel()

    suspend fun getAll(): List<Device> = deviceDao.getAll().map { it.toModel() }

    suspend fun getKnown(): List<Device> = deviceDao.getKnown().map { it.toModel() }

    suspend fun getByConnection(state: ConnectionState): List<Device> =
        deviceDao.getByConnection(state).map { it.toModel() }

    suspend fun updateConnectionState(nodeId: Int, state: ConnectionState) {
        deviceDao.updateConnectionState(nodeId, state)
    }

    suspend fun updateSignal(nodeId: Int, strength: Int, lastSeen: Long) {
        deviceDao.updateSignal(nodeId, strength, lastSeen)
    }

    suspend fun updateLastSeen(nodeId: Int, lastSeen: Long) {
        deviceDao.updateLastSeen(nodeId, lastSeen)
    }

    suspend fun delete(nodeId: Int) {
        deviceDao.deleteById(nodeId)
    }

    suspend fun clear() {
        deviceDao.clear()
    }
}