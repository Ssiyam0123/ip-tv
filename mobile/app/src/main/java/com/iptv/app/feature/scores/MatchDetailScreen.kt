package com.iptv.app.feature.scores

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iptv.app.core.model.*
import com.iptv.app.core.network.ApiService
import com.iptv.app.core.network.SocketRepository
import com.iptv.app.ui.components.*
import com.iptv.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── ViewModel ────────────────────────────────────────────────────────────────

@HiltViewModel
class MatchDetailViewModel @Inject constructor(
    private val apiService: ApiService,
    private val socketRepository: SocketRepository
) : ViewModel() {

    private val _state = MutableStateFlow<UiState<Match>>(UiState.Loading)
    val state: StateFlow<UiState<Match>> = _state.asStateFlow()

    private var lastVersion = 0

    fun loadMatch(matchId: String) {
        viewModelScope.launch {
            _state.value = UiState.Loading
            try {
                val response = apiService.getMatch(matchId)
                _state.value = UiState.Success(response.data.toDomain())
                socketRepository.subscribe(matchId)
            } catch (e: Exception) {
                _state.value = UiState.Error(e.message ?: "Failed to load match")
            }
        }
    }

    fun handleUpdate(update: MatchUpdate) {
        if (update.version > lastVersion) {
            lastVersion = update.version
            val current = _state.value
            if (current is UiState.Success) {
                _state.value = UiState.Success(
                    current.data.copy(
                        state         = MatchState.from(update.state),
                        homeScore     = update.homeScore ?: current.data.homeScore,
                        awayScore     = update.awayScore ?: current.data.awayScore,
                        currentPeriod = update.currentPeriod ?: current.data.currentPeriod
                    )
                )
            }
        }
    }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

@Composable
fun MatchDetailScreen(
    matchId: String,
    onBack: () -> Unit,
    viewModel: MatchDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(matchId) { viewModel.loadMatch(matchId) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Bg0)
            .verticalScroll(rememberScrollState())
    ) {

        // ── Top Bar ──────────────────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick  = onBack,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Bg2)
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = OffWhite, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(10.dp))
            Text(
                text  = "Match Details",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = OffWhite
            )
        }

        // ── Content ──────────────────────────────────────────────────────────
        when (val s = state) {
            is UiState.Loading -> {
                Box(Modifier.fillMaxSize().height(400.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Brand, modifier = Modifier.size(36.dp))
                }
            }
            is UiState.Error -> {
                ErrorState(
                    message = s.message,
                    onRetry = { viewModel.loadMatch(matchId) },
                    modifier = Modifier.height(400.dp)
                )
            }
            is UiState.Success -> MatchDetailContent(match = s.data)
            else -> {}
        }
    }
}

// ─── Detail Content ───────────────────────────────────────────────────────────

@Composable
private fun MatchDetailContent(match: Match) {
    val isLive     = match.state == MatchState.LIVE
    val isFinished = match.state == MatchState.FINISHED

    // ── Hero Scoreboard ──────────────────────────────────────────────────────
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.linearGradient(
                    if (isLive)
                        listOf(Color(0xFF1E0015), Color(0xFF0E0E22), Bg2)
                    else
                        listOf(Bg2, Bg1)
                )
            )
            .border(
                1.dp,
                if (isLive) LiveRed.copy(0.5f) else Line,
                RoundedCornerShape(20.dp)
            )
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Competition badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        if (isLive) LiveRed.copy(0.12f)
                        else AccentGold.copy(0.12f)
                    )
                    .border(
                        1.dp,
                        if (isLive) LiveRed.copy(0.3f) else AccentGold.copy(0.3f),
                        RoundedCornerShape(20.dp)
                    )
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Text(
                    text       = match.competition.name,
                    style      = MaterialTheme.typography.labelMedium,
                    color      = if (isLive) LiveRed else AccentGold,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.height(24.dp))

            // Teams & Score
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Home
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    TeamFlag(name = match.homeTeam.name)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text  = match.homeTeam.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = OffWhite,
                        textAlign = TextAlign.Center
                    )
                    if (match.homeTeam.shortName != null) {
                        Text(
                            text  = match.homeTeam.shortName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Score Centre
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(horizontal = 16.dp)
                ) {
                    if (isLive) {
                        LiveIndicator()
                        Spacer(Modifier.height(8.dp))
                    }

                    Text(
                        text  = when {
                            match.homeScore != null && match.awayScore != null ->
                                "${match.homeScore}  :  ${match.awayScore}"
                            else -> "vs"
                        },
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Black,
                        color = when {
                            isLive     -> LiveRed
                            isFinished -> OffWhite
                            else       -> MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )

                    Spacer(Modifier.height(6.dp))

                    // Period or time
                    if (match.currentPeriod != null) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isLive) LiveRed.copy(0.15f) else Bg3)
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text  = match.currentPeriod,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isLive) LiveRed else MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    } else {
                        Text(
                            text  = formatMatchTime(match.startTime),
                            style = MaterialTheme.typography.bodySmall,
                            color = AccentGold
                        )
                    }
                }

                // Away
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    TeamFlag(name = match.awayTeam.name)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text  = match.awayTeam.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = OffWhite,
                        textAlign = TextAlign.Center
                    )
                    if (match.awayTeam.shortName != null) {
                        Text(
                            text  = match.awayTeam.shortName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }

    // ── Match Info Card ──────────────────────────────────────────────────────
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Bg2)
            .border(1.dp, Line, RoundedCornerShape(16.dp))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            SectionHeader(title = "Match Info", icon = Icons.Default.Info, accentColor = Brand)
            Spacer(Modifier.height(12.dp))

            InfoRow("Sport",  match.sport.value.replaceFirstChar { it.uppercase() })
            Divider(Modifier.padding(vertical = 8.dp), color = Line)
            InfoRow("Status", match.state.value.replaceFirstChar { it.uppercase() })
            if (match.competition.country != null) {
                Divider(Modifier.padding(vertical = 8.dp), color = Line)
                InfoRow("Region", match.competition.country)
            }
            if (match.snapshots?.isNotEmpty() == true) {
                Divider(Modifier.padding(vertical = 8.dp), color = Line)
                InfoRow("Last Updated", match.snapshots.first().capturedAt.take(16).replace("T", " "))
            }
        }
    }

    Spacer(Modifier.height(80.dp))
}

// ─── Team flag placeholder ────────────────────────────────────────────────────

@Composable
private fun TeamFlag(name: String) {
    Box(
        modifier = Modifier
            .size(56.dp)
            .clip(CircleShape)
            .background(
                Brush.linearGradient(listOf(Brand.copy(0.3f), BrandDark.copy(0.3f)))
            )
            .border(2.dp, Brand.copy(0.3f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text  = name.take(2).uppercase(),
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            color = OffWhite
        )
    }
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            text  = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text  = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = OffWhite
        )
    }
}

private fun formatMatchTime(isoTime: String): String {
    return try {
        val time = java.time.Instant.parse(isoTime)
            .atZone(java.time.ZoneId.systemDefault())
        String.format("%02d:%02d", time.hour, time.minute)
    } catch (_: Exception) { "" }
}
