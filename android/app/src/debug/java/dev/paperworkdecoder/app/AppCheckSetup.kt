package dev.paperworkdecoder.app

import com.google.firebase.Firebase
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory

/** Debug builds: the debug provider prints a token in Logcat to register in the Firebase console. */
fun installAppCheck() {
    Firebase.appCheck.installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance())
}
