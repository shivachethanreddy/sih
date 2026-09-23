package com.itantra.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.itantra.data.dao.ChannelDao
import com.itantra.data.dao.DeviceDao
import com.itantra.data.dao.MessageDao
import com.itantra.data.entity.ChannelEntity
import com.itantra.data.entity.DeviceEntity
import com.itantra.data.entity.MessageEntity

/**
 * iTANTRA offline persistence database.
 */
@Database(
    entities = [
        MessageEntity::class,
        DeviceEntity::class,
        ChannelEntity::class
    ],
    version = 1,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun messageDao(): MessageDao

    abstract fun deviceDao(): DeviceDao

    abstract fun channelDao(): ChannelDao

    companion object {
        private const val DATABASE_NAME = "itantra.db"

        @Volatile
        private var instance: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DATABASE_NAME
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { instance = it }
            }
        }

        fun close() {
            instance?.close()
            instance = null
        }
    }
}