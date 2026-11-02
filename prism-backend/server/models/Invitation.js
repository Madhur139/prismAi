/**
 * models/Invitation.js
 * ----------------------------------------------------------------------------
 * "Come and work with me."
 *
 * One invitation is sent to one person for one thing: a study group, a
 * lesson, or a teacher's class. The person accepts or declines it, and
 * nothing happens until they do.
 */
const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    fromId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fromName: { type: String, default: "" },
    // The person who was invited. We keep the id AND the email, because an
    // invitation can be sent to somebody who has no account yet.
    toId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    toEmail: { type: String, default: "", lowercase: true, trim: true, index: true },
    toName: { type: String, default: "" },
    // What they are invited to.
    kind: { type: String, enum: ["group", "lesson", "class"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null }, // the group / lesson
    targetName: { type: String, default: "" }, // shown in the invitation
    role: { type: String, default: "member" },
    message: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending", index: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invitation", invitationSchema);
