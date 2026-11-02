/**
 * controllers/progressController.js
 * ----------------------------------------------------------------------------
 * Gamification logic:
 *   submitProgress -> POST /api/progress/submit  (XP, streak, weak concepts)
 *   getMyProgress  -> GET  /api/progress/me      (dashboard data)
 *   getLessonMastery -> GET /api/progress/lesson/:lessonId (per-concept mastery)
 *   getDueReviews  -> GET  /api/progress/review    (spaced repetition queue)
 */
const Lesson = require("../models/Lesson");
const UserProgress = require("../models/UserProgress");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidId, todayUTC, dayDiff } = require("../utils/helpers");
const {
  GAME_TYPES,
  XP_TABLE,
  HINT_XP_COST,
  MASTERY_XP_DECAY,
  MASTERY_TARGET,
  SRS_INTERVALS,
} = require("../config/constants");

// How many days until a concept should come back, based on how well it went.
const nextInterval = (streak) => SRS_INTERVALS[Math.min(Math.max(streak - 1, 0), SRS_INTERVALS.length - 1)];

// How many attempts we keep per learner. The activity heatmap needs a long
// tail, so this is bigger than the old 500.
const MAX_ATTEMPTS = 1500;

// UTC day key ("YYYY-MM-DD") - the same format the frontend uses.
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/*
  Midnight of today, in UTC.
  Review dates are aligned to this so "due today" compares correctly: a concept
  you got wrong is due the same day, not the day after.
*/
const startOfToday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Spaced repetition: remember how well a concept is going so it can come back
 * at the right time. Wrong answer -> review today. Right answer -> later.
 */
function updateSrs(list, { lessonId, conceptName, correct }) {
  const i = list.findIndex((s) => String(s.lessonId) === String(lessonId) && s.conceptName === conceptName);
  if (i < 0) {
    const interval = correct ? nextInterval(1) : 0;
    list.push({
      lessonId,
      conceptName,
      streak: correct ? 1 : 0,
      interval,
      // Midnight-aligned: wrong = due today, right = due in `interval` days.
      dueAt: new Date(startOfToday().getTime() + interval * 86400000),
      lastSeenAt: new Date(),
    });
    return;
  }
  const row = list[i];
  row.streak = correct ? (row.streak || 0) + 1 : 0;
  row.interval = correct ? nextInterval(row.streak) : 0;
  row.dueAt = new Date(startOfToday().getTime() + row.interval * 86400000);
  row.lastSeenAt = new Date();
}

