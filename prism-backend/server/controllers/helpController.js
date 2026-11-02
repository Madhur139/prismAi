/**
 * controllers/helpController.js
 * ----------------------------------------------------------------------------
 * The help board: a learner gets stuck, posts the question (with a picture if
 * they have one), and anybody can answer it.
 *
 *   createRequest  -> POST   /api/help            (ask a question)
 *   listRequests   -> GET    /api/help            (the global board)
 *   getRequest     -> GET    /api/help/:id        (one question + answers)
 *   answerRequest  -> POST   /api/help/:id/answer (help somebody out)
 *   acceptAnswer   -> POST   /api/help/:id/accept (the asker picks the answer)
 *   closeRequest   -> POST   /api/help/:id/close  (never mind)
 *   myRequests     -> GET    /api/help/mine
 */
const HelpRequest = require("../models/HelpRequest");
const UserProgress = require("../models/UserProgress");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidId } = require("../utils/helpers");
const crypto = require("crypto");
const { saveImage, removeImage, absoluteUrl } = require("../services/imageStorage");
const { HELP_ANSWER_XP } = require("../config/constants");

// Compare two answers the way the rest of the app does.
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Is this answer right? Exact match, or the answer contained in the reply. */
function isRight(said, correct) {
  if (!correct) return false;
  const a = norm(said), c = norm(correct);
  if (!a || !c) return false;
  if (a === c) return true;
  // "the answer is 96" should still count as "96"
  return a.includes(c) || c.includes(a);
}

/** What a helper is allowed to see. The correct answer stays hidden. */
const publicView = (r, meId) => ({
  _id: r._id,
  askerId: r.askerId,
  askerName: r.askerName,
  lessonId: r.lessonId,
  conceptName: r.conceptName,
  gameType: r.gameType,
  title: r.title,
  prompt: r.prompt,
  note: r.note,
  imageUrl: r.imageUrl,
  status: r.status,
  createdAt: r.createdAt,
  solvedAt: r.solvedAt,
  answerCount: (r.answers || []).length,
  hasCorrectAnswer: (r.answers || []).some((a) => a.correct),
  mine: String(r.askerId) === String(meId),
  answers: (r.answers || []).map((a) => ({
    id: a.id,
    userId: a.userId,
    userName: a.userName,
    text: a.text,
    imageUrl: a.imageUrl,
    correct: a.correct,
    accepted: a.accepted,
    at: a.at,
  })),
  // The asker may see the answer of their own question once somebody has got
  // it right (or once it is solved). Helpers never see it.
  correctAnswer:
    String(r.askerId) === String(meId) && (r.status === "solved" || (r.answers || []).some((a) => a.correct))
      ? r.correctAnswer
      : undefined,
});

/* ---------- ask a question ---------- */
const createRequest = asyncHandler(async (req, res) => {
  const Lesson = require("../models/Lesson");
  const { lessonId, conceptIndex, gameIndex } = req.body || {};
  const note = String(req.body?.note || "").slice(0, 500);

  /*
    When the question comes from a lesson, the server reads the game itself.
    That way the correct answer cannot be tampered with, and the question
    text always matches what the learner was actually looking at.
  */
  let title = String(req.body?.title || req.body?.prompt || "").trim().slice(0, 200);
  let prompt = String(req.body?.prompt || title).slice(0, 1000);
  let correctAnswer = "";
  let conceptName = String(req.body?.conceptName || "").slice(0, 120);
  let gameType = String(req.body?.gameType || "").slice(0, 40);
  let sourceLesson = null;

  if (lessonId && isValidId(lessonId) && conceptIndex !== undefined && gameIndex !== undefined) {
    const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user.id }).select("concepts").lean();
    const concept = lesson?.concepts?.[Number(conceptIndex)];
    const game = concept?.microGames?.[Number(gameIndex)];
    if (game) {
      sourceLesson = lesson._id;
      prompt = String(game.prompt || "").slice(0, 1000);
      title = (prompt || game.answer || "A question").split(/[.?]/)[0].slice(0, 160);
      correctAnswer = String(game.answer || "").slice(0, 200);
      conceptName = String(concept.conceptName || "").slice(0, 120);
      gameType = String(game.type || "").slice(0, 40);
    }
  }

  if (!title && !prompt) return res.status(400).json({ error: "The question cannot be empty" });

  const file = req.file;
  let imageUrl = "", imagePublicId = "";
  if (file) {
    try {
      const saved = await saveImage(file.buffer, { userId: req.user.id, mimetype: file.mimetype });
      // The picture must load in the browser, so it needs a full address.
      imageUrl = absoluteUrl(req, saved.secure_url);
      imagePublicId = saved.public_id;
    } catch (e) {
      // A picture is a nice extra, not a reason to fail the whole request.
      console.warn("Help image upload failed:", e.message);
    }
  }

  const request = await HelpRequest.create({
    askerId: req.user.id,
    askerName: req.user.name || "A learner",
    lessonId: sourceLesson,
    conceptName,
    gameType,
    title: title || prompt.slice(0, 160),
    prompt,
    note,
    imageUrl,
    imagePublicId,
    // Kept on the server so helpers' answers can be checked.
    correctAnswer,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.status(201).json({ request: publicView(request, req.user.id) });
});

