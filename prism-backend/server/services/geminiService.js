/**
 * services/geminiService.js
 * ----------------------------------------------------------------------------
 * Everything that talks to Gemini AI lives here.
 * We force Gemini to answer in a strict JSON shape ("structured output"),
 * which makes the AI output predictable enough to feed into games.
 *
 * Exports:
 *   generateLessonDraft()  -> whole lesson in one AI call
 *   regenerateGameNode()   -> redo ONE broken game
 */
const { SchemaType } = require("@google/generative-ai");
const genAI = require("../config/gemini");
const { GEMINI_MODEL } = require("../config/env");
const { GAME_TYPES } = require("../config/constants");

/* ---------- JSON schemas for the AI (NOT the database) ---------- */

// Fields of ONE game, in Gemini's schema language (mirrors models/Lesson.js)
const gameSchemaProps = {
  type: { type: SchemaType.STRING, format: "enum", enum: GAME_TYPES },
  prompt: { type: SchemaType.STRING },
  answer: { type: SchemaType.STRING },
  options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  hint: { type: SchemaType.STRING },
  explanation: { type: SchemaType.STRING },
  expression: { type: SchemaType.STRING },
  targetWords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  /*
    Gemini only accepts STRING values inside an enum, even when the property
    itself is a number. So the difficulty is asked for as "1" | "2" | "3" and
    validateGame turns it back into a real number.
  */
  level: { type: SchemaType.STRING, format: "enum", enum: ["1", "2", "3"] },
  ladder: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  code: { type: SchemaType.STRING },
  data: {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: { label: { type: SchemaType.STRING }, value: { type: SchemaType.STRING } },
      required: ["label", "value"],
    },
  },
  words: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  dates: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  hotspots: {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER },
        y: { type: SchemaType.NUMBER },
        w: { type: SchemaType.NUMBER },
        h: { type: SchemaType.NUMBER },
        label: { type: SchemaType.STRING },
      },
      required: ["x", "y", "w", "h", "label"],
    },
  },
  pairs: {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: { left: { type: SchemaType.STRING }, right: { type: SchemaType.STRING } },
      required: ["left", "right"],
    },
  },
  clues: {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: { word: { type: SchemaType.STRING }, clue: { type: SchemaType.STRING } },
      required: ["word", "clue"],
    },
  },
  hotspot: {
    type: SchemaType.OBJECT,
    properties: {
      x: { type: SchemaType.NUMBER },
      y: { type: SchemaType.NUMBER },
      w: { type: SchemaType.NUMBER },
      h: { type: SchemaType.NUMBER },
      label: { type: SchemaType.STRING },
    },
  },
};

// Schema for a single game (used when regenerating one node)
const GAME_NODE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: gameSchemaProps,
  required: ["type", "prompt", "answer"],
};

// Schema for the whole lesson: title + concepts, each with games
const LESSON_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    concepts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          conceptName: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          microGames: { type: SchemaType.ARRAY, items: GAME_NODE_SCHEMA },
        },
        required: ["conceptName", "microGames"],
      },
    },
  },
  required: ["title", "concepts"],
};

/* ---------- Prompts ---------- */

