/**
 * config/constants.js
 * ----------------------------------------------------------------------------
 * Fixed values used in many files. Change them here and the whole app updates.
 */

// All game types the system supports. These names must match what your
// React game engines expect (e.g. "WORD_SNAKE" -> your Canvas snake engine).
const GAME_TYPES = [
  // --- the original six ---
  "MULTIPLE_CHOICE",
  "FILL_BLANK",
  "WORD_SNAKE",
  "CROSSWORD",
  "SUPER_QUIZ",
  "DIAGRAM_HOTSPOT",
  // --- added in round two ---
  "TRUE_FALSE",
  "ORDERING",
  "MATCH_PAIRS",
  "MATH_SPRINT",
  // --- added in round three ---
  "ODD_ONE_OUT",
  "TWO_TRUE_ONE_FALSE",
  "ANAGRAM",
  "CLOZE",
  "MEMORY_MATCH",
  "ODD_EQUATION",
  "WORD_LADDER",
  "CODE_OUTPUT",
  "CHART_QUESTION",
  "MULTI_LABEL",
  "SENTENCE_UNSCRAMBLE",
  "TIMELINE",
];

// The types the learner can ask us to ADD to an existing lesson later.
// DIAGRAM_HOTSPOT and MULTI_LABEL are left out on purpose: they need the
// lesson image and exact boxes, so they only exist with a lesson.
const ADDABLE_TYPES = [
  "TRUE_FALSE",
  "ORDERING",
  "MATCH_PAIRS",
  "MATH_SPRINT",
  "ODD_ONE_OUT",
  "TWO_TRUE_ONE_FALSE",
  "ANAGRAM",
  "CLOZE",
  "MEMORY_MATCH",
  "ODD_EQUATION",
  "WORD_LADDER",
  "CODE_OUTPUT",
  "CHART_QUESTION",
  "SENTENCE_UNSCRAMBLE",
  "TIMELINE",
  "MULTIPLE_CHOICE",
  "FILL_BLANK",
  "SUPER_QUIZ",
  "WORD_SNAKE",
];

// Difficulty levels. Every game gets one, so a learner can drill the easy
// version first and unlock the harder one later.
const LEVELS = [1, 2, 3];
const LEVEL_NAMES = { 1: "Easy", 2: "Normal", 3: "Hard" };

// If the AI produces an invalid game, we ask it to redo that ONE game up to 3 times
const MAX_NODE_RETRIES = 3;

// XP (experience points) given for a correct answer, by game type
const XP_TABLE = {
  MULTIPLE_CHOICE: 10,
  FILL_BLANK: 15,
  WORD_SNAKE: 20,
  CROSSWORD: 20,
  SUPER_QUIZ: 25,
  DIAGRAM_HOTSPOT: 20,
  TRUE_FALSE: 10,
  ORDERING: 20,
  MATCH_PAIRS: 20,
  MATH_SPRINT: 20,
  ODD_ONE_OUT: 10,
  TWO_TRUE_ONE_FALSE: 10,
  ANAGRAM: 15,
  CLOZE: 15,
  MEMORY_MATCH: 20,
  ODD_EQUATION: 15,
  WORD_LADDER: 15,
  CODE_OUTPUT: 15,
  CHART_QUESTION: 15,
  MULTI_LABEL: 20,
  SENTENCE_UNSCRAMBLE: 15,
  TIMELINE: 20,
};

// How many games a concept may hold before we stop adding more
const MAX_GAMES_PER_CONCEPT = 12;

// A hint is useful, but it should cost something: this is how much XP is
// taken away when the learner asks for one.
const HINT_XP_COST = 5;

// XP for helping somebody else out on the help board.
const HELP_ANSWER_XP = 20;

// Once a learner has answered a concept well several times, the XP for that
// concept is scaled down (this factor is applied per extra correct answer).
const MASTERY_XP_DECAY = 0.1;

// A concept is "mastered" after this many correct answers without a miss.
const MASTERY_TARGET = 5;

// Spaced repetition: how many days until a concept should be reviewed again.
const SRS_INTERVALS = [1, 2, 4, 7, 15, 30];

module.exports = {
  GAME_TYPES,
  ADDABLE_TYPES,
  LEVELS,
  LEVEL_NAMES,
  MAX_NODE_RETRIES,
  XP_TABLE,
  MAX_GAMES_PER_CONCEPT,
  HINT_XP_COST,
  HELP_ANSWER_XP,
  MASTERY_XP_DECAY,
  MASTERY_TARGET,
  SRS_INTERVALS,
};
