# Paperwork Decoder

Understand official letters without handing over your identity.

Tax notices, bank letters, leases and medical paperwork are written in language most people can't follow, and they are full of exactly the details you shouldn't paste into a chatbot. Paperwork Decoder hides your name, address and numbers **on your device**, sends only the redacted text to the cloud for a plain-language explanation, then puts your real details back into the answer locally.

Built for the #BuildHybridAI hackathon with **Firebase AI Logic hybrid inference**.

## How hybrid inference is used

Every model call goes through Firebase AI Logic (`firebase/ai`). Each feature picks its inference mode on purpose (see [`src/lib/ai.ts`](src/lib/ai.ts)):

| Feature | Mode | Why |
|---|---|---|
| Read a photo of a letter | `ONLY_ON_DEVICE` | The raw letter must not leave the device. |
| Find personal details to hide | `ONLY_ON_DEVICE` | Same. Structured JSON output from Gemini Nano, checked against the letter. |
| Explain the letter, list actions and deadlines | `ONLY_IN_CLOUD` | Needs deeper reasoning. Sees placeholders like `[NAME_1]`, never the real values. |
| Draft a reply | `ONLY_IN_CLOUD` | Written with placeholders; real details are filled in locally. |
| "Say it more simply" | `PREFER_ON_DEVICE` | Instant and free on-device, falls back to cloud where there is no local model. |

Every AI result carries a badge showing where it ran, read from `response.inferenceSource`.

If the browser has no on-device model, the app does not silently fall back for the private steps. Pasted text is redacted by local patterns and the user is asked to add names by hand; a photo is only sent to the cloud after explicit consent.

Other Firebase products: **App Check** (required by AI Logic) and **Remote Config** (the `cloud_model` key switches the cloud model without a redeploy).

## Run it

Requirements: Node 20+, Chrome 139+ on desktop.

1. In `chrome://flags`, enable the Prompt API / on-device model flags (`#prompt-api-for-gemini-nano-multimodal-input`, and "Gemma 4 for Built-in AI" for Gemini Nano 4), then restart Chrome.
2. Create a Firebase project, open **AI Services > AI Logic**, click **Get started** and choose the Gemini Developer API. Register a web app.
3. Copy `.env.example` to `.env.local` and fill in the web app config.
4. Install and start:

   ```bash
   pnpm install
   pnpm dev
   ```

5. Open the app, open DevTools, and copy the `AppCheck debug token` printed in the console. Register it in Firebase console under **App Check > Apps > Manage debug tokens**. To reuse one token in every local browser, put it in `.env.development.local` as `VITE_APPCHECK_DEBUG_TOKEN=...`. That file is git-ignored and is never loaded for a production build.
6. Click **Try a sample letter**, then **Hide my personal details**.

For a hosted build, create a score-based reCAPTCHA key in your Google Cloud project, register its site key in App Check under **Fraud Defense (reCAPTCHA Enterprise)**, set `VITE_RECAPTCHA_SITE_KEY`, then `pnpm build` and deploy `dist/` to Firebase Hosting.

## Android app

The `android/` folder holds a native Kotlin and Jetpack Compose app with the same three steps and the same per-feature inference modes, using `firebase-ai` and `firebase-ai-ondevice` (Gemini Nano through ML Kit's Prompt API).

```bash
cd android
# Put your own google-services.json in android/app/ (Firebase console, or `firebase apps:sdkconfig ANDROID`)
./gradlew :app:testDebugUnitTest   # redaction tests
./gradlew :app:installDebug        # install on a connected device or emulator
```

Debug builds use the App Check debug provider: copy the token printed in Logcat (`DebugAppCheckProvider`) into **App Check > Apps > Manage debug tokens**. Release builds use Play Integrity.

On-device inference needs a phone that supports Gemini Nano. On other devices and on emulators the app says so, hides details with patterns only, and asks you to hide names yourself. Differences from the web app: on-device requests are limited to about 4,000 tokens, so letters are processed in smaller pieces, and "Say it more simply" uses the on-device model only for English and Korean, the languages it is validated for.

## Privacy and security

- The debug token lives in a dev-only env file and the code that reads it is removed from production builds; this is checked by searching `dist/` for the token.
- Model output is treated as untrusted: it is rendered as text, coerced into a fixed shape, and personal-data suggestions are only accepted if they appear verbatim in the letter.
- Letters are passed to the model as data with an instruction to ignore anything written inside them.
- Hidden values are matched as whole words, and each part of a hidden name is hidden too, so "Mr. Okafor" does not leak after "Daniel Okafor" is hidden.
- The reply goal you type is redacted with the same list before it is sent.
- An enforcing Content-Security-Policy allows scripts only from the site itself and reCAPTCHA, and connections only to the site and Google APIs.
- `firebase.json` sets `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS and a restrictive `Permissions-Policy` on the hosted build.
- `pnpm test` covers the redaction code; `pnpm audit` is clean.

## Project layout

- `src/lib/ai.ts` — all Firebase AI Logic calls and inference modes
- `src/lib/redact.ts` — local redaction and re-insertion (no network)
- `src/lib/firebase.ts` — Firebase app, App Check, Remote Config (loaded on demand)
- `src/lib/device.ts`, `src/lib/config.ts` — on-device availability and limits, no Firebase import
- `src/Landing.tsx` — the landing page at `/`
- `src/App.tsx` — the three-step interface at `/app`
- `src/ui.tsx` — shared navigation, badges and the redacted-text renderer

## Limits

- On-device inference needs Chrome on desktop with the flags above and takes at most about 9,000 tokens per request, so long letters are processed in pieces.
- On-device input is text, JPEG or PNG. PDFs are not supported yet.
- This is not legal advice.

## License

Apache-2.0. See [LICENSE](LICENSE).

The heading typeface is Fraunces, used under the SIL Open Font License (`public/fonts/OFL-Fraunces.txt`).