// Plain-English rules for each game type.
// utils/validateGame.js re-checks these rules afterwards in code.
const GAME_RULES = `
GAME TYPE RULES (you only output DATA — never code or game logic):
- MULTIPLE_CHOICE / SUPER_QUIZ: "options" = exactly 4 distinct strings that include "answer" verbatim. Distractors must be plausible but clearly different in meaning. Add a short "explanation".
- FILL_BLANK: "prompt" contains exactly one "____". "answer" is 1-3 words.
- WORD_SNAKE: "targetWords" = 3-8 single key vocabulary words (letters only, 3-12 letters). "prompt" is a one-line instruction. "answer" = the first target word.
- CROSSWORD: "clues" = 4-10 {word, clue} pairs, words letters only (3-15 letters), all unique. "answer" = the first word.
- DIAGRAM_HOTSPOT (ONLY if an image is supplied): "prompt" asks the learner to click a part of the diagram; "answer" = the part's label; "hotspot" = bounding box {x,y,w,h,label} in PERCENT (0-100) of the image's width/height.
- TRUE_FALSE: "prompt" is a short plain STATEMENT about the topic — never a question and never ending in "?". "answer" is exactly "True" or "False". The statement must be unambiguous: everything needed to judge it must be in the sentence.
- ORDERING: "steps" = 3-6 short steps listed in the CORRECT order (stages of a process, chronological order, order of operations...). "prompt" asks the learner to put them in order. "answer" is not used by the app.
- MATCH_PAIRS: "pairs" = 3-5 {left, right} objects where "left" is a key term and "right" is its definition or its matching term. All pairs must use the same topic and every "left" and "right" must be unique. "prompt" asks the learner to match them. "answer" is not used by the app.
- MATH_SPRINT (maths topics only): "prompt" is the arithmetic question. "expression" holds the arithmetic using only digits and + - * / ( ) % . and "answer" is the numeric result of that expression.
- ODD_ONE_OUT: "options" = exactly 4 items from the same category; exactly ONE of them does not belong and "answer" is that one. "prompt" asks which one does not belong.
- TWO_TRUE_ONE_FALSE: "options" = exactly 3 statements; exactly TWO are true and "answer" is the FALSE one. "prompt" asks which statement is false.
- ANAGRAM: "targetWords" = exactly ONE word, letters only, 4-14 letters. "prompt" asks the learner to unscramble it. "answer" = that word.
- CLOZE: "prompt" contains 2 or 3 "____" blanks. "answer" = the missing words in order, joined with "|" (e.g. "glucose|carbon dioxide"). Each missing word is 1-2 words.
- MEMORY_MATCH: "pairs" = 3-8 {left, right} objects (term -> meaning). "prompt" asks the learner to match them.
- ODD_EQUATION (maths topics only): "options" = exactly 4 equations written as "12*8=96"; exactly ONE equation is arithmetically wrong and "answer" is that wrong equation.
- WORD_LADDER: "ladder" = the chain so far (2-6 words, each word differing from the next by exactly ONE letter). "options" = exactly 4 words where exactly ONE continues the ladder, and "answer" is that word.
- CODE_OUTPUT (coding topics only): "code" = a short snippet (max 6 lines, plain JavaScript-like). "options" = exactly 4 possible outputs and "answer" is the correct one, written exactly as the code prints it.
- CHART_QUESTION: "data" = 3-8 {label, value} points (values are numbers written as strings). "options" = exactly 4 possible answers and "answer" is the correct one.
- MULTI_LABEL (ONLY if an image is supplied): "hotspots" = 2-5 {x,y,w,h,label} boxes in PERCENT (0-100) of the image; "prompt" asks the learner to click EVERY part that matches. "answer" is not used by the app.
- SENTENCE_UNSCRAMBLE: "words" = 3-14 words of ONE sentence in the correct order. "prompt" asks the learner to rebuild the sentence.
- TIMELINE: "steps" = 3-6 events in CHRONOLOGICAL order and "dates" = the matching date for each event, same length and order. "prompt" asks the learner to put the events in order.
- "level" = 1 (easy), 2 (normal) or 3 (hard). Spread the levels inside a concept so a learner can drill easy ones first.
- "hint" = ONE short nudge (max 15 words) that points at the METHOD so the learner can work it out. NEVER the answer, never the result, never the substituted working, and never a bare number or a calculation. For a calculation, name the FORMULA to use (e.g. "Use the formula V = IR" or "Use F = ma"), not the numbers plugged in. For a definition, name the idea to recall (e.g. "Think about what energy is conserved in"). If no useful nudge exists, leave "hint" empty.
- If a question has a numeric answer, put the arithmetic in "expression" (digits and + - * / ( ) ^ % . only) and the numeric result in "answer".
- Keep every string SHORT (one line). A long lesson is better made of many small games.
- Leave unused fields as empty strings / empty arrays.`;

