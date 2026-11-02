/**
 * models/StudyGroup.js
 * ----------------------------------------------------------------------------
 * A study group: a small space where a few learners work on the same lessons.
 * People join through an invitation, so the owner decides who is in.
 */
const mongoose = require("mongoose");
// Load the Lesson model so the reference below can find it.
require("./Lesson");

/*
  A lesson inside the group. It needs its own schema: with a plain inline
  array, mongoose reads "ref" as the type of the item instead of a link.
*/
const groupLessonSchema = new mongoose.Schema(
  {
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    name: { type: String, default: "" },
    addedBy: { type: String, default: "" },
  },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studyGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    topic: { type: String, default: "" }, // what the group is about
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerName: { type: String, default: "" },
    members: { type: [memberSchema], default: [] },
    // Lessons everybody in the group can practice.
    lessons: { type: [groupLessonSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyGroup", studyGroupSchema);
