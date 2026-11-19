// ai.js
//
// Firebase wiring for BelajarKu AI — the ONLY module that talks to
// Firebase. Everything else in the app is pure logic and is unit-tested.
//
// Firebase products used (all required or encouraged by the hackathon):
//   - AI Logic (hybrid inference) — the core of the app. getAI +
//     getGenerativeModel with an InferenceMode, generateContent(), and
//     response.inferenceSource to show which path answered.
//   - App Check — enforced by the AI Logic setup workflow. Localhost uses
//     the debug provider; the hosted demo uses reCAPTCHA v3.
//   - Authentication — anonymous sign-in, so saved sets belong to a user.
//   - Firestore — saved study sets (see store.js).
//   - Remote Config — routing thresholds (see config.js defaults).
//
// The module loads the Firebase SDKs lazily (dynamic import) so the page
// still renders fully when Firebase is not configured yet — in that case
// init() resolves { status: 'not-configured' } and the UI shows the demo
// banner instead of throwing.

import {
  firebaseConfig,
  RECAPTCHA_V3_SITE_KEY,
  isFirebaseConfigured,
  CLOUD_MODEL,
  REMOTE_CONFIG_DEFAULTS,
} from './config.js';
import { INFERENCE_MODES } from './router.js';

// --- Module state -------------------------------------------------------
let firebaseApp = null;
let ai = null;
let auth = null;
let db = null;
let remoteConfig = null;
let remoteValues = { ...REMOTE_CONFIG_DEFAULTS };
let modelCache = {}; // mode -> GenerativeModel

export function getRemoteValue(key) {
  return remoteValues[key] !== undefined ? remoteValues[key] : REMOTE_CONFIG_DEFAULTS[key];
}

export function isConfigured() {
  return isFirebaseConfigured() && firebaseApp !== null;
}

// --- On-device availability probe ---------------------------------------
// Uses the Chrome Prompt API directly. Returns one of:
// 'available' | 'downloading' | 'downloadable' | 'unavailable' | 'unsupported'
export async function probeOnDevice() {
  try {
    const LM = globalThis.LanguageModel;
    if (!LM || typeof LM.availability !== 'function') return 'unsupported';
    const status = await LM.availability();
    if (status === 'available') return 'available';
    if (status === 'downloading') return 'downloading';
    if (status === 'downloadable') return 'downloadable';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

// --- Init ---------------------------------------------------------------
// Returns { status: 'ready' } or { status: 'not-configured' }.
// Never throws for a missing config — the UI handles the demo state.
export async function init() {
  if (!isFirebaseConfigured()) return { status: 'not-configured' };
  if (firebaseApp) return { status: 'ready' };

  const { initializeApp } = await import('firebase/app');
  const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
  const { getAuth } = await import('firebase/auth');
  const { getFirestore } = await import('firebase/firestore');
  const { getRemoteConfig, fetchAndActivate } = await import('firebase/remote-config');
  const { getAI, GoogleAIBackend } = await import('firebase/ai');

  firebaseApp = initializeApp(firebaseConfig);

  // App Check: the debug provider is enabled on localhost by setting
  // FIREBASE_APPCHECK_DEBUG_TOKEN *before* initializeAppCheck — the SDK
  // then uses the debug provider instead of reCAPTCHA. The debug token
  // is printed to the browser console; register it in the Firebase
  // console under App Check > Manage debug tokens. In production the
  // reCAPTCHA v3 provider below is used.
  const isLocalhost =
    globalThis.location &&
    (globalThis.location.hostname === 'localhost' ||
      globalThis.location.hostname === '127.0.0.1');
  if (isLocalhost) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });

  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

  // Remote Config with built-in defaults (works even if the fetch fails).
  try {
    remoteConfig = getRemoteConfig(firebaseApp);
    remoteConfig.settings = { minimumFetchIntervalMillis: 3600000 };
    remoteConfig.defaultConfig = Object.fromEntries(
      Object.entries(REMOTE_CONFIG_DEFAULTS).map(([k, v]) => [k, String(v)]),
    );
    await fetchAndActivate(remoteConfig);
    for (const key of Object.keys(REMOTE_CONFIG_DEFAULTS)) {
      const raw = remoteConfig.getValue(key).asString();
      const def = REMOTE_CONFIG_DEFAULTS[key];
      remoteValues[key] = typeof def === 'number' ? Number(raw) || def : raw || def;
    }
  } catch {
    // Keep defaults; Remote Config is optional.
  }

  return { status: 'ready' };
}

// --- Auth ---------------------------------------------------------------
export async function signInAnonymously() {
  const { signInAnonymously } = await import('firebase/auth');
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export function currentUser() {
  return auth ? auth.currentUser : null;
}

export function getDb() {
  return db;
}

// --- Hybrid model -------------------------------------------------------
// One GenerativeModel per inference mode, cached. The cloud fallback model
// is set explicitly so the demo badge always names a real model.
async function getModel(mode) {
  if (modelCache[mode]) return modelCache[mode];
  const { getGenerativeModel, InferenceMode } = await import('firebase/ai');
  const firebaseMode = InferenceMode[INFERENCE_MODES[mode]];
  const model = getGenerativeModel(ai, {
    mode: firebaseMode,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: { maxOutputTokens: 2048 },
    },
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: 'text', languages: ['en', 'id'] }],
        expectedOutputs: [{ type: 'text', languages: ['en', 'id'] }],
        initialPrompts: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                value: 'You are BelajarKu, a patient study tutor. Answer briefly and factually.',
              },
            ],
          },
        ],
      },
    },
  });
  modelCache[mode] = model;
  return model;
}

// --- Prepare the on-device model ---------------------------------------
// Starts (or resumes) the on-device model download without sending a
// prompt. Call from a user gesture (button click). `onProgress` receives
// the download fraction (0..1). Resolves when the model is ready.
export async function prepareDeviceModel(onProgress) {
  const model = await getModel('auto');
  await model.initializeDeviceModel((fraction) => {
    if (typeof onProgress === 'function') onProgress(fraction);
  });
}

// --- Run one single-turn request ----------------------------------------
// `onProgress` receives the on-device model download fraction (0..1)
// while initializeDeviceModel runs. Must be called from a user gesture
// (all calls in the UI come from button clicks).
//
// Returns { text, inferenceSource } where inferenceSource is
// 'ON_DEVICE' | 'IN_CLOUD' (or null if the SDK did not report it).
export async function runInference({ prompt, mode, onProgress }) {
  const model = await getModel(mode);
  if (mode !== 'cloud') {
    // Starts (or resumes) the on-device model download. Safe to call
    // even when the model is already available.
    try {
      await model.initializeDeviceModel((fraction) => {
        if (typeof onProgress === 'function') onProgress(fraction);
      });
    } catch (err) {
      // Download/init failure: PREFER_ON_DEVICE still falls back to the
      // cloud inside generateContent; ONLY_ON_DEVICE surfaces the error.
      if (mode === 'on-device') throw err;
    }
  }
  const result = await model.generateContent(prompt);
  const response = result.response;
  return {
    text: response.text(),
    inferenceSource: response.inferenceSource || null,
  };
}

// Firestore helper functions, re-exported for store.js so the UI only
// ever imports from this module.
export async function firestoreFns() {
  return await import('firebase/firestore');
}
