/**
 * controllers/groupRoomController.js
 * ----------------------------------------------------------------------------
 * Two things that happen inside a study group:
 *   CHAT            - talk to the people you work with
 *   STUDY TOGETHER  - everybody answers the same rounds at the same time
 */
const StudyGroup = require("../models/StudyGroup");
const GroupMessage = require("../models/GroupMessage");
const GroupRoom = require("../models/GroupRoom");
const Lesson = require("../models/Lesson");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidId } = require("../utils/helpers");
const crypto = require("crypto");

/** Is this person in the group? */
async function memberOf(groupId, userId) {
  const group = await StudyGroup.findById(groupId);
  if (!group) return { group: null, member: false };
  const member = (group.members || []).some((m) => String(m.userId) === String(userId));
  return { group, member };
}

/* ---------- chat ---------- */

// THE MESSAGES (newest last, so the page can just append them)
const listMessages = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const { member } = await memberOf(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: "You are not in this group" });

  const since = req.query.since ? new Date(req.query.since) : null;
  const filter = { groupId: req.params.id };
  if (since && !Number.isNaN(since.getTime())) filter.at = { $gt: since };

  const messages = await GroupMessage.find(filter).sort({ at: 1 }).limit(200).lean();
  res.json({ messages });
});

// WRITE A MESSAGE
const sendMessage = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const text = String(req.body?.text || "").trim().slice(0, 1000);
  if (!text) return res.status(400).json({ error: "Nothing to say" });
  const { member } = await memberOf(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: "You are not in this group" });

  const message = await GroupMessage.create({
    groupId: req.params.id,
    userId: req.user.id,
    userName: req.user.name || "A learner",
    text,
  });
  res.status(201).json({ message });
});

// A note in the chat that nobody can answer (joins, leaves, shared a lesson)
const systemMessage = async (groupId, text) => {
  try { await GroupMessage.create({ groupId, userName: "", text, kind: "system" }); } catch { /* not important */ }
};

/* ---------- study together ---------- */

// Start a room: everybody plays the same rounds.
const createRoom = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const { group, member } = await memberOf(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: "That group is gone" });
  if (!member) return res.status(403).json({ error: "You are not in this group" });

  // One room at a time per group.
  const running = await GroupRoom.findOne({ groupId: group._id, status: { $ne: "done" } });
  if (running) return res.json({ room: roomView(running, req.user.id) });

  const size = Math.min(Math.max(parseInt(req.body?.size) || 8, 4), 15);

  // Take the questions from the lessons the group shares.
  const ids = (group.lessons || []).map((l) => l.lessonId);
  const lessons = ids.length ? await Lesson.find({ _id: { $in: ids } }).select("concepts").lean() : [];
  const pool = [];
  lessons.forEach((l) =>
    (l.concepts || []).forEach((c) =>
      (c.microGames || []).forEach((g) => pool.push({ conceptName: c.conceptName, game: g }))
    )
  );
  if (!pool.length) return res.status(400).json({ error: "Share a lesson with the group first — the room uses your group's questions." });

  const picked = [];
  const bag = [...pool];
  while (picked.length < size && bag.length) picked.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);

  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const room = await GroupRoom.create({
    groupId: group._id,
    code,
    title: String(req.body?.title || `${group.name} — study together`).slice(0, 80),
    status: "waiting",
    rounds: picked,
    players: [{ userId: req.user.id, name: req.user.name || "Player" }],
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });
  await systemMessage(group._id, `${req.user.name || "Somebody"} started a study session.`);
  res.status(201).json({ room: roomView(room, req.user.id) });
});

// JOIN a room
const joinRoom = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const room = await GroupRoom.findOne({ code: String(code || "").toUpperCase() });
  if (!room) return res.status(404).json({ error: "That room is gone" });
  const { member } = await memberOf(room.groupId, req.user.id);
  if (!member) return res.status(403).json({ error: "You are not in this group" });
  if (!(room.players || []).some((p) => String(p.userId) === String(req.user.id))) {
    room.players.push({ userId: req.user.id, name: req.user.name || "Player" });
    await room.save();
    await systemMessage(room.groupId, `${req.user.name || "Somebody"} joined the study session.`);
  }
  res.json({ room: roomView(room, req.user.id) });
});

// POLL the room
const getRoom = asyncHandler(async (req, res) => {
  const room = await GroupRoom.findOne({ code: String(req.params.code || "").toUpperCase() });
  if (!room) return res.status(404).json({ error: "That room is gone" });
  const { member } = await memberOf(room.groupId, req.user.id);
  if (!member) return res.status(403).json({ error: "You are not in this group" });
  res.json({ room: roomView(room, req.user.id) });
});

// The same room, but found through the group (so the group page can poll it).
const getGroupRoom = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const { member } = await memberOf(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: "You are not in this group" });
  const room = await GroupRoom.findOne({ groupId: req.params.id, status: { $ne: "done" } }).sort({ createdAt: -1 });
  res.json({ room: room ? roomView(room, req.user.id) : null });
});

// BEGIN the session (the host starts it)
const startRoom = asyncHandler(async (req, res) => {
  const room = await GroupRoom.findOne({ code: String(req.params.code || "").toUpperCase() });
  if (!room) return res.status(404).json({ error: "That room is gone" });
  if (room.status !== "waiting") return res.status(400).json({ error: "The session has already started" });
  room.status = "playing";
  room.startedAt = new Date();
  await room.save();
  await systemMessage(room.groupId, "The study session has started. Same questions for everybody!");
  res.json({ room: roomView(room, req.user.id) });
});

// ANSWER the current round
const answerRoom = asyncHandler(async (req, res) => {
  const room = await GroupRoom.findOne({ code: String(req.params.code || "").toUpperCase() });
  if (!room) return res.status(404).json({ error: "That room is gone" });
  if (room.status !== "playing") return res.status(400).json({ error: "The session has not started" });

  const me = (room.players || []).find((p) => String(p.userId) === String(req.user.id));
  if (!me) return res.status(403).json({ error: "You are not in this session" });
  if (me.answered) return res.json({ ok: true, already: true });

  const correct = !!req.body?.correct;
  me.answered = true;
  if (correct) me.score += 1;

  // The round moves on once everybody has answered it.
  if ((room.players || []).every((p) => p.answered)) {
    room.roundIndex += 1;
    (room.players || []).forEach((p) => { p.answered = false; });
    if (room.roundIndex >= room.rounds.length) {
      room.status = "done";
      room.finishedAt = new Date();
      await systemMessage(room.groupId, "That is the last round. Nice work!");
    }
  }
  await room.save();
  res.json({ ok: true, room: roomView(room, req.user.id) });
});

/** What the client sees: the round, the leaderboard, and my place in it. */
function roomView(room, userId) {
  const players = [...(room.players || [])].sort((a, b) => b.score - a.score);
  const round = room.rounds[room.roundIndex] || null;
  return {
    code: room.code,
    title: room.title,
    groupId: room.groupId,
    status: room.status,
    roundIndex: room.roundIndex,
    total: room.rounds.length,
    players: players.map((p) => ({
      userId: p.userId,
      name: p.name,
      score: p.score,
      answered: p.answered,
      me: String(p.userId) === String(userId),
    })),
    round: round ? { conceptName: round.conceptName, game: round.game } : null,
  };
}

module.exports = { listMessages, sendMessage, systemMessage, createRoom, joinRoom, getRoom, getGroupRoom, startRoom, answerRoom, roomView };
