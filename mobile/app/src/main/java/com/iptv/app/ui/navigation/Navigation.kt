package com.iptv.app.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.*
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.iptv.app.feature.auth.*
import com.iptv.app.feature.favorites.FavoritesScreen
import com.iptv.app.feature.home.HomeScreen
import com.iptv.app.feature.player.PlayerScreen
import com.iptv.app.feature.scores.*
import com.iptv.app.feature.settings.SettingsScreen
import com.iptv.app.ui.theme.*

// ─── Routes ──────────────────────────────────────────────────────────────────

sealed class Route(val route: String, val label: String? = null, val icon: ImageVector? = null, val iconSelected: ImageVector? = null) {
    data object Home      : Route("home",      "Home",      Icons.Outlined.Home,         Icons.Filled.Home)
    data object Scores    : Route("scores",    "Scores",    Icons.Outlined.EmojiEvents,  Icons.Filled.EmojiEvents)
    data object Favorites : Route("favorites", "Favorites", Icons.Outlined.FavoriteBorder, Icons.Filled.Favorite)
    data object Settings  : Route("settings",  "Settings",  Icons.Outlined.Settings,     Icons.Filled.Settings)

    data object Player      : Route("player/{channelId}") { fun create(id: String) = "player/$id" }
    data object MatchDetail : Route("match/{matchId}")    { fun create(id: String) = "match/$id"   }
    data object SignIn      : Route("auth/sign-in")
    data object Register    : Route("auth/register")
}

val bottomNavItems = listOf(Route.Home, Route.Scores, Route.Favorites, Route.Settings)

// ─── Navigation ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IptvNavigation() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in bottomNavItems.map { it.route }

    Scaffold(
        modifier       = Modifier.fillMaxSize(),
        containerColor = Bg0,
        bottomBar = {
            AnimatedVisibility(
                visible = showBottomBar,
                enter   = slideInVertically { it } + fadeIn(),
                exit    = slideOutVertically { it } + fadeOut()
            ) {
                NavigationBar(
                    containerColor = Bg1,
                    tonalElevation = 0.dp,
                    modifier       = Modifier
                        .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                        .border(BorderStroke(1.dp, Line), RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            selected = selected,
                            onClick  = {
                                if (currentRoute != item.route) {
                                    navController.navigate(item.route) {
                                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                        launchSingleTop = true
                                        restoreState    = true
                                    }
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector       = if (selected) item.iconSelected!! else item.icon!!,
                                    contentDescription = item.label,
                                    modifier          = Modifier.size(24.dp)
                                )
                            },
                            label = {
                                Text(
                                    text       = item.label!!,
                                    style      = MaterialTheme.typography.labelSmall,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            alwaysShowLabel = true,
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor   = Color.White,
                                selectedTextColor   = Brand,
                                indicatorColor      = Brand,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }
            }
        }
    ) { paddingValues ->

        NavHost(
            navController    = navController,
            startDestination = Route.Home.route,
            modifier         = Modifier.padding(paddingValues),
            // Smooth slide transitions
            enterTransition  = { slideInHorizontally(tween(280)) { it / 8 } + fadeIn(tween(280)) },
            exitTransition   = { slideOutHorizontally(tween(200)) { -it / 8 } + fadeOut(tween(200)) },
            popEnterTransition  = { slideInHorizontally(tween(280)) { -it / 8 } + fadeIn(tween(280)) },
            popExitTransition   = { slideOutHorizontally(tween(200)) { it / 8 } + fadeOut(tween(200)) }
        ) {
            composable(Route.Home.route) {
                HomeScreen(onPlayChannel = { navController.navigate(Route.Player.create(it)) })
            }

            composable(Route.Scores.route) {
                ScoresScreen(onMatchClick = { navController.navigate(Route.MatchDetail.create(it)) })
            }

            composable(Route.Favorites.route) {
                FavoritesScreen(
                    onPlayChannel = { navController.navigate(Route.Player.create(it)) },
                    onSignIn      = { navController.navigate(Route.SignIn.route) }
                )
            }

            composable(Route.Settings.route) {
                SettingsScreen(onSignIn = { navController.navigate(Route.SignIn.route) })
            }

            composable(
                route     = Route.Player.route,
                arguments = listOf(navArgument("channelId") { type = NavType.StringType }),
                // Player screen: full slide from bottom
                enterTransition = { slideInVertically(tween(320)) { it } + fadeIn(tween(320)) },
                exitTransition  = { slideOutVertically(tween(280)) { it } + fadeOut(tween(280)) }
            ) { back ->
                val channelId = back.arguments?.getString("channelId") ?: return@composable
                PlayerScreen(channelId = channelId, onBack = { navController.popBackStack() })
            }

            composable(
                route     = Route.MatchDetail.route,
                arguments = listOf(navArgument("matchId") { type = NavType.StringType })
            ) { back ->
                val matchId = back.arguments?.getString("matchId") ?: return@composable
                MatchDetailScreen(matchId = matchId, onBack = { navController.popBackStack() })
            }

            composable(Route.SignIn.route) {
                SignInScreen(
                    onSignInSuccess      = { navController.popBackStack() },
                    onNavigateToRegister = { navController.navigate(Route.Register.route) },
                    onContinueAsGuest   = { navController.popBackStack() }
                )
            }

            composable(Route.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = { navController.popBackStack(Route.Home.route, false) },
                    onBack            = { navController.popBackStack() }
                )
            }
        }
    }
}