/* ---------- the board ---------- */
const listRequests = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 60);
  const filter = req.query.status ? { status: String(req.query.status) } : {};
  const rows = await HelpRequest.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ requests: rows.map((r) => publicView(r, req.user.id)) });
});

/* ---------- one question ---------- */
const getRequest = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad request id" });
  const r = await HelpRequest.findById(req.params.id).lean();
  if (!r) return res.status(404).json({ error: "That question is gone" });
  res.json({ request: publicView(r, req.user.id) });
});

/* ---------- answer somebody ---------- */
const answerRequest = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad request id" });
  const text = String(req.body?.text || "").trim().slice(0, 1000);
  if (!text) return res.status(400).json({ error: "Write your answer" });

  const r = await HelpRequest.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "That question is gone" });
  if (r.status === "solved") return res.status(409).json({ error: "This question already has an answer" });

  const file = req.file;
  let imageUrl = "", imagePublicId = "";
  if (file) {
    try {
      const saved = await saveImage(file.buffer, { userId: req.user.id, mimetype: file.mimetype });
      imageUrl = absoluteUrl(req, saved.secure_url);
      imagePublicId = saved.public_id;
    } catch (e) {
      console.warn("Help answer image upload failed:", e.message);
    }
  }

  const correct = isRight(text, r.correctAnswer);
  r.answers.push({
    id: crypto.randomBytes(4).toString("hex"),
    userId: req.user.id,
    userName: req.user.name || "A learner",
    text,
    imageUrl,
    imagePublicId,
    correct,
    at: new Date(),
  });
  await r.save();

  // A correct answer is worth something, even before it is accepted.
  if (correct) {
    const progress = await UserProgress.findOne({ userId: req.user.id });
    if (progress) {
      progress.totalXP += HELP_ANSWER_XP;
      await progress.save();
    }
  }

  res.status(201).json({ request: publicView(r, req.user.id), correct, xp: correct ? HELP_ANSWER_XP : 0 });
});

/* ---------- the asker picks the answer ---------- */
const acceptAnswer = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad request id" });
  const r = await HelpRequest.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "That question is gone" });
  if (String(r.askerId) !== String(req.user.id)) return res.status(403).json({ error: "This is not your question" });

  // The answer is picked by its id, never by its time: two answers can land
  // in the same millisecond.
  const accepted = (r.answers || []).find((a) => a.id && a.id === String(req.body?.id || ""));
  if (!accepted) return res.status(400).json({ error: "Pick one of the answers" });

  r.answers.forEach((a) => { a.accepted = a === accepted; });
  r.status = "solved";
  r.solvedAt = new Date();
  await r.save();

  res.json({ request: publicView(r, req.user.id) });
});

/* ---------- close it ---------- */
const closeRequest = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad request id" });
  const r = await HelpRequest.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "That question is gone" });
  if (String(r.askerId) !== String(req.user.id)) return res.status(403).json({ error: "This is not your question" });
  r.status = "solved";
  r.solvedAt = new Date();
  await r.save();
  res.json({ request: publicView(r, req.user.id) });
});

/* ---------- my questions ---------- */
const myRequests = asyncHandler(async (req, res) => {
  const rows = await HelpRequest.find({ askerId: req.user.id }).sort({ createdAt: -1 }).limit(30).lean();
  res.json({ requests: rows.map((r) => publicView(r, req.user.id)) });
});

/*
  DELETE a question.
  The person who asked can always remove their own question, and a teacher
  can remove any of them (the board needs somebody who can tidy it up).
  The attached pictures go with it.
*/
const deleteRequest = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad request id" });
  const r = await HelpRequest.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "That question is gone" });

  const isOwner = String(r.askerId) === String(req.user.id);
  if (!isOwner && req.user.role !== "teacher") return res.status(403).json({ error: "This is not your question" });

  // Take the pictures with it.
  removeImage(r.imagePublicId);
  (r.answers || []).forEach((a) => { if (a.imagePublicId) removeImage(a.imagePublicId); });

  await HelpRequest.deleteOne({ _id: r._id });
  res.json({ deleted: true });
});

module.exports = { createRequest, listRequests, getRequest, answerRequest, acceptAnswer, closeRequest, myRequests, deleteRequest };
