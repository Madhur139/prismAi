/**
 * controllers/lessonController.js
 * ----------------------------------------------------------------------------
 * All lesson logic:
 *   generateLesson   -> POST   /api/lessons/generate
 *   getLessons       -> GET    /api/lessons
 *   getLesson        -> GET    /api/lessons/:id
 *   getSession       -> GET    /api/lessons/:id/session
 *   regenerateGame   -> POST   /api/lessons/:id/regenerate
 *   deleteLesson     -> DELETE /api/lessons/:id
 *
 * NOTE: every query filters by `createdBy: req.user.id`, so a user can only
 * ever see / change their OWN lessons.
 */
const Lesson = require("../models/Lesson");
const UserProgress = require("../models/UserProgress");
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const mongoose = require("mongoose");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidId } = require("../utils/helpers");
const crypto = require("crypto");
const { validateGame } = require("../utils/validateGame");
const { generateLessonDraft, regenerateGameNode } = require("../services/geminiService");
const { extractPdf, extractYouTube, cleanText } = require("../services/importService");
const { buildDiagram, boxes: diagramBoxes } = require("../services/diagramService");
const { saveImage, removeImage, absoluteUrl } = require("../services/imageStorage");
const { validateAndRepairLesson } = require("../services/lessonRepairService");
const { MAX_NODE_RETRIES, ADDABLE_TYPES, MAX_GAMES_PER_CONCEPT } = require("../config/constants");

// The four newest game types. They are preferred when we add games to a lesson
// so the learner meets them first.
const FRESH_TYPES = ["TRUE_FALSE", "ORDERING", "MATCH_PAIRS", "MATH_SPRINT"];

/**
 * Choose the game type for a NEW game.
 * We want variety: the newest game types come first, then the ones that are
 * already used a lot in this concept get pushed to the back.
 */
function pickType(concept, batch = {}) {
  const used = {};
  (concept.microGames || []).forEach((g) => { used[g.type] = (used[g.type] || 0) + 1; });
  const score = (t) => (used[t] || 0) * 2 + (batch[t] || 0) * 4 + (FRESH_TYPES.includes(t) ? 0 : 3);
  return ADDABLE_TYPES.slice().sort((a, b) => score(a) - score(b))[0];
}

/**
 * Build ONE extra game for a concept: ask the AI, validate the answer, and
 * retry with the error messages when it does not pass.
 */
async function buildExtraGame({ lesson, concept, conceptIndex, type, hasImage }) {
  const avoid = (concept.microGames || []).map((g) => g.prompt).filter(Boolean).slice(-12);
  let errors = [];
  for (let i = 0; i < MAX_NODE_RETRIES; i++) {
    try {
      const fresh = await regenerateGameNode({
        topic: lesson.topic,
        concept,
        type,
        previousErrors: errors,
        avoid,
      });
      const result = validateGame(fresh, { hasImage });
      if (result.ok) {
        const duplicate = (concept.microGames || []).some(
          (g) => g.prompt && result.game.prompt && g.prompt.toLowerCase() === result.game.prompt.toLowerCase()
        );
        if (!duplicate) return { conceptIndex, game: result.game };
        errors = ["this question already exists in the lesson"];
      } else {
        errors = result.errors;
      }
    } catch (err) {
      errors = [err.message || "AI call failed"];
    }
  }
  return { conceptIndex, game: null, errors };
}


