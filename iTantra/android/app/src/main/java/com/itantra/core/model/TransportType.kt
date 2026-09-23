package com.itantra.core.model

enum class TransportType(val value: Int, val label: String) {
    WIFI_DIRECT(0, "Wi-Fi Direct"),
    BLUETOOTH(1, "Bluetooth"),
    MOCK(2, "Mock Transport");

    companion object {
        fun fromValue(value: Int): TransportType = values().firstOrNull { it.value == value } ?: MOCK
    }
}

enum class ConnectionState(val value: Int, val label: String) {
    DISCONNECTED(0, "Disconnected"),
    CONNECTING(1, "Connecting"),
    CONNECTED(2, "Connected"),
    DISCONNECTING(3, "Disconnecting"),
    FAILED(4, "Failed");

    companion object {
        fun fromValue(value: Int): ConnectionState = values().firstOrNull { it.value == value } ?: DISCONNECTED
    }
}