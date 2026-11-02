/**
 * routes/groupRoutes.js
 * ----------------------------------------------------------------------------
 * Mounted at /api/groups. Login required.
 */
const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createGroup,
  listGroups,
  getGroup,
  inviteToGroup,
  addLessonToGroup,
  leaveGroup,
  removeMember,
  deleteGroup,
} = require("../controllers/inviteController");
const {
  listMessages,
  sendMessage,
  createRoom,
  joinRoom,
  getRoom,
  getGroupRoom,
  startRoom,
  answerRoom,
} = require("../controllers/groupRoomController");

const router = express.Router();

router.use(protect);

router.get("/", listGroups);
router.post("/", createGroup);
router.get("/:id", getGroup);
router.delete("/:id", deleteGroup);
router.post("/:id/invite", inviteToGroup); // body: { people: [emails], message? }
router.post("/:id/lessons", addLessonToGroup); // body: { lessonId }
router.post("/:id/leave", leaveGroup);
router.delete("/:id/members/:userId", removeMember);

// ---- the chat ----
router.get("/:id/messages", listMessages); // ?since=<iso date>
router.post("/:id/messages", sendMessage); // body: { text }

// ---- study together ----
router.get("/:id/study", getGroupRoom); // the room the group is in right now
router.post("/:id/study", createRoom); // start one
router.get("/:id/study/:code", getRoom); // poll it
router.post("/:id/study/:code/join", joinRoom);
router.post("/:id/study/:code/start", startRoom);
router.post("/:id/study/:code/answer", answerRoom); // body: { correct, timeMs }

module.exports = router;