// GENERATE: the main feature (topic and/or image -> verified lesson)
const generateLesson = asyncHandler(async (req, res) => {
  const topic = String(req.body?.topic || "").trim();
  const file = req.file; // set by uploadMiddleware; undefined if no image
  if (!topic && !file) return res.status(400).json({ error: "Provide a topic and/or an image" });
  if (topic.length > 500) return res.status(400).json({ error: "Topic too long (max 500 chars)" });

  const imageBuffer = file?.buffer;
  const mimeType = file?.mimetype;

  // Promise.all runs BOTH at the same time, so total time = the slower one:
  //   1) upload image to Cloudinary (skipped if no image)
  //   2) ask Gemini to draft the lesson
  //
  // Storing the photo is BEST EFFORT. Gemini already has the image bytes, so a
  // Cloudinary problem (most often a missing CLOUDINARY_CLOUD_NAME) must not
  // stop the lesson from being created - the picture is simply kept on our
  // own server instead.
  let imageWarning = "";
  const cloudPromise = file
    ? saveImage(imageBuffer, { userId: req.user.id, mimetype: file?.mimetype }).catch((e) => {
        console.error("Image upload failed:", e.message);
        imageWarning = e.message;
        return null;
      })
    : Promise.resolve(null);

  const [cloud, draft] = await Promise.all([
    cloudPromise,
    generateLessonDraft({ topic, imageBuffer, mimeType }),
  ]);

  // The lesson only shows a picture if we actually managed to store one.
  const hasImage = file ? !!cloud : false;
  const sourceType = topic && hasImage ? "text+image" : hasImage ? "image" : "text";

  // Check the AI's work and repair bad games one at a time
  const { concepts, dropped } = await validateAndRepairLesson(draft, {
    topic: topic || draft.title,
    imageBuffer,
    mimeType,
    hasImage,
  });

  // Nothing valid survived -> delete the uploaded image and report failure
  if (!concepts.length) {
    removeImage(cloud?.public_id);
    return res.status(502).json({ error: "Could not generate valid lesson content. Please try again." });
  }

  // Save the verified lesson
  const lesson = await Lesson.create({
    topic: topic || draft.title || "Untitled lesson",
    sourceType,
    imageUrl: cloud ? absoluteUrl(req, cloud.secure_url) : "",
    imagePublicId: cloud?.public_id || "",
    createdBy: req.user.id,
    concepts,
    droppedNodes: dropped,
  });

  res.status(201).json({ lesson, ...(imageWarning ? { warning: imageWarning } : {}) });
});

// LIST: my lessons, newest first (only light fields)
const getLessons = asyncHandler(async (req, res) => {
  /*
    An aggregation lets us count the games without pulling every game object
    (prompts, options, clues) down to the client. The list only needs the
    concept names and a total, so we project exactly that.
  */
  const lessons = await Lesson.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.id) } },
    {
      $project: {
        topic: 1,
        sourceType: 1,
        imageUrl: 1,
        createdAt: 1,
        concepts: { $map: { input: "$concepts", as: "c", in: { conceptName: "$$c.conceptName" } } },
        gameCount: {
          $sum: {
            $map: {
              input: "$concepts",
              as: "c",
              in: { $size: { $ifNull: ["$$c.microGames", []] } },
            },
          },
        },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
  ]);
  res.json({ lessons });
});

// GET ONE: full lesson
const getLesson = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOne({ _id: req.params.id, createdBy: req.user.id }).lean();
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  res.json({ lesson });
});

// SESSION: play session where WEAK concepts appear more often
// ("Adaptive Spaced Repetition")
const getSession = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOne({ _id: req.params.id, createdBy: req.user.id }).lean();
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  // ?size=10 -> number of rounds, kept between 3 and 30
  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 10, 3), 30);
  // ?level=2 -> only games of that difficulty
  const level = parseInt(req.query.level, 10);
  // ?weak=1 -> only the concepts the learner keeps getting wrong
  const weakOnly = req.query.weak === "1" || req.query.weak === "true";
  const progress = await UserProgress.findOne({ userId: req.user.id }).lean();

  // Map: conceptName -> misses (for THIS lesson only)
  const missMap = new Map(
    (progress?.weakConcepts || [])
      .filter((w) => String(w.lessonId) === String(lesson._id))
      .map((w) => [w.conceptName, w.misses])
  );

  // Pool of every game with a "weight": 1 normally, +2 per past miss
  const pool = [];
  lesson.concepts.forEach((c, ci) =>
    c.microGames.forEach((game, gi) => {
      if (level >= 1 && level <= 3 && game.level && game.level !== level) return; // difficulty filter
      if (weakOnly && !missMap.get(c.conceptName)) return; // only weak concepts
      const weight = 1 + 2 * (missMap.get(c.conceptName) || 0);
      pool.push({ conceptName: c.conceptName, conceptIndex: ci, gameIndex: gi, game, weight });
    })
  );

  // Weighted random pick without repeats ("roulette wheel"):
  // heavier items take more of the wheel, so they're picked more often
  const picked = [];
  const bag = [...pool];
  while (picked.length < size && bag.length) {
    const total = bag.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total; // spin
    const idx = bag.findIndex((x) => (r -= x.weight) <= 0); // where it lands
    picked.push(...bag.splice(idx === -1 ? 0 : idx, 1)); // remove from bag
  }

  res.json({
    lessonId: lesson._id,
    imageUrl: lesson.imageUrl,
    weakConcepts: [...missMap.keys()],
    rounds: picked.map(({ weight, ...rest }) => rest), // hide internal weight
  });
});