// SUBMIT: frontend sends the results of a play session
const submitProgress = asyncHandler(async (req, res) => {
  const { lessonId, results } = req.body || {};
  if (!isValidId(lessonId) || !Array.isArray(results) || !results.length || results.length > 100)
    return res.status(400).json({ error: "lessonId and 1-100 results are required" });

  const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user.id })
    .select("_id concepts.conceptName")
    .lean();
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  // Only accept concept names that really exist in this lesson (stops fake data)
  const validConcepts = new Set(lesson.concepts.map((c) => c.conceptName));

  let progress = await UserProgress.findOne({ userId: req.user.id });
  if (!progress) progress = new UserProgress({ userId: req.user.id });

  let gainedXP = 0;
  for (const r of results) {
    if (!validConcepts.has(r.conceptName) || !GAME_TYPES.includes(r.gameType)) continue; // skip bad entries
    const correct = !!r.correct;
    const timeMs = Math.max(0, Math.min(Number(r.timeMs) || 0, 10 * 60 * 1000)); // clamp 0..10 min
    const hinted = !!r.hintUsed;
    // Somebody else answered this one on the help board, so it earns no XP.
    const helped = !!r.askedHelp;

    // XP: base by game type, +5 bonus for answering in under 5 seconds
    let xp = 0;
    if (correct && !helped) {
      xp = XP_TABLE[r.gameType] || 10;
      if (timeMs > 0 && timeMs < 5000) xp += 5;

      /*
        MASTERY DECAY
        Once a learner has aced a concept several times, extra XP for it is
        worth less and less. It keeps the score meaningful for material the
        learner already knows.
      */
      const aced = progress.attemptHistory.filter(
        (h) => String(h.lessonId) === String(lessonId) && h.conceptName === r.conceptName && h.correct
      ).length;
      if (aced >= MASTERY_TARGET) xp *= 1 / (1 + (aced - MASTERY_TARGET) * MASTERY_XP_DECAY);

      // A hint is a shortcut, so it costs a few points.
      if (hinted) xp = Math.max(0, xp - HINT_XP_COST);
    }
    xp = Math.round(xp);
    gainedXP += xp;

    // Save this attempt in history
    progress.attemptHistory.push({
      lessonId,
      conceptName: r.conceptName,
      gameType: r.gameType,
      correct,
      timeMs,
      xp,
      hintUsed: hinted,
      askedHelp: helped,
      // Kept so the Mistake Notebook can show the exact question again.
      prompt: String(r.prompt || "").slice(0, 300),
      userAnswer: String(r.userAnswer ?? "").slice(0, 200),
      explanation: String(r.explanation || "").slice(0, 400),
      // The whole game is saved for wrong answers only: it is what lets
      // "Drill my mistakes" ask the exact same question again.
      game: correct ? undefined : r.game || undefined,
    });

    // Weak concepts: wrong -> misses +1 (or add); right -> misses -1 (remove at 0)
    const idx = progress.weakConcepts.findIndex(
      (w) => String(w.lessonId) === String(lessonId) && w.conceptName === r.conceptName
    );
    if (!correct) {
      if (idx >= 0) {
        progress.weakConcepts[idx].misses += 1;
        progress.weakConcepts[idx].lastMissedAt = new Date();
      } else {
        progress.weakConcepts.push({ lessonId, conceptName: r.conceptName, misses: 1, lastMissedAt: new Date() });
      }
    } else if (idx >= 0) {
      progress.weakConcepts[idx].misses -= 1;
      if (progress.weakConcepts[idx].misses <= 0) progress.weakConcepts.splice(idx, 1);
    }

    // Spaced repetition: when should this concept come back?
    updateSrs(progress.srs, { lessonId, conceptName: r.conceptName, correct });
  }

  // Streak (once per day):
  //   played yesterday       -> streak + 1
  //   missed a day / first   -> reset to 1
  //   already played today   -> unchanged
  const today = todayUTC();
  if (progress.lastActiveDay !== today) {
    const gap = progress.lastActiveDay ? dayDiff(progress.lastActiveDay, today) : null;
    progress.streakCount = gap === 1 ? progress.streakCount + 1 : 1;
    progress.lastActiveDay = today;
  }

  progress.totalXP += gainedXP;
  // Keep only the latest attempts. 1500 covers roughly a year of steady
  // practice, which is what the activity heatmap needs.
  if (progress.attemptHistory.length > MAX_ATTEMPTS) progress.attemptHistory = progress.attemptHistory.slice(-MAX_ATTEMPTS);
  await progress.save();

  res.json({
    gainedXP,
    totalXP: progress.totalXP,
    streakCount: progress.streakCount,
    weakConcepts: progress.weakConcepts,
  });
});

// ME: dashboard (XP, streak, accuracy, weak concepts, recent attempts)
const getMyProgress = asyncHandler(async (req, res) => {
  const progress = (await UserProgress.findOne({ userId: req.user.id }).lean()) || {
    totalXP: 0,
    streakCount: 0,
    weakConcepts: [],
    attemptHistory: [],
  };
  const history = progress.attemptHistory || [];
  const correct = history.filter((h) => h.correct).length;

  res.json({
    totalXP: progress.totalXP,
    streakCount: progress.streakCount,
    lastActiveDay: progress.lastActiveDay,
    weakConcepts: [...(progress.weakConcepts || [])].sort((a, b) => b.misses - a.misses), // worst first
    accuracy: history.length ? Math.round((correct / history.length) * 100) : null,
    recentAttempts: history.slice(-25).reverse(), // newest first
  });
});

