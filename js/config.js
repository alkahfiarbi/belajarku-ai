// config.js
//
// Central configuration for BelajarKu AI.
//
// HOW TO CONNECT FIREBASE (do this before the demo):
//   1. Create a Firebase project at https://console.firebase.google.com
//   2. In the console go to AI Services > AI Logic > Get started and choose
//      the "Gemini Developer API" provider (free tier covers text inference).
//   3. Enable Anonymous sign-in: Build > Authentication > Sign-in method.
//   4. Create a Firestore database (production mode) and add the rules from
//      README.md. Create a Remote Config with the keys listed in README.md
//      (optional — the app ships with defaults for every key).
//   5. Register a Web App in Project settings and paste its firebaseConfig
//      below, replacing every "YOUR_..." placeholder value.
//   6. App Check: the AI Logic setup workflow enforces App Check. For local
//      development use the debug provider (see ai.js); for the hosted demo
//      register a reCAPTCHA v3 site key and put it in RECAPTCHA_V3_SITE_KEY.
//
// SECURITY: firebaseConfig values (apiKey etc.) are public client
// identifiers, NOT secrets — but never paste a Gemini API key, service
// account key, or any private key anywhere in this repo.

// Firebase web app config — project "belajarku-ai", created 2026-11-19
// in the user's Google account. These are public client identifiers
// (not secrets), per Firebase docs.
export const firebaseConfig = {
  apiKey: 'AIzaSyCTZAwCZa0zgYgxLS_6rTwWCJLif36vEpo',
  authDomain: 'belajarku-ai.firebaseapp.com',
  projectId: 'belajarku-ai',
  storageBucket: 'belajarku-ai.firebasestorage.app',
  messagingSenderId: '1067622479431',
  appId: '1:1067622479431:web:6e71fa4fa1ef26348b6362',
};

// reCAPTCHA v3 site key for App Check in production (hosted demo).
// Leave as the placeholder for local development (debug provider is used).
export const RECAPTCHA_V3_SITE_KEY = 'YOUR_RECAPTCHA_V3_SITE_KEY';

// True when a real Firebase config has been pasted in (used by the UI to
// show the "Demo mode — connect Firebase" banner instead of failing).
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      !firebaseConfig.apiKey.startsWith('YOUR_') &&
      firebaseConfig.projectId &&
      !firebaseConfig.projectId.startsWith('YOUR_'),
  );
}

// Cloud model used as the fallback / cloud path of hybrid inference.
// The default fallback in SDK v13 is gemini-3.5-flash-lite; we pin an
// explicit model so the demo badge always names a real model.
export const CLOUD_MODEL = 'gemini-3.5-flash-lite';

// On-device model label shown in the UI (Chrome's Prompt API / Gemini Nano).
export const ON_DEVICE_MODEL_LABEL = 'Gemini Nano';

// Firebase JS SDK version pinned in the import map (index.html).
// v13.4.0: hybrid inference + `inferenceSource`, and the first version
// with `model.initializeDeviceModel()` (absent from v12.5.0).
export const FIREBASE_SDK_VERSION = '13.4.0';

// Remote Config keys and their built-in defaults. The app works fully
// without Remote Config; these values are only overridden when a
// Remote Config is actually fetched.
export const REMOTE_CONFIG_DEFAULTS = {
  // Max material length (characters) the router sends to the on-device
  // model. Longer material goes to the cloud (better quality on long text).
  on_device_max_chars: 4000,
  // Default inference mode: "auto" | "on-device" | "cloud".
  default_mode: 'auto',
  // How many flashcards / quiz questions to generate per run.
  flashcard_count: 8,
  quiz_count: 5,
};

// Local-storage keys used when Firestore is unavailable.
export const LOCAL_SETS_KEY = 'belajarku.sets.v1';
export const LOCAL_LANG_KEY = 'belajarku.lang';
export const LOCAL_MODE_KEY = 'belajarku.mode';
