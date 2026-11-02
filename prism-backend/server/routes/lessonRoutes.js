/**
 * routes/lessonRoutes.js
 * ----------------------------------------------------------------------------
 * Mounted at /api/lessons. ALL routes here need login (protect).
 * Middleware order matters — they run left to right:
 *   protect (who are you?) -> generateLimiter (not too fast) -> upload (read file) -> controller
 */
const express = require("express");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const uploadPdf = upload.uploadPdf;
const { generateLimiter } = require("../middleware/rateLimiters");
const {
  generateLesson,
  importLesson,
  getLessons,
  getLesson,
  getSession,
  regenerateGame,
  addGames,
  addDiagram,
  addCustomGame,
  copyAssignedLesson,
  shareLesson,
  getSharedLesson,
  deleteLesson,
} = require("../controllers/lessonController");

const router = express.Router();

// PUBLIC (no login): a lesson someone shared with you, read only.
router.get("/shared/:token", getSharedLesson);

// Apply `protect` to every route below this line
router.use(protect);

router.post("/generate", generateLimiter, upload.single("image"), generateLesson); // form: topic, image
router.post("/import", generateLimiter, uploadPdf.single("file"), importLesson); // form: file (pdf) | url | text
router.get("/", getLessons);
router.get("/:id", getLesson);
router.get("/:id/session", getSession); // ?size=10&level=2&weak=1
router.post("/:id/regenerate", generateLimiter, regenerateGame); // body: { conceptIndex, gameIndex }
router.post("/:id/add-games", generateLimiter, addGames); // body: { conceptIndex?, count?, type? }
router.post("/:id/diagram", generateLimiter, addDiagram); // body: { conceptIndex } -> draws a diagram + 2 games
router.post("/copy-assigned", copyAssignedLesson); // body: { lessonId }
router.post("/:id/custom-game", generateLimiter, addCustomGame); // body: { conceptIndex, type, prompt, answer, options?, hint?, explanation?, level? }
router.post("/:id/share", shareLesson); // create a public link
router.delete("/:id/share", shareLesson); // stop sharing
router.delete("/:id", deleteLesson);

module.exports = router;
