package com.iptv.app.core.auth

import com.iptv.app.core.model.*
import com.iptv.app.core.network.ApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) {
    val isAuthenticated: Flow<Boolean> = tokenManager.isAuthenticated

    suspend fun login(email: String, password: String): User {
        val response = apiService.login(LoginRequest(email, password))
        val auth = response.data
        val user = auth.user.toDomain()

        tokenManager.saveTokens(auth.accessToken, auth.refreshToken, auth.expiresIn)
        tokenManager.saveUserInfo(user.id, user.email, user.displayName, user.avatarUrl)

        return user
    }

    suspend fun register(email: String, password: String, displayName: String?): User {
        val response = apiService.register(RegisterRequest(email, password, displayName))
        val auth = response.data
        val user = auth.user.toDomain()

        tokenManager.saveTokens(auth.accessToken, auth.refreshToken, auth.expiresIn)
        tokenManager.saveUserInfo(user.id, user.email, user.displayName, user.avatarUrl)

        return user
    }

    suspend fun googleAuth(idToken: String): User {
        val response = apiService.googleAuth(GoogleAuthRequest(idToken))
        val auth = response.data
        val user = auth.user.toDomain()

        tokenManager.saveTokens(auth.accessToken, auth.refreshToken, auth.expiresIn)
        tokenManager.saveUserInfo(user.id, user.email, user.displayName, user.avatarUrl)

        return user
    }

    suspend fun logout() {
        try {
            val refreshToken = tokenManager.getRefreshToken()
            if (refreshToken != null) {
                apiService.logout(RefreshRequest(refreshToken))
            }
        } catch (_: Exception) {
            // Ignore logout API errors
        } finally {
            tokenManager.clearSession()
        }
    }

    suspend fun getMe(): User? {
        return try {
            val response = apiService.getMe()
            val user = response.data.toDomain()
            tokenManager.saveUserInfo(user.id, user.email, user.displayName, user.avatarUrl)
            user
        } catch (_: Exception) {
            null
        }
    }

    suspend fun deleteAccount() {
        apiService.deleteAccount()
        tokenManager.clearSession()
    }

    suspend fun getCachedUser(): User? {
        val userId = tokenManager.getUserId() ?: return null
        val email = tokenManager.getEmail() ?: return null
        return User(
            id = userId,
            email = email,
            displayName = tokenManager.getDisplayName(),
            avatarUrl = null,
            role = "user",
            createdAt = null
        )
    }

    suspend fun isLoggedIn(): Boolean {
        return tokenManager.getRefreshToken() != null
    }
}
