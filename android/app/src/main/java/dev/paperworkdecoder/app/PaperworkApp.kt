package dev.paperworkdecoder.app

import android.app.Application
import com.google.firebase.Firebase
import com.google.firebase.initialize
import com.google.firebase.remoteconfig.remoteConfig

class PaperworkApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Firebase.initialize(this)
        // Firebase AI Logic enforces App Check.
        installAppCheck()
        // Remote Config lets the cloud model change without shipping a new build.
        Firebase.remoteConfig.apply {
            setDefaultsAsync(mapOf(HybridAi.CLOUD_MODEL_KEY to HybridAi.DEFAULT_CLOUD_MODEL))
            fetchAndActivate()
        }
    }
}
