package com.iptv.app.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Database(
    entities = [
        CachedChannel::class,
        CachedCategory::class,
        CachedMatch::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun channelDao(): ChannelDao
    abstract fun categoryDao(): CategoryDao
    abstract fun matchDao(): MatchDao
}

@Singleton
class DatabaseProvider @Inject constructor(
    @ApplicationContext context: Context
) {
    val database: AppDatabase = Room.databaseBuilder(
        context,
        AppDatabase::class.java,
        "iptv_cache.db"
    )
        .fallbackToDestructiveMigration()
        .build()
}
