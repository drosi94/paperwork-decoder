## Inspiration

Official bureaucracy is designed for the agency issuing it, not the citizen receiving it.

Every year, millions of people receive intimidating notices from municipal tax offices, public health systems, social welfare bureaus, and private landlords. These letters arrive dense with archaic legal statutes, aggressive penalty warnings, and short statutory deadlines. It is especially disorienting for immigrants navigating bureaucracy in an adopted language, and for older relatives who struggle to decipher what an agency wants them to do.

Modern Large Language Models are remarkably gifted at breaking down Byzantine bureaucracy into clear, compassionate human language. However, administrative notices are the **worst possible documents** to upload to a generic cloud chatbot. A single tax assessment or rent increase notice contains your:

- Full legal name and family member references
- Exact residential domicile
- Government Tax ID and Social Security Number
- Bank account details (IBAN / routing numbers)
- Alleged debts and financial distress history

Uploading an unredacted official notice to a public cloud chatbot permanently logs your sensitive personal identity onto third-party servers.

We built **Paperwork Decoder** around a single conviction: **Hybrid AI eliminates this trade-off entirely.** A lightweight model running directly on client silicon is fast and private enough to isolate personal data, while a frontier cloud model is capable enough to decode legal consequences and extract deadlines without ever needing to know who you are.

---

## What it does

Paperwork Decoder operates in three auditable stages, separating private data extraction from high-capability reasoning:

### 1. Document Ingestion (Zero Network Egress)

The user either pastes text or uploads a photo of an official letter. In Google Chrome and on Android, document reading executes directly on client hardware:

- Optical Character Recognition (OCR) runs on-device using local vision models (`ONLY_ON_DEVICE`).
- The unredacted image never leaves your computer or phone.

### 2. On-Device Redaction & Privacy Workbench

