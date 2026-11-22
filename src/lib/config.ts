/** True when the Firebase web config is present. Kept free of Firebase imports so it loads instantly. */
export const firebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_APP_ID)

/** Hard limits on what one request may carry. */
export const MAX_LETTER_CHARS = 20_000
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
