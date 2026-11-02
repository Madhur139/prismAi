/**
 * models/HelpRequest.js
 * ----------------------------------------------------------------------------
 * One question a learner got stuck on, shared with everybody.
 * Other learners answer it, the server checks whether the answer is right,
 * and the person who asked gets the answer back in their game.
 *
 * The correct answer stays on the server: helpers never see it, they just
 * write what they think and the server compares it.
 */
const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" }, // short id, so the asker can pick this answer
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, default: "A learner" },
    text: { type: String, required: true }, // what the helper says
    imageUrl: { type: String, default: "" }, // their working, as a picture
    imagePublicId: { type: String, default: "" },
    correct: { type: Boolean, default: false }, // checked by the server
    accepted: { type: Boolean, default: false }, // the asker picked this one
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const helpRequestSchema = new mongoose.Schema(
  {
    askerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    askerName: { type: String, default: "A learner" },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
    conceptName: { type: String, default: "" },
    gameType: { type: String, default: "" },
    title: { type: String, default: "" }, // the question, in one line
    prompt: { type: String, default: "" }, // the full question text
    note: { type: String, default: "" }, // what the learner added
    imageUrl: { type: String, default: "" }, // a photo of the question
    imagePublicId: { type: String, default: "" },
    correctAnswer: { type: String, default: "" }, // never sent to helpers
    status: { type: String, enum: ["open", "solved"], default: "open", index: true },
    answers: { type: [answerSchema], default: [] },
    solvedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Old questions are cleaned up automatically after a week.
helpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
helpRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("HelpRequest", helpRequestSchema);
