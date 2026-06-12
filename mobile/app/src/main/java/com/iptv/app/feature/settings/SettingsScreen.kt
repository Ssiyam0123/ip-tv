package com.iptv.app.feature.settings

import androidx.compose.animation.*
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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iptv.app.core.auth.AuthRepository
import com.iptv.app.core.model.User
import com.iptv.app.ui.components.EmptyState
import com.iptv.app.ui.components.HapticButton
import com.iptv.app.ui.components.SectionHeader
import com.iptv.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── State ────────────────────────────────────────────────────────────────────

data class SettingsUiState(
    val isAuthenticated: Boolean = false,
    val user: User? = null,
    val isLoggingOut: Boolean = false,
    val isDeleting: Boolean = false,
    val error: String? = null
)

// ─── ViewModel ────────────────────────────────────────────────────────────────

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init { loadUser() }

    private fun loadUser() {
        viewModelScope.launch {
            val loggedIn = authRepository.isLoggedIn()
            _state.update { it.copy(isAuthenticated = loggedIn) }
            if (loggedIn) {
                val cached = authRepository.getCachedUser()
                _state.update { it.copy(user = cached) }
                val fresh = authRepository.getMe()
                if (fresh != null) _state.update { it.copy(user = fresh) }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            _state.update { it.copy(isLoggingOut = true) }
            authRepository.logout()
            _state.update { it.copy(isLoggingOut = false, isAuthenticated = false, user = null) }
        }
    }

    fun deleteAccount() {
        viewModelScope.launch {
            _state.update { it.copy(isDeleting = true, error = null) }
            try {
                authRepository.deleteAccount()
                _state.update { it.copy(isDeleting = false, isAuthenticated = false, user = null) }
            } catch (e: Exception) {
                _state.update { it.copy(isDeleting = false, error = e.message ?: "Failed to delete account") }
            }
        }
    }

    fun dismissError() { _state.update { it.copy(error = null) } }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

@Composable
fun SettingsScreen(
    onSignIn: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var showDeleteConfirm by remember { mutableStateOf(false) }

    if (!state.isAuthenticated) {
        Box(Modifier.fillMaxSize().background(Bg0), Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier.size(90.dp).clip(CircleShape).background(Brush.radialGradient(listOf(Brand.copy(0.2f), Color.Transparent))),
                    Alignment.Center
                ) {
                    Icon(Icons.Default.Settings, null, Modifier.size(44.dp), Brand.copy(0.6f))
                }
                Spacer(Modifier.height(18.dp))
                Text("Sign in to manage settings", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = OffWhite)
                Spacer(Modifier.height(20.dp))
                HapticButton(onClick = onSignIn, containerColor = Brand) {
                    Icon(Icons.Default.Login, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("Sign In", fontWeight = FontWeight.Bold)
                }
            }
        }
        return
    }

    Column(
        Modifier.fillMaxSize().background(Bg0).verticalScroll(rememberScrollState())
    ) {
        // ── Profile Header Card ───────────────────────────────────────────────
        Box(
            Modifier.fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Bg2, Bg0)))
                .padding(horizontal = 20.dp, vertical = 28.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Avatar
                Box(
                    Modifier.size(64.dp).clip(CircleShape)
                        .background(Brush.linearGradient(listOf(Brand, BrandDark))),
                    Alignment.Center
                ) {
                    Text(
                        (state.user?.displayName?.firstOrNull() ?: state.user?.email?.firstOrNull() ?: 'U').uppercaseChar().toString(),
                        fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = Color.White
                    )
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(state.user?.displayName ?: "User", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = OffWhite)
                    Spacer(Modifier.height(4.dp))
                    Text(state.user?.email ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(6.dp))
                    // Role badge
                    Box(
                        Modifier.clip(RoundedCornerShape(20.dp)).background(Brand.copy(0.2f))
                            .border(1.dp, Brand.copy(0.4f), RoundedCornerShape(20.dp))
                            .padding(horizontal = 10.dp, vertical = 3.dp)
                    ) {
                        Text(state.user?.role?.replaceFirstChar { it.uppercase() } ?: "User", style = MaterialTheme.typography.labelSmall, color = Brand, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // ── Account Section ───────────────────────────────────────────────────
        SectionLabel("ACCOUNT")
        SettingsCard {
            SettingsInfoRow(Icons.Default.Person, "Display Name", state.user?.displayName ?: "Not set")
            SettingsDivider()
            SettingsInfoRow(Icons.Default.Email, "Email", state.user?.email ?: "")
            SettingsDivider()
            SettingsInfoRow(Icons.Default.Shield, "Role", state.user?.role?.replaceFirstChar { it.uppercase() } ?: "User")
        }

        Spacer(Modifier.height(20.dp))

        // ── Actions Section ───────────────────────────────────────────────────
        SectionLabel("ACTIONS")
        SettingsCard {
            SettingsActionRow(
                icon = Icons.Default.Logout,
                label = "Sign Out",
                description = "Sign out of your account",
                iconTint = LiveRed.copy(0.8f),
                isLoading = state.isLoggingOut
            ) { viewModel.logout() }
        }

        Spacer(Modifier.height(12.dp))

        // ── Delete Confirm ────────────────────────────────────────────────────
        AnimatedVisibility(!showDeleteConfirm) {
            Box(Modifier.padding(horizontal = 16.dp).fillMaxWidth()) {
                OutlinedButton(
                    onClick  = { showDeleteConfirm = true },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors   = ButtonDefaults.outlinedButtonColors(contentColor = LiveRed),
                    shape    = RoundedCornerShape(14.dp),
                    border   = BorderStroke(1.dp, LiveRed.copy(0.4f))
                ) {
                    Icon(Icons.Default.DeleteForever, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Delete Account", fontWeight = FontWeight.SemiBold)
                }
            }
        }

        AnimatedVisibility(showDeleteConfirm, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
            Box(
                Modifier.padding(horizontal = 16.dp).fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(LiveRed.copy(0.08f))
                    .border(1.dp, LiveRed.copy(0.35f), RoundedCornerShape(16.dp))
                    .padding(18.dp)
            ) {
                Column {
                    Text("Delete Account?", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = LiveRed)
                    Spacer(Modifier.height(6.dp))
                    Text("This is permanent. All your data will be deleted and cannot be recovered.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    AnimatedVisibility(state.error != null) {
                        Spacer(Modifier.height(8.dp))
                        Text(state.error ?: "", style = MaterialTheme.typography.bodySmall, color = LiveRed)
                    }

                    Spacer(Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick   = { showDeleteConfirm = false; viewModel.dismissError() },
                            modifier  = Modifier.weight(1f).height(46.dp),
                            shape     = RoundedCornerShape(12.dp),
                            border    = BorderStroke(1.dp, Line),
                            colors    = ButtonDefaults.outlinedButtonColors(contentColor = OffWhite)
                        ) { Text("Cancel") }

                        Button(
                            onClick  = { viewModel.deleteAccount() },
                            modifier = Modifier.weight(1f).height(46.dp),
                            enabled  = !state.isDeleting,
                            shape    = RoundedCornerShape(12.dp),
                            colors   = ButtonDefaults.buttonColors(containerColor = LiveRed)
                        ) {
                            if (state.isDeleting)
                                CircularProgressIndicator(Modifier.size(18.dp), Color.White, 2.dp, strokeCap = StrokeCap.Round)
                            else
                                Text("Delete", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(80.dp))
    }
}

// ─── Section Label ────────────────────────────────────────────────────────────

@Composable
private fun SectionLabel(label: String) {
    Text(
        label,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
    )
}

// ─── Settings Card ────────────────────────────────────────────────────────────

@Composable
private fun SettingsCard(content: @Composable ColumnScope.() -> Unit) {
    Box(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Bg2)
            .border(1.dp, Line, RoundedCornerShape(16.dp))
    ) {
        Column(content = content)
    }
}

@Composable
private fun SettingsDivider() = HorizontalDivider(Modifier.padding(start = 52.dp), color = Line)

// ─── Info Row ─────────────────────────────────────────────────────────────────

@Composable
private fun SettingsInfoRow(icon: ImageVector, label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Brand.copy(0.12f)), Alignment.Center) {
            Icon(icon, null, Modifier.size(18.dp), Brand.copy(0.8f))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = OffWhite)
        }
    }
}

// ─── Action Row ───────────────────────────────────────────────────────────────

@Composable
private fun SettingsActionRow(
    icon: ImageVector,
    label: String,
    description: String,
    iconTint: Color = Brand,
    isLoading: Boolean = false,
    onClick: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    Row(
        Modifier.fillMaxWidth()
            .clickable(enabled = !isLoading) { haptic.performHapticFeedback(HapticFeedbackType.LongPress); onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(iconTint.copy(0.12f)), Alignment.Center) {
            Icon(icon, null, Modifier.size(18.dp), iconTint)
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = OffWhite)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (isLoading) CircularProgressIndicator(Modifier.size(20.dp), Brand, 2.dp, strokeCap = StrokeCap.Round)
        else Icon(Icons.Default.ChevronRight, null, Modifier.size(20.dp), MaterialTheme.colorScheme.onSurfaceVariant.copy(0.4f))
    }
}
