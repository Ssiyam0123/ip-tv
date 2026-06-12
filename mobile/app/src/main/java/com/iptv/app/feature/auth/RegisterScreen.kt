package com.iptv.app.feature.auth

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.iptv.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val state        by viewModel.state.collectAsState()
    var email        by remember { mutableStateOf("") }
    var password     by remember { mutableStateOf("") }
    var displayName  by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val haptic       = LocalHapticFeedback.current

    LaunchedEffect(state.user) {
        if (state.user != null) onRegisterSuccess()
    }

    Box(
        Modifier.fillMaxSize().background(Bg0)
    ) {
        // Background glow
        Box(
            Modifier.size(280.dp).align(Alignment.TopCenter).offset(y = (-40).dp)
                .background(Brush.radialGradient(listOf(BrandDark.copy(0.2f), Color.Transparent)))
        )

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(48.dp))

            // ── Back button ───────────────────────────────────────────────────
            Row(Modifier.fillMaxWidth()) {
                IconButton({ haptic.performHapticFeedback(HapticFeedbackType.LongPress); onBack() }) {
                    Icon(Icons.Default.ArrowBack, "Back", tint = OffWhite)
                }
            }

            Spacer(Modifier.height(16.dp))

            // ── Logo ─────────────────────────────────────────────────────────
            Box(
                Modifier.size(76.dp).clip(RoundedCornerShape(22.dp))
                    .background(Brush.linearGradient(listOf(Brand, BrandDark))),
                Alignment.Center
            ) {
                Icon(Icons.Default.PersonAdd, null, Modifier.size(38.dp), Color.White)
            }

            Spacer(Modifier.height(20.dp))
            Text("Create account", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold, color = OffWhite)
            Spacer(Modifier.height(4.dp))
            Text("Start watching your favorite channels", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(36.dp))

            // ── Error Banner ─────────────────────────────────────────────────
            AnimatedVisibility(state.error != null, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                        .background(LiveRed.copy(0.15f)).border(1.dp, LiveRed.copy(0.4f), RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.ErrorOutline, null, Modifier.size(18.dp), LiveRed)
                        Spacer(Modifier.width(10.dp))
                        Text(state.error ?: "", style = MaterialTheme.typography.bodySmall, color = LiveRed)
                    }
                }
                Spacer(Modifier.height(16.dp))
            }

            Spacer(Modifier.height(4.dp))

            // ── Fields ────────────────────────────────────────────────────────
            PremiumTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = "Display Name (optional)",
                leadingIcon = Icons.Default.Person,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
            )
            Spacer(Modifier.height(12.dp))

            PremiumTextField(
                value = email,
                onValueChange = { email = it; viewModel.clearError() },
                label = "Email",
                leadingIcon = Icons.Default.Email,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
            )
            Spacer(Modifier.height(12.dp))

            PremiumTextField(
                value = password,
                onValueChange = { password = it; viewModel.clearError() },
                label = "Password",
                leadingIcon = Icons.Default.Lock,
                trailingIcon = {
                    IconButton({ showPassword = !showPassword }) {
                        Icon(if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                supportingText = "At least 8 characters",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus(); viewModel.register(email, password, displayName) })
            )

            Spacer(Modifier.height(28.dp))

            // ── Create Button ─────────────────────────────────────────────────
            Box(
                Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(14.dp))
                    .background(if (!state.isLoading) Brush.linearGradient(listOf(Brand, BrandDark)) else Brush.linearGradient(listOf(Bg3, Bg3)))
                    .clickable(enabled = !state.isLoading) {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.register(email, password, displayName)
                    },
                Alignment.Center
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(Modifier.size(22.dp), Color.White, 2.5.dp, strokeCap = StrokeCap.Round)
                } else {
                    Text("Create Account", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            Spacer(Modifier.height(16.dp))
            TextButton({ haptic.performHapticFeedback(HapticFeedbackType.LongPress); onBack() }) {
                Text("Already have an account? ", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
                Text("Sign in", color = Brand, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(40.dp))
        }
    }
}