// REGENERATE: redo just ONE game the user didn't like
const regenerateGame = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad lesson id" });
  const { conceptIndex, gameIndex } = req.body || {};
  const lesson = await Lesson.findOne({ _id: req.params.id, createdBy: req.user.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const concept = lesson.concepts[conceptIndex];
  const old = concept?.microGames?.[gameIndex];
  if (!concept || !old) return res.status(400).json({ error: "Invalid conceptIndex/gameIndex" });

  const hasImage = !!lesson.imageUrl;
  let errors = [];
  for (let i = 0; i < MAX_NODE_RETRIES; i++) {
    const fresh = await regenerateGameNode({
      topic: lesson.topic,
      concept,
      type: old.type, // keep the same game type
      previousErrors: errors,
    });
    const result = validateGame(fresh, { hasImage });
    if (result.ok) {
      concept.microGames[gameIndex] = result.game;
      lesson.markModified("concepts"); // tell Mongoose the nested array changed
      await lesson.save();
      return res.json({ game: result.game });
    }
    errors = result.errors; // feed errors into the next try
  }
  res.status(502).json({ error: "Regeneration failed validation", details: errors });
});

// ADD GAMES: append brand-new games to a lesson
//   body: { conceptIndex?: number, count?: number, type?: string }
//   No conceptIndex -> one game for every concept in the lesson.
const addGames = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOne({ _id: req.params.id, createdBy: req.user.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const { conceptIndex, type } = req.body || {};
  const count = Math.min(Math.max(parseInt(req.body?.count) || 1, 1), 4);

  // Which concepts get new games? One concept, or all of them.
  let targets = lesson.concepts.map((c, i) => ({ concept: c, index: i }));
  if (conceptIndex !== undefined && conceptIndex !== null && conceptIndex !== "") {
    const ci = parseInt(conceptIndex);
    if (Number.isNaN(ci) || !lesson.concepts[ci]) return res.status(400).json({ error: "Invalid conceptIndex" });
    targets = [{ concept: lesson.concepts[ci], index: ci }];
  }
  if (!targets.length) return res.status(400).json({ error: "This lesson has no concepts yet" });

  const hasImage = !!lesson.imageUrl;
  const wanted = ADDABLE_TYPES.includes(type) ? type : null;

  // Build the work list: how many games per concept and which type each one gets.
  const jobs = [];
  targets.forEach(({ concept, index }) => {
    const room = MAX_GAMES_PER_CONCEPT - (concept.microGames || []).length;
    const batch = {};
    const n = Math.max(0, Math.min(count, room));
    for (let k = 0; k < n; k++) {
      const gameType = wanted || pickType(concept, batch);
      batch[gameType] = (batch[gameType] || 0) + 1;
      jobs.push({ concept, conceptIndex: index, type: gameType });
    }
  });
  if (!jobs.length) return res.status(400).json({ error: "These concepts already have as many games as they can hold" });

  // Each game is an independent AI call, so they all run at the same time.
  const results = await Promise.all(jobs.map((job) => buildExtraGame({ lesson, ...job, hasImage })));

  const added = [];
  results.forEach((r) => {
    if (!r.game) return;
    lesson.concepts[r.conceptIndex].microGames.push(r.game);
    added.push({ conceptIndex: r.conceptIndex, game: r.game });
  });

  if (!added.length) return res.status(502).json({ error: "Could not create valid games. Please try again." });

  lesson.markModified("concepts");
  await lesson.save();
  res.json({ added, count: added.length });
});

