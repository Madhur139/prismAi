/**
 * models/ClassDuel.js
 * ----------------------------------------------------------------------------
 * A class duel: everybody who joins answers the SAME rounds at the same time,
 * and the leaderboard is polled from the server (no websockets needed).
 *
 * This is separate from the 2-player Duel model on purpose - the head-to-head
 * duel keeps working exactly as before.
 */
const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, default: "Player" },
    score: { type: Number, default: 0 },
    answered: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const classDuelSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    // Which classroom this duel belongs to ("" = open to anybody with the code).
    classroomCode: { type: String, default: "", index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teacherName: { type: String, default: "" },
    title: { type: String, default: "" },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
    rounds: { type: [{ conceptName: String, game: Object }], default: [] },
    roundIndex: { type: Number, default: 0 },
    players: { type: [playerSchema], default: [] },
    status: { type: String, enum: ["waiting", "playing", "done"], default: "waiting" },
    finishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Old duels are cleaned up by the MongoDB TTL index after 2 hours.
classDuelSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ClassDuel", classDuelSchema);
