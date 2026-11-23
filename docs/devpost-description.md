# Devpost submission text

Paste each section into the matching Devpost field. Lines marked **[YOU]** need your own words or a check.

---

## Project name
Paperwork Decoder

## Tagline
Understand official letters without handing over your identity.

## Platform
Web (Chrome)

## Links
- Live app: https://paperworkdecoder.com
- Code: https://github.com/drosi94/paperwork-decoder
- Video: https://youtu.be/_WHj41UJDYE

---

## Inspiration

Official letters are written for the office that sends them, not the person who receives them. A tax notice, a bank letter or a landlord's notice can decide whether you owe money or lose a right, and it arrives in language most people cannot follow. It is hardest for people handling bureaucracy in a second language, and for older relatives who end up asking family to translate.

AI is good at explaining these letters. But they are also the documents you should least want to paste into a chatbot: full name, home address, tax number, bank account, all on one page.

Hybrid inference removes that trade-off. A small model on the device is good enough to find the personal details; a large model in the cloud is good enough to explain the letter, and it does not need to know who you are to do it.

**[YOU] If you have a personal reason for building this, add one or two sentences here. Judges score "genuine understanding of the problem space".**

## What it does

1. **Add your letter.** Paste the text or add a photo.
2. **Check what is hidden.** An on-device model finds names, addresses, ID numbers, bank accounts, phone numbers and emails, and replaces them with labels such as `NAME_1`. You see the exact text that will leave your device and can hide more, or un-hide, before anything is sent.
3. **Understand it.** The cloud model receives only the redacted text and returns a plain-language summary, urgency, what you must do and by when, what happens if you do nothing, difficult words explained, and questions worth asking. Your real details are put back into the answer on your device.

You can also draft a reply (the cloud writes it with placeholders, your details are filled in locally), choose the language of the explanation, and ask for any difficult word to be explained more simply.

Every AI result carries a badge showing where it ran: "On this device" or "Cloud".

## How I used Firebase AI Logic

Every model call in the app goes through the Firebase AI Logic web SDK (`firebase/ai`). Hybrid inference is not a fallback here. Each feature has its own model instance with a deliberately chosen inference mode:

| Feature | Inference mode | Why |
|---|---|---|
| Read a photo of the letter | `ONLY_ON_DEVICE` | The original letter must not leave the device. |
| Find personal details to hide | `ONLY_ON_DEVICE`, structured JSON output | The only model that sees your identity is the one in your browser. |
| Explain the letter, actions and deadlines | `ONLY_IN_CLOUD`, JSON schema | Needs stronger reasoning. Sees placeholders only. |
| Draft a reply | `ONLY_IN_CLOUD` | Written with placeholders, filled in locally. |
| "Say it more simply" | `PREFER_ON_DEVICE` | Instant and free on-device; still works in the cloud where there is no local model. |

Other details:

- **On-device model:** Gemini Nano through Chrome's built-in Prompt API. The app calls `initializeDeviceModel()` on the user's first click and shows download progress.
- **Where it ran:** read from `response.inferenceSource` and shown as a badge on every result.
- **No silent fallback for private steps.** If the browser has no on-device model, pasted text is redacted with local patterns and the user is asked to hide names by hand. A photo is sent to the cloud only after explicit consent.
- **One schema, two models.** The same JSON Schema is passed to the cloud (`responseJsonSchema`) and to the on-device model (`responseConstraint`).
- **Firebase App Check** protects the API (reCAPTCHA Enterprise in production, debug provider locally).
- **Firebase Remote Config** holds the cloud model name, so it can be changed without a redeploy.
- **Firebase Hosting** serves the app with an enforcing Content-Security-Policy and other security headers.

**WebMCP for AI agents.** The page also registers WebMCP tools (`hide_personal_details`, `explain_letter`, `draft_reply`), so an AI agent in Chrome can decode a letter for the user. The tools run inside the page and use the same hybrid pipeline. They return placeholders only, never the hidden details, because the agent may itself be a cloud model; the cloud tools are marked consequential so the browser can ask the user before anything leaves the device.

The code that does this is in [`src/lib/ai.ts`](https://github.com/drosi94/paperwork-decoder/blob/main/src/lib/ai.ts).

## How I built it

React and TypeScript with Vite. There is no backend of my own: the browser talks to Firebase directly, protected by App Check.

Redaction is ordinary, tested code rather than a prompt. Patterns catch emails, phone numbers, IBANs and long numbers; the on-device model adds names and addresses. Its suggestions are accepted only if they appear word for word in the letter and are short enough to be a detail. Hidden values are matched as whole words, and each part of a hidden name is hidden too, so hiding "Daniel Okafor" also hides the "Okafor" in "Dear Mr. Okafor".

Model output is treated as untrusted: it is rendered as text, coerced into a fixed shape, and the letter is passed to the model as data with an instruction to ignore anything written inside it.

## Challenges

- **The surname leak.** The first version hid "Daniel Okafor" and then sent "Dear Mr. Okafor" to the cloud. The fix is the name-part rule above, with a unit test.
- **A debug token in the production bundle.** Aliasing `import.meta.env` made Vite inline every environment variable, including the App Check debug token. The token now lives in a dev-only env file and the build is checked for it.
- **On-device limits.** The local model takes about 9,000 tokens per request and cannot read PDFs. Long letters are processed in pieces, and PDFs are opened in the browser first: text PDFs are read directly, and scanned PDFs have their first page turned into an image for the on-device model.
- **A security policy that blocked the on-device model.** The Firebase AI SDK loads a photo's inline data with `fetch()`, which a strict Content-Security-Policy `connect-src` blocks. Photo reading failed on the live site until `data:` was allowed.
- **Honest degradation.** Deciding what to do when there is no on-device model, without quietly sending private data to the cloud, shaped most of the interface.

## What I'm proud of

- The hybrid split is the product, not a performance detail: you can see what stays and what goes before you send anything.
- The review screen. Automated hiding can miss things, so the app shows its work instead of asking for trust.
- It still works, with weaker hiding and a clear warning, in browsers with no on-device model.

## What I learned

- A small on-device model is reliable at narrow extraction when its output is constrained by a schema and then verified against the source text.
- Per-feature inference modes are a product decision as much as a technical one.

## What's next

- Android and iOS versions on the same Firebase project, using Gemini Nano and Apple Foundation Models through the same SDK.
- Multi-page scanned letters (text PDFs already work; scans read page 1 only).
- An optional, encrypted history with Firebase Authentication and Firestore.

## Built during the submission period

Everything. The project was started on November 22, 2026 and has no pre-existing code. It was built with an AI coding assistant (Claude Code). Third-party pieces: React, Vite, the Firebase JavaScript SDK, and the Fraunces typeface (SIL Open Font License).

## Testing instructions for judges

1. Open https://paperworkdecoder.com in **Chrome on desktop** (139 or newer). No login is needed.
2. For on-device inference, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and "Gemma 4 for Built-in AI", then restart Chrome. The first run downloads the model, which can take several minutes.
3. Click **Decode a letter**, then **Try a sample letter**, then **Hide my personal details**.
4. On step 2, check the green "On this device" badge and that the name, address and numbers are replaced by labels.
5. Click **Explain this letter** and check the "Cloud" badge and the line at the bottom of the result showing what was sent and what was kept.

Without the flags, the app still runs: it hides emails, phone numbers, bank accounts and long numbers with patterns, says so, and asks you to hide names yourself.

The sample letter is fictional.