Gemini Nano (via Chrome's built-in Prompt API or Android ML Kit) and deterministic whole-word regex engines inspect the document:

- Names, physical addresses, tax numbers, IBANs, telephone numbers, and email addresses are extracted locally.
- Sensitive items are mapped to anonymous placeholder tokens. For example, the local mapping \\(M\\) contains this entry:

$$
\text{Daniel Okafor} \mapsto \texttt{[NAME\_1]}
$$

The outbound payload replaces each matched value with its placeholder:

$$
D_{\mathrm{cloud}} = \operatorname{replace}(D_{\mathrm{raw}}, M)
$$

Users can visually audit every detected entity chip on an interactive review workbench before anything leaves their device.

### 3. Cloud Reasoning & Client Re-hydration

Firebase AI Logic sends only \\(D_{\mathrm{cloud}}\\) to Gemini in the cloud (`ONLY_IN_CLOUD`). The cloud model returns:

- **Plain-Language Summary**: 2–3 clear sentences explaining the core issue.
- **Urgency & Deadlines**: Imminent due dates and payment windows.
- **Consequences**: Exact statutory penalties or enforcement measures if no action is taken.
- **Jargon Glossary**: Plain definitions for up to 5 difficult legal terms, with a one-click *"Say it more simply"* option.
- **Actionable Response Draft**: A formal reply letter composed using placeholders.

Finally, the browser **locally restores** the real identity back into the response template:

$$
R_{\mathrm{final}} = \operatorname{replace}(R_{\mathrm{cloud}}, M^{-1})
$$

The cloud models see the legal dilemma; only the user ever sees their own name.

---

## How I built it

Paperwork Decoder is designed as a serverless client application communicating directly with Google Firebase services, secured by **Firebase App Check**:

### 1. Per-Feature Inference Architecture

Rather than treating hybrid inference as a simple fallback, every model call explicitly specifies its inference mode:

| Feature | Inference Mode | Model Used | Reason |
|---|---|---|---|
| Read letter photo | `ONLY_ON_DEVICE` | Gemini Nano (Vision) | Raw document must never touch the network |
| Detect personal identity | `ONLY_ON_DEVICE` | Gemini Nano (Prompt API) | Only local models inspect unredacted PII |
| Explain consequences & deadlines | `ONLY_IN_CLOUD` | Gemini 2.5 Flash / Flash Lite | Requires deep reasoning over legal text |
| Draft formal appeal letter | `ONLY_IN_CLOUD` | Gemini 2.5 Flash / Flash Lite | Composes structured response templates |
| "Say it more simply" | `PREFER_ON_DEVICE` | Gemini Nano → Cloud | Instant and free locally; falls back gracefully |

### 2. Dual-Engine Redaction & Name Splitting

Redaction combines deterministic patterns (regex for IBANs, tax IDs, emails, phone numbers) with Gemini Nano for names and street addresses. Suggested entities are verified against the source text to prevent hallucinations before being replaced with tokens.

### 3. Economics & Built-in Rate Limiting

At the example rates of USD 0.10 per million input tokens and USD 0.40 per million output tokens, the estimated cost in USD for one letter is:

$$
C_{\mathrm{letter}} = \frac{0.10\,T_{\mathrm{in}} + 0.40\,T_{\mathrm{out}}}{10^{6}}
$$

For example, 1,000 input tokens and 500 output tokens cost USD 0.0003 at those rates.

To protect project quota against automated scrapers and viral spikes, we built a client-side sliding-window rate limiter:

- **Cooldown Protection**: 6-second enforced gap between calls.
- **Burst Cap**: Maximum 4 cloud decodes per 5-minute rolling window.
- **Daily Quota**: Maximum 20 letters per 24 hours per browser session.

### 4. Supporting Firebase Stack

- **Firebase App Check**: Enforces reCAPTCHA Enterprise verification in production and debug tokens in development.
- **Firebase Remote Config**: Dynamically adjusts the cloud model identifier (`cloud_model`) without redeploying code.
- **Firebase Hosting**: Serves the application with strict CSP headers, `nosniff`, and zero server logging.
- **Android Client**: Native Kotlin and Jetpack Compose app utilizing `firebase-ai` and `firebase-ai-ondevice`.

---

## Challenges I ran into

- **The Partial Surname Leak**: In early testing, the model detected `"Daniel Okafor"` as `[NAME_1]`, but failed to flag `"Dear Mr. Okafor"` in the letter's salutation, leaking the recipient's surname to the cloud. We resolved this by building a dedicated `withNameParts()` algorithm that splits detected multi-word names into sub-tokens, enforcing whole-word boundary matching across the entire document.
- **Accidental Bundling of Debug Tokens**: Vite's aggressive compilation initially risked inlining development App Check debug tokens into production distributions. We resolved this by isolating the token into `.env.development.local` and implementing a build-time audit script that scans `dist/` before deployment.
- **On-Device Context Constraints**: Gemini Nano input limits (~4,000–9,000 tokens) cannot ingest long bureaucratic letters in a single prompt. We introduced an intelligent semantic chunking mechanism that segments documents along paragraph boundaries, ensuring long letters are processed without truncating names or reference IDs.
- **Honest Degradation**: If a user visits on a browser without Gemini Nano support, the app strictly refuses to silently ship unredacted data to the cloud. Instead, it relies on pattern-based redaction and asks the user to manually verify names, preserving user trust.

---

## Accomplishments that I'm proud of

- **Privacy as the Architecture, Not a Feature**: Zero personally identifiable information (PII) is ever written to a database or sent across the network.
- **Emil Kowalski Design Polish**: Built an interface with concentric nested radii (\\(r_{\mathrm{inner}} = r_{\mathrm{outer}} - p\\), where \\(p\\) is the padding), layered dark-mode elevation, constant-weight segmented controls that eliminate layout shift, and an interactive PII Inspector.
- **Real Cross-Platform Execution**: Achieved feature parity across both modern desktop web (Chrome 139+) and native Android (Kotlin + Jetpack Compose).
- **Rock-Solid Test Coverage**: 100% of the redaction engine, surname splitting, and rate limiting logic is validated by automated test suites.

---

## What I learned

- **Constrained On-Device Models Are Unbeatable for Privacy**: Supplying Gemini Nano with a strict JSON schema (`responseConstraint`) yields deterministic, near-instant privacy extraction that outperforms oversized cloud prompts.
- **Inference Mode Selection Is a UX Philosophy**: Choosing between `ONLY_ON_DEVICE`, `ONLY_IN_CLOUD`, and `PREFER_ON_DEVICE` is fundamentally an architectural contract with the user about who controls their data.

---

## What's next for Paperwork Decoder

- **Text-to-Speech (TTS)**: Integration with `gemini-3.1-flash-tts-preview` to read plain-language summaries aloud for visually impaired and elderly users.
- **Client-Side PDF Rasterization**: In-browser PDF canvas extraction allowing multi-page PDF notices to be scanned locally with Gemini Nano.
- **Encrypted Local Document Vault**: Optional client-side encryption using the Web Crypto API to let users track their ongoing dispute letters completely offline.
