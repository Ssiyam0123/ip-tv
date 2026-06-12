package com.iptv.app.feature.player

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.iptv.app.core.model.*
import com.iptv.app.core.network.ApiService
import com.iptv.app.core.player.PlayerController
import com.iptv.app.core.player.PlayerState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlayerUiState(
    val channel: UiState<ChannelDetail> = UiState.Loading,
    val session: UiState<PlaybackSession> = UiState.Loading,
    val playerState: PlayerState = PlayerState.Idle,
    val relatedChannels: UiState<List<Channel>> = UiState.Success(emptyList())
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    application: Application,
    private val apiService: ApiService,
    val playerController: PlayerController
) : AndroidViewModel(application) {

    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    fun loadChannel(channelId: String) {
        viewModelScope.launch {
            _state.update { it.copy(channel = UiState.Loading, session = UiState.Loading) }

            // Reset player for new channel (prevents audio/video artifacts)
            playerController.prepareForNewChannel()

            try {
                val channelResponse = apiService.getChannel(channelId)
                val channel = channelResponse.data.toDomain()
                _state.update { it.copy(channel = UiState.Success(channel)) }

                loadRelatedChannels(channel.category?.id)

                val sessionResponse = apiService.createPlaybackSession(channelId)
                val session = sessionResponse.data.toDomain()
                _state.update { it.copy(session = UiState.Success(session)) }

                if (session.sources.isNotEmpty()) {
                    playerController.initialize()
                    playerController.playSources(session.sources)
                } else {
                    _state.update { it.copy(session = UiState.Error("No stream sources found")) }
                }
            } catch (e: Exception) {
                _state.update {
                    it.copy(session = UiState.Error(e.message ?: "Failed to start playback"))
                }
            }
        }
    }

    private suspend fun loadRelatedChannels(categoryId: String?) {
        try {
            if (categoryId != null) {
                val response = apiService.getChannels(category = categoryId, limit = 10)
                _state.update { it.copy(relatedChannels = UiState.Success(response.data.map { dto -> dto.toDomain() })) }
            }
        } catch (_: Exception) {
            // Non-critical
        }
    }

    fun observePlayerState(): StateFlow<PlayerState> = playerController.playerState

    fun togglePlayPause() = playerController.togglePlayPause()
    fun seekTo(positionMs: Long) = playerController.seekTo(positionMs)
    fun setVolume(volume: Float) = playerController.setVolume(volume)
    fun retry() = playerController.retry()
    fun switchSource(index: Int) = playerController.switchSource(index)

    override fun onCleared() {
        super.onCleared()
        playerController.release()
    }
}
