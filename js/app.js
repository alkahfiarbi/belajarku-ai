// app.js
//
// UI wiring for BelajarKu AI. All Firebase calls go through ai.js; all
// decisions, prompts and parsing go through the pure modules (router.js,
// prompts.js, parse.js, store.js), which are unit-tested in Node.

import { isFirebaseConfigured, LOCAL_LANG_KEY, LOCAL_MODE_KEY, LOCAL_SETS_KEY } from './config.js';
import { t } from './i18n.js';
import { buildSummaryPrompt, buildFlashcardsPrompt, buildQuizPrompt, buildAskPrompt, clipText } from './prompts.js';
import { parseSummary, parseFlashcards, parseQuiz } from './parse.js';
import { decideRoute, sourceToRoute, ROUTE_MODELS } from './router.js';
import { createLocalStore, createMemoryStore, createFirestoreStore } from './store.js';
import * as ai from './ai.js';

// --- State ---------------------------------------------------------------
let lang = 'en';
let mode = 'auto';
let deviceStatus = 'checking'; // checking|available|downloading|downloadable|unavailable|unsupported
let deviceAvailable = false;
let store = null;
let currentTool = 'summary';
let flashState = null; // { cards, index, known:Set, unknown:Set }
let quizState = null; // { questions, index, score, picked, revealed }
let lastResults = {}; // tool -> { route, data } for "Save set"

// --- DOM helpers ---------------------------------------------------------
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
function showError(msg) {
  const box = $('error-box');
  box.textContent = msg;
  box.hidden = false;
}
function clearError() {
  $('error-box').hidden = true;
  $('error-box').textContent = '';
}
function setBusy(busy, label) {
  const btn = $('run-btn');
  btn.disabled = busy;
  btn.textContent = busy ? (label || '…') : t('action.run', lang);
}

