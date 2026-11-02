/**
 * services/lessonRepairService.js
 * ----------------------------------------------------------------------------
 * validateAndRepairLesson — goes through every game in the AI's draft:
 *   1. validate it (utils/validateGame.js)
 *   2. if invalid -> ask the AI to regenerate JUST that game (up to 3 tries)
 *   3. if still invalid -> drop that one game (the rest of the lesson survives)
 *
 * This is the "never trust the AI blindly" guardrail.
 *
 * Lessons hold a lot of games now, so the repairs run in parallel: one slow
 * game must not hold up the whole lesson.
 */
const { validateGame } = require("../utils/validateGame");
const { regenerateGameNode } = require("./geminiService");
const { GAME_TYPES, MAX_NODE_RETRIES } = require("../config/constants");

// Fix ONE broken game. Returns { ok, game }.
async function repairOne({ rawGame, concept, topic, imageBuffer, mimeType, hasImage }) {
  // Keep the same game type if it is usable, otherwise fall back to multiple choice.
  const type =
    GAME_TYPES.includes(rawGame?.type) && (rawGame.type !== "DIAGRAM_HOTSPOT" || hasImage)
      ? rawGame.type
      : "MULTIPLE_CHOICE";

  let errors = [];
  for (let i = 0; i < MAX_NODE_RETRIES; i++) {
    try {
      const fresh = await regenerateGameNode({
        topic,
        concept,
        type,
        previousErrors: errors, // tell the AI exactly what to fix
        imageBuffer,
        mimeType,
      });
      const result = validateGame(fresh, { hasImage });
      if (result.ok) return { ok: true, game: result.game };
      errors = result.errors;
    } catch (err) {
      console.warn("Node regeneration failed:", err.message);
      errors = [err.message];
    }
  }
  return { ok: false, game: null };
}

async function validateAndRepairLesson(draft, { topic, imageBuffer, mimeType, hasImage: hasImageOverride }) {
  /*
    Whether the finished lesson will actually SHOW a picture. Normally that is
    simply "we were given an image", but when storing the image failed the
    lesson ends up text-only, so image-only games must not be built.
  */
  const hasImage = hasImageOverride !== undefined ? hasImageOverride : !!imageBuffer;

  // ---- 1. split the draft into concepts and check every game ----
  const concepts = []; // { conceptName, summary, slots: [game|null] }
  const broken = []; // games that need a second try

  for (const c of draft.concepts || []) {
    const conceptName = String(c.conceptName || "").trim();
    if (!conceptName) continue; // skip nameless concepts

    const concept = { conceptName, summary: String(c.summary || "").trim(), slots: [] };
    const conceptIndex = concepts.length;

    for (const rawGame of c.microGames || []) {
      const result = validateGame(rawGame, { hasImage });
      if (result.ok) concept.slots.push(result.game);
      else {
        // Placeholder, filled in after the repair. We remember WHERE it was
        // so the fixed game goes back into the same spot.
        broken.push({ rawGame, concept, conceptIndex, slotIndex: concept.slots.length });
        concept.slots.push(null);
      }
    }
    concepts.push(concept);
  }

  // ---- 2. repair every broken game at the same time ----
  const repaired = await Promise.all(
    broken.map((b) => repairOne({ ...b, topic, imageBuffer, mimeType, hasImage }))
  );
  repaired.forEach((r, i) => {
    if (r.ok) concepts[broken[i].conceptIndex].slots[broken[i].slotIndex] = r.game;
  });

  // ---- 3. drop the games that never worked ----
  let dropped = 0;
  const clean = concepts
    .map((c) => {
      const microGames = c.slots.filter(Boolean);
      dropped += c.slots.length - microGames.length;
      return { conceptName: c.conceptName, summary: c.summary, microGames };
    })
    .filter((c) => c.microGames.length); // keep only concepts with at least one valid game

  return { concepts: clean, dropped };
}

module.exports = { validateAndRepairLesson };