// IMPORT: build a lesson from a PDF, a YouTube video or pasted notes
const importLesson = asyncHandler(async (req, res) => {
  const file = req.file;
  const url = String(req.body?.url || "").trim();
  const pasted = String(req.body?.text || "").trim();

  let sourceText = "", sourceType = "text", title = "";
  try {
    if (file) {
      const isPdf = file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname || "");
      if (!isPdf) return res.status(400).json({ error: "Only PDF files can be imported here. For a photo, use Create lesson." });
      sourceText = await extractPdf(file.buffer);
      sourceType = "pdf";
      title = String(file.originalname || "Imported lesson").replace(/\.pdf$/i, "").slice(0, 120);
    } else if (url) {
      sourceText = await extractYouTube(url);
      sourceType = "video";
    } else if (pasted) {
      sourceText = cleanText(pasted);
      sourceType = "text";
    } else {
      return res.status(400).json({ error: "Give a PDF, a YouTube link or some notes to import." });
    }
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  if (!sourceText || sourceText.length < 80) return res.status(400).json({ error: "There was not enough readable text in that material." });

  // The same pipeline as a normal lesson, but the material comes from the import.
  const draft = await generateLessonDraft({ sourceText });
  const { concepts, dropped } = await validateAndRepairLesson(draft, { topic: title || draft.title, imageBuffer: null, mimeType: null });
  if (!concepts.length) return res.status(502).json({ error: "Could not build a lesson from that material." });

  const lesson = await Lesson.create({
    topic: title || draft.title || "Imported lesson",
    sourceType,
    imageUrl: "",
    imagePublicId: "",
    createdBy: req.user.id,
    concepts,
    droppedNodes: dropped,
  });
  res.status(201).json({ lesson });
});

// COPY an assigned lesson into my own library
// (a student cannot play a lesson owned by their teacher, so we copy it once)
const copyAssignedLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.body || {};
  if (!isValidId(lessonId)) return res.status(400).json({ error: "Bad lesson id" });

  const teacher = req.user.classCode
    ? await User.findOne({ classCode: req.user.classCode, role: "teacher" }).select("_id")
    : null;
  if (!teacher) return res.status(403).json({ error: "This lesson was not assigned to you" });
  const assignment = await Assignment.findOne({ lessonId, teacherId: teacher._id });
  if (!assignment) return res.status(403).json({ error: "This lesson was not assigned to you" });

  const source = await Lesson.findById(lessonId).lean();
  if (!source) return res.status(404).json({ error: "Lesson not found" });

  const copy = await Lesson.create({
    topic: source.topic,
    sourceType: source.sourceType,
    imageUrl: source.imageUrl,
    imagePublicId: "", // the teacher keeps the original image
    createdBy: req.user.id,
    concepts: source.concepts,
    droppedNodes: source.droppedNodes,
  });
  res.status(201).json({ lesson: copy });
});

// DIAGRAM: draw a labelled diagram for a concept and add the two games that
// use it (click one part, or click every part of a group).
const addDiagram = asyncHandler(async (req, res) => {
  const { conceptIndex } = req.body || {};
  const ci = parseInt(conceptIndex);
  const lesson = await Lesson.findOne({ _id: req.params.id, createdBy: req.user.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  const concept = lesson.concepts[ci];
  if (!concept) return res.status(400).json({ error: "Invalid conceptIndex" });
  if ((concept.microGames || []).length >= MAX_GAMES_PER_CONCEPT) return res.status(400).json({ error: "This concept already has as many games as it can hold" });

  let plan;
  try {
    plan = await buildDiagram({ topic: lesson.topic, concept: concept.conceptName, summary: concept.summary });
  } catch (e) {
    return res.status(502).json({ error: e.message || "Could not draw the diagram." });
  }

  const boxes = diagramBoxes();
  // Find where each part ended up in the drawing.
  const spotOf = name => {
    const i = plan.parts.findIndex(p => p.toLowerCase() === String(name || "").toLowerCase());
    return i >= 0 ? i : 0;
  };

  const games = [];
  // 1) click ONE part
  const singleIndex = spotOf(plan.single);
  games.push({
    type: "DIAGRAM_HOTSPOT",
    prompt: `Click the ${plan.single} in the diagram.`,
    answer: plan.single,
    explanation: `The ${plan.single} is the part shown in the diagram.`,
    svg: plan.svg,
    hotspot: { ...boxes[singleIndex], label: plan.single },
    hint: `Look for the shape labelled ${plan.single}.`,
    level: 2,
  });

  // 2) click EVERY part of a group
  const pairIndexes = (plan.pair || []).map(spotOf).filter((v, i, a) => a.indexOf(v) === i);
  if (pairIndexes.length >= 2) {
    const names = pairIndexes.map(i => plan.parts[i]);
    games.push({
      type: "MULTI_LABEL",
      prompt: `Click every ${plan.pair.length === 2 ? names.join(" and ") : "part of the group"} in the diagram.`,
      answer: names.sort().join("|"),
      explanation: `Both ${names.join(" and ")} belong to the same group.`,
      svg: plan.svg,
      hotspots: pairIndexes.map(i => ({ ...boxes[i], label: plan.parts[i] })),
      hint: `There are ${pairIndexes.length} to find.`,
      level: 3,
    });
  }

  // The same rules as every other game.
  const checked = games.map(g => validateGame(g, { hasImage: false }));
  const good = checked.filter(c => c.ok).map(c => c.game);
  if (!good.length) return res.status(502).json({ error: checked[0]?.errors?.join("; ") || "Could not build the diagram games." });

  concept.microGames.push(...good);
  lesson.markModified("concepts");
  await lesson.save();
  res.json({ games: good, parts: plan.parts, title: plan.title });
});

// SHARE: create (or stop) a read-only public link for this lesson
const shareLesson = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOne({ _id: req.params.id, createdBy: req.user.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  if (req.method === "DELETE") {
    lesson.shared = false;
    await lesson.save();
    return res.json({ shared: false });
  }

  if (!lesson.shareToken) lesson.shareToken = crypto.randomBytes(12).toString("hex");
  lesson.shared = true;
  await lesson.save();
  res.json({ shared: true, token: lesson.shareToken, path: `/shared/${lesson.shareToken}` });
});

// GET A SHARED LESSON (public — no login needed, read only)
const getSharedLesson = asyncHandler(async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!token) return res.status(400).json({ error: "Missing token" });
  const lesson = await Lesson.findOne({ shareToken: token, shared: true })
    .select("topic sourceType imageUrl concepts createdAt shareToken")
    .lean();
  if (!lesson) return res.status(404).json({ error: "This link is not valid any more" });

  // Never leak who owns the lesson.
  res.json({
    lesson: {
      topic: lesson.topic,
      sourceType: lesson.sourceType,
      imageUrl: lesson.imageUrl,
      concepts: lesson.concepts,
      createdAt: lesson.createdAt,
    },
  });
});

