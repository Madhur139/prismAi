/**
 * models/Duel.js
 * ----------------------------------------------------------------------------
 * A head-to-head run: two people answer the SAME rounds and the score is
 * shown live. The game polls the server, so no websockets are needed.
 */
const mongoose = require("mongoose");

const duelSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true }, // short code to share
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    hostName: { type: String, default: "Player 1" },
    guestName: { type: String, default: "Player 2" },
    status: { type: String, enum: ["waiting", "playing", "done"], default: "waiting" },
    rounds: { type: [{ conceptName: String, game: Object }], default: [] },
    roundIndex: { type: Number, default: 0 },
    scores: {
      host: { type: Number, default: 0 },
      guest: { type: Number, default: 0 },
    },
    // What each player has already answered for the current round.
    answered: {
      host: { type: Boolean, default: false },
      guest: { type: Boolean, default: false },
    },
    finishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Old duels are cleaned up by the MongoDB TTL index after 2 hours.
duelSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Duel", duelSchema);