// The AI's permanent "job description"
const SYSTEM_INSTRUCTION = `You are the content engine of Prism AI, an educational micro-game generator.
You output ONLY structured JSON matching the provided schema. Be factually accurate; if unsure, choose a simpler, certain fact.
${GAME_RULES}`;

/* ---------- Helpers ---------- */

// Build a configured Gemini model that must answer in the given JSON schema
function getModel(responseSchema) {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json", // answer as JSON only
      responseSchema, // ...in exactly this shape
      temperature: 0.6, // 0 = predictable, 1 = creative; 0.6 = balance
    },
  });
}

// Message "parts": always text, plus the image if present.
// The image goes straight to Gemini as raw data — no separate OCR step.
function buildParts({ prompt, imageBuffer, mimeType }) {
  const parts = [{ text: prompt }];
  if (imageBuffer) {
    parts.push({ inlineData: { data: imageBuffer.toString("base64"), mimeType } });
  }
  return parts;
}

// Turn the AI's text into a JS object (strips ```json fences just in case)
function safeParseJSON(text) {
  const clean = String(text).replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

/* ---------- Public functions ---------- */

// STEP A: ask Gemini for the FULL lesson draft in one pass
async function generateLessonDraft({ topic, imageBuffer, mimeType, sourceText }) {
  const hasImage = !!imageBuffer;
  const head = [];

  // Material the learner brought in (a PDF, a video transcript, pasted notes).
  if (sourceText) {
    head.push(`Here is the study material. Build the lesson ONLY from this material:\n"""\n${sourceText}\n"""`);
  } else if (topic) {
    head.push(`Topic / learner request: "${topic}".`);
  } else {
    head.push("Analyse the supplied educational image (notes, diagram, textbook page).");
  }

  head.push(
    hasImage
      ? "An image IS supplied: read handwriting, labels and diagram structure directly. You may use DIAGRAM_HOTSPOT."
      : "No image is supplied: do NOT use DIAGRAM_HOTSPOT."
  );

  /*
    A long lesson can come back cut off, so we ask for a big one first and
    fall back to a smaller one if the JSON does not parse.
  */
  const attempts = [
    [
      "Break the material into 4-6 concept nodes. Each node needs 6-8 micro-games using a MIX of the allowed game types.",
      "Spread the game types out: inside one concept do not use the same type twice in a row.",
      "Give the lesson a short title.",
    ].join("\n"),
    [
      "IMPORTANT: keep the lesson SMALL. Break the material into 3-4 concept nodes with 4-5 micro-games each.",
      "Give the lesson a short title.",
    ].join("\n"),
  ];

  const model = getModel(LESSON_SCHEMA);
  let lastError;
  for (const extra of attempts) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: buildParts({ prompt: [...head, extra].join("\n"), imageBuffer, mimeType }) }],
      });
      return safeParseJSON(result.response.text());
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// STEP B (only when needed): regenerate ONE broken game, telling the AI what was wrong
async function regenerateGameNode({ topic, concept, type, previousErrors, imageBuffer, mimeType, avoid }) {
  const prompt = [
    `Topic: "${topic}". Concept: "${concept.conceptName}" — ${concept.summary || ""}`,
    `Create ONE new micro-game of type ${type}.`,
    previousErrors?.length ? `The previous attempt failed validation: ${previousErrors.join("; ")}. Fix these.` : "",
    avoid?.length ? `Do NOT repeat these questions already in the lesson:\n- ${avoid.join("\n- ")}` : "",
  ].join("\n");

  const model = getModel(GAME_NODE_SCHEMA);
  const result = await model.generateContent({
    contents: [{ role: "user", parts: buildParts({ prompt, imageBuffer, mimeType }) }],
  });
  return safeParseJSON(result.response.text());
}

module.exports = { generateLessonDraft, regenerateGameNode };
