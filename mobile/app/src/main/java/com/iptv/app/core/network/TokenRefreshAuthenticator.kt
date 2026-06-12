package com.iptv.app.core.network

import com.iptv.app.core.auth.TokenManager
import com.iptv.app.core.model.RefreshRequest
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

@Singleton
class TokenRefreshAuthenticator @Inject constructor(
    private val tokenManager: TokenManager,
    private val retrofitProvider: Provider<Retrofit>
) : Authenticator {

    @Volatile
    private var isRefreshing = false

    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.request.header("Authorization") == null) return null

        synchronized(this) {
            if (isRefreshing) return null
            isRefreshing = true
        }

        try {
            val refreshToken = runBlocking { tokenManager.getRefreshToken() }
            if (refreshToken == null) {
                runBlocking { tokenManager.clearSession() }
                return null
            }

            val apiService = retrofitProvider.get().create(ApiService::class.java)
            val refreshResult = runBlocking {
                apiService.refresh(RefreshRequest(refreshToken))
            }

            val tokens = refreshResult.data
            runBlocking {
                tokenManager.saveTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn)
            }

            return response.request.newBuilder()
                .header("Authorization", "Bearer ${tokens.accessToken}")
                .build()
        } catch (e: Exception) {
            runBlocking { tokenManager.clearSession() }
            return null
        } finally {
            isRefreshing = false
        }
    }
}
