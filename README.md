# BelajarKu AI — #BuildHybridAI 2026

**An AI study companion that runs on-device first, cloud when it matters.**

Paste study material (lecture notes, a textbook page, an article) and
BelajarKu turns it into a **summary**, **flashcards**, a **quiz**, or
answers a **question** about the material — in English or Bahasa
Indonesia. Short work runs on the student's own device with Gemini Nano
(private, offline, free). Long work falls back to Gemini in the cloud.
Every result carries a badge showing which path answered it.

Built for **#BuildHybridAI 2026** (Devpost × Google/Firebase) — $30,000
cash prizes, submission deadline **30 Nov 2026, 2:00 PM PT (1 Dec 2026,
05:00 WIB)**. Hackathon page:
https://firebasehybridaihackathon.devpost.com/

## Why this idea

Indonesian students study from phones, often on slow or expensive
data. A study tool that answers on-device — no data used, no waiting,
nothing leaving the phone — is genuinely useful for them, and the cloud
is there for the long documents the small model cannot handle well.
That split is exactly what hybrid inference is for: the same prompt,
two routes, chosen per request.

## How the hybrid part works

- One `GenerativeModel`, created with
  `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE })`
  plus explicit `inCloudParams` (cloud model `gemini-3.5-flash-lite`) and
  `onDeviceParams` (Prompt API `createOptions`).
- **Modes:** Auto (`PREFER_ON_DEVICE`), On-device only
  (`ONLY_ON_DEVICE`), Cloud only (`ONLY_IN_CLOUD`) — selectable in the
  UI, remembered per device.
- **Router** (`js/router.js`): in Auto mode, material shorter than the
  Remote Config limit (`on_device_max_chars`, default 4000 chars) with
  the local model ready goes on-device; longer material, or no local
  model, goes to the cloud; offline forces on-device (or a clear error
  when no local model exists).
- **Route badge:** every result shows `response.inferenceSource`
  (`ON_DEVICE` / `IN_CLOUD`, SDK v13.4.0+) plus a one-line reason.
- **On-device model prep:** `model.initializeDeviceModel(progress)`
  runs after a user gesture (the "Prepare on-device model" button, or
  any Run click) and reports download progress.
- **Every feature is single-turn text generation** — the only thing
  on-device inference supports. The Q&A feature is one question per
  request, with the material included as context each time.
- **JSON features** (flashcards, quiz) ask the model for ONLY valid
  JSON and validate it client-side (`js/parse.js`). We deliberately do
  NOT rely on `generationConfig.responseSchema`, because schema support
  differs between the on-device and cloud paths in hybrid mode; prompt
  + client-side validation behaves identically on both.

## Firebase products used

| Product | Use |
|---|---|
| **AI Logic** (hybrid inference) | All four AI features, Gemini Developer API backend |
| **App Check** | Enforced by the AI Logic setup; debug provider on localhost, reCAPTCHA v3 in production |
| **Authentication** | Anonymous sign-in (one click); saved sets belong to the user |
| **Firestore** | Saved study sets (`studySets/{uid}/sets/{setId}`); localStorage fallback when signed out |
| **Remote Config** | `on_device_max_chars`, `default_mode`, `flashcard_count`, `quiz_count` (all have built-in defaults) |

## Run it locally

```sh
cd app
python3 -m http.server 8000
# open http://localhost:8000 in Chrome 139+ on desktop
```

Notes:
- Serve over `http://localhost` (not `file://`): ES modules and the
  on-device model both need a real origin.
- On-device inference needs **Chrome 139+ on desktop** with the
  on-device model downloaded. Enable the flag
  `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` if the
  model does not appear, then click "Prepare on-device model".
- Without a Firebase config the app runs in **Demo mode**: the full UI
  works, but AI calls show a setup hint instead of failing.

## Connect Firebase (needed for AI + saving to the cloud)

1. Create a project at https://console.firebase.google.com
2. **AI Logic:** AI Services > AI Logic > Get started, choose the
   **Gemini Developer API** provider (free tier covers text inference).
   This workflow enforces App Check automatically.
3. **App Check:** for local development, the app sets
   `FIREBASE_APPCHECK_DEBUG_TOKEN = true` before initializing App
   Check. Open the app once, copy the debug token from the browser
   console, and register it in the console under Security > App Check >
   Apps > Manage debug tokens. For the hosted demo, create a
   reCAPTCHA v3 site key and put it in `RECAPTCHA_V3_SITE_KEY` in
   `js/config.js`.
4. **Authentication:** Build > Authentication > Sign-in method >
   enable **Anonymous**.
5. **Firestore:** create a database, then add these rules (users can
   only read/write their own sets):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /studySets/{uid}/sets/{setId} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
6. **Remote Config (optional):** create these keys — the app uses its
   built-in defaults when a key is missing:
   `on_device_max_chars` (4000), `default_mode` ("auto"),
   `flashcard_count` (8), `quiz_count` (5).
7. Register a **Web App** in Project settings, copy its
   `firebaseConfig`, and paste it into `js/config.js`, replacing every
   `YOUR_...` placeholder. **Never paste a Gemini API key, service
   account key, or any private key into this repo** — the Firebase web
   config values are public client identifiers, not secrets.

