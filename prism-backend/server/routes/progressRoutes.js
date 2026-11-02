/**
 * routes/progressRoutes.js
 * ----------------------------------------------------------------------------
 * Mounted at /api/progress. Login required.
 */
const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  submitProgress,
  getMyProgress,
  getLessonMastery,
  getDueReviews,
  getActivity,
  getMistakes,
  getDrill,
  getWeekly,
} = require("../controllers/progressController");

const router = express.Router();

router.post("/submit", protect, submitProgress); // body: { lessonId, results: [...] }
router.get("/me", protect, getMyProgress);
router.get("/review", protect, getDueReviews); // spaced repetition queue
router.get("/lesson/:lessonId", protect, getLessonMastery); // per-concept mastery
router.get("/activity", protect, getActivity); // ?days=90 -> one row per day
router.get("/mistakes", protect, getMistakes); // ?limit=60 -> the mistake notebook
router.get("/drill", protect, getDrill); // ?limit=15 -> questions to drill
router.get("/weekly", protect, getWeekly); // this week vs last week

module.exports = router;
