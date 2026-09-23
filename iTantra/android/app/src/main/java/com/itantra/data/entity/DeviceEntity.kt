package com.itantra.data.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.itantra.core.model.ConnectionState
import com.itantra.core.model.Device
import com.itantra.core.model.TransportType
import kotlinx.serialization.Serializable

/**
 * Room entity mirroring [com.itantra.core.model.Device].
 * Persists known peers so they can be reconnected on app restart.
 */
@Serializable
@Entity(tableName = "devices")
data class DeviceEntity(
    @PrimaryKey
    @ColumnInfo(name = "node_id")
    val nodeId: Int,

    @ColumnInfo(name = "device_name")
    val deviceName: String,

    @ColumnInfo(name = "transport_type")
    val transportType: TransportType,

    @ColumnInfo(name = "connection_state")
    val connectionState: ConnectionState,

    @ColumnInfo(name = "signal_strength")
    val signalStrength: Int,

    @ColumnInfo(name = "last_seen")
    val lastSeen: Long,

    @ColumnInfo(name = "is_self")
    val isSelf: Boolean,

    @ColumnInfo(name = "is_known")
    val isKnown: Boolean = false,

    @ColumnInfo(name = "stored_at")
    val storedAt: Long = System.currentTimeMillis()
) {
    fun toModel(): Device = Device(
        nodeId = nodeId,
        deviceName = deviceName,
        transportType = transportType,
        connectionState = connectionState,
        signalStrength = signalStrength,
        lastSeen = lastSeen,
        isSelf = isSelf
    )

    companion object {
        fun fromModel(
            device: Device,
            isKnown: Boolean = false
        ): DeviceEntity = DeviceEntity(
            nodeId = device.nodeId,
            deviceName = device.deviceName,
            transportType = device.transportType,
            connectionState = device.connectionState,
            signalStrength = device.signalStrength,
            lastSeen = device.lastSeen,
            isSelf = device.isSelf,
            isKnown = isKnown
        )
    }
}