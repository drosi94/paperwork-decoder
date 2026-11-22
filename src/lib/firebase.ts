import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai'
import { fetchAndActivate, getRemoteConfig, getValue } from 'firebase/remote-config'

import { firebaseConfigured } from './config'

/** Defaults used until Remote Config answers (and whenever it can't). */
const DEFAULTS = {
  cloud_model: 'gemini-3.5-flash-lite',
}

let app: FirebaseApp | undefined
let ai: AI | undefined
let settings = { ...DEFAULTS }
let ready: Promise<void> | undefined

function init(): Promise<void> {
  if (!firebaseConfigured) return Promise.reject(new Error('Firebase is not configured. Add your keys to .env.local.'))
  if (ready) return ready

  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  })

  // Firebase AI Logic enforces App Check. On localhost the debug provider prints a
  // token in the console; register it in Firebase console > App Check > Manage debug tokens.
  // Development only. `import.meta.env.DEV` is replaced with `false` in production builds, so this
  // whole block (and the token) is removed from the shipped bundle. Keep the token in
  // .env.development.local, which Vite never loads for a production build.
  if (import.meta.env.DEV) {
    ;(self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'missing-site-key'),
    isTokenAutoRefreshEnabled: true,
  })

  ai = getAI(app, { backend: new GoogleAIBackend() })

  // Remote Config lets us change the cloud model without redeploying.
  const rc = getRemoteConfig(app)
  rc.defaultConfig = DEFAULTS
  ready = fetchAndActivate(rc)
    .then(() => {
      settings = { cloud_model: getValue(rc, 'cloud_model').asString() || DEFAULTS.cloud_model }
    })
    .catch(() => {
      /* offline or not set up: keep defaults */
    })
  return ready
}

export async function getFirebaseAI(): Promise<{ ai: AI; cloudModel: string }> {
  await init()
  return { ai: ai!, cloudModel: settings.cloud_model }
}
