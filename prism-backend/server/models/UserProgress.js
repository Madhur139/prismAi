/**
 * models/UserProgress.js
 * ----------------------------------------------------------------------------
 * One document per user: XP, daily streak, weak concepts and answer history.
 */
const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    totalXP: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 }, // consecutive days played
    lastActiveDay: { type: String, default: "" }, // "YYYY-MM-DD" (UTC) for streak math

    // Concepts the student keeps getting wrong. `misses` goes up on a wrong
    // answer and down on a right one; at 0 the concept is removed.
    weakConcepts: {
      type: [
        {
          lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
          conceptName: String,
          misses: { type: Number, default: 1 },
          lastMissedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    /*
      SPACED REPETITION
      One entry per concept the learner has practised. `dueAt` is the day the
      concept should come back (spaced out as it is answered well).
      `streak` counts how many times in a row it was answered correctly.
    */
    srs: {
      type: [
        {
          lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
          conceptName: String,
          streak: { type: Number, default: 0 },
          interval: { type: Number, default: 0 }, // days until the next review
          dueAt: { type: Date, default: Date.now },
          lastSeenAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Log of every answer (we keep only the latest 500)
    attemptHistory: {
      type: [
        {
          lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
          conceptName: String,
          gameType: String,
          correct: Boolean,
          timeMs: Number,
          xp: Number,
          at: { type: Date, default: Date.now },
          // Kept so the Mistake Notebook can show the exact question again.
          prompt: String,
          userAnswer: String,
          explanation: String,
          // The whole game, saved only when the answer was WRONG, so the
          // "Drill my mistakes" mode can ask the exact same question again.
          game: mongoose.Schema.Types.Mixed,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserProgress", userProgressSchema);
