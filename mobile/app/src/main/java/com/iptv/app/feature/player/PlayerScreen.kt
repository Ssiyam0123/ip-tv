package com.iptv.app.feature.player

import android.app.Activity
import android.content.pm.ActivityInfo
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.iptv.app.core.model.*
import com.iptv.app.core.player.PlayerState
import com.iptv.app.ui.components.*
import com.iptv.app.ui.theme.*

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
    channelId: String,
    onBack: () -> Unit,
    viewModel: PlayerViewModel = hiltViewModel()
) {
    val state       by viewModel.state.collectAsState()
    val playerState by viewModel.observePlayerState().collectAsState()
    var isFullscreen by remember { mutableStateOf(false) }
    val context = LocalContext.current

    LaunchedEffect(isFullscreen) {
        val activity = context as? Activity
        if (isFullscreen) {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        } else {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            val activity = context as? Activity
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    LaunchedEffect(channelId) { viewModel.loadChannel(channelId) }

    if (isFullscreen) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            PlayerSurface(
                state       = state,
                playerState = playerState,
                channelId   = channelId,
                onBack      = { isFullscreen = false },
                viewModel   = viewModel,
                isFullscreen = true,
                onToggleFullscreen = { isFullscreen = false }
            )
        }
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Bg0)
                .verticalScroll(rememberScrollState())
        ) {
            // ── Video Player ─────────────────────────────────────────────────────
            PlayerSurface(
                state       = state,
                playerState = playerState,
                channelId   = channelId,
                onBack      = onBack,
                viewModel   = viewModel,
                isFullscreen = false,
                onToggleFullscreen = { isFullscreen = true }
            )

            // ── Channel Info ─────────────────────────────────────────────────────
            AnimatedVisibility(
                visible = state.channel is UiState.Success,
                enter   = fadeIn() + slideInVertically { it / 2 }
            ) {
                (state.channel as? UiState.Success)?.data?.let { ch ->
                    ChannelInfoSection(channel = ch, state = state, viewModel = viewModel)
                }
            }

            if (state.channel is UiState.Loading) {
                Column(Modifier.padding(16.dp)) {
                    repeat(3) {
                        ShimmerBox(Modifier.fillMaxWidth().height(14.dp))
                        Spacer(Modifier.height(10.dp))
                    }
                }
            }

            // ── Related Channels ─────────────────────────────────────────────────
            (state.relatedChannels as? UiState.Success)?.data?.let { channels ->
                if (channels.isNotEmpty()) RelatedChannelsSection(channels) { viewModel.loadChannel(it) }
            }

            Spacer(Modifier.height(80.dp))
        }
    }
}

