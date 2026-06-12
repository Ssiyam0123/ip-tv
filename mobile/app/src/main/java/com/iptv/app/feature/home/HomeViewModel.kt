package com.iptv.app.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iptv.app.core.database.*
import com.iptv.app.core.model.*
import com.iptv.app.core.network.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val categories: UiState<List<Category>> = UiState.Loading,
    val channels: UiState<List<Channel>> = UiState.Loading,
    val liveMatches: UiState<List<Match>> = UiState.Loading,
    val selectedCategory: String? = null,       // category id – used for UI chip selection
    val selectedCategorySlug: String? = null,   // category slug – sent to API
    val searchQuery: String = "",
    val hasMoreChannels: Boolean = false,
    val isLoadingMore: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val apiService: ApiService,
    private val databaseProvider: DatabaseProvider
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    private var channelsCursor: String? = null

    init {
        loadCategories()
        loadChannels()
        loadLiveMatches()
    }

    fun loadCategories() {
        viewModelScope.launch {
            _state.update { it.copy(categories = UiState.Loading) }
            try {
                val response = apiService.getCategories()
                val categories = response.data.map { it.toDomain() }
                _state.update { it.copy(categories = UiState.Success(categories)) }

                // Cache categories
                databaseProvider.database.categoryDao().insertAll(
                    categories.map { CachedCategory(it.id, it.name, it.slug, it.sortOrder) }
                )
            } catch (e: Exception) {
                val cached = databaseProvider.database.categoryDao().getAll()
                if (cached.isNotEmpty()) {
                    _state.update {
                        it.copy(categories = UiState.Success(
                            cached.map { Category(it.id, it.name, it.slug, it.sortOrder) }
                        ))
                    }
                } else {
                    _state.update { it.copy(categories = UiState.Error(e.message ?: "Failed to load categories")) }
                }
            }
        }
    }

    fun loadChannels(categoryId: String? = null, categorySlug: String? = null) {
        viewModelScope.launch {
            _state.update {
                it.copy(
                    channels = UiState.Loading,
                    selectedCategory = categoryId,
                    selectedCategorySlug = categorySlug
                )
            }
            channelsCursor = null
            fetchChannels()
        }
    }

    fun searchChannels(query: String) {
        viewModelScope.launch {
            _state.update { it.copy(searchQuery = query, channels = UiState.Loading) }
            channelsCursor = null
            fetchChannels()
        }
    }

    fun loadMoreChannels() {
        if (_state.value.isLoadingMore || !_state.value.hasMoreChannels) return
        viewModelScope.launch {
            _state.update { it.copy(isLoadingMore = true) }
            fetchChannels(loadMore = true)
        }
    }

    private suspend fun fetchChannels(loadMore: Boolean = false) {
        try {
            val s = _state.value
            val response = apiService.getChannels(
                category = s.selectedCategorySlug,
                query = s.searchQuery.ifEmpty { null },
                cursor = if (loadMore) channelsCursor else null,
                limit = 24
            )

            val channels = response.data.map { it.toDomain() }
            val existing = if (loadMore) {
                (s.channels as? UiState.Success)?.data ?: emptyList()
            } else emptyList()

            _state.update {
                it.copy(
                    channels = UiState.Success(existing + channels),
                    hasMoreChannels = response.page.hasMore,
                    isLoadingMore = false
                )
            }
            channelsCursor = response.page.nextCursor
            // Cache channels
            if (!loadMore) {
                    databaseProvider.database.channelDao().clearAll()
                    databaseProvider.database.channelDao().insertAll(
                        channels.map { ch ->
                            CachedChannel(
                                id = ch.id,
                                title = ch.title,
                                slug = ch.slug,
                                description = ch.description,
                                logoUrl = ch.logoUrl,
                                status = ch.status.value,
                                language = ch.language,
                                countryCode = ch.countryCode,
                                categoryId = ch.category?.id,
                                categoryName = ch.category?.name,
                                categorySlug = ch.category?.slug
                            )
                        }
                    )
                }
        } catch (e: Exception) {
            if (!loadMore) {
                val cached = databaseProvider.database.channelDao().getAll()
                if (cached.isNotEmpty()) {
                    _state.update {
                        it.copy(
                            channels = UiState.Success(
                                cached.map { c ->
                                    Channel(
                                        id = c.id, title = c.title, slug = c.slug,
                                        description = c.description, logoUrl = c.logoUrl,
                                        status = ChannelStatus.from(c.status),
                                        language = c.language, countryCode = c.countryCode,
                                        category = if (c.categoryId != null)
                                            CategoryRef(c.categoryId, c.categoryName ?: "", c.categorySlug ?: "")
                                        else null
                                    )
                                }
                            ),
                            isLoadingMore = false
                        )
                    }
                } else {
                    _state.update { it.copy(channels = UiState.Error(e.message ?: "Failed to load channels"), isLoadingMore = false) }
                }
            }
        }
    }

    private var liveMatchesJob: kotlinx.coroutines.Job? = null

    fun loadLiveMatches() {
        liveMatchesJob?.cancel()
        liveMatchesJob = viewModelScope.launch {
            while (true) {
                try {
                    val response = apiService.getMatches(state = "live", limit = 10)
                    val matches = response.data.map { it.toDomain() }
                    _state.update { it.copy(liveMatches = UiState.Success(matches)) }
                } catch (e: Exception) {
                    if (_state.value.liveMatches !is UiState.Success) {
                        _state.update { it.copy(liveMatches = UiState.Error(e.message ?: "Failed to load live scores")) }
                    }
                }
                kotlinx.coroutines.delay(5000)
            }
        }
    }

    fun selectCategory(categoryId: String?) {
        val slug = ((_state.value.categories as? UiState.Success)?.data
            ?.find { it.id == categoryId })?.slug
        loadChannels(categoryId = categoryId, categorySlug = slug)
    }

    fun clearSearch() {
        _state.update { it.copy(searchQuery = "") }
        loadChannels()
    }
}
