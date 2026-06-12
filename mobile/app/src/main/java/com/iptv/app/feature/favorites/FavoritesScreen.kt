package com.iptv.app.feature.favorites

import androidx.compose.animation.*
import androidx.compose.foundation.*
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.iptv.app.core.model.*
import com.iptv.app.ui.components.*
import com.iptv.app.ui.theme.*

@Composable
fun FavoritesScreen(
    onPlayChannel: (String) -> Unit,
    onSignIn: () -> Unit,
    viewModel: FavoritesViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    if (!state.isAuthenticated) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Bg0),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                listOf(LiveRed.copy(0.2f), Color.Transparent)
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.FavoriteBorder,
                        contentDescription = null,
                        tint     = LiveRed.copy(0.7f),
                        modifier = Modifier.size(48.dp)
                    )
                }
                Spacer(Modifier.height(20.dp))
                Text(
                    "Sign in to save favorites",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = OffWhite
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Save your favorite channels for quick access",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = onSignIn,
                    colors  = ButtonDefaults.buttonColors(containerColor = Brand),
                    shape   = RoundedCornerShape(14.dp),
                    modifier = Modifier.height(48.dp)
                ) {
                    Icon(Icons.Default.Login, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("Sign In", fontWeight = FontWeight.Bold)
                }
            }
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Bg0)
            .padding(horizontal = 16.dp)
    ) {

        Spacer(Modifier.height(16.dp))

        SectionHeader(
            title = "My Favorites",
            icon  = Icons.Default.Favorite,
            accentColor = LiveRed
        )

        Spacer(Modifier.height(16.dp))

        when (val favState = state.favorites) {
            is UiState.Loading -> {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    repeat(4) { ChannelSkeleton() }
                }
            }
            is UiState.Error -> {
                ErrorState(
                    message = favState.message,
                    onRetry = { viewModel.loadFavorites() },
                    modifier = Modifier.fillMaxSize()
                )
            }
            is UiState.Success -> {
                if (favState.data.isEmpty()) {
                    EmptyState(
                        icon        = Icons.Default.FavoriteBorder,
                        title       = "No favorites yet",
                        description = "Add channels to your favorites for quick access",
                        modifier    = Modifier.fillMaxSize()
                    )
                } else {
                    Text(
                        text  = "${favState.data.size} channels",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(10.dp))
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(favState.data, key = { it.id }) { favorite ->
                            FavoriteListItem(
                                favorite = favorite,
                                onPlay   = { onPlayChannel(favorite.channel.id) },
                                onRemove = { viewModel.removeFavorite(favorite.channel.id) }
                            )
                        }
                    }
                }
            }
            else -> {}
        }
    }
}

// ─── Favorite Row Card ────────────────────────────────────────────────────────

@Composable
private fun FavoriteListItem(
    favorite: Favorite,
    onPlay: () -> Unit,
    onRemove: () -> Unit
) {
    val isActive = favorite.channel.status == "active"

    Card(
        onClick   = onPlay,
        modifier  = Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(16.dp),
        colors    = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Box(
            modifier = Modifier
                .background(Brush.verticalGradient(listOf(Bg2, Bg1)))
                .border(1.dp, Line, RoundedCornerShape(16.dp))
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Logo
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Bg3),
                    contentAlignment = Alignment.Center
                ) {
                    if (favorite.channel.logoUrl != null) {
                        AsyncImage(
                            model = favorite.channel.logoUrl,
                            contentDescription = null,
                            modifier = Modifier.size(36.dp),
                            contentScale = ContentScale.Fit
                        )
                    } else {
                        Icon(
                            Icons.Default.Tv, null,
                            tint = BrandLight.copy(0.4f),
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }

                Spacer(Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text  = favorite.channel.title,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = OffWhite,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ChannelStatusDot(status = favorite.channel.status)
                        Spacer(Modifier.width(5.dp))
                        Text(
                            text  = favorite.channel.category?.name ?: favorite.channel.status,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Play icon
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Brand.copy(0.15f))
                        .border(1.dp, Brand.copy(0.3f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = "Play",
                        tint     = Brand,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(Modifier.width(8.dp))

                // Remove
                IconButton(
                    onClick  = onRemove,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(LiveRed.copy(0.1f))
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Remove",
                        tint     = LiveRed.copy(0.8f),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
