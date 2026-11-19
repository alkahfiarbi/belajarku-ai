// parse.js
//
// Pure parsers for model output.
//
// Models sometimes wrap JSON in ```json fences, add a sentence before or
// after it, or return a slightly damaged structure. These parsers are
// deliberately tolerant: they extract the first JSON value, validate each
// item, drop invalid items, and report warnings instead of failing the
// whole result. Everything here is unit-tested in scripts/test-logic.mjs.

// Extract the first JSON array or object found in `text`.
// Handles ```json fenced blocks, leading/trailing prose, and returns
// { ok: true, data } or { ok: false, error }.
export function extractJson(text) {
  const raw = String(text || '');
  // Prefer a fenced code block if one exists.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : raw;
  // Find the first '[' or '{' and the matching last ']' or '}'.
  const startBracket = candidate.indexOf('[');
  const startBrace = candidate.indexOf('{');
  let start = -1;
  let endChar = '';
  if (startBracket !== -1 && (startBrace === -1 || startBracket < startBrace)) {
    start = startBracket;
    endChar = ']';
  } else if (startBrace !== -1) {
    start = startBrace;
    endChar = '}';
  }
  if (start === -1) return { ok: false, error: 'no-json-found' };
  const end = candidate.lastIndexOf(endChar);
  if (end <= start) return { ok: false, error: 'no-json-found' };
  const jsonText = candidate.slice(start, end + 1);
  try {
    return { ok: true, data: JSON.parse(jsonText) };
  } catch (err) {
    return { ok: false, error: 'json-parse-error', detail: String(err.message || err) };
  }
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

// Parse flashcard output: an array of { q, a }.
// Returns { cards: [{q, a}], warnings: [string] }.
export function parseFlashcards(text, maxCount) {
  const extracted = extractJson(text);
  if (!extracted.ok) return { cards: [], warnings: ['no-valid-json'] };
  const arr = Array.isArray(extracted.data) ? extracted.data : [];
  const cards = [];
  const warnings = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') {
      warnings.push('skipped-non-object');
      continue;
    }
    if (!isNonEmptyString(item.q) || !isNonEmptyString(item.a)) {
      warnings.push('skipped-incomplete-card');
      continue;
    }
    cards.push({ q: item.q.trim(), a: item.a.trim() });
    if (cards.length >= maxCount) break;
  }
  if (arr.length > cards.length && warnings.length === 0) {
    warnings.push('some-cards-dropped');
  }
  if (cards.length === 0) warnings.push('no-usable-cards');
  return { cards, warnings };
}

// Normalize an answer value to an option index 0-3.
// Accepts a number, a numeric string, or a letter ("A"-"D", "a"-"d").
export function normalizeAnswerIndex(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3) {
    return value;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^[0-3]$/.test(s)) return Number(s);
    const letter = s.toUpperCase();
    if (/^[A-D]$/.test(letter)) return letter.charCodeAt(0) - 65;
  }
  return -1;
}

// Parse quiz output: an array of
// { question, options[4], answer (0-3), explanation }.
// Returns { questions: [...], warnings: [string] }.
export function parseQuiz(text, maxCount) {
  const extracted = extractJson(text);
  if (!extracted.ok) return { questions: [], warnings: ['no-valid-json'] };
  const arr = Array.isArray(extracted.data) ? extracted.data : [];
  const questions = [];
  const warnings = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') {
      warnings.push('skipped-non-object');
      continue;
    }
    const options = Array.isArray(item.options)
      ? item.options.filter(isNonEmptyString).map((o) => o.trim())
      : [];
    const answer = normalizeAnswerIndex(item.answer);
    if (!isNonEmptyString(item.question) || options.length !== 4 || answer === -1) {
      warnings.push('skipped-invalid-question');
      continue;
    }
    questions.push({
      question: item.question.trim(),
      options,
      answer,
      explanation: isNonEmptyString(item.explanation) ? item.explanation.trim() : '',
    });
    if (questions.length >= maxCount) break;
  }
  if (questions.length === 0) warnings.push('no-usable-questions');
  return { questions, warnings };
}

// Parse a summary in the shape requested by buildSummaryPrompt:
// bullet lines starting with "- " and one "Key terms:" line.
// Returns { bullets: [string], keyTerms: [string] }.
export function parseSummary(text) {
  const lines = String(text || '').split('\n');
  const bullets = [];
  const keyTerms = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const body = trimmed.slice(2).trim();
      if (body) bullets.push(body);
    } else if (/^key terms:/i.test(trimmed)) {
      const rest = trimmed.replace(/^key terms:/i, '').trim();
      for (const term of rest.split(',')) {
        const t = term.trim();
        if (t) keyTerms.push(t);
      }
    }
  }
  // Fallback: if the model ignored the format, treat each non-empty line
  // as a bullet so the student still sees the content.
  if (bullets.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !/^key terms:/i.test(trimmed)) bullets.push(trimmed);
    }
  }
  return { bullets, keyTerms };
}
