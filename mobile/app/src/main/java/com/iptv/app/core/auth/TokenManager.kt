package com.iptv.app.core.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "iptv_auth_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    init {
        _isAuthenticated.value = prefs.contains(KEY_REFRESH_TOKEN)
    }

    suspend fun getAccessToken(): String? =
        prefs.getString(KEY_ACCESS_TOKEN, null)

    suspend fun getRefreshToken(): String? =
        prefs.getString(KEY_REFRESH_TOKEN, null)

    suspend fun getUserId(): String? =
        prefs.getString(KEY_USER_ID, null)

    suspend fun saveTokens(
        accessToken: String,
        refreshToken: String,
        expiresIn: Int
    ) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
        _isAuthenticated.value = true
    }

    suspend fun saveUserInfo(
        userId: String,
        email: String,
        displayName: String?,
        avatarUrl: String?
    ) {
        prefs.edit()
            .putString(KEY_USER_ID, userId)
            .putString(KEY_EMAIL, email)
            .putString(KEY_DISPLAY_NAME, displayName)
            .putString(KEY_AVATAR_URL, avatarUrl)
            .apply()
    }

    suspend fun getEmail(): String? =
        prefs.getString(KEY_EMAIL, null)

    suspend fun getDisplayName(): String? =
        prefs.getString(KEY_DISPLAY_NAME, null)

    suspend fun clearSession() {
        prefs.edit().clear().apply()
        _isAuthenticated.value = false
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_EMAIL = "email"
        private const val KEY_DISPLAY_NAME = "display_name"
        private const val KEY_AVATAR_URL = "avatar_url"
    }
}