/*
  LESSON MASTERY
  How well the learner knows each concept of one lesson. The lesson page uses
  this to draw the mastery rings and to build the "review my weak spots" list.
*/
const getLessonMastery = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  if (!isValidId(lessonId)) return res.status(400).json({ error: "Bad lesson id" });
  const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user.id })
    .select("concepts.conceptName")
    .lean();
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const progress = await UserProgress.findOne({ userId: req.user.id }).lean();
  const same = (a, b) => String(a) === String(b);
  const history = (progress?.attemptHistory || []).filter((h) => same(h.lessonId, lessonId));
  const srsMap = new Map((progress?.srs || []).filter((s) => same(s.lessonId, lessonId)).map((s) => [s.conceptName, s]));
  const missMap = new Map((progress?.weakConcepts || []).filter((w) => same(w.lessonId, lessonId)).map((w) => [w.conceptName, w.misses]));

  const concepts = (lesson.concepts || []).map((c) => {
    const rows = history.filter((h) => h.conceptName === c.conceptName);
    const correct = rows.filter((r) => r.correct).length;
    const total = rows.length;
    const srs = srsMap.get(c.conceptName);
    return {
      conceptName: c.conceptName,
      total,
      correct,
      mastery: total ? Math.round((correct / total) * 100) : 0,
      misses: missMap.get(c.conceptName) || 0,
      streak: srs?.streak || 0,
      dueAt: srs?.dueAt || null,
    };
  });

  res.json({
    lessonId,
    concepts,
    weak: concepts.filter((c) => c.misses > 0).map((c) => c.conceptName),
    unplayed: concepts.filter((c) => c.total === 0).map((c) => c.conceptName),
  });
});

/*
  REVIEW QUEUE
  The concepts that are due today, thanks to spaced repetition.
*/
const getDueReviews = asyncHandler(async (req, res) => {
  const progress = await UserProgress.findOne({ userId: req.user.id }).lean();
  const startOfDay = startOfToday();

  const due = (progress?.srs || [])
    .filter((s) => s.dueAt && new Date(s.dueAt) <= startOfDay)
    .map((s) => ({ lessonId: s.lessonId, conceptName: s.conceptName, streak: s.streak || 0, dueAt: s.dueAt }));

  // Group by lesson so the frontend can offer one session per lesson.
  const byLesson = {};
  due.forEach((d) => {
    const key = String(d.lessonId);
    byLesson[key] = byLesson[key] || { lessonId: d.lessonId, concepts: [] };
    byLesson[key].concepts.push(d.conceptName);
  });

  res.json({ count: due.length, due, byLesson: Object.values(byLesson) });
});

/*
  ACTIVITY
  One row per day for the last N days, so the heatmap can show real history
  instead of only the most recent attempts.
*/
const getActivity = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 7), 365);
  const progress = await UserProgress.findOne({ userId: req.user.id }).select("attemptHistory").lean();
  const history = progress?.attemptHistory || [];

  const buckets = new Map();
  history.forEach((h) => {
    const d = new Date(h.at);
    if (Number.isNaN(d.getTime())) return;
    const key = dayKey(d);
    const b = buckets.get(key) || { date: key, count: 0, correct: 0, xp: 0 };
    b.count += 1;
    if (h.correct) b.correct += 1;
    b.xp += h.xp || 0;
    buckets.set(key, b);
  });

  // A dense series: every day is present, even the quiet ones.
  const activity = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = dayKey(d);
    activity.push(buckets.get(key) || { date: key, count: 0, correct: 0, xp: 0 });
  }

  res.json({ days, activity });
});