## Google Account Quota — NOT needed for this app

The hackathon offers a Quota Form for billing-required models (e.g.
image generation). Sprint 3 requests close **Wed 25 Nov 2026, 10:00
PT**, accounts are sent Fri 27 Nov and last 4 days. BelajarKu uses
**text inference only**, which is free within usage limits on the
Gemini Developer API — no quota account is needed. Do not request one
unless an image feature is added later.

## Tests

```sh
cd app
node scripts/test-logic.mjs     # 62 checks, pure logic (prompts/parse/router/store)
```

Browser smoke test (needs the app served on http://localhost:8123 and
a headless Chrome; script lives outside the repo in /tmp):
17 checks — boot state, sample loading (ID + EN), tab switching,
language toggle, error paths, zero console errors.

### What was tested (19 Nov 2026, this machine)

- ✅ 62/62 unit checks: prompt builders, JSON extraction/validation,
  flashcard + quiz parsing (incl. malformed input), summary parsing,
  routing decisions for all modes, store round-trip.
- ✅ App boots in headless Chrome with zero JS errors; demo banner,
  device probe, and status pills render correctly.
- ✅ Interactive flows without Firebase: sample loading, tab switching,
  language toggle EN↔ID, error messages for empty material / missing
  question / unconfigured Firebase.
- ✅ Firebase JS SDK v13.4.0 `firebase-ai.js` fetched from the CDN and
  verified to export `PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`,
  `PREFER_IN_CLOUD`, `ONLY_IN_CLOUD`, `inferenceSource`,
  `inCloudParams`, `onDeviceParams`, and `Schema`, and to define
  `GenerativeModel.initializeDeviceModel()` (verified 19 Nov 2026 —
  the method is ABSENT from v12.5.0, which the app pinned before;
  the pin was bumped to 13.4.0 for this reason).
- ✅ One real UI bug found and fixed by testing: the `hidden`
  attribute lost to `.row { display:flex }` (fixed with a
  `[hidden] { display:none !important; }` rule); one favicon 404
  fixed with an inline SVG icon.

### What was NOT tested (honest limits)

- ❌ **Live AI calls** (summary / flashcards / quiz / ask) — no
  Firebase project exists for this app yet, and creating one needs the
  user's Google account. The AI path (`js/ai.js`) is written exactly
  per the Firebase hybrid docs (verified against the official
  get-started + configuration-options pages and the shipped SDK
  bundle), but it has never run against a real model from this
  machine. Before the demo video, run it once in Chrome 139+ with a
  real config and confirm: (1) on-device summary works and the badge
  says ON_DEVICE, (2) a long document falls back to cloud and the
  badge says IN_CLOUD, (3) flashcards/quiz JSON parses.
- ❌ On-device model download on a real device (headless Chrome here
  reports the model unavailable, as expected without the flag/model).
- ❌ Firestore save/load against a real project (the localStorage path
  is exercised; the Firestore code path is identical in shape but
  unrun).
- ❌ The "Prepare on-device model" button's download progress UI
  (needs a real Chrome with the model downloadable).

## File map

```
app/
  index.html            single-page UI + Firebase import map (SDK 13.4.0)
  styles.css            mobile-first styles, no framework
  js/
    config.js           firebaseConfig placeholder + Remote Config defaults
    i18n.js             English + Bahasa Indonesia strings
    prompts.js          prompt builders (single-turn, JSON for cards/quiz)
    parse.js            tolerant JSON/text parsers + validators
    router.js           hybrid routing decisions (pure, tested)
    store.js            Firestore / localStorage / memory persistence
    ai.js               Firebase init, App Check, Auth, AI Logic calls
    app.js              UI wiring
  scripts/test-logic.mjs 62 unit checks (node, no Firebase needed)
  samples/              sample-id.txt (fotosintesis), sample-en.txt (water cycle)
  README.md             this file
  LICENSE               MIT
```

## Judging criteria (how this maps)

- **Technological Implementation:** one hybrid `GenerativeModel`,
  explicit `inCloudParams`/`onDeviceParams`, `initializeDeviceModel`
  with progress, `inferenceSource` badge per result, router with
  Remote Config limits, all four features single-turn so they run on
  both paths.
- **Design:** complete product (not a demo stub): bilingual UI, four
  tools, interactive flashcards + quiz with scoring, saved library,
  honest empty/error states, mobile-first layout.
- **Potential Impact:** Indonesian students on phones with costly
  data — on-device study help that works offline and costs nothing.
- **Quality of Idea:** the hybrid split is the point of the app, not
  an afterthought: short = private/offline/free on-device, long =
  cloud, and the user always sees which one answered.

## Submission checklist (for the Devpost step — NOT done here)

- [ ] Firebase project created, config pasted into `js/config.js`
- [ ] Live test in Chrome 139+ desktop: on-device + cloud badges seen
- [ ] Public GitHub repo with this code + MIT LICENSE (Apache also OK)
- [ ] Demo video < 3 min on YouTube (public, English or English subs)
- [ ] Devpost registration + submission with repo URL, video, description
- [ ] Project available free of charge; no secrets in the repo
