package com.iptv.app.feature.auth

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.iptv.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignInScreen(
    onSignInSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onContinueAsGuest: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val state        by viewModel.state.collectAsState()
    var email        by remember { mutableStateOf("") }
    var password     by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val haptic       = LocalHapticFeedback.current

    LaunchedEffect(state.user) {
        if (state.user != null) onSignInSuccess()
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Bg0)
    ) {
        // Background glow
        Box(
            Modifier.size(300.dp).align(Alignment.TopCenter)
                .offset(y = (-60).dp)
                .background(Brush.radialGradient(listOf(Brand.copy(0.22f), Color.Transparent)))
        )

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(56.dp))

            // ── Logo ─────────────────────────────────────────────────────────
            Box(
                Modifier.size(76.dp).clip(RoundedCornerShape(22.dp))
                    .background(Brush.linearGradient(listOf(Brand, BrandDark))),
                Alignment.Center
            ) {
                Icon(Icons.Default.Tv, null, Modifier.size(40.dp), Color.White)
            }
            Spacer(Modifier.height(20.dp))

            Text(
                "Welcome back",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color = OffWhite
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Sign in to your IPTV account",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

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

            // ── Email ─────────────────────────────────────────────────────────
            PremiumTextField(
                value       = email,
                onValueChange = { email = it; viewModel.clearError() },
                label       = "Email",
                leadingIcon = Icons.Default.Email,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
            )
            Spacer(Modifier.height(12.dp))

            // ── Password ──────────────────────────────────────────────────────
            PremiumTextField(
                value       = password,
                onValueChange = { password = it; viewModel.clearError() },
                label       = "Password",
                leadingIcon = Icons.Default.Lock,
                trailingIcon = {
                    IconButton({ showPassword = !showPassword }) {
                        Icon(
                            if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            null, tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus(); viewModel.signIn(email, password) })
            )

            Spacer(Modifier.height(28.dp))

            // ── Sign In Button ────────────────────────────────────────────────
            Box(
                Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(14.dp))
                    .background(if (!state.isLoading) Brush.linearGradient(listOf(Brand, BrandDark)) else Brush.linearGradient(listOf(Bg3, Bg3)))
                    .clickable(enabled = !state.isLoading) {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.signIn(email, password)
                    },
                Alignment.Center
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(Modifier.size(22.dp), Color.White, 2.5.dp, strokeCap = StrokeCap.Round)
                } else {
                    Text("Sign In", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            Spacer(Modifier.height(16.dp))
            TextButton({ haptic.performHapticFeedback(HapticFeedbackType.LongPress); onNavigateToRegister() }) {
                Text("Don't have an account? ", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
                Text("Create one", color = Brand, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
            }

            Spacer(Modifier.height(24.dp))

            // ── Divider ───────────────────────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically) {
                HorizontalDivider(Modifier.weight(1f), color = Line)
                Text("  or  ", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                HorizontalDivider(Modifier.weight(1f), color = Line)
            }

            Spacer(Modifier.height(18.dp))

            // ── Guest Button ──────────────────────────────────────────────────
            OutlinedButton(
                onClick  = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); onContinueAsGuest() },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape    = RoundedCornerShape(14.dp),
                border   = BorderStroke(1.dp, Line),
                colors   = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant)
            ) {
                Icon(Icons.Default.PersonOutline, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Continue as Guest", fontWeight = FontWeight.Medium)
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

// ─── Shared Premium TextField ─────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PremiumTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    leadingIcon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    supportingText: String? = null,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value         = value,
        onValueChange = onValueChange,
        label         = { Text(label) },
        leadingIcon   = leadingIcon?.let { { Icon(it, null, tint = Brand.copy(0.8f)) } },
        trailingIcon  = trailingIcon,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        supportingText  = if (supportingText != null) { { Text(supportingText) } } else null,
        singleLine     = true,
        shape          = RoundedCornerShape(14.dp),
        colors         = OutlinedTextFieldDefaults.colors(
            focusedBorderColor      = Brand,
            unfocusedBorderColor    = Line,
            focusedContainerColor   = Bg2,
            unfocusedContainerColor = Bg1,
            cursorColor             = Brand,
            focusedTextColor        = OffWhite,
            unfocusedTextColor      = OffWhite,
            focusedLabelColor       = Brand,
            unfocusedLabelColor     = MaterialTheme.colorScheme.onSurfaceVariant
        ),
        modifier = modifier.fillMaxWidth()
    )
}
