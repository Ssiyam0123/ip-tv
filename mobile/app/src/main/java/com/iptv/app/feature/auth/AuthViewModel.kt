package com.iptv.app.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iptv.app.core.auth.AuthRepository
import com.iptv.app.core.model.UiState
import com.iptv.app.core.model.User
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val user: User? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun signIn(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _state.value = _state.value.copy(error = "Please fill in all fields")
            return
        }

        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                val user = authRepository.login(email.trim(), password)
                _state.value = _state.value.copy(isLoading = false, user = user)
            } catch (e: Exception) {
                val message = e.message ?: "Invalid email or password"
                _state.value = _state.value.copy(isLoading = false, error = message)
            }
        }
    }

    fun register(email: String, password: String, displayName: String?) {
        if (email.isBlank() || password.isBlank()) {
            _state.value = _state.value.copy(error = "Please fill in all required fields")
            return
        }
        if (password.length < 8) {
            _state.value = _state.value.copy(error = "Password must be at least 8 characters")
            return
        }

        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                val user = authRepository.register(
                    email = email.trim(),
                    password = password,
                    displayName = displayName?.trim()?.ifEmpty { null }
                )
                _state.value = _state.value.copy(isLoading = false, user = user)
            } catch (e: Exception) {
                val message = e.message ?: "Registration failed"
                _state.value = _state.value.copy(isLoading = false, error = message)
            }
        }
    }

    fun googleSignIn(idToken: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                val user = authRepository.googleAuth(idToken)
                _state.value = _state.value.copy(isLoading = false, user = user)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
