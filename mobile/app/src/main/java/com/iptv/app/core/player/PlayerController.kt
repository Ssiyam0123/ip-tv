package com.iptv.app.core.player

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import com.iptv.app.core.model.PlaybackSource
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

// ─── States ───────────────────────────────────────────────────────────────────

sealed interface PlayerState {
    data object Idle      : PlayerState
    data object Loading   : PlayerState
    data object Buffering : PlayerState
    data object Playing   : PlayerState
    data object Paused    : PlayerState
    data class  Error(val message: String, val isRecoverable: Boolean = true) : PlayerState
    data object Retrying  : PlayerState
}

// ─── Controller ───────────────────────────────────────────────────────────────

@OptIn(UnstableApi::class)
@Singleton
class PlayerController @Inject constructor(
    private val context: Context
) {
    private val _playerState = MutableStateFlow<PlayerState>(PlayerState.Idle)
    val playerState: StateFlow<PlayerState> = _playerState.asStateFlow()

    private var exoPlayer: ExoPlayer? = null
    private var currentSources: List<PlaybackSource> = emptyList()
    private var currentSourceIndex = 0
    private var retryCount = 0
    private var retryJob: Job? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val MAX_RETRIES    = 3
    private val RETRY_DELAY_MS = 2500L

    val player: ExoPlayer? get() = exoPlayer

    // ── Initialization ────────────────────────────────────────────────────────

    fun initialize(): ExoPlayer {
        // Release stale player before creating new one (avoids glitches on channel switch)
        if (exoPlayer != null) return exoPlayer!!

        exoPlayer = ExoPlayer.Builder(context)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(android.os.PowerManager.PARTIAL_WAKE_LOCK)
            .build()
            .apply { addListener(playerListener) }

        return exoPlayer!!
    }

    /** Call this BEFORE loading a new channel to reset stale state */
    fun prepareForNewChannel() {
        retryJob?.cancel()
        retryCount = 0
        currentSourceIndex = 0
        currentSources = emptyList()
        exoPlayer?.run {
            stop()
            clearMediaItems()
        }
        _playerState.value = PlayerState.Loading
    }

    // ── Playback ──────────────────────────────────────────────────────────────

    fun playSources(sources: List<PlaybackSource>) {
        if (sources.isEmpty()) {
            _playerState.value = PlayerState.Error("No stream sources available", false)
            return
        }
        currentSources      = sources.sortedBy { it.priority }
        currentSourceIndex  = 0
        retryCount          = 0
        playCurrentSource()
    }

    private fun playCurrentSource() {
        if (currentSourceIndex >= currentSources.size) {
            _playerState.value = PlayerState.Error("All sources failed. Please retry.", false)
            return
        }

        val source = currentSources[currentSourceIndex]
        _playerState.value = PlayerState.Loading

        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(15_000)
            .setAllowCrossProtocolRedirects(true)

        val hlsSource = HlsMediaSource.Factory(dataSourceFactory)
            .setAllowChunklessPreparation(true)
            .createMediaSource(MediaItem.fromUri(source.playbackUrl))

        exoPlayer?.apply {
            stop()
            clearMediaItems()
            setMediaSource(hlsSource)
            prepare()
            playWhenReady = true
        }
    }

    // ── Player Listener ───────────────────────────────────────────────────────

    private val playerListener = object : Player.Listener {

        override fun onPlaybackStateChanged(state: Int) {
            when (state) {
                Player.STATE_BUFFERING -> {
                    // Only downgrade to Buffering if we were Playing (avoid stomping Loading)
                    if (_playerState.value is PlayerState.Playing) {
                        _playerState.value = PlayerState.Buffering
                    }
                }
                Player.STATE_READY -> {
                    // Ready is set via onIsPlayingChanged which is more accurate
                }
                Player.STATE_ENDED -> {
                    _playerState.value = PlayerState.Paused
                }
                Player.STATE_IDLE -> {
                    // handled by onPlayerError
                }
            }
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            val current = _playerState.value
            // Don't stomp Error / Retrying states
            if (current is PlayerState.Error || current is PlayerState.Retrying) return

            _playerState.value = if (isPlaying) PlayerState.Playing else {
                // Only mark Paused if we were Playing/Buffering (not while Loading)
                if (current is PlayerState.Playing || current is PlayerState.Buffering)
                    PlayerState.Paused
                else
                    current
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            handlePlaybackError(error)
        }
    }

    // ── Error Handling ────────────────────────────────────────────────────────

    private fun handlePlaybackError(error: PlaybackException) {
        retryJob?.cancel()

        when {
            retryCount < MAX_RETRIES -> {
                retryCount++
                _playerState.value = PlayerState.Retrying
                retryJob = scope.launch {
                    delay(RETRY_DELAY_MS)
                    playCurrentSource()
                }
            }
            currentSourceIndex < currentSources.size - 1 -> {
                // Try next source
                currentSourceIndex++
                retryCount = 0
                _playerState.value = PlayerState.Retrying
                retryJob = scope.launch {
                    delay(500)
                    playCurrentSource()
                }
            }
            else -> {
                _playerState.value = PlayerState.Error(
                    message = "Stream unavailable. ${error.errorCodeName}",
                    isRecoverable = true
                )
            }
        }
    }

    // ── Controls ──────────────────────────────────────────────────────────────

    fun togglePlayPause() {
        exoPlayer?.let {
            if (it.isPlaying) it.pause() else it.play()
        }
    }

    fun seekTo(positionMs: Long) { exoPlayer?.seekTo(positionMs) }

    fun setVolume(volume: Float) { exoPlayer?.volume = volume.coerceIn(0f, 1f) }

    fun switchSource(sourceIndex: Int) {
        if (sourceIndex !in currentSources.indices) return
        currentSourceIndex = sourceIndex
        retryCount         = 0
        retryJob?.cancel()
        playCurrentSource()
    }

    fun retry() {
        retryJob?.cancel()
        retryCount         = 0
        currentSourceIndex = 0
        playCurrentSource()
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    fun release() {
        retryJob?.cancel()
        exoPlayer?.removeListener(playerListener)
        exoPlayer?.release()
        exoPlayer       = null
        _playerState.value = PlayerState.Idle
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    fun getCurrentPosition(): Long       = exoPlayer?.currentPosition ?: 0L
    fun getDuration(): Long              = exoPlayer?.duration ?: 0L
    fun isPlaying(): Boolean             = exoPlayer?.isPlaying ?: false
    fun getAvailableSources(): List<PlaybackSource> = currentSources
    fun getCurrentSourceIndex(): Int     = currentSourceIndex
}
