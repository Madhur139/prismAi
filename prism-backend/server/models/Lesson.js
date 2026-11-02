/**
 * models/Lesson.js
 * ----------------------------------------------------------------------------
 * A Lesson contains Concepts, and each Concept contains mini-Games:
 *
 *   Lesson
 *    └── concepts[]        (conceptNodeSchema)
 *         └── microGames[] (gamePayloadSchema)
 *
 * The two inner schemas are "embedded" — they live INSIDE the lesson document,
 * not in their own collections.
 */
const mongoose = require("mongoose");
const { GAME_TYPES } = require("../config/constants");

// ---- Game Payload: one mini-game's data ----
// "Polymorphic" = one schema that can describe several game types.
// Fields that don't apply to a given type are just left empty.
const gamePayloadSchema = new mongoose.Schema(
  {
    type: { type: String, enum: GAME_TYPES, required: true }, // which engine plays it
    prompt: { type: String, required: true }, // the question / instruction
    answer: { type: String, default: "" }, // correct answer
    options: { type: [String], default: [] }, // 4 choices (multiple choice / super quiz)
    hint: { type: String, default: "" },
    explanation: { type: String, default: "" }, // shown after answering
    expression: { type: String, default: "" }, // math the server can verify, e.g. "12*4"
    targetWords: { type: [String], default: [] }, // words the snake must eat
    clues: { type: [{ word: String, clue: String }], default: [] }, // crossword pairs
    steps: { type: [String], default: [] }, // ORDERING: the correct sequence
    pairs: { type: [{ left: String, right: String }], default: [] }, // MATCH_PAIRS: term -> meaning
    level: { type: Number, enum: [1, 2, 3], default: 2 }, // difficulty: 1 easy, 2 normal, 3 hard
    ladder: { type: [String], default: [] }, // WORD_LADDER: the chain of words
    code: { type: String, default: "" }, // CODE_OUTPUT: the snippet to read
    data: { type: [{ label: String, value: String }], default: [] }, // CHART_QUESTION: the chart points
    words: { type: [String], default: [] }, // SENTENCE_UNSCRAMBLE: the sentence in order
    dates: { type: [String], default: [] }, // TIMELINE: the date of each step
    hotspots: {
      type: [{ x: Number, y: Number, w: Number, h: Number, label: String }],
      default: [],
    }, // MULTI_LABEL: several clickable boxes
    svg: { type: String, default: "" }, // a generated diagram (used instead of a photo)
    hotspot: {
      // Diagram Hotspot: clickable box over the image, in PERCENT (0-100)
      x: Number, // left edge
      y: Number, // top edge
      w: Number, // width
      h: Number, // height
      label: String, // name of the diagram part
    },
  },
  { _id: false } // embedded docs don't need their own id
);

// ---- Concept Node: one small learning goal with several games ----
const conceptNodeSchema = new mongoose.Schema(
  {
    conceptName: { type: String, required: true },
    summary: { type: String, default: "" },
    microGames: { type: [gamePayloadSchema], default: [] },
  },
  { _id: false }
);

// ---- Lesson: the main record ----
const lessonSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, index: true }, // index => faster search
    sourceType: { type: String, enum: ["text", "image", "text+image", "pdf", "video"], required: true },
    imageUrl: { type: String, default: "" }, // permanent Cloudinary URL
    imagePublicId: { type: String, default: "" }, // needed to delete the image later
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    concepts: { type: [conceptNodeSchema], default: [] },
    droppedNodes: { type: Number, default: 0 }, // AI games that never passed validation
    shareToken: { type: String, default: "", index: true }, // read-only public link
    shared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index: quickly find "all lessons by this user about this topic"
lessonSchema.index({ createdBy: 1, topic: 1 });

module.exports = mongoose.model("Lesson", lessonSchema);
