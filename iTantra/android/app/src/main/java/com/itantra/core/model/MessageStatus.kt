package com.itantra.core.model

enum class MessageStatus(val value: Int, val label: String) {
    PENDING(0, "Pending"),
    SENDING(1, "Sending"),
    SENT(2, "Sent"),
    DELIVERED(3, "Delivered"),
    FAILED(4, "Failed"),
    RECEIVED(5, "Received"),
    ACKNOWLEDGED(6, "Acknowledged"),
    EXPIRED(7, "Expired");

    companion object {
        fun fromValue(value: Int): MessageStatus = values().firstOrNull { it.value == value } ?: PENDING
    }
}