# Demo video script (target 2:50, hard limit 3:00)

Judges may score from the video alone, and only the first 3 minutes count. The first 30 seconds must say who it is for, the problem, and how Firebase AI Logic makes it work.

## Before you record

- [ ] Chrome on desktop with the on-device model **already downloaded**. Run the sample once beforehand so there is no download wait on camera.
- [ ] Use the **live site**, not localhost: https://paperwork-decoder-8055c.web.app
- [ ] Use only the built-in sample letter. Never a real letter.
- [ ] Clean browser window: no bookmarks bar, no other tabs, no extensions showing. Zoom the page to about 125% so text is readable.
- [ ] Pick light or dark and keep it for the whole video.
- [ ] Record at 1080p. Record your voice separately if you can; clear audio matters more than anything else.
- [ ] **Test shot 6 (offline) before recording.** I have not verified that on-device hiding works with the network off. If it does not, cut shot 6 and extend shot 5.
- [ ] No music or images you do not have rights to. No third-party logos beyond what Chrome itself shows.
- [ ] Upload to YouTube as **Public** at least a day early; processing can take hours.

## Script

| Time | On screen | Say |
|---|---|---|
| 0:00–0:10 | Landing page hero. Slowly move the mouse to the demo card. | "Official letters are hard to understand. And they are the last thing you should paste into a chatbot: your name, address, tax number and bank account, all on one page." |
| 0:10–0:22 | Click the toggle on the demo card: "Your letter", then "What the cloud sees". | "Paperwork Decoder is for anyone facing a tax, bank or government letter they can't follow. It hides who you are on your own device, then asks the cloud to explain what's left." |
| 0:22–0:32 | Scroll to the "Two models" table. Hold on it. | "It's built on Firebase AI Logic hybrid inference. Each feature chooses where it runs: private steps on the on-device model only, reasoning in the cloud only, and quick help on the device first." |
| 0:32–0:45 | Click **Decode a letter**. Point at the "On-device model ready" badge. Click **Try a sample letter**. | "Here's the app. Chrome's built-in model is ready. I'll use a sample tax notice. I can also add a photo, which is read on the device too." |
| 0:45–1:10 | Click **Hide my personal details**. Step 2 appears. Point at the green badge, then at the chips in the letter, then at the hidden list. | "Gemini Nano, running in my browser, finds the name, address, taxpayer number, bank account and phone. This ran on the device: here's the badge. And this is exactly the text that will be sent. Nothing has left my computer yet." |
| 1:10–1:22 | Type a word into "Hide something else", press Enter. Then click "show" on one item to un-hide it, and hide it again. | "The model can miss things, so I stay in control. I can hide anything else, or un-hide something the explanation needs." |
| 1:22–1:35 | **Shot 6, optional.** Turn Wi-Fi off. Click Back, then **Hide my personal details** again. It still works. Turn Wi-Fi back on. | "Because this step is on-device only, it works with no connection at all." |
| 1:35–2:00 | Click **Explain this letter**. Result appears. Point at the "Cloud" badge, the urgency, the two actions with deadlines. | "Now the cloud model gets the redacted letter. It tells me what this is, that it's urgent, the two things I can do, and the deadlines. Notice my real bank reference is back in the answer. The cloud returned a label; my device filled it in." |
| 2:00–2:12 | Scroll to the line "Sent to the cloud … Kept on this device …". Hold. | "Here's the receipt: about a thousand characters of redacted text went to the cloud. Seven personal details never left." |
| 2:12–2:27 | Click **Say it more simply** on a difficult word. Point at the "On this device" badge that appears. | "Quick help uses the third mode, prefer on-device. This rewording came from the local model, instantly and at no cost. On a browser with no local model, the same button falls back to the cloud." |
| 2:27–2:42 | Type "ask for two more weeks to pay" in Write back, click **Draft a reply**. Show the letter with real details filled in. | "It can also draft a reply. The cloud writes it with placeholders, and my name and reference numbers are added on the device." |
| 2:42–2:52 | Back to the landing page hero, or a plain title card with the app name and URL. | "Paperwork Decoder. Two models, each doing the job it's suited to, with Firebase AI Logic, App Check and Remote Config. Your letter explained, your identity kept." |

## If you are over time

Cut in this order: shot 6 (offline), the reply draft, the manual hide. Never cut the first 30 seconds, the green badge on step 2, or the "sent / kept" receipt.

## Optional proof shot

If you have 10 spare seconds: open DevTools, Network tab, click the request to `firebasevertexai.googleapis.com`, and show the request body containing `[NAME_1]` instead of the name. It is the strongest evidence in the whole video that the redaction is real.
