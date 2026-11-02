/**
 * models/User.js
 * ----------------------------------------------------------------------------
 * A "model" = the tool we use to read/write one MongoDB collection.
 * The "schema" describes what each document looks like.
 * This one stores login accounts.
 */
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // unique => no two users share an email; lowercase keeps matching consistent
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // We store only a HASH of the password, never the password itself
    passwordHash: { type: String, required: true },
    // "student" (default) or "teacher". Teachers can assign lessons and see
    // a class dashboard.
    role: { type: String, enum: ["student", "teacher"], default: "student" },
    // A short code a student types to join a teacher's class.
    classCode: { type: String, default: "", index: true },
  },
  { timestamps: true } // auto-adds createdAt / updatedAt
);

module.exports = mongoose.model("User", userSchema);
