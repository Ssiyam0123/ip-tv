package com.iptv.app.core.model

// ─── Auth ──────────────────────────────────────────────────────────────────

data class User(
    val id: String,
    val email: String,
    val displayName: String?,
    val avatarUrl: String?,
    val role: String,
    val createdAt: String?
)

data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int
)

// ─── Catalog ───────────────────────────────────────────────────────────────

data class Category(
    val id: String,
    val name: String,
    val slug: String,
    val sortOrder: Int
)

data class Channel(
    val id: String,
    val title: String,
    val slug: String,
    val description: String?,
    val logoUrl: String?,
    val status: ChannelStatus,
    val language: String?,
    val countryCode: String?,
    val category: CategoryRef?
)

data class CategoryRef(
    val id: String,
    val name: String,
    val slug: String
)

enum class ChannelStatus(val value: String) {
    ACTIVE("active"),
    DEGRADED("degraded"),
    OFFLINE("offline"),
    DISABLED("disabled");

    companion object {
        fun from(value: String): ChannelStatus =
            entries.find { it.value == value } ?: OFFLINE
    }
}

data class ChannelDetail(
    val id: String,
    val title: String,
    val slug: String,
    val description: String?,
    val logoUrl: String?,
    val status: ChannelStatus,
    val language: String?,
    val countryCode: String?,
    val category: CategoryRef?,
    val streamSources: List<StreamSource>
)

data class StreamSource(
    val id: String,
    val quality: String,
    val priority: Int,
    val status: String
)

// ─── Playback ──────────────────────────────────────────────────────────────

data class PlaybackSession(
    val sessionId: String,
    val channelId: String,
    val expiresAt: String,
    val sources: List<PlaybackSource>
)

data class PlaybackSource(
    val sourceId: String,
    val playbackUrl: String,
    val quality: String,
    val priority: Int
)

// ─── Favorites ─────────────────────────────────────────────────────────────

data class Favorite(
    val id: String,
    val createdAt: String,
    val channel: FavoriteChannel
)

data class FavoriteChannel(
    val id: String,
    val title: String,
    val slug: String,
    val logoUrl: String?,
    val status: String,
    val category: CategoryRef?
)

// ─── Scores ────────────────────────────────────────────────────────────────

enum class Sport(val value: String) {
    FOOTBALL("football"),
    CRICKET("cricket");

    companion object {
        fun from(value: String): Sport = entries.find { it.value == value } ?: FOOTBALL
    }
}

enum class MatchState(val value: String) {
    SCHEDULED("scheduled"),
    LIVE("live"),
    FINISHED("finished"),
    POSTPONED("postponed"),
    CANCELLED("cancelled");

    companion object {
        fun from(value: String): MatchState = entries.find { it.value == value } ?: SCHEDULED
    }
}

data class Match(
    val id: String,
    val sport: Sport,
    val state: MatchState,
    val startTime: String,
    val homeScore: Int?,
    val awayScore: Int?,
    val currentPeriod: String?,
    val competition: Competition,
    val homeTeam: Team,
    val awayTeam: Team,
    val snapshots: List<Snapshot>?
)

data class Competition(
    val id: String,
    val name: String,
    val slug: String,
    val sport: String,
    val country: String?,
    val logoUrl: String?
)

data class Team(
    val id: String,
    val name: String,
    val shortName: String?,
    val logoUrl: String?
)

data class Snapshot(
    val version: Int,
    val capturedAt: String
)

// ─── Socket ────────────────────────────────────────────────────────────────

data class MatchUpdate(
    val matchId: String,
    val version: Int,
    val state: String,
    val homeScore: Int?,
    val awayScore: Int?,
    val currentPeriod: String?,
    val timestamp: String
)

// ─── UI State ──────────────────────────────────────────────────────────────

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String, val retry: (() -> Unit)? = null) : UiState<Nothing>
    data object Offline : UiState<Nothing>
}
