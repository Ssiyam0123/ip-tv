package com.iptv.app.di

import android.content.Context
import com.iptv.app.core.database.AppDatabase
import com.iptv.app.core.database.DatabaseProvider
import com.iptv.app.core.network.SocketRepository
import com.iptv.app.core.player.PlayerController
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return DatabaseProvider(context).database
    }

    @Provides
    @Singleton
    fun provideSocketRepository(): SocketRepository {
        return SocketRepository()
    }

    @Provides
    @Singleton
    fun providePlayerController(@ApplicationContext context: Context): PlayerController {
        return PlayerController(context)
    }
}
