/**
 * controllers/classroomController.js
 * ----------------------------------------------------------------------------
 * The classroom, part two:
 *   listClassrooms   -> GET  /api/teacher/classrooms   (all my named classes)
 *   createClassroom  -> POST /api/teacher/classrooms   (a new named class)
 *   updateClassroom  -> PATCH /api/teacher/classrooms/:id
 *   importRoster    -> POST /api/teacher/classrooms/:id/roster (paste names)
 *   getMyClassroom   -> GET  /api/teacher/my-class     (the class I joined)
 *   getClassWeekly   -> GET  /api/teacher/weekly      (the class weekly report)
 *   getClassInsight  -> POST /api/teacher/insight     (AI: what to reteach)
 */
const User = require("../models/User");
const UserProgress = require("../models/UserProgress");
const Assignment = require("../models/Assignment");
const Classroom = require("../models/Classroom");
const asyncHandler = require("../middleware/asyncHandler");
const { askJSON, fail } = require("../utils/askAI");
const { SchemaType } = require("@google/generative-ai");
const { isValidId } = require("../utils/helpers");

const isTeacher = (user) => user.role === "teacher";

// A readable class code, e.g. "K7P-42QX".
const newClassCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const pick = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  return `${pick(4)}-${pick(4)}`;
};

// A personal join code for one student, e.g. "M4K7-QP2D".
const newInviteCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  return `${pick(4)}-${pick(4)}`;
};

// UTC day key, the same format the progress history uses.
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/* ---------- named classes ---------- */

// ALL my classes
const listClassrooms = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  const rooms = await Classroom.find({ teacherId: req.user.id }).sort({ createdAt: 1 }).lean();
  // How many students are in each class.
  const students = await User.find({ classCode: { $in: rooms.map((r) => r.code) }, role: { $ne: "teacher" } })
    .select("classCode")
    .lean();
  const perRoom = new Map();
  students.forEach((s) => perRoom.set(s.classCode, (perRoom.get(s.classCode) || 0) + 1));
  res.json({
    classrooms: rooms.map((r) => ({
      _id: r._id,
      code: r.code,
      name: r.name,
      subject: r.subject,
      studentCount: perRoom.get(r.code) || 0,
      inviteCount: (r.invites || []).filter((i) => !i.used).length,
      createdAt: r.createdAt,
    })),
  });
});

// CREATE a named class
const createClassroom = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  const name = String(req.body?.name || "").trim().slice(0, 80);
  const subject = String(req.body?.subject || "").trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: "Give the class a name" });

  let code = String(req.body?.code || "").toUpperCase().trim() || newClassCode();
  if (!/^[A-Z0-9-]{4,16}$/.test(code)) return res.status(400).json({ error: "A class code looks like ABCD-1234" });
  // The code must be free everywhere: on a teacher account and on a class.
  const clash = await Classroom.findOne({ code });
  const clashUser = await User.findOne({ classCode: code, role: "teacher" });
  if (clash || clashUser) return res.status(409).json({ error: "That code is taken" });

  const room = await Classroom.create({ code, teacherId: req.user.id, name, subject });
  // The first class also becomes the teacher's main class code.
  if (!req.user.classCode) await User.updateOne({ _id: req.user.id }, { classCode: code });
  res.status(201).json({ classroom: { _id: room._id, code: room.code, name: room.name, subject: room.subject } });
});

// RENAME a class
const updateClassroom = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad class id" });
  const room = await Classroom.findOne({ _id: req.params.id, teacherId: req.user.id });
  if (!room) return res.status(404).json({ error: "Class not found" });
  if (req.body?.name !== undefined) room.name = String(req.body.name).trim().slice(0, 80);
  if (req.body?.subject !== undefined) room.subject = String(req.body.subject).trim().slice(0, 60);
  await room.save();
  res.json({ classroom: { _id: room._id, code: room.code, name: room.name, subject: room.subject } });
});

