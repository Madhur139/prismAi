/**
 * routes/helpRoutes.js
 * ----------------------------------------------------------------------------
 * Mounted at /api/help. Login required - the board is for Prism learners.
 */
const express = require("express");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  createRequest,
  listRequests,
  getRequest,
  answerRequest,
  acceptAnswer,
  closeRequest,
  myRequests,
  deleteRequest,
} = require("../controllers/helpController");

const router = express.Router();

router.use(protect);

router.get("/", listRequests); // the global board
router.get("/mine", myRequests); // my own questions
router.post("/", upload.single("image"), createRequest); // ask a question
router.get("/:id", getRequest);
router.post("/:id/answer", upload.single("image"), answerRequest);
router.post("/:id/accept", acceptAnswer);
router.post("/:id/close", closeRequest);
router.delete("/:id", deleteRequest); // remove it completely

module.exports = router;
