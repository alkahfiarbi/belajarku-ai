// prompts.js
//
// Pure prompt builders for BelajarKu AI.
//
// Every AI feature in the app is a SINGLE-TURN text generation request.
// That is deliberate: on-device inference (Chrome Prompt API / Gemini Nano)
// only supports single-turn text generation, not multi-turn chat. By
// keeping every feature single-turn, the same prompt runs unchanged on
// the on-device model and on the cloud model — the hybrid SDK just picks
// the route. The Q&A feature ("Ask") is therefore one question per
// request, with the study material included as context each time.
//
// JSON features (flashcards, quiz) ask the model for ONLY valid JSON and
// the client validates the result (see parse.js). We do NOT rely on
// generationConfig.responseSchema, because schema support differs between
// the on-device and cloud paths in hybrid mode; prompt + client-side
// validation behaves identically on both paths.

// Clip text to a maximum number of characters, cutting at a word
// boundary when possible and marking the cut.
export function clipText(text, maxChars) {
  const clean = String(text || '').trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  const clipped = (lastSpace > maxChars * 0.8 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return clipped + '\n[...material clipped to fit the on-device limit...]';
}

// Language instruction inserted into every prompt.
function langLine(lang) {
  return lang === 'id'
    ? 'Respond in Bahasa Indonesia.'
    : 'Respond in English.';
}

// ---- Summary ----------------------------------------------------------
// Ask for a short bullet summary plus a "Key terms" line. The parser
// (parse.js) understands this exact shape.
export function buildSummaryPrompt(material, lang) {
  return [
    'You are a patient study tutor. Summarize the study material below so a student can revise it quickly.',
    langLine(lang),
    'Format your answer exactly like this:',
    '- one bullet per key idea (5 to 8 bullets, each one sentence)',
    '- then one line starting with "Key terms:" followed by up to 8 important terms, comma-separated',
    'Keep the whole answer short. Do not add anything outside that format.',
    '',
    'Study material:',
    material,
  ].join('\n');
}

// ---- Flashcards -------------------------------------------------------
// Ask for ONLY a JSON array of { q, a } objects. No prose around it.
export function buildFlashcardsPrompt(material, lang, count) {
  return [
    'You are a patient study tutor. Create flashcards from the study material below.',
    langLine(lang),
    `Respond with ONLY a valid JSON array of exactly ${count} objects. No markdown fences, no extra text.`,
    'Each object must have exactly these two string fields:',
    '  "q": a short question a student can answer from the material,',
    '  "a": a short answer, one or two sentences.',
    'Cover different parts of the material. Keep questions and answers short and factual.',
    '',
    'Study material:',
    material,
  ].join('\n');
}

// ---- Quiz -------------------------------------------------------------
// Ask for ONLY a JSON array of multiple-choice questions.
export function buildQuizPrompt(material, lang, count) {
  return [
    'You are a patient study tutor. Create a multiple-choice quiz from the study material below.',
    langLine(lang),
    `Respond with ONLY a valid JSON array of exactly ${count} objects. No markdown fences, no extra text.`,
    'Each object must have exactly these fields:',
    '  "question": string, one question answerable from the material,',
    '  "options": an array of exactly 4 short strings,',
    '  "answer": the index (0-3) of the correct option,',
    '  "explanation": one short sentence explaining why the answer is correct.',
    'Make the wrong options plausible but clearly wrong to someone who read the material.',
    '',
    'Study material:',
    material,
  ].join('\n');
}

// ---- Ask (single-turn Q&A grounded in the material) -------------------
export function buildAskPrompt(material, question, lang) {
  return [
    'You are a patient study tutor. Answer the student question using ONLY the study material below.',
    langLine(lang),
    'If the material does not contain the answer, say so clearly in one sentence and do not invent facts.',
    'Keep the answer to 2-4 short sentences.',
    '',
    'Study material:',
    material,
    '',
    'Student question:',
    question,
  ].join('\n');
}