/*
  ROSTER IMPORT
  The teacher pastes a list of names (one per line, or "Name, email"). Each
  student gets their own join code, so nobody has to type a shared code by hand.
*/
const importRoster = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad class id" });
  const room = await Classroom.findOne({ _id: req.params.id, teacherId: req.user.id });
  if (!room) return res.status(404).json({ error: "Class not found" });

  const raw = String(req.body?.roster || "");
  const lines = raw.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean).slice(0, 200);
  if (!lines.length) return res.status(400).json({ error: "Paste at least one name" });

  const added = [];
  for (const line of lines) {
    const [name, email] = line.split(/[,;\t]/).map((s) => String(s || "").trim());
    if (!name) continue;
    // Never hand out the same code twice.
    let code = newInviteCode();
    let clash = true;
    while (clash) {
      clash = !!(await Classroom.findOne({ "invites.code": code }));
      if (clash) code = newInviteCode();
    }
    room.invites.push({ name: name.slice(0, 80), email: (email || "").slice(0, 120), code, used: false });
    added.push({ name, email: email || "", code });
  }
  await room.save();
  res.json({ added, count: added.length });
});

/* ---------- the class a student belongs to ---------- */

const getMyClassroom = asyncHandler(async (req, res) => {
  const code = req.user.classCode || "";
  if (!code) return res.json({ joined: false, classroom: null, teacher: null });
  const teacher = await User.findOne({ classCode: code, role: "teacher" }).select("name email").lean();
  const room = await Classroom.findOne({ code, teacherId: teacher?._id }).lean();
  res.json({
    joined: true,
    classroom: room ? { code: room.code, name: room.name, subject: room.subject } : { code, name: "", subject: "" },
    teacher: teacher ? { name: teacher.name, email: teacher.email } : null,
  });
});

/* ---------- the class weekly report ---------- */

