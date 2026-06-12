package com.iptv.app.feature.scores

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iptv.app.core.model.*
import com.iptv.app.core.network.ApiService
import com.iptv.app.core.network.SocketRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ScoresUiState(
    val matches: UiState<List<Match>> = UiState.Loading,
    val selectedSport: SportFilter = SportFilter.ALL,
    val selectedState: MatchStateFilter = MatchStateFilter.ALL,
    val liveUpdates: Map<String, MatchUpdate> = emptyMap()
)

enum class SportFilter(val label: String, val queryValue: String?) {
    ALL("All Sports", null),
    FOOTBALL("Football", "football"),
    CRICKET("Cricket", "cricket")
}

enum class MatchStateFilter(val label: String, val queryValue: String?) {
    ALL("All", null),
    LIVE("Live", "live"),
    SCHEDULED("Scheduled", "scheduled"),
    FINISHED("Finished", "finished")
}

@HiltViewModel
class ScoresViewModel @Inject constructor(
    private val apiService: ApiService,
    private val socketRepository: SocketRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ScoresUiState())
    val state: StateFlow<ScoresUiState> = _state.asStateFlow()

    private var lastVersions = mutableMapOf<String, Int>()

    init {
        loadMatches()
    }

    fun loadMatches() {
        viewModelScope.launch {
            _state.update { it.copy(matches = UiState.Loading) }
            try {
                val s = _state.value
                val response = apiService.getMatches(
                    sport = s.selectedSport.queryValue,
                    state = s.selectedState.queryValue,
                    limit = 50
                )
                val matches = response.data.map { it.toDomain() }
                _state.update { it.copy(matches = UiState.Success(matches)) }

                // Subscribe to live matches
                matches.filter { it.state == MatchState.LIVE }.forEach { match ->
                    socketRepository.subscribe(match.id)
                }
            } catch (e: Exception) {
                _state.update { it.copy(matches = UiState.Error(e.message ?: "Failed to load scores")) }
            }
        }
    }

    fun setSportFilter(sport: SportFilter) {
        _state.update { it.copy(selectedSport = sport) }
        loadMatches()
    }

    fun setStateFilter(state: MatchStateFilter) {
        _state.update { it.copy(selectedState = state) }
        loadMatches()
    }

    // Observe socket updates
    val scoreUpdates: Flow<MatchUpdate> = socketRepository.connect()

    fun handleScoreUpdate(update: MatchUpdate) {
        val lastVersion = lastVersions[update.matchId] ?: -1
        if (update.version > lastVersion) {
            lastVersions[update.matchId] = update.version
            _state.update {
                val updates = it.liveUpdates + (update.matchId to update)
                it.copy(liveUpdates = updates)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        socketRepository.disconnect()
    }
}
