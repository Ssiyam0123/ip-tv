package com.iptv.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Common ────────────────────────────────────────────────────────────────

@Serializable
data class ApiError(
    val error: ErrorBody
)

@Serializable
data class ErrorBody(
    val code: String,
    val message: String,
    @SerialName("requestId") val requestId: String,
    val details: Map<String, kotlinx.serialization.json.JsonElement>? = null
)

@Serializable
data class PaginatedResponse<T>(
    val data: List<T>,
    val page: PageInfo
)

@Serializable
data class PageInfo(
    @SerialName("nextCursor") val nextCursor: String? = null,
    @SerialName("hasMore") val hasMore: Boolean,
    val limit: Int
)

@Serializable
data class DataResponse<T>(
    val data: T
)

// ─── Auth ──────────────────────────────────────────────────────────────────

@Serializable
data class AuthResponse(
    val user: UserDto,
    @SerialName("accessToken") val accessToken: String,
    @SerialName("refreshToken") val refreshToken: String,
    @SerialName("expiresIn") val expiresIn: Int,
    @SerialName("tokenType") val tokenType: String = "Bearer"
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    @SerialName("displayName") val displayName: String? = null,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    val role: String = "user",
    @SerialName("createdAt") val createdAt: String? = null
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    @SerialName("displayName") val displayName: String? = null
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class GoogleAuthRequest(
    @SerialName("idToken") val idToken: String
)

@Serializable
data class RefreshRequest(
    @SerialName("refreshToken") val refreshToken: String
)

// ─── Catalog ───────────────────────────────────────────────────────────────

@Serializable
data class CategoryDto(
    val id: String,
    val name: String,
    val slug: String,
    @SerialName("sortOrder") val sortOrder: Int
)

@Serializable
data class ChannelDto(
    val id: String,
    val title: String,
    val slug: String,
    val description: String? = null,
    @SerialName("logoUrl") val logoUrl: String? = null,
    val status: String = "active",
    val language: String? = null,
    @SerialName("countryCode") val countryCode: String? = null,
    val category: CategoryRefDto? = null
)

@Serializable
data class CategoryRefDto(
    val id: String,
    val name: String,
    val slug: String
)

@Serializable
data class ChannelDetailDto(
    val id: String,
    val title: String,
    val slug: String,
    val description: String? = null,
    @SerialName("logoUrl") val logoUrl: String? = null,
    val status: String = "active",
    val language: String? = null,
    @SerialName("countryCode") val countryCode: String? = null,
    val category: CategoryRefDto? = null,
    @SerialName("streamSources") val streamSources: List<StreamSourceDto> = emptyList()
)

@Serializable
data class StreamSourceDto(
    val id: String,
    val quality: String = "auto",
    val priority: Int = 0,
    val status: String = "active"
)

// ─── Playback ──────────────────────────────────────────────────────────────

@Serializable
data class PlaybackSessionDto(
    @SerialName("sessionId") val sessionId: String,
    @SerialName("channelId") val channelId: String,
    @SerialName("expiresAt") val expiresAt: String,
    val sources: List<PlaybackSourceDto>
)

@Serializable
data class PlaybackSourceDto(
    @SerialName("sourceId") val sourceId: String,
    @SerialName("playbackUrl") val playbackUrl: String,
    val quality: String = "auto",
    val priority: Int = 0
)

// ─── Favorites ─────────────────────────────────────────────────────────────

@Serializable
data class FavoriteDto(
    val id: String,
    @SerialName("createdAt") val createdAt: String,
    val channel: FavoriteChannelDto
)

@Serializable
data class FavoriteChannelDto(
    val id: String,
    val title: String,
    val slug: String,
    @SerialName("logoUrl") val logoUrl: String? = null,
    val status: String = "active",
    val category: CategoryRefDto? = null
)

// ─── Scores ────────────────────────────────────────────────────────────────

@Serializable
data class MatchDto(
    val id: String,
    val sport: String,
    val state: String,
    @SerialName("startTime") val startTime: String,
    @SerialName("homeScore") val homeScore: Int? = null,
    @SerialName("awayScore") val awayScore: Int? = null,
    @SerialName("currentPeriod") val currentPeriod: String? = null,
    val competition: CompetitionDto,
    @SerialName("homeTeam") val homeTeam: TeamDto,
    @SerialName("awayTeam") val awayTeam: TeamDto,
    val snapshots: List<SnapshotDto>? = null
)

@Serializable
data class CompetitionDto(
    val id: String,
    val name: String,
    val slug: String,
    val sport: String,
    val country: String? = null,
    @SerialName("logoUrl") val logoUrl: String? = null
)

@Serializable
data class TeamDto(
    val id: String,
    val name: String,
    @SerialName("shortName") val shortName: String? = null,
    @SerialName("logoUrl") val logoUrl: String? = null
)

@Serializable
data class SnapshotDto(
    val version: Int,
    @SerialName("capturedAt") val capturedAt: String
)

// ─── Socket Events ─────────────────────────────────────────────────────────

@Serializable
data class MatchSubscribeEvent(
    @SerialName("matchId") val matchId: String
)

@Serializable
data class MatchUpdateEvent(
    @SerialName("matchId") val matchId: String,
    val version: Int,
    val state: String,
    @SerialName("homeScore") val homeScore: Int? = null,
    @SerialName("awayScore") val awayScore: Int? = null,
    @SerialName("currentPeriod") val currentPeriod: String? = null,
    val timestamp: String
)

@Serializable
data class MatchErrorEvent(
    val message: String
)