// --- i18n ------------------------------------------------------------------
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((n) => {
    n.textContent = t(n.dataset.i18n, lang);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((n) => {
    n.placeholder = t(n.dataset.i18nPlaceholder, lang);
  });
  $('lang-toggle').textContent = lang === 'en' ? 'ID' : 'EN';
  try {
    localStorage.setItem(LOCAL_LANG_KEY, lang);
  } catch { /* ignore */ }
}

// --- Status bar ------------------------------------------------------------
function renderStatus() {
  const fb = $('status-firebase');
  fb.textContent = isFirebaseConfigured()
    ? t('status.firebase-ok', lang)
    : t('status.firebase-missing', lang);
  fb.className = 'status-pill ' + (isFirebaseConfigured() ? 'ok' : 'warn');

  const dev = $('status-device');
  dev.textContent = t(`status.device-${deviceStatus}`, lang);
  dev.className = 'status-pill ' + (deviceAvailable ? 'ok' : 'muted');

  const auth = $('status-auth');
  const user = ai.currentUser();
  auth.textContent = user ? t('status.signed-in-anon', lang) : t('status.signed-out', lang);
  auth.className = 'status-pill ' + (user ? 'ok' : 'muted');
  $('sign-in-btn').hidden = Boolean(user) || !isFirebaseConfigured();
}

// --- Route badge -----------------------------------------------------------
function routeBadge(route, reason) {
  const badge = el('div', 'route-badge ' + route);
  const title = el('strong', '', route === 'on-device' ? t('badge.on-device', lang) : t('badge.cloud', lang));
  const why = el('span', 'route-why', t(`route.${reason}`, lang));
  badge.append(title, why);
  return badge;
}

// --- Material ---------------------------------------------------------------
function getMaterial() {
  return $('material').value.trim();
}
function charCount() {
  const n = getMaterial().length;
  $('char-count').textContent = `${n} chars`;
}

// --- Run pipeline ------------------------------------------------------------
// Shared by all four tools: route -> prompt -> inference -> parse -> render.
async function runTool(tool, buildPrompt, parseFn) {
  clearError();
  const material = getMaterial();
  if (!material) {
    showError(t('error.no-material', lang));
    return;
  }
  if (!ai.isConfigured()) {
    showError(t('error.firebase-missing', lang));
    return;
  }
  const maxChars = Number(ai.getRemoteValue('on_device_max_chars')) || 4000;
  const decision = decideRoute({
    mode,
    onDeviceAvailable: deviceAvailable,
    online: navigator.onLine,
    textChars: material.length,
    onDeviceMaxChars: maxChars,
  });
  if (decision.route === 'error') {
    showError(t(`route.${decision.reason}`, lang));
    return;
  }
  const prompt = buildPrompt(tool === 'ask' ? clipText(material, maxChars * 2) : material);
  setBusy(true, '…');
  try {
    const { text, inferenceSource } = await ai.runInference({
      prompt,
      mode,
      onProgress: (f) => {
        $('progress-note').textContent = `Downloading on-device model: ${Math.round(f * 100)}%`;
      },
    });
    $('progress-note').textContent = '';
    // Trust the SDK's report of which path answered; fall back to the
    // route we asked for when the SDK stays silent (old SDK versions).
    const actualRoute = sourceToRoute(inferenceSource) || decision.route;
    const parsed = parseFn(text);
    lastResults[tool] = { route: actualRoute, data: parsed, raw: text };
    renderResult(tool, actualRoute, decision.reason, parsed, text);
  } catch (err) {
    console.error(err);
    showError(t('error.ai-failed', lang));
  } finally {
    setBusy(false);
  }
}

// --- Result renderers ---------------------------------------------------------
function renderResult(tool, route, reason, parsed, rawText) {
  const area = $('result-area');
  area.innerHTML = '';
  area.append(routeBadge(route, reason));
  if (tool === 'summary') renderSummary(area, parsed);
  if (tool === 'flashcards') renderFlashcards(area, parsed);
  if (tool === 'quiz') renderQuiz(area, parsed);
  if (tool === 'ask') {
    const p = el('p', 'answer-text', rawText);
    area.append(p);
  }
  $('save-set-btn').hidden = false;
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderSummary(area, parsed) {
  if (parsed.bullets.length === 0 && parsed.keyTerms.length === 0) {
    area.append(el('p', '', ''));
    return;
  }
  const ul = el('ul', 'summary-list');
  for (const b of parsed.bullets) ul.append(el('li', '', b));
  area.append(ul);
  if (parsed.keyTerms.length) {
    const box = el('div', 'key-terms');
    box.append(el('strong', '', t('label.key-terms', lang) + ': '));
    box.append(document.createTextNode(parsed.keyTerms.join(', ')));
    area.append(box);
  }
}

function renderFlashcards(area, parsed) {
  if (!parsed.cards.length) {
    showError(t('error.no-cards', lang));
    return;
  }
  flashState = { cards: parsed.cards, index: 0, known: new Set(), unknown: new Set(), flipped: false };
  const wrap = el('div', 'flash-wrap');
  const card = el('div', 'flash-card');
  card.id = 'flash-card';
  card.addEventListener('click', () => {
    flashState.flipped = !flashState.flipped;
    drawFlashCard();
  });
  const nav = el('div', 'flash-nav');
  const prev = el('button', 'btn secondary', '←');
  const next = el('button', 'btn secondary', '→');
  const count = el('span', 'flash-count');
  const knownBtn = el('button', 'btn secondary', t('label.known', lang));
  const unknownBtn = el('button', 'btn secondary', t('label.unknown', lang));
  prev.addEventListener('click', () => { flashState.index = (flashState.index - 1 + flashState.cards.length) % flashState.cards.length; flashState.flipped = false; drawFlashCard(); });
  next.addEventListener('click', () => { flashState.index = (flashState.index + 1) % flashState.cards.length; flashState.flipped = false; drawFlashCard(); });
  knownBtn.addEventListener('click', () => { flashState.known.add(flashState.index); flashState.unknown.delete(flashState.index); drawFlashCard(); });
  unknownBtn.addEventListener('click', () => { flashState.unknown.add(flashState.index); flashState.known.delete(flashState.index); drawFlashCard(); });
  nav.append(prev, count, next, knownBtn, unknownBtn);
  wrap.append(card, el('p', 'hint', t('label.flip', lang)), nav);
  area.append(wrap);
  function drawFlashCard() {
    const c = flashState.cards[flashState.index];
    card.textContent = flashState.flipped ? c.a : c.q;
    card.classList.toggle('flipped', flashState.flipped);
    count.textContent = `${flashState.index + 1} / ${flashState.cards.length} · ✓ ${flashState.known.size} · … ${flashState.unknown.size}`;
  }
  drawFlashCard();
  // Keep drawFlashCard reachable for the buttons above.
  wrap._draw = drawFlashCard;
}

function renderQuiz(area, parsed) {
  if (!parsed.questions.length) {
    showError(t('error.no-questions', lang));
    return;
  }
  quizState = { questions: parsed.questions, index: 0, score: 0, picked: -1, revealed: false };
  const wrap = el('div', 'quiz-wrap');
  area.append(wrap);
  drawQuizQuestion(wrap);
}

function drawQuizQuestion(wrap) {
  wrap.innerHTML = '';
  const q = quizState.questions[quizState.index];
  const head = el('div', 'quiz-head');
  head.append(el('span', '', `${t('tool.quiz', lang)} ${quizState.index + 1}/${quizState.questions.length}`));
  head.append(el('span', '', `${t('label.score', lang)}: ${quizState.score}`));
  wrap.append(head);
  wrap.append(el('p', 'quiz-q', q.question));
  const opts = el('div', 'quiz-opts');
  q.options.forEach((opt, i) => {
    const b = el('button', 'quiz-opt', `${'ABCD'[i]}. ${opt}`);
    b.disabled = quizState.revealed;
    if (quizState.revealed) {
      if (i === q.answer) b.classList.add('correct');
      else if (i === quizState.picked) b.classList.add('wrong');
    }
    b.addEventListener('click', () => {
      quizState.picked = i;
      quizState.revealed = true;
      if (i === q.answer) quizState.score += 1;
      drawQuizQuestion(wrap);
    });
    opts.append(b);
  });
  wrap.append(opts);
  if (quizState.revealed) {
    const fb = el('div', 'quiz-feedback');
    fb.append(el('strong', '', quizState.picked === q.answer ? t('label.correct', lang) : t('label.wrong', lang) + ' ' + q.options[q.answer]));
    if (q.explanation) fb.append(el('p', '', `${t('label.why', lang)} ${q.explanation}`));
    wrap.append(fb);
    const nextBtn = el('button', 'btn', quizState.index + 1 < quizState.questions.length ? t('label.next', lang) : t('label.score', lang));
    nextBtn.addEventListener('click', () => {
      quizState.index += 1;
      quizState.picked = -1;
      quizState.revealed = false;
      if (quizState.index >= quizState.questions.length) {
        wrap.innerHTML = '';
        wrap.append(el('h3', '', `${t('label.score', lang)}: ${quizState.score} / ${quizState.questions.length}`));
        const again = el('button', 'btn secondary', t('label.restart-quiz', lang));
        again.addEventListener('click', () => {
          quizState = { ...quizState, index: 0, score: 0, picked: -1, revealed: false };
          drawQuizQuestion(wrap);
        });
        wrap.append(again);
      } else {
        drawQuizQuestion(wrap);
      }
    });
    wrap.append(nextBtn);
  }
}

// --- Tool switching ---------------------------------------------------------
function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
  $('ask-row').hidden = tool !== 'ask';
  $('result-area').innerHTML = '';
  $('save-set-btn').hidden = true;
  clearError();
}

// --- Library (saved sets) ---------------------------------------------------
async function refreshLibrary() {
  const list = $('sets-list');
  list.innerHTML = '';
  const sets = await store.listSets();
  if (!sets.length) {
    list.append(el('p', 'muted', t('label.no-saved-sets', lang)));
    return;
  }
  for (const s of sets) {
    const row = el('div', 'set-row');
    row.append(el('span', 'set-title', s.title || 'Untitled'));
    const open = el('button', 'btn secondary small', t('label.open', lang));
    open.addEventListener('click', async () => {
      const full = await store.getSet(s.id);
      if (full) {
        $('material').value = full.material || '';
        charCount();
        if (full.lang) { lang = full.lang; applyLang(); }
      }
    });
    const del = el('button', 'btn secondary small', t('label.delete', lang));
    del.addEventListener('click', async () => {
      await store.deleteSet(s.id);
      refreshLibrary();
    });
    row.append(open, del);
    list.append(row);
  }
}

async function saveCurrentSet() {
  const material = getMaterial();
  if (!material) return;
  const title = material.split('\n').find((l) => l.trim())?.slice(0, 60) || 'Study set';
  await store.saveSet({
    title,
    material,
    lang,
    createdAt: Date.now(),
    results: Object.fromEntries(
      Object.entries(lastResults).map(([k, v]) => [k, { route: v.route, data: v.data }]),
    ),
  });
  refreshLibrary();
}

// --- Samples ------------------------------------------------------------------
async function loadSample(which) {
  try {
    const res = await fetch(`samples/sample-${which}.txt`);
    const text = await res.text();
    $('material').value = text;
    lang = which === 'id' ? 'id' : 'en';
    applyLang();
    charCount();
  } catch {
    showError('Could not load the sample file.');
  }
}

// --- Boot ----------------------------------------------------------------------
async function boot() {
  // Language + mode from previous visit.
  try {
    const savedLang = localStorage.getItem(LOCAL_LANG_KEY);
    if (savedLang === 'id' || savedLang === 'en') lang = savedLang;
    const savedMode = localStorage.getItem(LOCAL_MODE_KEY);
    if (['auto', 'on-device', 'cloud'].includes(savedMode)) mode = savedMode;
  } catch { /* ignore */ }
  $('mode-select').value = mode;
  applyLang();

  // Storage: Firestore when signed in, otherwise local storage.
  store = createLocalStore(localStorage, LOCAL_SETS_KEY);

  // Wire controls.
  $('lang-toggle').addEventListener('click', () => {
    lang = lang === 'en' ? 'id' : 'en';
    applyLang();
    renderStatus();
    refreshLibrary();
  });
  $('mode-select').addEventListener('change', (e) => {
    mode = e.target.value;
    try { localStorage.setItem(LOCAL_MODE_KEY, mode); } catch { /* ignore */ }
  });
  $('material').addEventListener('input', charCount);
  $('sample-id-btn').addEventListener('click', () => loadSample('id'));
  $('sample-en-btn').addEventListener('click', () => loadSample('en'));
  document.querySelectorAll('.tool-tab').forEach((b) => {
    b.addEventListener('click', () => setTool(b.dataset.tool));
  });
  $('run-btn').addEventListener('click', () => {
    const tool = currentTool;
    if (tool === 'summary') {
      runTool(tool, (m) => buildSummaryPrompt(m, lang), (txt) => parseSummary(txt));
    } else if (tool === 'flashcards') {
      const count = Number(ai.getRemoteValue('flashcard_count')) || 8;
      runTool(tool, (m) => buildFlashcardsPrompt(m, lang, count), (txt) => parseFlashcards(txt, count));
    } else if (tool === 'quiz') {
      const count = Number(ai.getRemoteValue('quiz_count')) || 5;
      runTool(tool, (m) => buildQuizPrompt(m, lang, count), (txt) => parseQuiz(txt, count));
    } else if (tool === 'ask') {
      const q = $('question').value.trim();
      if (!q) { showError(t('error.no-question', lang)); return; }
      runTool(tool, (m) => buildAskPrompt(m, q, lang), (txt) => txt);
    }
  });
  $('prepare-btn').addEventListener('click', async () => {
    if (!ai.isConfigured()) { showError(t('error.firebase-missing', lang)); return; }
    $('prepare-btn').disabled = true;
    try {
      await ai.prepareDeviceModel((f) => {
        $('progress-note').textContent = `Downloading on-device model: ${Math.round(f * 100)}%`;
      });
      $('progress-note').textContent = '';
      const s = await ai.probeOnDevice();
      deviceStatus = s;
      deviceAvailable = s === 'available';
      renderStatus();
    } catch (err) {
      console.error(err);
      showError(t('error.ai-failed', lang));
    } finally {
      $('prepare-btn').disabled = false;
    }
  });
  $('sign-in-btn').addEventListener('click', async () => {
    try {
      const user = await ai.signInAnonymously();
      const fns = await ai.firestoreFns();
      store = createFirestoreStore(ai.getDb(), fns, user.uid);
      renderStatus();
      refreshLibrary();
    } catch (err) {
      console.error(err);
      showError(t('error.ai-failed', lang));
    }
  });
  $('save-set-btn').addEventListener('click', saveCurrentSet);

  // Firebase init (graceful when not configured).
  const initResult = await ai.init();
  if (initResult.status === 'ready') {
    const user = ai.currentUser();
    if (user) {
      const fns = await ai.firestoreFns();
      store = createFirestoreStore(ai.getDb(), fns, user.uid);
    }
  }

  // On-device probe (independent of Firebase).
  deviceStatus = await ai.probeOnDevice();
  deviceAvailable = deviceStatus === 'available';
  renderStatus();
  refreshLibrary();
  charCount();
}

document.addEventListener('DOMContentLoaded', boot);
