/**
 * routes/duelRoutes.js
 * ----------------------------------------------------------------------------
 * Mounted at /api/duel. Login required.
 */
const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createDuel,
  joinDuel,
  getDuel,
  answerDuel,
  listDuels,
  getPublicDuel,
} = require("../controllers/duelController");

const router = express.Router();

router.use(protect);

router.get("/mine", listDuels);
router.post("/", createDuel);
router.post("/join", joinDuel);
router.get("/:code", getDuel);
router.post("/:code/answer", answerDuel);

module.exports = router;
