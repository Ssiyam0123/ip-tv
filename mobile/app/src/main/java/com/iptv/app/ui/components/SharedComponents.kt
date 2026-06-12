package com.iptv.app.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import com.iptv.app.core.model.UiState
import com.iptv.app.ui.theme.*

// ─── Loading ──────────────────────────────────────────────────────────────────

@Composable
fun LoadingIndicator(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(
            modifier    = Modifier.size(36.dp),
            color       = Brand,
            strokeWidth = 3.dp,
            strokeCap   = StrokeCap.Round
        )
    }
}

// ─── Error State ──────────────────────────────────────────────────────────────

@Composable
fun ErrorState(
    message: String,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(CircleShape)
                    .background(Brush.radialGradient(listOf(LiveRed.copy(0.2f), Color.Transparent))),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.ErrorOutline, null, Modifier.size(38.dp), LiveRed)
            }
            Spacer(Modifier.height(16.dp))
            Text(message, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            if (onRetry != null) {
                Spacer(Modifier.height(20.dp))
                HapticButton(onClick = onRetry, containerColor = Brand) {
                    Icon(Icons.Default.Refresh, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Retry", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

// ─── Empty State ──────────────────────────────────────────────────────────────

@Composable
fun EmptyState(
    icon: ImageVector = Icons.Default.Info,
    title: String,
    description: String? = null,
    action: @Composable (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier.size(80.dp).clip(CircleShape).background(Bg3),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, Modifier.size(40.dp), BrandLight.copy(0.5f))
            }
            Spacer(Modifier.height(16.dp))
            Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center)
            if (description != null) {
                Spacer(Modifier.height(6.dp))
                Text(description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            }
            if (action != null) { Spacer(Modifier.height(20.dp)); action() }
        }
    }
}

// ─── Offline Banner ───────────────────────────────────────────────────────────

@Composable
fun OfflineBanner(visible: Boolean) {
    AnimatedVisibility(visible, enter = slideInVertically() + fadeIn(), exit = slideOutVertically() + fadeOut()) {
        Surface(color = LiveRed.copy(0.92f), modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.WifiOff, null, Modifier.size(16.dp), Color.White)
                Spacer(Modifier.width(8.dp))
                Text("You are offline", color = Color.White, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

// ─── Pulsing Live Indicator ───────────────────────────────────────────────────

@Composable
fun LiveIndicator(modifier: Modifier = Modifier) {
    val pulse = rememberInfiniteTransition(label = "live_pulse")
    val scale by pulse.animateFloat(
        initialValue  = 0.85f,
        targetValue   = 1.18f,
        animationSpec = infiniteRepeatable(tween(650, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label         = "dot_scale"
    )
    Row(verticalAlignment = Alignment.CenterVertically, modifier = modifier) {
        Box(Modifier.size(8.dp).scale(scale).clip(CircleShape).background(LiveRed))
        Spacer(Modifier.width(5.dp))
        Text("LIVE", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = LiveRed, letterSpacing = 1.sp)
    }
}

// ─── Channel Status Dot ───────────────────────────────────────────────────────

@Composable
fun ChannelStatusDot(status: String, modifier: Modifier = Modifier) {
    val color = when (status) {
        "active"   -> SuccessGreen
        "degraded" -> WarnAmber
        else       -> Color(0xFF555577)
    }
    Box(modifier.size(8.dp).clip(CircleShape).background(color))
}

// ─── Generic UiState Handler ──────────────────────────────────────────────────

@Composable
fun <T> UiStateHandler(
    state: UiState<T>,
    onRetry: (() -> Unit)? = null,
    loading: @Composable () -> Unit = { LoadingIndicator() },
    error: @Composable (String) -> Unit = { msg -> ErrorState(msg, onRetry) },
    content: @Composable (T) -> Unit
) {
    when (state) {
        is UiState.Loading -> loading()
        is UiState.Error   -> error(state.message)
        is UiState.Offline -> EmptyState(Icons.Default.WifiOff, "You are offline", "Some features may be unavailable")
        is UiState.Success -> content(state.data)
    }
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────

@Composable
fun ShimmerBox(modifier: Modifier = Modifier, cornerRadius: Dp = 8.dp) {
    val anim = rememberInfiniteTransition(label = "shimmer")
    val alpha by anim.animateFloat(
        0.12f, 0.3f,
        infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Reverse),
        label = "shimmer_a"
    )
    Box(modifier.clip(RoundedCornerShape(cornerRadius)).background(Bg3.copy(alpha)))
}

@Composable
fun ChannelSkeleton(modifier: Modifier = Modifier) {
    Card(modifier.fillMaxWidth(), RoundedCornerShape(16.dp), CardDefaults.cardColors(Bg2), CardDefaults.cardElevation(0.dp)) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            ShimmerBox(Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)))
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                ShimmerBox(Modifier.fillMaxWidth(0.65f).height(14.dp))
                Spacer(Modifier.height(8.dp))
                ShimmerBox(Modifier.fillMaxWidth(0.4f).height(11.dp))
            }
        }
    }
}

// ─── Section Header ───────────────────────────────────────────────────────────

@Composable
fun SectionHeader(
    title: String,
    icon: ImageVector? = null,
    accentColor: Color = Brand,
    modifier: Modifier = Modifier
) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = modifier) {
        Box(Modifier.width(4.dp).height(22.dp).clip(RoundedCornerShape(2.dp)).background(accentColor))
        Spacer(Modifier.width(10.dp))
        if (icon != null) {
            Icon(icon, null, Modifier.size(20.dp), accentColor)
            Spacer(Modifier.width(6.dp))
        }
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = OffWhite)
    }
}

