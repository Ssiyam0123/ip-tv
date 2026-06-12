package com.iptv.app.feature.scores

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.iptv.app.core.model.*
import com.iptv.app.ui.components.*
import com.iptv.app.ui.theme.*

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ScoresScreen(
    onMatchClick: (String) -> Unit,
    viewModel: ScoresViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.scoreUpdates.collect { viewModel.handleScoreUpdate(it) }
    }

    // Single LazyColumn — no outer scroll wrapper — eliminates double-scroll bug
    LazyColumn(
        modifier       = Modifier.fillMaxSize().background(Bg0),
        contentPadding = PaddingValues(bottom = 80.dp)
    ) {
        // ── Header ───────────────────────────────────────────────────────────
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp)
            ) {
                SectionHeader("World Cup Scores", Icons.Default.EmojiEvents, AccentGold)

                val liveCount by remember {
                    derivedStateOf {
                        (state.matches as? UiState.Success)?.data?.count { it.state == MatchState.LIVE } ?: 0
                    }
                }
                AnimatedVisibility(liveCount > 0) {
                    Box(
                        Modifier.clip(RoundedCornerShape(20.dp))
                            .background(LiveRed.copy(0.18f))
                            .border(1.dp, LiveRed.copy(0.4f), RoundedCornerShape(20.dp))
                            .padding(horizontal = 12.dp, vertical = 5.dp)
                    ) {
                        Text("$liveCount LIVE", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = LiveRed)
                    }
                }
            }
        }

        // ── Sport Filter (sticky) ─────────────────────────────────────────────
        stickyHeader {
            Surface(color = Bg0, tonalElevation = 0.dp, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        SportFilter.entries.forEach { filter ->
                            SportFilterChip(
                                label    = filter.label,
                                selected = state.selectedSport == filter,
                                onClick  = { viewModel.setSportFilter(filter) }
                            )
                        }
                    }
                    // ── Match State Tab Bar ───────────────────────────────────
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Bg2)
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        MatchStateFilter.entries.forEach { filter ->
                            val sel = state.selectedState == filter
                            Box(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (sel) Brush.linearGradient(listOf(Brand, BrandDark)) else Brush.linearGradient(listOf(Color.Transparent, Color.Transparent)))
                                    .clickable { viewModel.setStateFilter(filter) }
                                    .padding(vertical = 9.dp),
                                Alignment.Center
                            ) {
                                Text(filter.label, style = MaterialTheme.typography.labelMedium, fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal, color = if (sel) Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }

        // ── Match Content ─────────────────────────────────────────────────────
        when (val ms = state.matches) {
            is UiState.Loading -> {
                items(6) {
                    Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                        ShimmerBox(Modifier.fillMaxWidth().height(72.dp), 14.dp)
                    }
                }
            }
            is UiState.Error -> {
                item {
                    ErrorState(ms.message, onRetry = { viewModel.loadMatches() }, modifier = Modifier.height(400.dp))
                }
            }
            is UiState.Success -> {
                if (ms.data.isEmpty()) {
                    item {
                        EmptyState(Icons.Default.SportsScore, "No matches found", "Try different filters", modifier = Modifier.height(400.dp))
                    }
                } else {
                    val grouped = ms.data.groupBy { it.competition.name }
                    grouped.forEach { (competition, matches) ->
                        // Competition header (sticky)
                        stickyHeader(key = "hdr_$competition") {
                            CompetitionGroupHeader(competition)
                        }
                        items(matches, key = { it.id }) { match ->
                            val liveUpdate = state.liveUpdates[match.id]
                            val display = if (liveUpdate != null) match.copy(
                                state         = MatchState.from(liveUpdate.state),
                                homeScore     = liveUpdate.homeScore ?: match.homeScore,
                                awayScore     = liveUpdate.awayScore ?: match.awayScore,
                                currentPeriod = liveUpdate.currentPeriod ?: match.currentPeriod
                            ) else match
                            Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                                MatchListItem(display) { onMatchClick(match.id) }
                            }
                        }
                        item(key = "spacer_$competition") { Spacer(Modifier.height(4.dp)) }
                    }
                }
            }
            else -> {}
        }
    }
}

