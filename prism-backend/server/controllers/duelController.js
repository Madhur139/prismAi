/**
 * controllers/duelController.js
 * ----------------------------------------------------------------------------
 * A head-to-head run. Two players answer the SAME rounds; the score is polled
 * from the server, so no websockets are needed.
 *   createDuel  -> POST   /api/duel              { lessonId?, size? } -> { code }
 *   joinDuel    -> POST   /api/duel/join         { code }
 *   getDuel     -> GET    /api/duel/:code        (poll the state)
 *   answerDuel  -> POST   /api/duel/:code/answer { correct, timeMs }
 *   listDuels   -> GET    /api/duel/mine
 */
const Lesson = require("../models/Lesson");
const Duel = require("../models/Duel");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidId } = require("../utils/helpers");
const crypto = require("crypto");

// A short code people can read out loud: "A7K2".
const newCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// Pick the rounds for the duel out of the host's own lessons.
async function pickRounds(userId, size) {
  const lessons = await Lesson.find({ createdBy: userId }).select("concepts").lean();
  const pool = [];
  lessons.forEach((l) =>
    (l.concepts || []).forEach((c) =>
      (c.microGames || []).forEach((g) => pool.push({ conceptName: c.conceptName, game: g }))
    )
  );
  if (!pool.length) return [];
  const picked = [];
  const bag = [...pool];
  while (picked.length < size && bag.length) picked.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  return picked;
}

// CREATE a duel (the host waits for a second player)
const createDuel = asyncHandler(async (req, res) => {
  const size = Math.min(Math.max(parseInt(req.body?.size) || 8, 4), 15);
  const rounds = await pickRounds(req.user.id, size);
  if (!rounds.length) return res.status(400).json({ error: "Create a lesson first — the duel uses your own questions" });

  const code = newCode();
  const duel = await Duel.create({
    code,
    hostId: req.user.id,
    hostName: req.user.name,
    rounds,
    status: "waiting",
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });
  res.status(201).json({ code: duel.code });
});

// JOIN a duel with its code
const joinDuel = asyncHandler(async (req, res) => {
  const code = String(req.body?.code || "").toUpperCase().trim();
  if (!code) return res.status(400).json({ error: "Enter the duel code" });
  const duel = await Duel.findOne({ code });
  if (!duel) return res.status(404).json({ error: "No duel with that code" });
  if (duel.hostId.toString() === req.user.id.toString()) return res.status(400).json({ error: "You cannot duel yourself" });
  if (duel.guestId) return res.status(409).json({ error: "That duel already has two players" });
  if (duel.status !== "waiting") return res.status(409).json({ error: "That duel has already started" });

  duel.guestId = req.user.id;
  duel.guestName = req.user.name;
  duel.status = "playing";
  await duel.save();
  res.json({ code: duel.code, status: duel.status });
});

// POLL the state of a duel
const getDuel = asyncHandler(async (req, res) => {
  const duel = await Duel.findOne({ code: String(req.params.code || "").toUpperCase().trim() });
  if (!duel) return res.status(404).json({ error: "Duel not found" });

  const isHost = duel.hostId.toString() === req.user.id.toString();
  const isGuest = duel.guestId && duel.guestId.toString() === req.user.id.toString();
  if (!isHost && !isGuest) return res.status(403).json({ error: "This is not your duel" });

  const me = isHost ? "host" : "guest";
  const them = isHost ? "guest" : "host";
  const round = duel.rounds[duel.roundIndex] || null;

  res.json({
    code: duel.code,
    status: duel.status,
    hostName: duel.hostName,
    guestName: duel.guestName,
    roundIndex: duel.roundIndex,
    total: duel.rounds.length,
    myScore: duel.scores[me],
    theirScore: duel.scores[them],
    iAnswered: duel.answered[me],
    theyAnswered: duel.answered[them],
    // The round both players are working on right now.
    round: round ? { conceptName: round.conceptName, game: round.game } : null,
  });
});

// ANSWER the current round
const answerDuel = asyncHandler(async (req, res) => {
  const duel = await Duel.findOne({ code: String(req.params.code || "").toUpperCase().trim() });
  if (!duel) return res.status(404).json({ error: "Duel not found" });
  if (duel.status !== "playing") return res.status(400).json({ error: "The duel is not running" });

  const isHost = duel.hostId.toString() === req.user.id.toString();
  const isGuest = duel.guestId && duel.guestId.toString() === req.user.id.toString();
  if (!isHost && !isGuest) return res.status(403).json({ error: "This is not your duel" });

  const side = isHost ? "host" : "guest";
  if (duel.answered[side]) return res.json({ ok: true, already: true });

  const correct = !!req.body?.correct;
  const timeMs = Math.max(0, Math.min(Number(req.body?.timeMs) || 0, 10 * 60 * 1000));
  duel.answered[side] = true;
  if (correct) duel.scores[side] += 1;

  // The round moves on once BOTH players have answered it.
  if (duel.answered.host && duel.answered.guest) {
    duel.roundIndex += 1;
    duel.answered.host = false;
    duel.answered.guest = false;
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
    myScore: duel.scores[side],
    waitingForThem: !duel.answered[side === "host" ? "guest" : "host"],
  });
});

// MY duels (waiting or running)
const listDuels = asyncHandler(async (req, res) => {
  const duels = await Duel.find({
    $or: [{ hostId: req.user.id }, { guestId: req.user.id }],
    status: { $ne: "done" },
  })
    .select("code status hostName guestName roundIndex expiresAt")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json({ duels });
});

// The other player's name, used while waiting for them to join.
const getPublicDuel = asyncHandler(async (req, res) => {
  const duel = await Duel.findOne({ code: String(req.params.code || "").toUpperCase().trim() })
    .select("code status hostName guestName roundIndex expiresAt")
    .lean();
  if (!duel) return res.status(404).json({ error: "Duel not found" });
  res.json({ duel });
});

module.exports = { createDuel, joinDuel, getDuel, answerDuel, listDuels, getPublicDuel };
