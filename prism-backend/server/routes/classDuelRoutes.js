/**
 * routes/classDuelRoutes.js
 * ----------------------------------------------------------------------------
 * Mounted at /api/classduel. Login required.
 * A class duel is everybody answering the same rounds at the same time.
 */
const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createClassDuel,
  joinClassDuel,
  startClassDuel,
  getClassDuel,
  answerClassDuel,
  listClassDuels,
} = require("../controllers/classDuelController");

const router = express.Router();

router.use(protect);

router.post("/", createClassDuel); // body: { lessonId, size?, title? }
router.get("/mine", listClassDuels);
router.get("/:code", getClassDuel); // poll the state
router.post("/:code/join", joinClassDuel);
router.post("/:code/start", startClassDuel); // teacher starts it
router.post("/:code/answer", answerClassDuel); // body: { correct, timeMs }

module.exports = router;
