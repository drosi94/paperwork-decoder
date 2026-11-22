// AGP's built-in Kotlin support uses the Kotlin Gradle plugin on the classpath.
// The Firebase AI and ML Kit libraries are compiled with Kotlin 2.4, so pin 2.4.x here.
buildscript {
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.21")
    }
}

plugins {
    id("com.android.application") version "9.5.2" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.21" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.4.21" apply false
    id("com.google.gms.google-services") version "4.6.0" apply false
}
