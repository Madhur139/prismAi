/**
 * controllers/teacherController.js
 * ----------------------------------------------------------------------------
 * Teacher mode:
 *   getMyClass      -> GET  /api/teacher/class       (my class + my students)
 *   createClass     -> POST /api/teacher/class       (make/refresh my class code)
 *   joinClass       -> POST /api/teacher/join        (student joins with a code)
 *   assignLesson    -> POST /api/teacher/assign      (assign a lesson)
 *   listAssignments -> GET  /api/teacher/assignments (mine + my students')
 *   deleteAssign    -> DELETE /api/teacher/assign/:id
 *   getStudentStats -> GET  /api/teacher/students/:id
 */
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const UserProgress = require("../models/UserProgress");
const Assignment = require("../models/Assignment");
const Classroom = require("../models/Classroom");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidId } = require("../utils/helpers");
const crypto = require("crypto");

const isTeacher = (user) => user.role === "teacher";

// Make a short, readable class code like "K7P-42QX".
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

/*
  All the students of a teacher's class, with their progress.
  Several endpoints need this, so it lives in one place.
*/
async function classStudents(classCode) {
  const students = await User.find({ classCode, role: { $ne: "teacher" } })
    .select("name email createdAt")
    .lean();
  const progress = await UserProgress.find({ userId: { $in: students.map((s) => s._id) } }).lean();
  const pMap = new Map(progress.map((p) => [String(p.userId), p]));
  return { students, pMap };
}

// CREATE / REFRESH the class code
const createClass = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  const code = req.body?.code ? String(req.body.code).toUpperCase().trim() : newClassCode();
  if (!/^[A-Z0-9-]{4,16}$/.test(code)) return res.status(400).json({ error: "A class code looks like ABCD-1234" });
  const clash = await User.findOne({ classCode: code, role: "teacher", _id: { $ne: req.user.id } });
  if (clash) return res.status(409).json({ error: "That code is taken" });

  await User.updateOne({ _id: req.user.id }, { classCode: code });
  // Keep a named classroom next to the code so the class has a name and a roster.
  const room = await Classroom.findOne({ code, teacherId: req.user.id });
  if (room) await room.updateOne({ $set: { code } });
  else await Classroom.create({ code, teacherId: req.user.id, name: `${req.user.name}'s class` });
  res.json({ classCode: code });
});

// MY CLASS: the students who joined with my code + their progress
const getMyClass = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  const classCode = req.user.classCode || "";
  const { students, pMap } = await classStudents(classCode);

  const rows = students.map((s) => {
    const p = pMap.get(String(s._id));
    const history = p?.attemptHistory || [];
    const correct = history.filter((h) => h.correct).length;
    const missCount = (p?.weakConcepts || []).reduce((n, w) => n + (w.misses || 0), 0);
    return {
      _id: s._id,
      name: s.name,
      email: s.email,
      joinedAt: s.createdAt,
      totalXP: p?.totalXP || 0,
      streakCount: p?.streakCount || 0,
      attempts: history.length,
      accuracy: history.length ? Math.round((correct / history.length) * 100) : null,
      weakConcepts: (p?.weakConcepts || []).map((w) => w.conceptName),
      missCount,
    };
  });

  // Which concepts are tripping up the most students? (the class's weak spots)
  const counts = new Map();
  rows.forEach((r) => new Set(r.weakConcepts).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)));
  const sharedWeak = [...counts.entries()]
    .map(([conceptName, count]) => ({ conceptName, count }))
    .sort((a, b) => b.count - a.count || a.conceptName.localeCompare(b.conceptName))
    .slice(0, 8);

  // The students who need the most help, worst first.
  const needsHelp = rows
    .filter((r) => r.missCount > 0)
    .sort((a, b) => b.missCount - a.missCount)
    .slice(0, 8)
    .map((r) => ({ _id: r._id, name: r.name, missCount: r.missCount, accuracy: r.accuracy, weakConcepts: r.weakConcepts.slice(0, 4) }));

  const room = classCode ? await Classroom.findOne({ code: classCode, teacherId: req.user.id }).lean() : null;

  res.json({
    classCode,
    className: room?.name || "",
    subject: room?.subject || "",
    students: rows,
    total: rows.length,
    sharedWeak,
    needsHelp,
  });
});

// A STUDENT JOINS a class with the teacher's code (or a personal invite code)
const joinClass = asyncHandler(async (req, res) => {
  const code = String(req.body?.code || "").toUpperCase().trim();
  if (!code) return res.status(400).json({ error: "Enter the class code" });

  // A personal invite code from the teacher's roster import.
  const room = await Classroom.findOne({ "invites.code": code });
  if (room) {
    const invite = room.invites.find((i) => i.code === code);
    if (invite?.used) return res.status(409).json({ error: "That invite code has already been used" });
    if (invite) invite.used = true;
    if (!room.studentIds.some((id) => String(id) === String(req.user.id))) room.studentIds.push(req.user.id);
    await room.save();
    await User.updateOne({ _id: req.user.id }, { classCode: room.code });
    const teacher = await User.findById(room.teacherId).select("name").lean();
    return res.json({
      joined: true,
      classCode: room.code,
      className: room.name,
      subject: room.subject,
      teacherName: teacher?.name || "",
    });
  }

  // The class code itself.
  const teacher = await User.findOne({ classCode: code, role: "teacher" });
  if (!teacher) return res.status(404).json({ error: "No class has that code" });
  await User.updateOne({ _id: req.user.id }, { classCode: code });
  const named = await Classroom.findOne({ code, teacherId: teacher._id });
  // Keep the roster on the classroom in step with who has joined.
  if (named && !named.studentIds.some((id) => String(id) === String(req.user.id))) {
    named.studentIds.push(req.user.id);
    await named.save();
  }
  res.json({
    joined: true,
    classCode: code,
    className: named?.name || "",
    subject: named?.subject || "",
    teacherName: teacher.name,
  });
});

