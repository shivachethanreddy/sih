package com.itantra.core.model

enum class Priority(val value: Int, val label: String) {
    NORMAL(0, "Normal"),
    HIGH(1, "High"),
    EMERGENCY(2, "Emergency");

    companion object {
        fun fromValue(value: Int): Priority = values().firstOrNull { it.value == value } ?: NORMAL
    }
}