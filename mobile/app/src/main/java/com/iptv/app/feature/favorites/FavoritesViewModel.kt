package com.iptv.app.feature.favorites

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iptv.app.core.auth.AuthRepository
import com.iptv.app.core.model.*
import com.iptv.app.core.network.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FavoritesUiState(
    val favorites: UiState<List<Favorite>> = UiState.Loading,
    val isAuthenticated: Boolean = false
)

@HiltViewModel
class FavoritesViewModel @Inject constructor(
    private val apiService: ApiService,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(FavoritesUiState())
    val state: StateFlow<FavoritesUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.isAuthenticated.collect { authenticated ->
                _state.update { it.copy(isAuthenticated = authenticated) }
                if (authenticated) loadFavorites()
            }
        }
    }

    fun loadFavorites() {
        viewModelScope.launch {
            _state.update { it.copy(favorites = UiState.Loading) }
            try {
                val response = apiService.getFavorites()
                val favorites = response.data.map { it.toDomain() }
                _state.update { it.copy(favorites = UiState.Success(favorites)) }
            } catch (e: Exception) {
                _state.update { it.copy(favorites = UiState.Error(e.message ?: "Failed to load favorites")) }
            }
        }
    }

    fun removeFavorite(channelId: String) {
        viewModelScope.launch {
            try {
                apiService.removeFavorite(channelId)
                loadFavorites()
            } catch (_: Exception) {
                // Revert handled by UI layer
            }
        }
    }

    fun addFavorite(channelId: String) {
        viewModelScope.launch {
            try {
                apiService.addFavorite(channelId)
                loadFavorites()
            } catch (_: Exception) {
                // Revert handled by UI layer
            }
        }
    }
}
