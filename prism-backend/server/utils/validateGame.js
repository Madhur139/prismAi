/**
 * utils/validateGame.js
 * ----------------------------------------------------------------------------
 * DETERMINISTIC VALIDATION ("Anti-Hallucination" guardrails)
 * "Deterministic" = plain code with fixed rules: same input -> same result.
 * The AI can make mistakes, so we double-check everything with normal code.
 */
const { GAME_TYPES, LEVELS } = require("../config/constants");

// Normalize text: lowercase, strip accents/punctuation, collapse spaces.
// "Mitochondria!" and "mitochondria" become identical.
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove accent marks
    .replace(/[^a-z0-9\s.\-]/g, "") // remove odd punctuation
    .replace(/\s+/g, " ")
    .trim();

// How similar are two strings? 0 (nothing shared) to 1 (identical).
// "Jaccard similarity" = shared words / total unique words.
function similarity(a, b) {
  const A = new Set(norm(a).split(" ").filter(Boolean));
  const B = new Set(norm(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => B.has(t) && inter++);
  return inter / (A.size + B.size - inter);
}

// Calculates a math expression like "(12+8)*3". Only digits and operators
// are allowed (regex whitelist), so no harmful code can sneak in via the AI.
function evalExpression(expr) {
  const cleaned = String(expr).replace(/\s+/g, "").replace(/\^/g, "**").replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[0-9+\-*/().%]+$/.test(cleaned)) return NaN; // reject anything unexpected
  if (cleaned.length > 100) return NaN;
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict"; return (${cleaned});`)();
    return typeof v === "number" && Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

// True if the string has only letters (needed for snake/crossword words)
const isAlpha = (w) => /^[A-Za-z]+$/.test(String(w || "").trim());

// True/False answers come back from the AI in many shapes ("True", "yes", "correct").
// We fold them all into one of two plain words so the frontend can compare safely.
function normalizeBoolean(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (["true", "yes", "correct", "right"].includes(s)) return "true";
  if (["false", "no", "incorrect", "wrong"].includes(s)) return "false";
  return "";
}

// How many letters are different between two words of the same length?
// Used to check a WORD_LADDER chain: each rung must differ by exactly one letter.
function letterDiff(a, b) {
  const A = String(a || "");
  const B = String(b || "");
  if (A.length !== B.length) return Infinity;
  let d = 0;
  for (let i = 0; i < A.length; i++) if (A[i].toLowerCase() !== B[i].toLowerCase()) d++;
  return d;
}

/*
  A hint has to point at the METHOD. A hint that is only a number or a
  calculation ("4", "4*10", "15 + 25") gives the working away without helping
  the learner think, so it is thrown away rather than shown.
  A formula hint ("Use V = IR") is exactly what we want, so it is kept.
*/
function isUselessHint(hint, answer) {
  const h = String(hint || "").trim();
  if (!h) return false;
  // Only digits, maths symbols and spaces -> it is a number or a calculation.
  if (/^[\d\s.,+\-*/^%()x×÷]+$/i.test(h)) return true;
  // The hint is just the answer again.
  const a = String(answer || "").trim().toLowerCase();
  if (a && h.toLowerCase() === a) return true;
  return false;
}

// Reads an equation written as "12*8=96" and checks it.
// Returns { left, right, ok } — ok is false when the maths is wrong.
function checkEquation(text) {
  const parts = String(text || "").split("=");
  if (parts.length !== 2) return { left: NaN, right: NaN, ok: false };
  const left = evalExpression(parts[0]);
  const right = parseFloat(String(parts[1]).replace(/,/g, ""));
  if (Number.isNaN(left) || Number.isNaN(right)) return { left, right, ok: false };
  return { left, right, ok: Math.abs(left - right) < 1e-6 };
}

/**
 * validateGame — checks ONE game node.
 * Returns { ok, errors, game }:
 *   ok     -> true if it passed every rule
 *   errors -> list of problems (also sent back to the AI on retry)
 *   game   -> cleaned version of the node
 */
function validateGame(raw, { hasImage }) {
  const errors = [];

  // Rebuild the node with safe defaults so weird AI output can't crash us
  const g = {
    type: raw?.type,
    prompt: String(raw?.prompt || "").trim(),
    answer: String(raw?.answer ?? "").trim(),
    options: Array.isArray(raw?.options) ? raw.options.map((o) => String(o).trim()).filter(Boolean) : [],
    hint: String(raw?.hint || "").trim(),
    explanation: String(raw?.explanation || "").trim(),
    expression: String(raw?.expression || "").trim(),
    targetWords: Array.isArray(raw?.targetWords) ? raw.targetWords.map((w) => String(w).trim()) : [],
    clues: Array.isArray(raw?.clues)
      ? raw.clues.map((c) => ({ word: String(c?.word || "").trim(), clue: String(c?.clue || "").trim() }))
      : [],
    steps: Array.isArray(raw?.steps) ? raw.steps.map((s) => String(s).trim()).filter(Boolean) : [],
    pairs: Array.isArray(raw?.pairs)
      ? raw.pairs
          .map((p) => ({ left: String(p?.left ?? p?.word ?? "").trim(), right: String(p?.right ?? p?.clue ?? "").trim() }))
          .filter((p) => p.left && p.right)
      : [],
    level: LEVELS.includes(Number(raw?.level)) ? Number(raw.level) : 2,
    ladder: Array.isArray(raw?.ladder) ? raw.ladder.map((w) => String(w).trim()).filter(Boolean) : [],
    code: String(raw?.code || "").trim(),
    data: Array.isArray(raw?.data)
      ? raw.data.map((d) => ({ label: String(d?.label ?? "").trim(), value: String(d?.value ?? "").trim() })).filter((d) => d.label)
      : [],
    words: Array.isArray(raw?.words) ? raw.words.map((w) => String(w).trim()).filter(Boolean) : [],
    dates: Array.isArray(raw?.dates) ? raw.dates.map((d) => String(d).trim()).filter(Boolean) : [],
    hotspots: Array.isArray(raw?.hotspots)
      ? raw.hotspots.map((h) => ({
          x: Number(h?.x),
          y: Number(h?.y),
          w: Number(h?.w),
          h: Number(h?.h),
          label: String(h?.label || "").trim(),
        }))
      : [],
    hotspot: raw?.hotspot,
    svg: String(raw?.svg || "").trim(),
  };

  if (!GAME_TYPES.includes(g.type)) errors.push(`unknown type "${g.type}"`);
  if (g.prompt.length < 5) errors.push("prompt too short");

  // A hint that is only a number or a calculation is not a hint - drop it.
  // The game itself is fine, so this never costs the question.
  if (isUselessHint(g.hint, g.answer)) g.hint = "";

  // GUARDRAIL 1 — Math check: WE calculate the expression and compare with the AI's answer
  if (g.expression) {
    const truth = evalExpression(g.expression);
    const given = parseFloat(String(g.answer).replace(/,/g, ""));
    if (Number.isNaN(truth)) errors.push("expression not evaluable");
    else if (Number.isNaN(given) || Math.abs(truth - given) > 1e-6 * Math.max(1, Math.abs(truth)))
      errors.push(`math mismatch: expression=${truth}, answer=${g.answer}`);
  }

  // Rules specific to each game type
  switch (g.type) {
    case "MULTIPLE_CHOICE":
    case "SUPER_QUIZ": {
      if (!g.answer) errors.push("missing answer");
      if (g.options.length !== 4) errors.push("need exactly 4 options");
      const normed = g.options.map(norm);
      if (new Set(normed).size !== normed.length) errors.push("duplicate options");
      // The correct answer must be one of the options
      if (!normed.includes(norm(g.answer))) errors.push("answer not present in options");
      // GUARDRAIL 2 — options that are 80%+ similar are confusing
      for (let i = 0; i < g.options.length; i++)
        for (let j = i + 1; j < g.options.length; j++)
          if (similarity(g.options[i], g.options[j]) >= 0.8)
            errors.push(`options too similar: "${g.options[i]}" / "${g.options[j]}"`);
      break;
    }
    case "FILL_BLANK": {
      // Exactly one blank ("____") in the sentence
      if ((g.prompt.match(/_{2,}/g) || []).length !== 1) errors.push('prompt must contain exactly one "____"');
      if (!g.answer || g.answer.split(/\s+/).length > 3) errors.push("answer must be 1-3 words");
      break;
    }
    case "WORD_SNAKE": {
      // Letters only, reasonable length, no repeats
      const words = g.targetWords.filter(isAlpha);
      if (words.length !== g.targetWords.length) errors.push("targetWords must be letters only");
      if (words.length < 3 || words.length > 8) errors.push("need 3-8 targetWords");
      if (words.some((w) => w.length < 3 || w.length > 12)) errors.push("targetWords must be 3-12 letters");
      if (new Set(words.map((w) => w.toLowerCase())).size !== words.length) errors.push("duplicate targetWords");
      g.targetWords = words.map((w) => w.toUpperCase()); // uppercase for the Canvas grid
      if (!g.answer && g.targetWords[0]) g.answer = g.targetWords[0];
      break;
    }
    case "CROSSWORD": {
      if (g.clues.length < 4 || g.clues.length > 10) errors.push("need 4-10 clues");
      if (g.clues.some((c) => !isAlpha(c.word) || c.word.length < 3 || c.word.length > 15 || c.clue.length < 3))
        errors.push("invalid crossword word/clue");
      if (new Set(g.clues.map((c) => c.word.toLowerCase())).size !== g.clues.length)
        errors.push("duplicate crossword words");
      g.clues = g.clues.map((c) => ({ word: c.word.toUpperCase(), clue: c.clue }));
      if (!g.answer && g.clues[0]) g.answer = g.clues[0].word;
      break;
    }
    case "DIAGRAM_HOTSPOT": {
      const h = g.hotspot || {};
      // Needs an uploaded image, or a diagram we drew ourselves.
      if (!hasImage && !g.svg) errors.push("DIAGRAM_HOTSPOT requires an uploaded image");
      const inRange = (n) => typeof n === "number" && n >= 0 && n <= 100;
      if (![h.x, h.y, h.w, h.h].every(inRange)) errors.push("hotspot values must be 0-100");
      // The box must stay inside the image (0.5 = rounding tolerance)
      else if (h.x + h.w > 100.5 || h.y + h.h > 100.5 || h.w < 1 || h.h < 1) errors.push("hotspot out of bounds");
      if (!g.answer) errors.push("missing hotspot label/answer");
      else if (!h.label) g.hotspot = { ...h, label: g.answer };
      break;
    }
    case "TRUE_FALSE": {
      // The prompt must be a STATEMENT, not a question, otherwise the answer
      // would be pure guesswork.
      if (g.prompt.length < 12) errors.push("statement is too short");
      if (g.prompt.endsWith("?")) errors.push("statement must not be a question");
      const bool = normalizeBoolean(g.answer);
      if (!bool) errors.push('answer must be "True" or "False"');
      else g.answer = bool === "true" ? "True" : "False";
      break;
    }
    case "ORDERING": {
      if (g.steps.length < 3 || g.steps.length > 6) errors.push("need 3-6 steps");
      if (g.steps.some((s) => s.length > 90)) errors.push("steps must be short (max 90 characters)");
      const keys = g.steps.map((s) => s.toLowerCase());
      if (new Set(keys).size !== keys.length) errors.push("duplicate steps");
      // The review screen shows the correct order, so build a readable answer.
      if (g.steps.length) g.answer = g.steps.join(" → ");
      break;
    }
    case "MATCH_PAIRS": {
      if (g.pairs.length < 3 || g.pairs.length > 5) errors.push("need 3-5 pairs");
      if (g.pairs.some((p) => p.left.length > 60 || p.right.length > 90)) errors.push("pair text is too long");
      const lefts = g.pairs.map((p) => p.left.toLowerCase());
      if (new Set(lefts).size !== lefts.length) errors.push("duplicate left-hand terms");
      const rights = g.pairs.map((p) => p.right.toLowerCase());
      if (new Set(rights).size !== rights.length) errors.push("duplicate right-hand meanings");
      // Show the full correct matching in the review panel.
      if (g.pairs.length) g.answer = g.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
      break;
    }
    case "MATH_SPRINT": {
      if (!g.expression) errors.push("missing expression");
      else if (Number.isNaN(evalExpression(g.expression))) errors.push("expression not evaluable");
      if (!g.answer) errors.push("missing answer");
      else if (Number.isNaN(parseFloat(String(g.answer).replace(/,/g, "")))) errors.push("answer must be a number");
      break;
    }
    case "ODD_ONE_OUT": {
      if (g.options.length !== 4) errors.push("need exactly 4 options");
      if (!g.answer) errors.push("missing answer");
      else if (!g.options.map(norm).includes(norm(g.answer))) errors.push("answer not present in options");
      if (new Set(g.options.map(norm)).size !== g.options.length) errors.push("duplicate options");
      break;
    }
    case "TWO_TRUE_ONE_FALSE": {
      if (g.options.length !== 3) errors.push("need exactly 3 options");
      if (!g.answer) errors.push("missing answer");
      else if (!g.options.map(norm).includes(norm(g.answer))) errors.push("answer not present in options");
      if (new Set(g.options.map(norm)).size !== g.options.length) errors.push("duplicate options");
      break;
    }
    case "ANAGRAM": {
      // One word per game: the learner rebuilds it from jumbled letters.
      const words = g.targetWords.filter(isAlpha);
      if (words.length !== g.targetWords.length) errors.push("targetWords must be letters only");
      if (words.length !== 1) errors.push("need exactly 1 word to unscramble");
      if (words.some((w) => w.length < 4 || w.length > 14)) errors.push("the word must be 4-14 letters");
      g.targetWords = words.map((w) => w.toUpperCase());
      if (!g.answer && g.targetWords[0]) g.answer = g.targetWords[0];
      break;
    }
    case "CLOZE": {
      const blanks = (g.prompt.match(/_{2,}/g) || []).length;
      if (blanks < 2 || blanks > 3) errors.push('prompt must contain 2 or 3 "____" blanks');
      const parts = g.answer.split("|").map((p) => p.trim()).filter(Boolean);
      if (parts.length !== blanks) errors.push(`answer must hold ${blanks} words joined with "|"`);
      if (parts.some((p) => p.split(/\s+/).length > 2)) errors.push("each missing word must be 1-2 words");
      g.answer = parts.join("|").toLowerCase();
      break;
    }
    case "MEMORY_MATCH": {
      if (g.pairs.length < 3 || g.pairs.length > 8) errors.push("need 3-8 pairs");
      if (g.pairs.some((p) => p.left.length > 50 || p.right.length > 80)) errors.push("pair text is too long");
      const lefts = g.pairs.map((p) => p.left.toLowerCase());
      if (new Set(lefts).size !== lefts.length) errors.push("duplicate left-hand terms");
      g.answer = g.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
      break;
    }
    case "ODD_EQUATION": {
      if (g.options.length !== 4) errors.push("need exactly 4 equations");
      // Every option must be a real equation, and exactly one must be wrong.
      const checked = g.options.map((o) => checkEquation(o));
      if (checked.some((c) => Number.isNaN(c.left) || Number.isNaN(c.right))) errors.push("options must be equations like 12*8=96");
      else {
        const wrong = checked.filter((c) => !c.ok).length;
        if (wrong !== 1) errors.push(`exactly one equation must be wrong (found ${wrong})`);
        if (!g.answer) errors.push("missing answer");
        else {
          const answerEq = checkEquation(g.answer);
          if (Number.isNaN(answerEq.left)) errors.push("answer must be an equation");
          else if (answerEq.ok) errors.push("the answer must be the WRONG equation");
          else if (!g.options.map((o) => norm(o)).includes(norm(g.answer))) errors.push("answer not present in options");
        }
      }
      break;
    }
    case "WORD_LADDER": {
      // The ladder is the chain so far; the answer is the NEXT rung, which must
      // differ from the last word by exactly one letter.
      if (g.ladder.length < 1 || g.ladder.length > 6) errors.push("need 1-6 ladder words");
      if (g.ladder.some((w) => !isAlpha(w) || w.length < 3 || w.length > 14)) errors.push("ladder words must be 3-14 letters");
      for (let i = 1; i < g.ladder.length; i++)
        if (letterDiff(g.ladder[i - 1], g.ladder[i]) !== 1) errors.push("ladder words must differ by exactly one letter");
      if (g.options.length !== 4) errors.push("need exactly 4 options");
      if (!g.answer) errors.push("missing answer");
      else if (!g.options.map(norm).includes(norm(g.answer))) errors.push("answer not present in options");
      const last = g.ladder[g.ladder.length - 1];
      const fits = g.options.filter((o) => letterDiff(last, o) === 1 && !g.ladder.map(norm).includes(norm(o)));
      if (fits.length !== 1) errors.push(`exactly one option must fit the ladder (found ${fits.length})`);
      else if (g.answer && norm(fits[0]) !== norm(g.answer)) errors.push("answer is not the option that fits the ladder");
      break;
    }
    case "CODE_OUTPUT": {
      if (!g.code) errors.push("missing code");
      else if (g.code.length > 1200) errors.push("code must be short (max 1200 characters)");
      if (g.options.length !== 4) errors.push("need exactly 4 possible outputs");
      if (!g.answer) errors.push("missing answer");
      else if (!g.options.map(norm).includes(norm(g.answer))) errors.push("answer not present in options");
      if (new Set(g.options.map(norm)).size !== g.options.length) errors.push("duplicate options");
      break;
    }
    case "CHART_QUESTION": {
      if (g.data.length < 3 || g.data.length > 8) errors.push("need 3-8 data points");
      if (g.data.some((d) => !d.value)) errors.push("every data point needs a value");
      if (g.options.length !== 4) errors.push("need exactly 4 options");
      if (!g.answer) errors.push("missing answer");
      else if (!g.options.map(norm).includes(norm(g.answer))) errors.push("answer not present in options");
      break;
    }
    case "MULTI_LABEL": {
      // Needs an uploaded image, or a diagram we drew ourselves.
      if (!hasImage && !g.svg) errors.push("MULTI_LABEL requires an uploaded image");
      const inRange = (n) => typeof n === "number" && n >= 0 && n <= 100;
      if (g.hotspots.length < 2 || g.hotspots.length > 5) errors.push("need 2-5 hotspots");
      if (!g.hotspots.every((h) => [h.x, h.y, h.w, h.h].every(inRange))) errors.push("hotspot values must be 0-100");
      else if (g.hotspots.some((h) => h.x + h.w > 100.5 || h.y + h.h > 100.5 || h.w < 1 || h.h < 1))
        errors.push("hotspot out of bounds");
      if (g.hotspots.some((h) => !h.label)) errors.push("every hotspot needs a label");
      const labels = g.hotspots.map((h) => h.label.toLowerCase());
      if (new Set(labels).size !== labels.length) errors.push("duplicate hotspot labels");
      // The answer is the set of correct labels, sorted so the app can compare.
      // The sort must match the frontend: compare the lower-case names.
      if (g.hotspots.length) g.answer = labels.slice().sort((a, b) => a.localeCompare(b)).join("|");
      break;
    }
    case "SENTENCE_UNSCRAMBLE": {
      if (g.words.length < 3 || g.words.length > 14) errors.push("need 3-14 words");
      if (g.words.some((w) => w.length > 40)) errors.push("words must be short");
      // A sentence may repeat a word, so duplicates are allowed here.
      g.answer = g.words.join(" ").toLowerCase();
      break;
    }
    case "TIMELINE": {
      if (g.steps.length < 3 || g.steps.length > 6) errors.push("need 3-6 events");
      if (g.dates.length !== g.steps.length) errors.push("need one date per event");
      if (g.steps.some((s) => s.length > 80)) errors.push("events must be short");
      if (g.dates.some((d) => d.length > 30)) errors.push("dates must be short");
      g.answer = g.steps.map((s, i) => `${g.dates[i]} — ${s}`).join(" → ");
      break;
    }
    default:
      break;
  }

  // Tidy up: remove fields that don't belong to this game type
  if (!["MULTIPLE_CHOICE", "SUPER_QUIZ", "ODD_ONE_OUT", "TWO_TRUE_ONE_FALSE", "ODD_EQUATION", "WORD_LADDER", "CODE_OUTPUT", "CHART_QUESTION"].includes(g.type)) g.options = [];
  if (g.type !== "WORD_SNAKE" && g.type !== "ANAGRAM") g.targetWords = [];
  if (g.type !== "CROSSWORD") g.clues = [];
  if (g.type !== "ORDERING" && g.type !== "TIMELINE") g.steps = [];
  if (g.type !== "MATCH_PAIRS" && g.type !== "MEMORY_MATCH") g.pairs = [];
  if (g.type !== "WORD_LADDER") g.ladder = [];
  if (g.type !== "CODE_OUTPUT") g.code = "";
  if (g.type !== "CHART_QUESTION") g.data = [];
  if (g.type !== "SENTENCE_UNSCRAMBLE") g.words = [];
  if (g.type !== "TIMELINE") g.dates = [];
  if (g.type !== "MULTI_LABEL") g.hotspots = [];
  if (!["DIAGRAM_HOTSPOT", "MULTI_LABEL"].includes(g.type)) g.svg = "";
  if (g.type !== "DIAGRAM_HOTSPOT") g.hotspot = undefined;

  return { ok: errors.length === 0, errors, game: g };
}

module.exports = { validateGame, norm, similarity, evalExpression, isAlpha, normalizeBoolean, letterDiff, checkEquation, isUselessHint };
