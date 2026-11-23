# Demo video: recording script

A finished video already exists at `docs/demo-video.mp4` (2:07). It uses real screenshots of the live site, a live recording of the Android emulator, and an AI voice.

This script is for recording a better one yourself, if you have time: live screen motion and your own voice. Target 2:30, hard limit 3:00. Judges may score from the video alone, and only the first 3 minutes count.

## Before you record

- [ ] Use the **live site**: https://paperwork-decoder-8055c.web.app
- [ ] Chrome on desktop. The top bar of the app must say **Gemini Nano Ready**. If it says "downloads on first use", run the sample once and wait; do not record the download.
- [ ] Use only the built-in sample letter. Never a real letter.
- [ ] Clean window: no bookmarks bar, no other tabs, no extensions. Press `Cmd` `+` twice so text is readable.
- [ ] Record with `Cmd+Shift+5` > "Record Selected Portion", sized to 16:9.
- [ ] Do one silent practice run first. On-device steps take 10 to 30 seconds; you will cut those waits afterwards.
- [ ] Record your voice separately, reading the "Say" column, in a quiet room. Clear audio matters more than anything else.
- [ ] No music or images you do not have rights to.
- [ ] Upload to YouTube as **Public** at least a day before the deadline.

## Part 1: web (about 2:00)

| # | Do on screen | Say |
|---|---|---|
| 1 | Landing page. Hold on the headline for two seconds. | "Official letters are hard to understand. And they are the last thing you should paste into a chatbot." |
| 2 | In the demo card, click **Your original letter**. | "Your name, your address, your tax number and your bank account, all on one page." |
| 3 | Click **What the cloud sees**. | "Paperwork Decoder is for anyone facing a tax, bank or government letter they can't follow. It hides who you are on your own device, then asks the cloud to explain what's left." |
| 4 | Click **How it works** in the top bar, then scroll to the table "Two models, each doing the job it is best suited for". Move the mouse down the badge column. | "It's built on Firebase AI Logic hybrid inference. Each feature chooses where it runs: private steps on the on-device model only, reasoning in the cloud only, and quick help on the device first." |
| 5 | Click **Open App**. Point at **Gemini Nano Ready**. Click **Try a sample letter**. | "Here's the app, with Gemini Nano ready inside Chrome. I'll use a sample tax notice. I could also add a photo or a PDF." |
| 6 | Click **Hide my personal details**. Cut the wait. On step 2, point at the green badge, then the labels in the letter, then the "Hidden on this device" list. | "Gemini Nano, running in the browser, finds the name, the address, the taxpayer number, the bank account and the phone. This is the exact text that will be sent. Nothing has left the computer yet." |
| 7 | Click the eye icon on one item to reveal it, then hide it again by typing it into "Add custom text to hide". | "The model can miss things, so I stay in control. I can reveal or hide anything myself." |
| 8 | Click **Send redacted text & explain with Gemini**. On the result, point at **Cloud · Gemini**, the urgency, the two actions and their deadlines. | "Now the cloud model gets the redacted letter. It tells me what this is, that it's urgent, the two things I can do, and the deadlines. My real bank reference is back in the answer: the cloud returned a label, and my device filled it in." |
| 9 | Scroll to the **Privacy Receipt** line. Hold. | "Here's the receipt: about a thousand characters of redacted text went to the cloud." Then read the number of details shown on your screen. |
| 10 | Under "Difficult bureaucracy terms explained", click **Say it more simply** on the first word. Point at the green badge that appears. | "Quick help uses the third mode, prefer on-device. This simpler explanation came from the local model, instantly and at no cost." |
| 11 | Under "Draft a reply letter", click **Ask for two more weeks to pay**, then **Draft reply**. | "It also drafts a reply. The cloud writes it with placeholders, and my reference numbers are added on the device." |

### Optional proof shot (10 seconds, worth it)

Before step 8, open DevTools (`Cmd+Option+I`) > **Network**. After clicking explain, click the request to `firebasevertexai.googleapis.com` > **Payload**, and show `[NAME_1]` where the name would be. Say: "And here's the actual request. The name isn't in it."

## Part 2: Android (about 0:20)

### With the emulator (what the current video shows)

1. Open Android Studio > Device Manager > start **Galaxy_S22**.
2. In the project's `android` folder, run `./gradlew :app:installDebug`.
3. Record the emulator window. Tap **Try a sample letter**, **Hide my personal details**, then **Explain this letter**.

Say: "The same app runs natively on Android, with the same Firebase SDK. This emulator has no Gemini Nano, so it shows the designed fallback: details are hidden by patterns, the app says so, and the cloud explanation still works."

### With a real Gemini Nano phone (much stronger, if you can borrow one)

Supported: Pixel 10 or 11, Galaxy S26+, Z Fold8, Z Flip8.

1. On the phone: Settings > About phone > tap **Build number** seven times, then turn on **USB debugging** in Developer options.
2. Connect by USB and run `./gradlew :app:installDebug` in the `android` folder.
3. Open the app once, then run this on your Mac and register the printed token in Firebase console > App Check > Apps > Paperwork Decoder Android > Manage debug tokens:
   `~/Library/Android/sdk/platform-tools/adb logcat -d | grep DebugAppCheckProvider | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | tail -1`
4. Wait until the app's first screen says **On-device model ready**. The model may need to download first.
5. Record the phone screen (swipe down > Screen record). Run the same three taps.

Say: "The same app runs natively on Android, with the same Firebase SDK. Here Gemini Nano runs on the phone itself: the name and address are hidden before anything is sent."

## Closing (0:08)

Show the landing page headline again, or a plain card with the name and URL.

Say: "Paperwork Decoder. Two models, each doing the job it's suited to. Your letter explained, your identity kept."

## If you are over three minutes

Cut in this order: step 7, step 11, the proof shot. Never cut the first 30 seconds, the green badge in step 6, or the receipt in step 9.

## Getting it edited

Put your screen recording and your voice file in the `docs` folder and ask for them to be cut together. The waits will be trimmed and captions added from this script.
