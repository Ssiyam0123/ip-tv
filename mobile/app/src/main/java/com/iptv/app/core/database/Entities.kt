package com.iptv.app.core.database

import androidx.room.*

@Entity(tableName = "cached_channels")
data class CachedChannel(
    @PrimaryKey val id: String,
    val title: String,
    val slug: String,
    val description: String?,
    val logoUrl: String?,
    val status: String,
    val language: String?,
    val countryCode: String?,
    val categoryId: String?,
    val categoryName: String?,
    val categorySlug: String?,
    val cachedAt: Long = System.currentTimeMillis()
)

@Dao
interface ChannelDao {
    @Query("SELECT * FROM cached_channels ORDER BY title ASC")
    suspend fun getAll(): List<CachedChannel>

    @Query("SELECT * FROM cached_channels WHERE categoryId = :categoryId ORDER BY title ASC")
    suspend fun getByCategory(categoryId: String): List<CachedChannel>

    @Query("SELECT * FROM cached_channels WHERE title LIKE '%' || :query || '%' ORDER BY title ASC")
    suspend fun search(query: String): List<CachedChannel>

    @Query("SELECT * FROM cached_channels WHERE id = :id")
    suspend fun getById(id: String): CachedChannel?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(channels: List<CachedChannel>)

    @Query("DELETE FROM cached_channels")
    suspend fun clearAll()

    @Query("SELECT COUNT(*) FROM cached_channels")
    suspend fun count(): Int
}

@Entity(tableName = "cached_categories")
data class CachedCategory(
    @PrimaryKey val id: String,
    val name: String,
    val slug: String,
    val sortOrder: Int,
    val cachedAt: Long = System.currentTimeMillis()
)

@Dao
interface CategoryDao {
    @Query("SELECT * FROM cached_categories ORDER BY sortOrder ASC")
    suspend fun getAll(): List<CachedCategory>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<CachedCategory>)

    @Query("DELETE FROM cached_categories")
    suspend fun clearAll()
}

@Entity(tableName = "cached_matches")
data class CachedMatch(
    @PrimaryKey val id: String,
    val sport: String,
    val state: String,
    val startTime: String,
    val homeScore: Int?,
    val awayScore: Int?,
    val currentPeriod: String?,
    val homeTeamName: String,
    val homeTeamLogo: String?,
    val awayTeamName: String,
    val awayTeamLogo: String?,
    val competitionName: String,
    val cachedAt: Long = System.currentTimeMillis()
)

@Dao
interface MatchDao {
    @Query("SELECT * FROM cached_matches ORDER BY startTime DESC")
    suspend fun getAll(): List<CachedMatch>

    @Query("SELECT * FROM cached_matches WHERE sport = :sport ORDER BY startTime DESC")
    suspend fun getBySport(sport: String): List<CachedMatch>

    @Query("SELECT * FROM cached_matches WHERE state = :state ORDER BY startTime DESC")
    suspend fun getByState(state: String): List<CachedMatch>

    @Query("SELECT * FROM cached_matches WHERE id = :id")
    suspend fun getById(id: String): CachedMatch?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(matches: List<CachedMatch>)

    @Query("DELETE FROM cached_matches")
    suspend fun clearAll()
}