// Helper to format position/duration in HH:MM:SS or MM:SS format
private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val seconds = totalSeconds % 60
    val minutes = (totalSeconds / 60) % 60
    val hours = totalSeconds / 3600
    return if (hours > 0) {
        String.format("%02d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}

// ─── Player Surface ───────────────────────────────────────────────────────────

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
private fun PlayerSurface(
    state: PlayerUiState,
    playerState: PlayerState,
    channelId: String,
    onBack: () -> Unit,
    viewModel: PlayerViewModel,
    isFullscreen: Boolean,
    onToggleFullscreen: () -> Unit
) {
    var controlsVisible by remember { mutableStateOf(false) }
    var currentPosition by remember { mutableStateOf(0L) }
    var duration by remember { mutableStateOf(0L) }

    // Auto-hide controls after 3s when playing
    LaunchedEffect(playerState) {
        if (playerState is PlayerState.Playing) {
            kotlinx.coroutines.delay(3000)
            controlsVisible = false
        } else if (playerState !is PlayerState.Idle) {
            controlsVisible = true
        }
    }

    // Poll position/duration while controls are visible
    LaunchedEffect(controlsVisible, playerState) {
        val player = viewModel.playerController.player
        if (player != null && controlsVisible) {
            while (true) {
                currentPosition = player.currentPosition
                duration = player.duration
                kotlinx.coroutines.delay(1000)
            }
        }
    }

    Box(
        Modifier
            .fillMaxWidth()
            .then(if (isFullscreen) Modifier.fillMaxHeight() else Modifier.aspectRatio(16f / 9f))
            .background(Color.Black)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) { controlsVisible = !controlsVisible }
    ) {
        // ── ExoPlayer Surface ────────────────────────────────────────────────
        when {
            state.session is UiState.Loading || state.channel is UiState.Loading -> {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(36.dp), Brand, 3.dp, strokeCap = StrokeCap.Round)
                }
            }
            state.session is UiState.Error -> {
                PlayerErrorOverlay(
                    message = (state.session as UiState.Error).message,
                    onRetry = { viewModel.loadChannel(channelId) }
                )
            }
            else -> {
                val player = viewModel.playerController.player
                if (player != null) {
                    AndroidView(
                        factory = { ctx ->
                            PlayerView(ctx).apply {
                                this.player          = player
                                useController        = false
                                resizeMode           = AspectRatioFrameLayout.RESIZE_MODE_FIT
                                setShutterBackgroundColor(android.graphics.Color.BLACK)
                                setUseArtwork(false)
                            }
                        },
                        update  = { it.player = player },
                        modifier = Modifier.fillMaxSize()
                    )

                    // ── Buffering overlay ────────────────────────────────────
                    AnimatedVisibility(
                        visible = playerState is PlayerState.Buffering || playerState is PlayerState.Loading,
                        enter   = fadeIn(tween(200)),
                        exit    = fadeOut(tween(300))
                    ) {
                        Box(
                            Modifier.fillMaxSize().background(Color.Black.copy(0.45f)),
                            Alignment.Center
                        ) {
                            CircularProgressIndicator(Modifier.size(32.dp), Color.White.copy(0.85f), 2.5.dp, strokeCap = StrokeCap.Round)
                        }
                    }

                    // ── Retrying overlay ─────────────────────────────────────
                    AnimatedVisibility(
                        visible = playerState is PlayerState.Retrying,
                        enter   = fadeIn(),
                        exit    = fadeOut()
                    ) {
                        Box(
                            Modifier.fillMaxSize().background(Color.Black.copy(0.6f)),
                            Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(Modifier.size(32.dp), AccentGold, 2.5.dp, strokeCap = StrokeCap.Round)
                                Spacer(Modifier.height(10.dp))
                                Text("Retrying...", color = Color.White, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }

                    // ── Error overlay ────────────────────────────────────────
                    AnimatedVisibility(
                        visible = playerState is PlayerState.Error,
                        enter   = fadeIn(),
                        exit    = fadeOut()
                    ) {
                        PlayerErrorOverlay(
                            message = (playerState as? PlayerState.Error)?.message ?: "Playback error",
                            onRetry = { viewModel.retry() }
                        )
                    }

                    // ── Custom Controls ──────────────────────────────────────
                    AnimatedVisibility(
                        visible = controlsVisible,
                        enter   = fadeIn(tween(200)),
                        exit    = fadeOut(tween(250))
                    ) {
                        ControlsOverlay(
                            playerState = playerState,
                            viewModel = viewModel,
                            isFullscreen = isFullscreen,
                            onToggleFullscreen = onToggleFullscreen,
                            currentPosition = currentPosition,
                            duration = duration
                        )
                    }
                }
            }
        }

        // ── Back button (always visible) ─────────────────────────────────────
        IconButton(
            onClick  = onBack,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(8.dp)
                .size(36.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(0.55f))
        ) {
            Icon(Icons.Default.ArrowBack, "Back", tint = Color.White, modifier = Modifier.size(20.dp))
        }

        // ── Live badge ───────────────────────────────────────────────────────
        AnimatedVisibility(
            visible = playerState is PlayerState.Playing,
            enter   = fadeIn(),
            modifier = Modifier.align(Alignment.TopEnd).padding(10.dp)
        ) {
            PulsingLiveBadge()
        }
    }
}

// ─── Controls Overlay ─────────────────────────────────────────────────────────

@Composable
private fun ControlsOverlay(
    playerState: PlayerState,
    viewModel: PlayerViewModel,
    isFullscreen: Boolean,
    onToggleFullscreen: () -> Unit,
    currentPosition: Long,
    duration: Long
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color.Black.copy(0.35f), Color.Transparent, Color.Black.copy(0.5f))
                )
            )
    ) {
        // Center play/pause
        val showCentre = playerState is PlayerState.Playing || playerState is PlayerState.Paused
        if (showCentre) {
            val haptic = LocalHapticFeedback.current
            val isPlaying = playerState is PlayerState.Playing
            Box(
                Modifier
                    .align(Alignment.Center)
                    .size(60.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(0.14f))
                    .border(1.5.dp, Color.White.copy(0.3f), CircleShape)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication        = ripple(bounded = true, color = Color.White)
                    ) {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.togglePlayPause()
                    },
                Alignment.Center
            ) {
                Icon(
                    if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    null, tint = Color.White, modifier = Modifier.size(32.dp)
                )
            }
        }

        // Bottom Controls (Length Indicator & Live status + Fullscreen toggle)
        Row(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val player = viewModel.playerController.player
            val isLiveStream = player?.isCurrentMediaItemLive ?: true

            if (isLiveStream) {
                // Live Stream Indicator Bar (Full red indicator with LIVE label)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        Modifier
                            .height(4.dp)
                            .weight(1f)
                            .clip(RoundedCornerShape(2.dp))
                            .background(LiveRed)
                    )
                    Spacer(Modifier.width(12.dp))
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(LiveRed.copy(0.18f))
                            .border(1.dp, LiveRed.copy(0.45f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(LiveRed)
                            )
                            Spacer(Modifier.width(5.dp))
                            Text(
                                "LIVE",
                                color = OffWhite,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        }
                    }
                }
            } else {
                // VOD length scroll bar
                val progress = if (duration > 0) currentPosition.toFloat() / duration else 0f
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        formatTime(currentPosition),
                        color = OffWhite,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.width(8.dp))
                    Box(
                        Modifier
                            .height(4.dp)
                            .weight(1f)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Color.White.copy(0.3f))
                    ) {
                        Box(
                            Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(progress)
                                .background(Brand)
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(
                        formatTime(duration),
                        color = OffWhite,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(Modifier.width(14.dp))

            // Fullscreen toggle button
            val haptic = LocalHapticFeedback.current
            IconButton(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onToggleFullscreen()
                },
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(0.1f))
            ) {
                Icon(
                    imageVector = if (isFullscreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                    contentDescription = "Toggle Fullscreen",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

// ─── Pulsing Live Badge ───────────────────────────────────────────────────────

@Composable
private fun PulsingLiveBadge() {
    val pulse = rememberInfiniteTransition(label = "live_badge")
    val alpha by pulse.animateFloat(0.75f, 1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "badge_a")
    Row(
        Modifier.clip(RoundedCornerShape(6.dp)).background(LiveRed.copy(alpha))
            .padding(horizontal = 9.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(Color.White))
        Spacer(Modifier.width(5.dp))
        Text("LIVE", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
    }
}

// ─── Error Overlay ────────────────────────────────────────────────────────────

@Composable
private fun PlayerErrorOverlay(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().background(Color.Black.copy(0.78f)), Alignment.Center) {
        Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.ErrorOutline, null, Modifier.size(48.dp), LiveRed)
            Spacer(Modifier.height(12.dp))
            Text(message, color = Color.White.copy(0.85f), style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            Spacer(Modifier.height(16.dp))
            val haptic = LocalHapticFeedback.current
            OutlinedButton(
                onClick = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); onRetry() },
                shape   = RoundedCornerShape(10.dp),
                border  = BorderStroke(1.dp, Color.White.copy(0.45f)),
                colors  = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
            ) {
                Icon(Icons.Default.Refresh, null, Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Retry", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ─── Channel Info ─────────────────────────────────────────────────────────────

@Composable
private fun ChannelInfoSection(channel: ChannelDetail, state: PlayerUiState, viewModel: PlayerViewModel) {
    Column(Modifier.padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(48.dp).clip(RoundedCornerShape(13.dp)).background(Bg2),
                Alignment.Center
            ) {
                NetworkImage(channel.logoUrl, "${channel.title} logo", Modifier.size(34.dp))
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(channel.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = OffWhite, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ChannelStatusDot(channel.status.value)
                    Text(channel.status.value.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (channel.category != null) {
                        Text("·", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(0.5f))
                        Text(channel.category.name, style = MaterialTheme.typography.bodySmall, color = BrandLight.copy(0.7f))
                    }
                }
            }
        }

        if (!channel.description.isNullOrBlank()) {
            Spacer(Modifier.height(12.dp))
            Text(channel.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3, overflow = TextOverflow.Ellipsis)
        }

        // Source selector
        val sessionData = (state.session as? UiState.Success)?.data
        if (sessionData != null && sessionData.sources.size > 1) {
            Spacer(Modifier.height(20.dp))
            SectionHeader("Servers", Icons.Default.Dns, Brand)
            Spacer(Modifier.height(10.dp))
            val haptic = LocalHapticFeedback.current
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(sessionData.sources) { idx, source ->
                    val isSelected = idx == viewModel.playerController.getCurrentSourceIndex()
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isSelected) Brush.linearGradient(listOf(Brand, BrandDark)) else Brush.linearGradient(listOf(Bg2, Bg3)))
                            .border(1.dp, if (isSelected) Brand else Line, RoundedCornerShape(10.dp))
                            .clickable { haptic.performHapticFeedback(HapticFeedbackType.LongPress); viewModel.switchSource(idx) }
                            .padding(horizontal = 16.dp, vertical = 9.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PlayCircle, null, Modifier.size(16.dp), if (isSelected) Color.White else BrandLight.copy(0.5f))
                            Spacer(Modifier.width(6.dp))
                            Text(source.quality, style = MaterialTheme.typography.labelMedium, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal, color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

// ─── Related Channels ─────────────────────────────────────────────────────────

@Composable
private fun RelatedChannelsSection(channels: List<Channel>, onPlay: (String) -> Unit) {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        SectionHeader("Related Channels", Icons.Default.LiveTv, AccentGold)
        Spacer(Modifier.height(12.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(channels, key = { it.id }) { ch ->
                val haptic = LocalHapticFeedback.current
                val interactionSource = remember { MutableInteractionSource() }
                val isPressed by interactionSource.collectIsPressedAsState()
                val scale by animateFloatAsState(if (isPressed) 0.94f else 1f, spring(Spring.DampingRatioMediumBouncy), label = "rel_scale")
                Box(Modifier.scale(scale)) {
                    Card(
                        onClick   = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); onPlay(ch.id) },
                        modifier  = Modifier.width(130.dp),
                        shape     = RoundedCornerShape(14.dp),
                        colors    = CardDefaults.cardColors(Color.Transparent),
                        elevation = CardDefaults.cardElevation(0.dp),
                        interactionSource = interactionSource
                    ) {
                        Box(Modifier.background(Brush.verticalGradient(listOf(Bg2, Bg1))).border(1.dp, Line, RoundedCornerShape(14.dp))) {
                            Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)).background(Bg3), Alignment.Center) {
                                    NetworkImage(ch.logoUrl, ch.title, Modifier.size(32.dp))
                                }
                                Spacer(Modifier.height(8.dp))
                                Text(ch.title, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, color = OffWhite)
                                Spacer(Modifier.height(4.dp))
                                Text(ch.category?.name ?: "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}
