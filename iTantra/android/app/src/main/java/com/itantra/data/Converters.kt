package com.itantra.data

import androidx.room.TypeConverter
import com.itantra.core.model.Channel
import com.itantra.core.model.ConnectionState
import com.itantra.core.model.MessageStatus
import com.itantra.core.model.Priority
import com.itantra.core.model.TransportType

/**
 * Room type converters mapping our domain enums to integer column values.
 */
class Converters {

    @TypeConverter
    fun priorityFromValue(value: Int): Priority = Priority.fromValue(value)

    @TypeConverter
    fun priorityToValue(priority: Priority): Int = priority.value

    @TypeConverter
    fun messageStatusFromValue(value: Int): MessageStatus = MessageStatus.fromValue(value)

    @TypeConverter
    fun messageStatusToValue(status: MessageStatus): Int = status.value

    @TypeConverter
    fun connectionStateFromValue(value: Int): ConnectionState = ConnectionState.fromValue(value)

    @TypeConverter
    fun connectionStateToValue(state: ConnectionState): Int = state.value

    @TypeConverter
    fun transportTypeFromValue(value: Int): TransportType = TransportType.fromValue(value)

    @TypeConverter
    fun transportTypeToValue(type: TransportType): Int = type.value

    @TypeConverter
    fun channelTypeFromValue(value: Int): Channel.ChannelType = Channel.ChannelType.fromValue(value)

    @TypeConverter
    fun channelTypeToValue(type: Channel.ChannelType): Int = type.value
}