/*
  MISTAKE NOTEBOOK
  Every question the learner got wrong, with their answer and the explanation,
  so the exact mistake can be reviewed later.
*/
const getMistakes = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 200);
  const progress = await UserProgress.findOne({ userId: req.user.id }).lean();
  const history = progress?.attemptHistory || [];

  const mistakes = history
    .filter((h) => !h.correct)
    .slice(-limit)
    .reverse()
    .map((h) => ({
      at: h.at,
      lessonId: h.lessonId,
      conceptName: h.conceptName,
      gameType: h.gameType,
      prompt: h.prompt || "",
      userAnswer: h.userAnswer || "",
      explanation: h.explanation || "",
      timeMs: h.timeMs,
    }));

  // How many mistakes per concept, worst first.
  const counts = {};
  mistakes.forEach((m) => {
    const key = m.conceptName || "General";
    counts[key] = (counts[key] || 0) + 1;
  });
  const byConcept = Object.entries(counts)
    .map(([conceptName, count]) => ({ conceptName, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ count: mistakes.length, mistakes, byConcept });
});

/*
  DRILL MY MISTAKES
  The exact questions the learner got wrong and has NOT answered correctly
  since. Each one comes back with the game that was played, so the drill is
  the same question, not a similar one.
*/
const getDrill = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 40);
  const progress = await UserProgress.findOne({ userId: req.user.id }).lean();
  const history = progress?.attemptHistory || [];

  // A mistake is cleared once the same question is answered correctly later.
  const solvedPrompts = new Set(
    history.filter((h) => h.correct && h.prompt).map((h) => String(h.prompt).trim().toLowerCase())
  );

  const seen = new Set();
  const drills = [];
  for (let i = history.length - 1; i >= 0 && drills.length < limit; i--) {
    const h = history[i];
    if (h.correct) continue;
    const key = String(h.prompt || h.conceptName || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;              // one round per question
    if (solvedPrompts.has(key)) continue;             // already answered right since
    if (!h.game) continue;                            // nothing to replay (older attempt)
    seen.add(key);
    drills.push({
      lessonId: h.lessonId,
      conceptName: h.conceptName,
      gameType: h.gameType,
      game: h.game,
      userAnswer: h.userAnswer || "",
      explanation: h.explanation || "",
      at: h.at,
    });
  }

  res.json({ count: drills.length, drills });
});

/*
  WEEKLY REPORT
  The last seven days compared with the seven before, ready to show in a
  shareable card.
*/
const getWeekly = asyncHandler(async (req, res) => {
  const progress = await UserProgress.findOne({ userId: req.user.id }).lean();
  const history = progress?.attemptHistory || [];
  const days = 7;

  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1)));
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - days);

  const inRange = (h, from, to) => {
    const t = new Date(h.at);
    return t >= from && t < to;
  };
  const thisWeek = history.filter((h) => inRange(h, start, new Date(start.getTime() + days * 86400000)));
  const prevWeek = history.filter((h) => inRange(h, prevStart, start));

  const sum = (list) => ({
    rounds: list.length,
    correct: list.filter((h) => h.correct).length,
    xp: list.reduce((s, h) => s + (h.xp || 0), 0),
    timeMs: list.reduce((s, h) => s + (h.timeMs || 0), 0),
  });

  // One entry per day, for a small bar chart.
  const byDay = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = dayKey(d);
    const rows = thisWeek.filter((h) => dayKey(h.at) === key);
    byDay.push({
      date: key,
      rounds: rows.length,
      correct: rows.filter((h) => h.correct).length,
      xp: rows.reduce((s, h) => s + (h.xp || 0), 0),
    });
  }

  // Per-concept accuracy this week.
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

  const week = sum(thisWeek);
  const previousWeek = sum(prevWeek);

  res.json({
    days,
    totalXP: progress?.totalXP || 0,
    streakCount: progress?.streakCount || 0,
    week,
    previousWeek,
    accuracy: week.rounds ? Math.round((week.correct / week.rounds) * 100) : null,
    previousAccuracy: previousWeek.rounds ? Math.round((previousWeek.correct / previousWeek.rounds) * 100) : null,
    byDay,
    strongest: concepts[0] || null,
    weakest: concepts.length ? concepts[concepts.length - 1] : null,
    concepts,
  });
});

module.exports = {
  submitProgress,
  getMyProgress,
  getLessonMastery,
  getDueReviews,
  getActivity,
  getMistakes,
  getDrill,
  getWeekly,
};
