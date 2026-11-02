/**
 * models/Classroom.js
 * ----------------------------------------------------------------------------
 * A named class: "Physics - Period 3".
 * The code is what students type to join. A teacher can have several classes,
 * and every class keeps its own roster so the teacher can see it in one query.
 */
const mongoose = require("mongoose");

const classroomSchema = new mongoose.Schema(
  {
    // The join code, e.g. "ABCD-1234". Same shape as the old User.classCode.
    code: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // What the class is called, and what subject it covers.
    name: { type: String, default: "", trim: true, maxlength: 80 },
    subject: { type: String, default: "", trim: true, maxlength: 60 },
    // The roster, kept here as well as on each user so one query lists a class.
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    /*
      Personal join codes handed out by the roster import: the teacher imports a
      list of names, gives each student their own code, and the student types it
      to join. A used invite cannot be used twice.
    */
    invites: [
      {
        name: { type: String, default: "" },
        email: { type: String, default: "" },
        code: { type: String, required: true },
        used: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Classroom", classroomSchema);
