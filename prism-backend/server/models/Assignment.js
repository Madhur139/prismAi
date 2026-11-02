/**
 * models/Assignment.js
 * ----------------------------------------------------------------------------
 * A teacher assigns a lesson to their class. Students see the assignment on
 * their dashboard and the teacher sees who finished it.
 */
const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    title: { type: String, default: "" }, // shown to the students
    instructions: { type: String, default: "" },
    dueAt: { type: Date, default: null },
    /*
      What counts as "done". 0 means "no target set":
        targetRounds   - how many rounds the student should attempt
        targetAccuracy - the percentage they should reach (0 = any)
    */
    targetRounds: { type: Number, default: 0 },
    targetAccuracy: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
