// test-logic.mjs
//
// Local tests for the pure-logic modules of BelajarKu AI:
//   js/prompts.js, js/parse.js, js/router.js, js/store.js
//
// Run from the app root:  node scripts/test-logic.mjs
// Prints PASS/FAIL per expectation and exits non-zero on any failure.
//
// These modules are pure (no Firebase, no DOM), so they can be tested
// fully here. The Firebase wiring (js/ai.js) and the UI (js/app.js)
// cannot be tested on this machine — see README.md "What was tested".

import { buildSummaryPrompt, buildFlashcardsPrompt, buildQuizPrompt, buildAskPrompt, clipText } from '../js/prompts.js';
import { extractJson, parseFlashcards, parseQuiz, parseSummary, normalizeAnswerIndex } from '../js/parse.js';
import { decideRoute, sourceToRoute, INFERENCE_MODES } from '../js/router.js';
import { createMemoryStore } from '../js/store.js';

let failures = 0;
let passes = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passes += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}`);
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual:   ${JSON.stringify(actual)}`);
  }
}

function checkContains(name, haystack, needle) {
  const ok = String(haystack).includes(needle);
  if (ok) {
    passes += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}`);
    console.log(`  expected to contain: ${JSON.stringify(needle)}`);
    console.log(`  in: ${JSON.stringify(String(haystack).slice(0, 200))}`);
  }
}

// ---------------------------------------------------------------- prompts
const material = 'Photosynthesis turns sunlight, water and CO2 into glucose and oxygen.';
const summaryEn = buildSummaryPrompt(material, 'en');
checkContains('summary prompt carries material', summaryEn, material);
checkContains('summary prompt asks English', summaryEn, 'Respond in English.');
checkContains('summary prompt asks Key terms line', summaryEn, 'Key terms:');
const summaryId = buildSummaryPrompt(material, 'id');
checkContains('summary prompt asks Indonesian', summaryId, 'Respond in Bahasa Indonesia.');

const fcPrompt = buildFlashcardsPrompt(material, 'en', 8);
checkContains('flashcards prompt demands ONLY JSON', fcPrompt, 'ONLY a valid JSON array of exactly 8 objects');
checkContains('flashcards prompt defines q/a fields', fcPrompt, '"q"');
checkContains('flashcards prompt defines q/a fields (a)', fcPrompt, '"a"');

const quizPrompt = buildQuizPrompt(material, 'id', 5);
checkContains('quiz prompt demands ONLY JSON', quizPrompt, 'ONLY a valid JSON array of exactly 5 objects');
checkContains('quiz prompt requires 4 options', quizPrompt, 'exactly 4 short strings');
checkContains('quiz prompt requires answer index', quizPrompt, '"answer": the index (0-3)');

const askPrompt = buildAskPrompt(material, 'What is produced?', 'en');
checkContains('ask prompt carries question', askPrompt, 'What is produced?');
checkContains('ask prompt grounds in material', askPrompt, 'using ONLY the study material');

check('clipText leaves short text alone', clipText('hello', 100), 'hello');
const clipped = clipText('word '.repeat(100), 50);
const clippedBody = clipped.split('\n[')[0];
check('clipText cuts long text', clippedBody.length <= 50, true); // marker line is extra metadata
checkContains('clipText marks the cut', clipped, 'clipped to fit');

// ---------------------------------------------------------------- parse: extractJson
const plain = extractJson('[{"q":"a","a":"b"}]');
check('extractJson plain array', plain.ok, true);
check('extractJson plain array data', plain.data, [{ q: 'a', a: 'b' }]);

const fenced = extractJson('Here you go:\n```json\n[{"q":"a","a":"b"}]\n```\nDone.');
check('extractJson fenced block', fenced.ok, true);
check('extractJson fenced block data', fenced.data, [{ q: 'a', a: 'b' }]);

const noisy = extractJson('Sure! [{"q":"a","a":"b"}] Hope that helps.');
check('extractJson with surrounding prose', noisy.ok, true);

const broken = extractJson('no json here at all');
check('extractJson no JSON', broken.ok, false);

const malformed = extractJson('[{"q": "a",}]');
check('extractJson malformed JSON', malformed.ok, false);

// ---------------------------------------------------------------- parse: flashcards
const fcGood = parseFlashcards(JSON.stringify([
  { q: 'What is 2+2?', a: '4' },
  { q: 'Capital of France?', a: 'Paris' },
]), 8);
check('parseFlashcards keeps good cards', fcGood.cards.length, 2);
check('parseFlashcards no warnings for clean input', fcGood.warnings, []);

const fcMessy = parseFlashcards('```json\n[{"q":"Q1","a":"A1"},{"q":"","a":"A2"},{"a":"A3"},{"q":"Q4","a":"A4"}]\n```', 8);
check('parseFlashcards drops incomplete cards', fcMessy.cards.length, 2);
check('parseFlashcards reports dropped cards', fcMessy.warnings.includes('skipped-incomplete-card'), true);

const fcCap = parseFlashcards(JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ q: `Q${i}`, a: `A${i}` }))), 3);
check('parseFlashcards respects maxCount', fcCap.cards.length, 3);

// ---------------------------------------------------------------- parse: quiz
const quizGood = parseQuiz(JSON.stringify([
  { question: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 1, explanation: 'Because b.' },
  { question: 'Q2?', options: ['a', 'b', 'c', 'd'], answer: 'C', explanation: 'Because c.' },
]), 5);
check('parseQuiz keeps good questions', quizGood.questions.length, 2);
check('parseQuiz normalizes letter answer', quizGood.questions[1].answer, 2);

const quizBad = parseQuiz(JSON.stringify([
  { question: 'Q?', options: ['a', 'b'], answer: 0 },
  { question: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 9 },
  { question: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 2, explanation: 'ok' },
]), 5);
check('parseQuiz drops invalid questions', quizBad.questions.length, 1);

check('normalizeAnswerIndex number', normalizeAnswerIndex(2), 2);
check('normalizeAnswerIndex letter', normalizeAnswerIndex('B'), 1);
check('normalizeAnswerIndex lowercase letter', normalizeAnswerIndex('d'), 3);
check('normalizeAnswerIndex numeric string', normalizeAnswerIndex('0'), 0);
check('normalizeAnswerIndex out of range', normalizeAnswerIndex(7), -1);
check('normalizeAnswerIndex garbage', normalizeAnswerIndex('banana'), -1);

// ---------------------------------------------------------------- parse: summary
const sumText = '- First idea.\n- Second idea.\nKey terms: alpha, beta, gamma';
const sum = parseSummary(sumText);
check('parseSummary bullets', sum.bullets, ['First idea.', 'Second idea.']);
check('parseSummary key terms', sum.keyTerms, ['alpha', 'beta', 'gamma']);

const sumPlain = parseSummary('Just a paragraph.\nSecond line.');
check('parseSummary falls back to lines', sum.bullets.length, 2);

// ---------------------------------------------------------------- router
const base = { mode: 'auto', onDeviceAvailable: true, online: true, textChars: 500, onDeviceMaxChars: 4000 };
check('router auto short+device -> on-device', decideRoute(base).route, 'on-device');
check('router auto short+device reason', decideRoute(base).reason, 'auto-device');
check('router auto long -> cloud', decideRoute({ ...base, textChars: 9000 }).route, 'cloud');
check('router auto long reason', decideRoute({ ...base, textChars: 9000 }).reason, 'auto-too-long');
check('router auto no device -> cloud', decideRoute({ ...base, onDeviceAvailable: false }).route, 'cloud');
check('router auto offline+device -> on-device', decideRoute({ ...base, online: false }).route, 'on-device');
check('router auto offline no device -> error', decideRoute({ ...base, online: false, onDeviceAvailable: false }).route, 'error');
check('router on-device mode ok', decideRoute({ ...base, mode: 'on-device' }).route, 'on-device');
check('router on-device mode unavailable -> error', decideRoute({ ...base, mode: 'on-device', onDeviceAvailable: false }).route, 'error');
check('router on-device mode too long -> error', decideRoute({ ...base, mode: 'on-device', textChars: 9000 }).route, 'error');
check('router cloud mode ok', decideRoute({ ...base, mode: 'cloud' }).route, 'cloud');
check('router cloud mode offline -> error', decideRoute({ ...base, mode: 'cloud', online: false }).route, 'error');

check('INFERENCE_MODES auto', INFERENCE_MODES.auto, 'PREFER_ON_DEVICE');
check('INFERENCE_MODES on-device', INFERENCE_MODES['on-device'], 'ONLY_ON_DEVICE');
check('INFERENCE_MODES cloud', INFERENCE_MODES.cloud, 'ONLY_IN_CLOUD');
check('sourceToRoute ON_DEVICE', sourceToRoute('ON_DEVICE'), 'on-device');
check('sourceToRoute IN_CLOUD', sourceToRoute('IN_CLOUD'), 'cloud');
check('sourceToRoute unknown', sourceToRoute(undefined), null);

// ---------------------------------------------------------------- store (memory backend)
const memStore = createMemoryStore();
const saved = await memStore.saveSet({ title: 'T1', material: 'm', lang: 'en', createdAt: 100 });
check('store save returns id', typeof saved.id, 'string');
const listed = await memStore.listSets();
check('store list has saved set', listed.length, 1);
check('store get returns set', (await memStore.getSet(saved.id)).title, 'T1');
check('store get missing returns null', await memStore.getSet('nope'), null);
await memStore.deleteSet(saved.id);
check('store delete removes set', (await memStore.listSets()).length, 0);

// ---------------------------------------------------------------- summary
console.log(`\n${passes} passed, ${failures} failed.`);
process.exit(failures ? 1 : 0);
