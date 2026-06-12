package com.iptv.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.ui.graphics.toArgb
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.iptv.app.ui.navigation.IptvNavigation
import com.iptv.app.ui.theme.Bg0
import com.iptv.app.ui.theme.IptvTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        // Edge-to-edge with brand dark status bar and nav bar
        enableEdgeToEdge(
            statusBarStyle    = SystemBarStyle.dark(Bg0.toArgb()),
            navigationBarStyle = SystemBarStyle.dark(Bg0.toArgb())
        )

        setContent {
            IptvTheme {
                IptvNavigation()
            }
        }
    }
}
