/**
 * controllers/insightController.js
 * ----------------------------------------------------------------------------
 * "Insight" endpoints that turn a lesson into something you can consume in a
 * different way:
 *   POST /api/ai/summary -> a spoken summary script (Listen mode)
 *   POST /api/ai/levels  -> one concept explained at three depths
 *
 * The learner's text is always treated as DATA, never as instructions.
 */
const { SchemaType } = require("@google/generative-ai");
const asyncHandler = require("../middleware/asyncHandler");
const Lesson = require("../models/Lesson");
const { isValidId } = require("../utils/helpers");
const { askJSON, fail } = require("../utils/askAI");

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

// Build a plain-text context of the lesson (or just one concept) for the AI.
async function lessonContext(userId, lessonId, conceptName) {
  if (!lessonId || !isValidId(lessonId)) return null;
  const lesson = await Lesson.findOne({ _id: lessonId, createdBy: userId }).lean();
  if (!lesson) return null;
  const concepts = lesson.concepts || [];
  const picked = conceptName ? concepts.filter((c) => c.conceptName === conceptName) : concepts;
  const text = picked
    .map(
      (c) =>
        `Concept: ${c.conceptName}\nSummary: ${c.summary || ""}\nFacts: ${(c.microGames || [])
          .map((g) => g.explanation)
          .filter(Boolean)
          .slice(0, 5)
          .join(" | ")}`
    )
    .join("\n\n");
  return { topic: lesson.topic, concepts, text: text.slice(0, 4000) };
}

/* ---------- 1. spoken summary ---------- */
const SUMMARY_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    script: { type: SchemaType.STRING },
  },
  required: ["title", "script"],
};

const summarize = asyncHandler(async (req, res) => {
  const { lessonId, conceptName } = req.body || {};
  const ctx = await lessonContext(req.user.id, lessonId, conceptName);
  if (!ctx) return res.status(404).json({ error: "Lesson not found" });

  const prompt = `You are Prism AI. Write a spoken summary of this lesson for someone who is about to study it.

RULES
- Write plain spoken English. No markdown, no bullet points, no headings, no emoji, no special characters.
- Never write maths symbols. Say "two plus two" instead of "2 + 2", and "the square root of nine" instead of "sqrt(9)".
- Open with one sentence that says what the topic is about.
- Cover every concept once, in order, in about three sentences each.
- Close with one short sentence about what the learner should be able to do afterwards.
- Aim for 120 to 200 words. It will be read aloud, so keep every sentence short.

TOPIC: ${ctx.topic}

${ctx.text}`;

  try {
    const r = await askJSON(prompt, SUMMARY_SCHEMA, 0.5);
    const script = clip(r.script, 4000);
    const words = script.split(/\s+/).filter(Boolean).length;
    res.json({
      lessonId,
      title: clip(r.title, 120) || ctx.topic,
      script,
      wordCount: words,
      // Roughly 150 words a minute when read aloud.
      durationSec: Math.max(20, Math.round((words / 150) * 60)),
    });
  } catch (e) {
    fail(res, e);
  }
});

/* ---------- 2. three depths of the same concept ---------- */
const LEVELS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    conceptName: { type: SchemaType.STRING },
    simple: { type: SchemaType.STRING },
    standard: { type: SchemaType.STRING },
    deep: { type: SchemaType.STRING },
  },
  required: ["simple", "standard", "deep"],
};

const LEVEL_LABELS = [
  { key: "simple", label: "Simply", hint: "No jargon at all" },
  { key: "standard", label: "Normally", hint: "What a textbook would say" },
  { key: "deep", label: "In depth", hint: "The details underneath" },
];

const explainLevels = asyncHandler(async (req, res) => {
  const { lessonId, conceptName, topic } = req.body || {};
  if (!conceptName) return res.status(400).json({ error: "Tell us which concept to explain." });

  const ctx = await lessonContext(req.user.id, lessonId, conceptName);
  const subject = topic || ctx?.topic || "this topic";

  const prompt = `You are Prism AI. Explain the same concept three times, at three different depths.

TOPIC: ${subject}
CONCEPT: ${conceptName}

${ctx ? `CONTEXT FROM THE LESSON:\n${ctx.text}\n` : ""}

RULES
- "simple": as if explaining to a curious 12 year old. No jargon, one short analogy, at most 3 sentences.
- "standard": the way a good textbook would explain it. Correct terms, clear steps, 3 to 5 sentences.
- "deep": the interesting details a keen student would want. The why, the edge cases, the connection to the wider topic, 4 to 6 sentences.
- Use plain text only. No markdown, no bullet points, no headings.
- Never invent facts that are not implied by the concept itself.`;

  try {
    const r = await askJSON(prompt, LEVELS_SCHEMA, 0.4);
    res.json({
      conceptName: clip(r.conceptName, 120) || conceptName,
      levels: LEVEL_LABELS.map((l) => ({ ...l, text: clip(r[l.key], 1600) })),
    });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = { summarize, explainLevels };
