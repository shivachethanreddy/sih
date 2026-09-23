package com.itantra.core.model

import kotlinx.serialization.Serializable

@Serializable
data class Device(
    val nodeId: Int,
    val deviceName: String,
    val transportType: TransportType = TransportType.MOCK,
    val connectionState: ConnectionState = ConnectionState.DISCONNECTED,
    val signalStrength: Int = 0, // 0-100
    val lastSeen: Long = System.currentTimeMillis(),
    val isSelf: Boolean = false
) {
    fun copyWithConnectionState(state: ConnectionState): Device = copy(connectionState = state)
    fun copyWithSignalStrength(strength: Int): Device = copy(signalStrength = strength.coerceIn(0, 100))
    fun copyWithLastSeen(): Device = copy(lastSeen = System.currentTimeMillis())
}

@Serializable
data class Channel(
    val channelId: String,
    val name: String,
    val description: String,
    val isActive: Boolean = true,
    val type: ChannelType = ChannelType.GENERAL
) {
    enum class ChannelType(val value: Int, val label: String) {
        GENERAL(0, "General"),
        EMERGENCY(1, "Emergency"),
        MEDICAL(2, "Medical"),
        RESCUE(3, "Rescue"),
        LOCAL(4, "Local");

        companion object {
            fun fromValue(value: Int): ChannelType = values().firstOrNull { it.value == value } ?: GENERAL
        }
    }
}