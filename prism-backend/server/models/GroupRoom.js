/**
 * models/GroupRoom.js
 * ----------------------------------------------------------------------------
 * "Study together": everybody in the group answers the SAME rounds at the same
 * time, and the leaderboard is polled from the server (no websockets).
 *
 * The room lives for two hours and then cleans itself up.
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

const groupRoomSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyGroup", required: true, index: true },
    code: { type: String, required: true, unique: true, index: true, uppercase: true },
    title: { type: String, default: "Study together" },
    status: { type: String, enum: ["waiting", "playing", "done"], default: "waiting" },
    rounds: { type: [{ conceptName: String, game: Object }], default: [] },
    roundIndex: { type: Number, default: 0 },
    players: { type: [playerSchema], default: [] },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

groupRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("GroupRoom", groupRoomSchema);
