package com.iptv.app.feature.home

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
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
import androidx.compose.ui.platform.LocalConfiguration
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    onPlayChannel: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var searchText by remember { mutableStateOf("") }
    val isCompact = isCompactScreen()

    // Derive selected category name without recomputing on every frame
    val selectedCategoryName by remember {
        derivedStateOf {
            (state.categories as? UiState.Success)?.data
                ?.find { it.id == state.selectedCategory }?.name
        }
    }

    // Use LazyColumn to avoid nested-scroll conflict with LazyRow
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Bg0)
    ) {
        // ── Top Bar ──────────────────────────────────────────────────────────
        item {
            HomeTopBar()
        }

        // ── Live Scores Rail ─────────────────────────────────────────────────
        item {
            LiveScoresSection(
                matches   = (state.liveMatches as? UiState.Success)?.data ?: emptyList(),
                isLoading = state.liveMatches is UiState.Loading,
                onMatchClick = {}
            )
            Spacer(Modifier.height(20.dp))
        }

        // ── Search ───────────────────────────────────────────────────────────
        item {
            SearchBarField(
                text     = searchText,
                onChange = { searchText = it; viewModel.searchChannels(it) },
                onClear  = { searchText = ""; viewModel.clearSearch() }
            )
            Spacer(Modifier.height(14.dp))
        }

        // ── Category Chips (sticky) ───────────────────────────────────────────
        stickyHeader {
            Box(Modifier.background(Bg0).fillMaxWidth().padding(vertical = 6.dp)) {
                CategoryChipsRow(
                    categories = (state.categories as? UiState.Success)?.data ?: emptyList(),
                    selectedId = state.selectedCategory,
                    isLoading  = state.categories is UiState.Loading,
                    onSelect   = { viewModel.selectCategory(it) }
                )
            }
        }

        // ── Section Title ────────────────────────────────────────────────────
        item {
            Spacer(Modifier.height(14.dp))
            SectionHeader(
                title = when {
                    state.searchQuery.isNotEmpty()    -> "Results for \"${state.searchQuery}\""
                    selectedCategoryName != null      -> selectedCategoryName!!
                    else                              -> "All Channels"
                },
                icon  = Icons.Default.Tv,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(Modifier.height(12.dp))
        }

        // ── Channel Content ──────────────────────────────────────────────────
        when (val channelsState = state.channels) {
            is UiState.Loading -> {
                items(6) {
                    Box(Modifier.padding(horizontal = 16.dp)) {
                        ChannelSkeleton()
                    }
                    Spacer(Modifier.height(10.dp))
                }
            }
            is UiState.Error -> {
                item {
                    ErrorState(
                        message = channelsState.message,
                        onRetry = { viewModel.loadChannels() },
                        modifier = Modifier.height(300.dp)
                    )
                }
            }
            is UiState.Success -> {
                if (channelsState.data.isEmpty()) {
                    item {
                        EmptyState(
                            icon        = Icons.Default.SearchOff,
                            title       = "No channels found",
                            description = "Try a different category or search term",
                            modifier    = Modifier.height(300.dp)
                        )
                    }
                } else {
                    val columns = if (isCompact) 2 else 3
                    val rows = channelsState.data.chunked(columns)

                    items(rows.size) { rowIdx ->
                        val row = rows[rowIdx]
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            row.forEach { channel ->
                                ChannelCard(
                                    channel  = channel,
                                    onClick  = { onPlayChannel(channel.id) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
                        }
                        Spacer(Modifier.height(10.dp))
                    }

                    if (state.hasMoreChannels) {
                        item {
                            Box(
                                Modifier.fillMaxWidth().padding(16.dp),
                                Alignment.Center
                            ) {
                                if (state.isLoadingMore) {
                                    CircularProgressIndicator(
                                        Modifier.size(28.dp), Brand, 2.5.dp, strokeCap = StrokeCap.Round
                                    )
                                } else {
                                    OutlinedButton(
                                        onClick = { viewModel.loadMoreChannels() },
                                        shape   = RoundedCornerShape(12.dp),
                                        border  = BorderStroke(1.dp, Brand),
                                        colors  = ButtonDefaults.outlinedButtonColors(contentColor = Brand)
                                    ) {
                                        Text("Load More", fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else -> {}
        }

        // Bottom nav space
        item { Spacer(Modifier.height(80.dp)) }
    }
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

@Composable
private fun HomeTopBar() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(
                "IPTV Stream",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.ExtraBold,
                color = OffWhite
            )
            Text(
                "Live TV & Sports",
                style = MaterialTheme.typography.labelMedium,
                color = BrandLight.copy(0.65f)
            )
        }
        Box(
            Modifier.size(40.dp).clip(CircleShape)
                .background(Brush.linearGradient(listOf(Brand, BrandDark))),
            Alignment.Center
        ) {
            Icon(Icons.Default.Person, null, Modifier.size(20.dp), Color.White)
        }
    }
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

@Composable
private fun SearchBarField(text: String, onChange: (String) -> Unit, onClear: () -> Unit) {
    OutlinedTextField(
        value         = text,
        onValueChange = onChange,
        placeholder   = { Text("Search channels...", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(0.5f)) },
        leadingIcon   = { Icon(Icons.Default.Search, null, tint = Brand.copy(0.8f)) },
        trailingIcon  = {
            AnimatedVisibility(text.isNotEmpty(), enter = fadeIn(), exit = fadeOut()) {
                IconButton(onClear) { Icon(Icons.Default.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        },
        modifier  = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape     = RoundedCornerShape(16.dp),
        colors    = OutlinedTextFieldDefaults.colors(
            focusedContainerColor   = Bg2,
            unfocusedContainerColor = Bg1,
            focusedBorderColor      = Brand,
            unfocusedBorderColor    = Line,
            cursorColor             = Brand,
            focusedTextColor        = OffWhite,
            unfocusedTextColor      = OffWhite
        ),
        singleLine = true
    )
}

// ─── Live Scores ──────────────────────────────────────────────────────────────

@Composable
fun LiveScoresSection(
    matches: List<Match>,
    isLoading: Boolean,
    onMatchClick: (String) -> Unit
) {
    Column(Modifier.padding(top = 4.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            SectionHeader("Live Scores", Icons.Default.SportsSoccer, LiveRed)
            if (matches.isNotEmpty()) {
                Text("${matches.size} LIVE", style = MaterialTheme.typography.labelSmall, color = LiveRed, fontWeight = FontWeight.Bold)
            }
        }

        when {
            isLoading -> {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(3) {
                        ShimmerBox(Modifier.width(200.dp).height(120.dp), 16.dp)
                    }
                }
            }
            matches.isEmpty() -> {
                Box(
                    Modifier.fillMaxWidth().height(90.dp).padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(14.dp)).background(Bg2),
                    Alignment.Center
                ) {
                    Text("No live matches right now", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            else -> {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(matches, key = { it.id }) { match ->
                        ScoreRailCard(match, { onMatchClick(match.id) })
                    }
                }
            }
        }
    }
}

@Composable
fun ScoreRailCard(match: Match, onClick: () -> Unit) {
    val isLive = match.state == MatchState.LIVE
    val interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (isPressed) 0.96f else 1f, spring(Spring.DampingRatioMediumBouncy), label = "card_scale")

    Box(Modifier.scale(scale)) {
        Card(
            onClick   = onClick,
            modifier  = Modifier.width(200.dp),
            shape     = RoundedCornerShape(16.dp),
            colors    = CardDefaults.cardColors(Color.Transparent),
            elevation = CardDefaults.cardElevation(0.dp),
            interactionSource = interactionSource
        ) {
            Box(
                Modifier
                    .background(if (isLive) Brush.linearGradient(listOf(Color(0xFF1A0010), Bg2)) else Brush.linearGradient(listOf(Bg2, Bg3)))
                    .border(1.dp, if (isLive) LiveRed.copy(0.5f) else Line, RoundedCornerShape(16.dp))
            ) {
                Column(Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        match.competition.name,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isLive) AccentGold else MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1, overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(8.dp))
                    if (isLive) { LiveIndicator(); Spacer(Modifier.height(6.dp)) }
                    Text(
                        "${match.homeScore ?: "-"}  :  ${match.awayScore ?: "-"}",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black,
                        color = if (isLive) LiveRed else OffWhite
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${match.homeTeam.shortName ?: match.homeTeam.name} vs ${match.awayTeam.shortName ?: match.awayTeam.name}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center
                    )
                    if (match.currentPeriod != null && isLive) {
                        Spacer(Modifier.height(4.dp))
                        Box(Modifier.clip(RoundedCornerShape(6.dp)).background(LiveRed.copy(0.15f)).padding(horizontal = 8.dp, vertical = 2.dp)) {
                            Text(match.currentPeriod, style = MaterialTheme.typography.labelSmall, color = LiveRed, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

// ─── Category Chips ───────────────────────────────────────────────────────────

@Composable
fun CategoryChipsRow(
    categories: List<Category>,
    selectedId: String?,
    isLoading: Boolean,
    onSelect: (String?) -> Unit
) {
    if (isLoading) {
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(5) { ShimmerBox(Modifier.width(72.dp).height(34.dp), 50.dp) }
        }
        return
    }
    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        item { PremiumChip("All", selectedId == null) { onSelect(null) } }
        items(categories, key = { it.id }) { cat ->
            PremiumChip(cat.name, selectedId == cat.id) { onSelect(cat.id) }
        }
    }
}

@Composable
private fun PremiumChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val haptic = LocalHapticFeedback.current
    val scale by animateFloatAsState(if (selected) 1.04f else 1f, label = "chip_s")
    Box(
        Modifier
            .scale(scale)
            .clip(CircleShape)
            .background(if (selected) Brush.linearGradient(listOf(Brand, BrandDark)) else Brush.linearGradient(listOf(Bg2, Bg3)))
            .border(1.dp, if (selected) Brand else Line, CircleShape)
            .clickable { haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress); onClick() }
            .padding(horizontal = 18.dp, vertical = 9.dp),
        Alignment.Center
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ─── Channel Card ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChannelCard(channel: Channel, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val haptic = LocalHapticFeedback.current
    val interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (isPressed) 0.94f else 1f, spring(Spring.DampingRatioMediumBouncy), label = "ch_scale")

    Box(Modifier.scale(scale)) {
        Card(
            onClick   = { haptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress); onClick() },
            modifier  = modifier,
            shape     = RoundedCornerShape(16.dp),
            colors    = CardDefaults.cardColors(Color.Transparent),
            elevation = CardDefaults.cardElevation(0.dp),
            interactionSource = interactionSource
        ) {
            Box(
                Modifier
                    .background(Brush.verticalGradient(listOf(Bg2, Bg1)))
                    .border(1.dp, Line, RoundedCornerShape(16.dp))
            ) {
                Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    // Logo
                    Box(
                        Modifier.size(56.dp).clip(RoundedCornerShape(14.dp)).background(Bg3),
                        Alignment.Center
                    ) {
                        NetworkImage(
                            url = channel.logoUrl,
                            contentDescription = "${channel.title} logo",
                            modifier = Modifier.size(40.dp)
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        channel.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                        color = OffWhite, textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(5.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        ChannelStatusDot(channel.status.value)
                        Spacer(Modifier.width(5.dp))
                        Text(
                            channel.category?.name ?: channel.status.value,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1, overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

@Composable
private fun isCompactScreen(): Boolean {
    val configuration = LocalConfiguration.current
    return configuration.screenWidthDp < 600
}