/*
  The class weekly report: how the whole class did in the last seven days,
  compared with the seven days before. Same shape as the personal one.
*/
const getClassWeekly = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  const classCode = req.user.classCode || "";
  const students = await User.find({ classCode, role: { $ne: "teacher" } }).select("_id name").lean();
  const progress = await UserProgress.find({ userId: { $in: students.map((s) => s._id) } }).lean();

  const days = 7;
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1)));
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - days);

  const all = progress.flatMap((p) => p.attemptHistory || []);
  const inRange = (h, from, to) => {
    const t = new Date(h.at);
    return t >= from && t < to;
  };
  const thisWeek = all.filter((h) => inRange(h, start, new Date(start.getTime() + days * 86400000)));
  const prevWeek = all.filter((h) => inRange(h, prevStart, start));

  const sum = (list) => ({
    rounds: list.length,
    correct: list.filter((h) => h.correct).length,
    xp: list.reduce((s, h) => s + (h.xp || 0), 0),
  });
  const week = sum(thisWeek);
  const previousWeek = sum(prevWeek);

  // One row per day, for a small bar chart.
  const byDay = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = dayKey(d);
    const rows = thisWeek.filter((h) => dayKey(h.at) === key);
    byDay.push({ date: key, rounds: rows.length, correct: rows.filter((h) => h.correct).length, xp: rows.reduce((s, h) => s + (h.xp || 0), 0) });
  }

  // How many different students were active each day.
  const activeByDay = byDay.map((d) => {
    const who = new Set();
    thisWeek.filter((h) => dayKey(h.at) === d.date).forEach((h) => who.add(String(h.userId)));
    return who.size;
  });

  // Class-wide concept accuracy.
  const conceptStats = {};
  thisWeek.forEach((h) => {
    if (!h.conceptName) return;
    const c = conceptStats[h.conceptName] || (conceptStats[h.conceptName] = { conceptName: h.conceptName, n: 0, ok: 0 });
    c.n += 1;
    if (h.correct) c.ok += 1;
  });
  const concepts = Object.values(conceptStats)
    .filter((c) => c.n >= 2)
    .map((c) => ({ ...c, pct: Math.round((c.ok / c.n) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  // Who was active this week?
  const activeIds = new Set(thisWeek.map((h) => String(h.userId)));
  const active = students.filter((s) => activeIds.has(String(s._id))).length;

  // Assignments that are due and not finished yet.
  const assignments = await Assignment.find({ teacherId: req.user.id, dueAt: { $ne: null } }).lean();

  res.json({
    days,
    classSize: students.length,
    active,
    week,
    previousWeek,
    accuracy: week.rounds ? Math.round((week.correct / week.rounds) * 100) : null,
    previousAccuracy: previousWeek.rounds ? Math.round((previousWeek.correct / previousWeek.rounds) * 100) : null,
    byDay,
    activeByDay,
    strongest: concepts[0] || null,
    weakest: concepts.length ? concepts[concepts.length - 1] : null,
    concepts,
    openAssignments: assignments.length,
  });
});

/* ---------- the AI reteach note ---------- */

const INSIGHT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    nextSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    watchOut: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["headline", "summary", "nextSteps"],
};

/*
  AI RETEACH NOTE
  The AI looks at how the class is doing and writes a short note for the
  teacher: what to reteach next, and who to check in with.
*/
const getClassInsight = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  const classCode = req.user.classCode || "";
  const students = await User.find({ classCode, role: { $ne: "teacher" } }).select("_id name").lean();
  if (!students.length) return res.status(400).json({ error: "No students in your class yet" });
  const progress = await UserProgress.find({ userId: { $in: students.map((s) => s._id) } }).lean();

  // What the class is weak on, and who is struggling.
  const conceptMisses = new Map();
  const studentMisses = [];
  progress.forEach((p) => {
    const name = students.find((s) => String(s._id) === String(p.userId))?.name || "A student";
    let total = 0;
    (p.weakConcepts || []).forEach((w) => {
      conceptMisses.set(w.conceptName, (conceptMisses.get(w.conceptName) || 0) + (w.misses || 0));
      total += w.misses || 0;
    });
    if (total) studentMisses.push({ name, misses: total, weak: (p.weakConcepts || []).map((w) => w.conceptName).slice(0, 3) });
  });
  const weakConcepts = [...conceptMisses.entries()]
    .map(([conceptName, misses]) => ({ conceptName, misses }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, 8);
  const struggling = studentMisses.sort((a, b) => b.misses - a.misses).slice(0, 6);

  const rounds = progress.reduce((n, p) => n + (p.attemptHistory || []).length, 0);
  const correct = progress.reduce((n, p) => n + (p.attemptHistory || []).filter((h) => h.correct).length, 0);
  const accuracy = rounds ? Math.round((correct / rounds) * 100) : 0;
  const avgXp = progress.length ? Math.round(progress.reduce((s, p) => s + (p.totalXP || 0), 0) / progress.length) : 0;

  const room = await Classroom.findOne({ code: classCode, teacherId: req.user.id }).lean();

  const prompt = `You are Prism AI, helping a teacher plan their next lesson.

CLASS: ${room?.name || "a class"}${room?.subject ? ` (${room.subject})` : ""}
SIZE: ${students.length} students
ROUNDS PLAYED: ${rounds}
CLASS ACCURACY: ${accuracy}%
AVERAGE XP PER STUDENT: ${avgXp}

CONCEPTS THE CLASS IS WEAK ON (concept: total misses):
${weakConcepts.length ? weakConcepts.map((c) => `- ${c.conceptName} (${c.misses} misses)`).join("\n") : "- (none recorded yet)"}

STUDENTS WHO ARE STRUGGLING:
${struggling.length ? struggling.map((s) => `- ${s.name}: ${s.misses} misses, weak on ${s.weak.join(", ") || "several concepts"}`).join("\n") : "- (none recorded yet)"}

RULES
- "headline": one short sentence, the single most useful thing this teacher should do next.
- "summary": 2-3 sentences about how the class is really doing. Be honest but not harsh.
- "nextSteps": 3-4 short, concrete things to teach or set next.
- "watchOut": 1-3 students (by name) worth checking in with, and why. Use [] if nobody stands out.
- Plain text only. No markdown, no bullet characters, no headings.`;

  try {
    const r = await askJSON(prompt, INSIGHT_SCHEMA, 0.5);
    res.json({
      headline: String(r.headline || "").slice(0, 200),
      summary: String(r.summary || "").slice(0, 900),
      nextSteps: (r.nextSteps || []).map((s) => String(s).slice(0, 200)).slice(0, 6),
      watchOut: (r.watchOut || []).map((s) => String(s).slice(0, 200)).slice(0, 6),
      stats: { students: students.length, rounds, accuracy, weakConcepts, struggling },
    });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = {
  listClassrooms,
  createClassroom,
  updateClassroom,
  importRoster,
  getMyClassroom,
  getClassWeekly,
  getClassInsight,
};
