package com.iptv.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ─── Brand Colors ────────────────────────────────────────────────────────────

val Brand         = Color(0xFF6C63FF)   // vibrant purple-blue
val BrandLight    = Color(0xFF9D97FF)
val BrandDark     = Color(0xFF4843C8)
val Accent        = Color(0xFFFF6B35)   // vivid orange accent
val AccentGold    = Color(0xFFFFB800)   // gold for live / highlights
val LiveRed       = Color(0xFFFF3B3B)
val SuccessGreen  = Color(0xFF00D68F)
val WarnAmber     = Color(0xFFFFC107)
val OffWhite      = Color(0xFFF0EFFF)

// ─── Dark Surface Palette ────────────────────────────────────────────────────

val Bg0  = Color(0xFF08080E)   // deepest background
val Bg1  = Color(0xFF10101A)   // primary surface
val Bg2  = Color(0xFF181825)   // elevated surface
val Bg3  = Color(0xFF20203A)   // card / chip surface
val Line = Color(0xFF2A2A45)   // dividers / borders

// ─── Colour Scheme ───────────────────────────────────────────────────────────

private val DarkColorScheme = darkColorScheme(
    primary              = Brand,
    onPrimary            = Color.White,
    primaryContainer     = Color(0xFF1F1B4B),
    onPrimaryContainer   = BrandLight,
    secondary            = AccentGold,
    onSecondary          = Color(0xFF1A1000),
    secondaryContainer   = Color(0xFF3A2A00),
    onSecondaryContainer = AccentGold,
    tertiary             = SuccessGreen,
    onTertiary           = Color(0xFF002816),
    background           = Bg0,
    onBackground         = OffWhite,
    surface              = Bg1,
    onSurface            = OffWhite,
    surfaceVariant       = Bg2,
    onSurfaceVariant     = Color(0xFF9896B8),
    surfaceTint          = Brand,
    outline              = Line,
    outlineVariant       = Color(0xFF1E1E32),
    error                = LiveRed,
    onError              = Color.White,
    errorContainer       = Color(0xFF3D0000),
    onErrorContainer     = Color(0xFFFF9999),
    inverseSurface       = OffWhite,
    inverseOnSurface     = Bg0,
    inversePrimary       = BrandDark,
)

// ─── Typography ──────────────────────────────────────────────────────────────

private val AppTypography = Typography(
    displayLarge  = TextStyle(fontWeight = FontWeight.Black,  fontSize = 57.sp, letterSpacing = (-0.25).sp),
    displayMedium = TextStyle(fontWeight = FontWeight.Bold,   fontSize = 45.sp),
    displaySmall  = TextStyle(fontWeight = FontWeight.Bold,   fontSize = 36.sp),
    headlineLarge  = TextStyle(fontWeight = FontWeight.Bold,  fontSize = 32.sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 28.sp),
    headlineSmall  = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 24.sp),
    titleLarge   = TextStyle(fontWeight = FontWeight.Bold,    fontSize = 22.sp),
    titleMedium  = TextStyle(fontWeight = FontWeight.SemiBold,fontSize = 16.sp, letterSpacing = 0.15.sp),
    titleSmall   = TextStyle(fontWeight = FontWeight.Medium,  fontSize = 14.sp, letterSpacing = 0.1.sp),
    bodyLarge    = TextStyle(fontWeight = FontWeight.Normal,  fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium   = TextStyle(fontWeight = FontWeight.Normal,  fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall    = TextStyle(fontWeight = FontWeight.Normal,  fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge   = TextStyle(fontWeight = FontWeight.SemiBold,fontSize = 14.sp, letterSpacing = 0.1.sp),
    labelMedium  = TextStyle(fontWeight = FontWeight.Medium,  fontSize = 12.sp, letterSpacing = 0.5.sp),
    labelSmall   = TextStyle(fontWeight = FontWeight.Medium,  fontSize = 11.sp, letterSpacing = 0.5.sp),
)

// ─── Theme ───────────────────────────────────────────────────────────────────

@Composable
fun IptvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography  = AppTypography,
        content     = content
    )
}
