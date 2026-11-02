/**
 * models/CodeSnippet.js
 * Stores saved code snippets per user for Prism CodeLab.
 */
const mongoose = require("mongoose");

const codeSnippetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, default: "Untitled snippet" },
    language: { type: String, enum: ["javascript", "python", "html", "css"], default: "javascript" },
    code: { type: String, required: true },
    output: { type: String, default: "" },
    isPublic: { type: Boolean, default: false },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CodeSnippet", codeSnippetSchema);
