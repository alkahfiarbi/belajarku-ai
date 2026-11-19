// router.js
//
// Pure hybrid-routing decisions for BelajarKu AI.
//
// The Firebase AI Logic SDK itself performs the actual fallback
// (PREFER_ON_DEVICE tries the on-device model, then the cloud model).
// This module decides, BEFORE the call, which route the app *asks* for
// and what the UI should tell the student — so the route badge is honest
// and the app can refuse gracefully instead of failing mysteriously.
//
// Inputs:
//   mode: 'auto' | 'on-device' | 'cloud'  (user's choice; 'auto' is default)
//   onDeviceAvailable: boolean — Chrome Prompt API reports the local
//     model as downloaded and ready (probed in ai.js).
//   online: boolean — navigator.onLine at call time.
//   textChars: number — length of the material being sent.
//   onDeviceMaxChars: number — Remote Config value; material longer than
//     this goes to the cloud even when the local model is available
//     (long context is where the cloud model is clearly better).
//
// Output: { route: 'on-device' | 'cloud', reason: string, model: string }
//   or { route: 'error', reason: string } when no route can serve the
//   request. `reason` is a short machine-readable code; the UI maps it
//   to a human sentence via i18n.

export const INFERENCE_MODES = {
  // mode the user picks -> Firebase InferenceMode name
  auto: 'PREFER_ON_DEVICE',
  'on-device': 'ONLY_ON_DEVICE',
  cloud: 'ONLY_IN_CLOUD',
};

export const ROUTE_MODELS = {
  'on-device': 'Gemini Nano',
  cloud: 'gemini-3.5-flash-lite',
};

export function decideRoute({ mode, onDeviceAvailable, online, textChars, onDeviceMaxChars }) {
  const tooLongForDevice = textChars > onDeviceMaxChars;

  if (mode === 'on-device') {
    if (!onDeviceAvailable) {
      return { route: 'error', reason: 'on-device-unavailable' };
    }
    if (tooLongForDevice) {
      return { route: 'error', reason: 'too-long-for-device' };
    }
    return { route: 'on-device', reason: 'mode-on-device', model: ROUTE_MODELS['on-device'] };
  }

  if (mode === 'cloud') {
    if (!online) {
      return { route: 'error', reason: 'offline-no-cloud' };
    }
    return { route: 'cloud', reason: 'mode-cloud', model: ROUTE_MODELS.cloud };
  }

  // mode === 'auto' (PREFER_ON_DEVICE): on-device first, cloud fallback.
  if (!online) {
    // Offline: only the on-device model can possibly answer.
    if (!onDeviceAvailable) {
      return { route: 'error', reason: 'offline-no-device' };
    }
    if (tooLongForDevice) {
      return { route: 'error', reason: 'too-long-for-device' };
    }
    return { route: 'on-device', reason: 'offline-device', model: ROUTE_MODELS['on-device'] };
  }
  if (onDeviceAvailable && !tooLongForDevice) {
    return { route: 'on-device', reason: 'auto-device', model: ROUTE_MODELS['on-device'] };
  }
  if (onDeviceAvailable && tooLongForDevice) {
    return { route: 'cloud', reason: 'auto-too-long', model: ROUTE_MODELS.cloud };
  }
  return { route: 'cloud', reason: 'auto-no-device', model: ROUTE_MODELS.cloud };
}

// Map the SDK's `inferenceSource` response property to our route names.
// The SDK returns 'ON_DEVICE' or 'IN_CLOUD' (or undefined on old SDKs).
export function sourceToRoute(inferenceSource) {
  if (inferenceSource === 'ON_DEVICE') return 'on-device';
  if (inferenceSource === 'IN_CLOUD') return 'cloud';
  return null;
}
