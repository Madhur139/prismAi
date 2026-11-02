/**
 * controllers/classDuelController.js
 * ----------------------------------------------------------------------------
 * A CLASS DUEL: everybody who joins answers the SAME rounds at the same time
 * and the leaderboard is polled from the server - the same trick the 2-player
 * duel uses, so no websockets are needed.
 *
 *   createClassDuel -> POST /api/classduel              { lessonId, size?, title? }
 *   joinClassDuel   -> POST /api/classduel/:code/join
 *   getClassDuel    -> GET  /api/classduel/:code        (poll the state)
 *   answerClassDuel -> POST /api/classduel/:code/answer { correct, timeMs }
 *   listClassDuels  -> GET  /api/classduel/mine
 */
const Lesson = require("../models/Lesson");
const ClassDuel = require("../models/ClassDuel");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidId } = require("../utils/helpers");

const isTeacher = (user) => user.role === "teacher";

// A short code people can read out loud: "A7K2".
const newCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// Pick the rounds for the duel out of one lesson.
function roundsFromLesson(lesson, size) {
  const pool = [];
  (lesson.concepts || []).forEach((c) => (c.microGames || []).forEach((g) => pool.push({ conceptName: c.conceptName, game: g })));
  const picked = [];
  const bag = [...pool];
  while (picked.length < size && bag.length) picked.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  return picked;
}

// CREATE a class duel
const createClassDuel = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  const { lessonId, title } = req.body || {};
  if (!isValidId(lessonId)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user.id }).lean();
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const size = Math.min(Math.max(parseInt(req.body?.size) || 8, 4), 15);
  const rounds = roundsFromLesson(lesson, size);
  if (!rounds.length) return res.status(400).json({ error: "That lesson has no questions yet" });

  const code = newCode();
  const duel = await ClassDuel.create({
    code,
    classroomCode: req.user.classCode || "",
    teacherId: req.user.id,
    teacherName: req.user.name,
    title: String(title || lesson.topic).slice(0, 120),
    lessonId: lesson._id,
    rounds,
    status: "waiting",
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });
  res.status(201).json({ code: duel.code, title: duel.title, rounds: duel.rounds.length });
});

// JOIN a class duel
const joinClassDuel = asyncHandler(async (req, res) => {
  const code = String(req.params.code || "").toUpperCase().trim();
  const duel = await ClassDuel.findOne({ code });
  if (!duel) return res.status(404).json({ error: "No duel with that code" });
  if (duel.status === "done") return res.status(409).json({ error: "That duel has already finished" });
  if (duel.players.some((p) => String(p.userId) === String(req.user.id))) {
    return res.json({ code: duel.code, status: duel.status, already: true });
  }
  duel.players.push({ userId: req.user.id, name: req.user.name, score: 0, answered: false });
  await duel.save();
  res.json({ code: duel.code, status: duel.status, players: duel.players.length });
});

// POLL the state of a class duel
const getClassDuel = asyncHandler(async (req, res) => {
  const code = String(req.params.code || "").toUpperCase().trim();
  const duel = await ClassDuel.findOne({ code });
  if (!duel) return res.status(404).json({ error: "Duel not found" });

  const me = duel.players.find((p) => String(p.userId) === String(req.user.id));
  const isHost = String(duel.teacherId) === String(req.user.id);
  if (!me && !isHost) return res.status(403).json({ error: "You are not in this duel" });

  const round = duel.rounds[duel.roundIndex] || null;
  // The leaderboard, best first.
  const leaderboard = [...duel.players]
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .map((p, i) => ({ name: p.name, score: p.score, place: i + 1, answered: p.answered, isMe: String(p.userId) === String(req.user.id) }));

  res.json({
    code: duel.code,
    status: duel.status,
    title: duel.title,
    teacherName: duel.teacherName,
    roundIndex: duel.roundIndex,
    total: duel.rounds.length,
    myScore: me?.score ?? 0,
    myRank: leaderboard.findIndex((p) => p.isMe) + 1,
    iAnswered: !!me?.answered,
    players: duel.players.length,
    leaderboard,
    round: round ? { conceptName: round.conceptName, game: round.game } : null,
  });
});

// ANSWER the current round
const answerClassDuel = asyncHandler(async (req, res) => {
  const code = String(req.params.code || "").toUpperCase().trim();
  const duel = await ClassDuel.findOne({ code });
  if (!duel) return res.status(404).json({ error: "Duel not found" });
  if (duel.status !== "playing") return res.status(400).json({ error: "The duel is not running" });

  const me = duel.players.find((p) => String(p.userId) === String(req.user.id));
  if (!me) return res.status(403).json({ error: "You are not in this duel" });
  if (me.answered) return res.json({ ok: true, already: true });

  const correct = !!req.body?.correct;
  me.answered = true;
  if (correct) me.score += 1;

  // The round moves on once EVERY player has answered it.
  if (duel.players.length && duel.players.every((p) => p.answered)) {
    duel.roundIndex += 1;
    duel.players.forEach((p) => { p.answered = false; });
    if (duel.roundIndex >= duel.rounds.length) {
      duel.status = "done";
      duel.finishedAt = new Date();
    }
  }
  await duel.save();

  res.json({
    ok: true,
    status: duel.status,
    roundIndex: duel.roundIndex,
    myScore: me.score,
    waitingForOthers: duel.players.filter((p) => !p.answered).length,
  });
});

// START the duel (the teacher does this once everybody has joined)
const startClassDuel = asyncHandler(async (req, res) => {
  const code = String(req.params.code || "").toUpperCase().trim();
  const duel = await ClassDuel.findOne({ code });
  if (!duel) return res.status(404).json({ error: "Duel not found" });
  if (String(duel.teacherId) !== String(req.user.id)) return res.status(403).json({ error: "Only the teacher can start the duel" });
  if (duel.status === "done") return res.status(409).json({ error: "That duel has already finished" });
  if (!duel.players.length) return res.status(400).json({ error: "Nobody has joined yet" });
  duel.status = "playing";
  await duel.save();
  res.json({ code: duel.code, status: duel.status, players: duel.players.length });
});

// MY duels - the ones I am in, the ones I made, and the ones open to my class
const listClassDuels = asyncHandler(async (req, res) => {
  const classroomCode = req.user.classCode || "";
  const or = [{ teacherId: req.user.id }, { "players.userId": req.user.id }];
  // A student also sees the duels their class has been invited to.
  if (classroomCode) or.push({ classroomCode });

  const duels = await ClassDuel.find({
    $or: or,
    status: { $ne: "done" },
  })
    .select("code status title teacherName roundIndex players expiresAt createdAt classroomCode")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json({
    duels: duels.map((d) => ({
      code: d.code,
      status: d.status,
      title: d.title,
      teacherName: d.teacherName,
      roundIndex: d.roundIndex,
      players: d.players?.length || 0,
      expiresAt: d.expiresAt,
    })),
  });
});

module.exports = { createClassDuel, joinClassDuel, startClassDuel, getClassDuel, answerClassDuel, listClassDuels };
