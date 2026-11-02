/**
 * routes/inviteRoutes.js
 * ----------------------------------------------------------------------------
 * Mounted at /api/invites. Login required.
 */
const express = require("express");
const protect = require("../middleware/authMiddleware");
const { inviteSomeone, listInvites, listSentInvites, respondToInvite } = require("../controllers/inviteController");

const router = express.Router();

router.use(protect);

router.get("/", listInvites); // what is waiting for me
router.get("/sent", listSentInvites); // what I sent
router.post("/", inviteSomeone); // body: { kind, targetId?, people: [email], message? }
router.post("/:id/respond", respondToInvite); // body: { accept: true | false }

module.exports = router;