// ─── Competition Group Header ─────────────────────────────────────────────────

@Composable
private fun CompetitionGroupHeader(name: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(Bg0)
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(Brush.horizontalGradient(listOf(Bg2, Bg3)))
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Icon(Icons.Default.EmojiEvents, null, Modifier.size(16.dp), AccentGold)
        Spacer(Modifier.width(8.dp))
        Text(name, style = MaterialTheme.typography.labelLarge, color = OffWhite, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ─── Sport Filter Chip ────────────────────────────────────────────────────────

@Composable
private fun SportFilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val haptic = LocalHapticFeedback.current
    val scale by animateFloatAsState(if (selected) 1.05f else 1f, label = "sc")
    Box(
        Modifier
            .scale(scale)
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) Brush.linearGradient(listOf(Brand, BrandDark)) else Brush.linearGradient(listOf(Bg2, Bg3)))
            .border(1.dp, if (selected) Brand else Line, RoundedCornerShape(10.dp))
            .clickable { haptic.performHapticFeedback(HapticFeedbackType.LongPress); onClick() }
            .padding(horizontal = 18.dp, vertical = 9.dp)
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ─── Match Row Card ───────────────────────────────────────────────────────────

@Composable
fun MatchListItem(match: Match, onClick: () -> Unit) {
    val isLive     = match.state == MatchState.LIVE
    val isFinished = match.state == MatchState.FINISHED
    val haptic     = LocalHapticFeedback.current
    val interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (isPressed) 0.97f else 1f, spring(Spring.DampingRatioMediumBouncy), label = "m_s")

    Box(Modifier.scale(scale)) {
        Card(
            onClick   = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); onClick() },
            modifier  = Modifier.fillMaxWidth(),
            shape     = RoundedCornerShape(14.dp),
            colors    = CardDefaults.cardColors(Color.Transparent),
            elevation = CardDefaults.cardElevation(0.dp),
            interactionSource = interactionSource
        ) {
            Box(
                Modifier
                    .background(if (isLive) Brush.linearGradient(listOf(Color(0xFF1A0010), Bg2)) else Brush.linearGradient(listOf(Bg2, Bg1)))
                    .border(1.dp, if (isLive) LiveRed.copy(0.4f) else Line, RoundedCornerShape(14.dp))
            ) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                        Text(match.homeTeam.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = OffWhite, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.End)
                        match.homeTeam.shortName?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.End) }
                    }
                    Column(Modifier.padding(horizontal = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        if (isLive) { LiveIndicator(); Spacer(Modifier.height(3.dp)) }
                        Text(
                            text  = if (match.homeScore != null && match.awayScore != null) "${match.homeScore} : ${match.awayScore}" else "vs",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Black,
                            color = when { isLive -> LiveRed; isFinished -> OffWhite; else -> MaterialTheme.colorScheme.onSurfaceVariant }
                        )
                        if (match.currentPeriod != null) {
                            Spacer(Modifier.height(2.dp))
                            Text(match.currentPeriod, style = MaterialTheme.typography.labelSmall, color = if (isLive) LiveRed.copy(0.85f) else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                        } else if (!isLive && !isFinished) {
                            Text(formatMatchTime(match.startTime), style = MaterialTheme.typography.labelSmall, color = AccentGold)
                        }
                    }
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.Start) {
                        Text(match.awayTeam.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = OffWhite, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        match.awayTeam.shortName?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                }
            }
        }
    }
}

private fun formatMatchTime(isoTime: String): String = try {
    val t = java.time.Instant.parse(isoTime).atZone(java.time.ZoneId.systemDefault())
    String.format("%02d:%02d", t.hour, t.minute)
} catch (_: Exception) { "--:--" }
