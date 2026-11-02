/**
 * models/GroupMessage.js
 * ----------------------------------------------------------------------------
 * The chat inside a study group. Messages are small and the group page
 * polls for new ones, so a simple collection is all we need.
 */
const mongoose = require("mongoose");

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyGroup", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userName: { type: String, default: "" },
    text: { type: String, required: true },
    // "chat" for a message, "system" for "Lin joined the group".
    kind: { type: String, enum: ["chat", "system"], default: "chat" },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

groupMessageSchema.index({ groupId: 1, at: -1 });

module.exports = mongoose.model("GroupMessage", groupMessageSchema);
