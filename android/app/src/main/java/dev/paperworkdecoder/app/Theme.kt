package dev.paperworkdecoder.app

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/** The same paper-and-ink palette as the web app. */
data class Tones(
    val muted: Color, val line: Color,
    val device: Color, val deviceBg: Color,
    val cloud: Color, val cloudBg: Color,
    val warnBg: Color, val warnInk: Color,
    val errorBg: Color, val errorInk: Color,
)

val LocalTones = staticCompositionLocalOf<Tones> { error("no tones") }

private val LightTones = Tones(
    muted = Color(0xFF645E52), line = Color(0xFFE0D9C8),
    device = Color(0xFF1D6B45), deviceBg = Color(0xFFE2F1E7),
    cloud = Color(0xFF1F4E79), cloudBg = Color(0xFFE1EBF5),
    warnBg = Color(0xFFFBF0D3), warnInk = Color(0xFF5C4300),
    errorBg = Color(0xFFF9E0DC), errorInk = Color(0xFF7A1C10),
)
private val DarkTones = Tones(
    muted = Color(0xFFA8A294), line = Color(0xFF37353D),
    device = Color(0xFF7FD3A4), deviceBg = Color(0xFF1C3528),
    cloud = Color(0xFF8AB8E6), cloudBg = Color(0xFF1B2C3D),
    warnBg = Color(0xFF3A3118), warnInk = Color(0xFFF1DC9C),
    errorBg = Color(0xFF40201B), errorInk = Color(0xFFF5B9B0),
)

private val Light = lightColorScheme(
    primary = Color(0xFF1F4E79), onPrimary = Color.White,
    background = Color(0xFFF6F3EC), onBackground = Color(0xFF23201A),
    surface = Color(0xFFFFFDF8), onSurface = Color(0xFF23201A),
    surfaceVariant = Color(0xFFF6F3EC), onSurfaceVariant = Color(0xFF645E52),
    outline = Color(0xFFCFC7B4), outlineVariant = Color(0xFFE0D9C8),
    inverseSurface = Color(0xFF23201A), inverseOnSurface = Color(0xFFF6F3EC),
)
private val Dark = darkColorScheme(
    primary = Color(0xFF8AB8E6), onPrimary = Color(0xFF10202F),
    background = Color(0xFF17161A), onBackground = Color(0xFFECE8DF),
    surface = Color(0xFF201F24), onSurface = Color(0xFFECE8DF),
    surfaceVariant = Color(0xFF17161A), onSurfaceVariant = Color(0xFFA8A294),
    outline = Color(0xFF4A4852), outlineVariant = Color(0xFF37353D),
    inverseSurface = Color(0xFFECE8DF), inverseOnSurface = Color(0xFF17161A),
)

@Composable
fun PaperworkTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    androidx.compose.runtime.CompositionLocalProvider(LocalTones provides if (dark) DarkTones else LightTones) {
        MaterialTheme(colorScheme = if (dark) Dark else Light, content = content)
    }
}