// ─── Gradient Card ────────────────────────────────────────────────────────────

@Composable
fun GradientCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier, RoundedCornerShape(16.dp), CardDefaults.cardColors(Color.Transparent), CardDefaults.cardElevation(0.dp)) {
        Box(Modifier.background(Brush.verticalGradient(listOf(Bg2, Bg1))).border(1.dp, Line, RoundedCornerShape(16.dp))) {
            Column(content = content)
        }
    }
}

// ─── Haptic Button ────────────────────────────────────────────────────────────

@Composable
fun HapticButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    containerColor: Color = Brand,
    shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(12.dp),
    content: @Composable RowScope.() -> Unit
) {
    val haptic = LocalHapticFeedback.current
    Button(
        onClick  = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); onClick() },
        modifier = modifier.height(50.dp),
        enabled  = enabled,
        shape    = shape,
        colors   = ButtonDefaults.buttonColors(containerColor = containerColor),
        elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp),
        content  = content
    )
}

// ─── Image with Placeholder ───────────────────────────────────────────────────

@Composable
fun NetworkImage(
    url: String?,
    contentDescription: String? = null,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit
) {
    if (url.isNullOrBlank()) {
        Box(modifier.clip(RoundedCornerShape(8.dp)).background(Bg3), Alignment.Center) {
            Icon(Icons.Default.BrokenImage, null, Modifier.size(24.dp), Color(0xFF555577))
        }
        return
    }

    SubcomposeAsyncImage(
        model             = url,
        contentDescription = contentDescription,
        modifier          = modifier,
        contentScale      = contentScale,
        loading           = { ShimmerBox(modifier) },
        error             = {
            Box(modifier.clip(RoundedCornerShape(8.dp)).background(Bg3), Alignment.Center) {
                Icon(Icons.Default.Tv, null, Modifier.size(22.dp), Color(0xFF555577))
            }
        }
    )
}

// ─── Pressable Scale Modifier ─────────────────────────────────────────────────

@Composable
fun Modifier.pressScale(
    targetScale: Float = 0.95f,
    onPress: (() -> Unit)? = null
): Modifier {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        if (isPressed) targetScale else 1f,
        spring(stiffness = Spring.StiffnessMediumLow),
        label = "press_scale"
    )
    return this
        .scale(scale)
        .clickable(
            interactionSource = interactionSource,
            indication        = ripple(),
            onClick           = { onPress?.invoke() }
        )
}