// DELETE: remove lesson + its image + its weak-concept entries
const deleteLesson = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  removeImage(lesson.imagePublicId);
  await UserProgress.updateOne({ userId: req.user.id }, { $pull: { weakConcepts: { lessonId: lesson._id } } });
  res.json({ deleted: true });
});

// CUSTOM GAME: add one hand-written game to a concept
// body: { conceptIndex, type, prompt, answer, options?, hint?, explanation?, level? }
const addCustomGame = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOne({ _id: req.params.id, createdBy: req.user.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const { conceptIndex, type, prompt, answer, options, hint, explanation, level } = req.body || {};
  const ci = parseInt(conceptIndex);
  if (Number.isNaN(ci) || !lesson.concepts[ci]) return res.status(400).json({ error: "Invalid conceptIndex" });
  if (!ADDABLE_TYPES.includes(type)) return res.status(400).json({ error: "That game type cannot be added by hand." });
  if (!prompt || String(prompt).trim().length < 5) return res.status(400).json({ error: "Prompt is too short." });

  const concept = lesson.concepts[ci];
  if ((concept.microGames || []).length >= MAX_GAMES_PER_CONCEPT) {
    return res.status(400).json({ error: "This concept already has as many games as it can hold." });
  }

  const raw = {
    type,
    prompt: String(prompt).trim(),
    answer: String(answer ?? "").trim(),
    options: Array.isArray(options) ? options.map((o) => String(o).trim()).filter(Boolean) : [],
    hint: String(hint ?? "").trim(),
    explanation: String(explanation ?? "").trim(),
    level: LEVELS.includes(Number(level)) ? Number(level) : 2,
  };

  const result = validateGame(raw, { hasImage: !!lesson.imageUrl });
  if (!result.ok) return res.status(400).json({ error: result.errors.join("; "), details: result.errors });

  const duplicate = (concept.microGames || []).some(
    (g) => g.prompt && result.game.prompt && g.prompt.toLowerCase() === result.game.prompt.toLowerCase()
  );
  if (duplicate) return res.status(409).json({ error: "This question already exists in the lesson." });

  concept.microGames.push(result.game);
  lesson.markModified("concepts");
  await lesson.save();

  res.json({ game: result.game, conceptIndex: ci });
});

module.exports = { generateLesson, importLesson, getLessons, getLesson, getSession, regenerateGame, addGames, addDiagram, copyAssignedLesson, shareLesson, getSharedLesson, deleteLesson, addCustomGame };