// ASSIGN a lesson to the class
const assignLesson = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  const { lessonId, title, instructions, dueAt, targetRounds, targetAccuracy } = req.body || {};
  if (!isValidId(lessonId)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user.id });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const assignment = await Assignment.create({
    teacherId: req.user.id,
    lessonId,
    title: String(title || lesson.topic).slice(0, 120),
    instructions: String(instructions || "").slice(0, 500),
    dueAt: dueAt ? new Date(dueAt) : null,
    // What counts as "done": 0 means no target was set.
    targetRounds: Math.min(Math.max(parseInt(targetRounds) || 0, 0), 200),
    targetAccuracy: Math.min(Math.max(parseInt(targetAccuracy) || 0, 0), 100),
  });
  res.status(201).json({ assignment });
});

// ALL assignments that matter to me: the ones I made, and the ones for me
const listAssignments = asyncHandler(async (req, res) => {
  if (isTeacher(req.user)) {
    const mine = await Assignment.find({ teacherId: req.user.id })
      .populate("lessonId", "topic sourceType imageUrl")
      .sort({ createdAt: -1 })
      .lean();
    const { students, pMap } = await classStudents(req.user.classCode || "");

    // Per student, per assignment: how far they got and what they missed.
    const rows = mine.map((a) => {
      const lessonId = String(a.lessonId?._id || a.lessonId);
      const needRounds = a.targetRounds || 1;
      const needAccuracy = a.targetAccuracy || 0;
      const perStudent = students.map((s) => {
        const p = pMap.get(String(s._id));
        const att = (p?.attemptHistory || []).filter((h) => String(h.lessonId) === lessonId);
        const correct = att.filter((h) => h.correct).length;
        const accuracy = att.length ? Math.round((correct / att.length) * 100) : null;
        const missedConcepts = [...new Set(att.filter((h) => !h.correct).map((h) => h.conceptName))].filter(Boolean);
        const started = att.length > 0;
        const done = started && att.length >= needRounds && (!needAccuracy || (accuracy != null && accuracy >= needAccuracy));
        return {
          studentId: s._id,
          name: s.name,
          email: s.email,
          attempts: att.length,
          correct,
          accuracy,
          missedConcepts,
          started,
          done,
        };
      });
      return {
        ...a,
        students: perStudent,
        studentsStarted: perStudent.filter((r) => r.started).length,
        studentsDone: perStudent.filter((r) => r.done).length,
      };
    });
    return res.json({ assignments: rows, forMe: [] });
  }

  // A student: the assignments of the class they joined
  const teacher = req.user.classCode
    ? await User.findOne({ classCode: req.user.classCode, role: "teacher" }).select("_id name").lean()
    : null;
  if (!teacher) return res.json({ assignments: [], forMe: [] });

  const all = await Assignment.find({ teacherId: teacher._id })
    .populate("lessonId", "topic sourceType imageUrl concepts.conceptName")
    .sort({ createdAt: -1 })
    .lean();
  const myProgress = await UserProgress.findOne({ userId: req.user.id }).lean();
  const forMe = all
    .filter((a) => a.lessonId)
    .map((a) => {
      const attempts = (myProgress?.attemptHistory || []).filter((h) => String(h.lessonId) === String(a.lessonId._id));
      const correct = attempts.filter((h) => h.correct).length;
      const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : null;
      const needRounds = a.targetRounds || 1;
      const needAccuracy = a.targetAccuracy || 0;
      const done = attempts.length >= needRounds && (!needAccuracy || (accuracy != null && accuracy >= needAccuracy));
      return {
        _id: a._id,
        title: a.title,
        instructions: a.instructions,
        dueAt: a.dueAt,
        targetRounds: a.targetRounds || 0,
        targetAccuracy: a.targetAccuracy || 0,
        teacherName: teacher.name,
        lessonId: a.lessonId._id,
        topic: a.lessonId.topic,
        imageUrl: a.lessonId.imageUrl,
        concepts: a.lessonId.concepts || [],
        attempts: attempts.length,
        correct,
        accuracy,
        started: attempts.length > 0,
        done,
      };
    });
  res.json({ assignments: [], forMe });
});

// REMOVE an assignment
const deleteAssignment = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad assignment id" });
  const a = await Assignment.findOneAndDelete({ _id: req.params.id, teacherId: req.user.id });
  if (!a) return res.status(404).json({ error: "Assignment not found" });
  res.json({ deleted: true });
});

// ONE student's detail
const getStudentStats = asyncHandler(async (req, res) => {
  if (!isTeacher(req.user)) return res.status(403).json({ error: "Only teachers can do this" });
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad student id" });
  const student = await User.findOne({ _id: req.params.id, classCode: req.user.classCode, role: { $ne: "teacher" } })
    .select("name email createdAt")
    .lean();
  if (!student) return res.status(404).json({ error: "Student not found" });
  const p = await UserProgress.findOne({ userId: student._id }).lean();
  res.json({
    student,
    totalXP: p?.totalXP || 0,
    streakCount: p?.streakCount || 0,
    weakConcepts: p?.weakConcepts || [],
    recentAttempts: (p?.attemptHistory || []).slice(-30).reverse(),
  });
});

module.exports = { createClass, getMyClass, joinClass, assignLesson, listAssignments, deleteAssignment, getStudentStats };
