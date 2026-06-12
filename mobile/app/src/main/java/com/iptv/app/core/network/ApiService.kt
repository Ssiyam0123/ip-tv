package com.iptv.app.core.network

import com.iptv.app.core.model.*
import retrofit2.http.*

interface ApiService {

    // ─── Auth ─────────────────────────────────────────────────────────────

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): DataResponse<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): DataResponse<AuthResponse>

    @POST("auth/google")
    suspend fun googleAuth(@Body request: GoogleAuthRequest): DataResponse<AuthResponse>

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): DataResponse<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(@Body request: RefreshRequest)

    @GET("me")
    suspend fun getMe(): DataResponse<UserDto>

    @HTTP(method = "DELETE", path = "me", hasBody = false)
    suspend fun deleteAccount()

    // ─── Catalog ──────────────────────────────────────────────────────────

    @GET("categories")
    suspend fun getCategories(): DataResponse<List<CategoryDto>>

    @GET("channels")
    suspend fun getChannels(
        @Query("category") category: String? = null,
        @Query("query") query: String? = null,
        @Query("status") status: String? = null,
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int? = null
    ): PaginatedResponse<ChannelDto>

    @GET("channels/{channelId}")
    suspend fun getChannel(@Path("channelId") channelId: String): DataResponse<ChannelDetailDto>

    // ─── Playback ─────────────────────────────────────────────────────────

    @POST("channels/{channelId}/playback-session")
    suspend fun createPlaybackSession(
        @Path("channelId") channelId: String
    ): DataResponse<PlaybackSessionDto>

    // ─── Favorites ────────────────────────────────────────────────────────

    @GET("favorites")
    suspend fun getFavorites(
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int? = null
    ): PaginatedResponse<FavoriteDto>

    @PUT("favorites/{channelId}")
    suspend fun addFavorite(
        @Path("channelId") channelId: String
    ): DataResponse<FavoriteDto>

    @DELETE("favorites/{channelId}")
    suspend fun removeFavorite(@Path("channelId") channelId: String)

    // ─── Scores ───────────────────────────────────────────────────────────

    @GET("matches")
    suspend fun getMatches(
        @Query("sport") sport: String? = null,
        @Query("state") state: String? = null,
        @Query("date") date: String? = null,
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int? = null
    ): PaginatedResponse<MatchDto>

    @GET("matches/{matchId}")
    suspend fun getMatch(@Path("matchId") matchId: String): DataResponse<MatchDto>
}
