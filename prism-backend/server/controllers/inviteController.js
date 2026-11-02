/**
 * controllers/inviteController.js
 * ----------------------------------------------------------------------------
 * Working with other people:
 *   Groups      -> make a study group, invite people to it, share lessons
 *   Invitations -> what is waiting for you, and what you sent
 *
 * An invitation is always a question: "come and work with me". Nothing
 * happens until the other person says yes.
 */
const StudyGroup = require("../models/StudyGroup");
const Invitation = require("../models/Invitation");
const User = require("../models/User");
const Lesson = require("../models/Lesson");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidId } = require("../utils/helpers");

// What the invited person sees.
const inviteView = (i) => ({
  _id: i._id,
  fromName: i.fromName,
  toEmail: i.toEmail,
  kind: i.kind,
  targetId: i.targetId,
  targetName: i.targetName,
  role: i.role,
  message: i.message,
  status: i.status,
  createdAt: i.createdAt,
  respondedAt: i.respondedAt,
});

/* ---------- groups ---------- */

// MAKE a group. The maker is the owner and the first member.
const createGroup = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Give your group a name" });
  if (name.length > 80) return res.status(400).json({ error: "That name is too long" });

  const group = await StudyGroup.create({
    name,
    description: String(req.body?.description || "").slice(0, 300),
    topic: String(req.body?.topic || "").slice(0, 80),
    ownerId: req.user.id,
    ownerName: req.user.name,
    members: [{ userId: req.user.id, name: req.user.name, email: req.user.email, role: "owner" }],
  });
  res.status(201).json({ group });
});

// MY groups (the ones I am in)
const listGroups = asyncHandler(async (req, res) => {
  const groups = await StudyGroup.find({ "members.userId": req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ groups });
});

// ONE group, with its members and lessons
const getGroup = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const group = await StudyGroup.findById(req.params.id).lean();
  if (!group) return res.status(404).json({ error: "That group is gone" });
  const isMember = (group.members || []).some((m) => String(m.userId) === String(req.user.id));
  if (!isMember) return res.status(403).json({ error: "You are not in this group" });
  res.json({ group });
});

// INVITE people to a group. Their email can be anybody's, even without an account.
const inviteToGroup = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const group = await StudyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "That group is gone" });
  const isOwner = String(group.ownerId) === String(req.user.id);
  if (!isOwner) return res.status(403).json({ error: "Only the owner can invite people" });

  const people = Array.isArray(req.body?.people) ? req.body.people : [];
  if (!people.length) return res.status(400).json({ error: "Nobody to invite" });

  const message = String(req.body?.message || "").slice(0, 300);
  const made = [];
  const skipped = [];

  for (const raw of people.slice(0, 20)) {
    const email = String(raw?.email || raw || "").trim().toLowerCase();
    if (!email || !email.includes("@")) { skipped.push(email || "?"); continue; }
    // Already a member?
    const user = await User.findOne({ email });
    if (user && (group.members || []).some((m) => String(m.userId) === String(user._id))) { skipped.push(email); continue; }
    // Already invited and still waiting?
    const pending = await Invitation.findOne({ kind: "group", targetId: group._id, toEmail: email, status: "pending" });
    if (pending) { skipped.push(email); continue; }

    const invitation = await Invitation.create({
      fromId: req.user.id,
      fromName: req.user.name,
      toId: user ? user._id : null,
      toEmail: email,
      toName: user ? user.name : "",
      kind: "group",
      targetId: group._id,
      targetName: group.name,
      message,
    });
    made.push(inviteView(invitation));
  }

  res.status(201).json({ invitations: made, skipped });
});

// SHARE a lesson with the group
const addLessonToGroup = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const { lessonId } = req.body || {};
  if (!isValidId(lessonId)) return res.status(400).json({ error: "Bad lesson id" });
  const group = await StudyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "That group is gone" });
  const isMember = (group.members || []).some((m) => String(m.userId) === String(req.user.id));
  if (!isMember) return res.status(403).json({ error: "You are not in this group" });

  const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user.id }).select("topic");
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  if (!(group.lessons || []).some((l) => String(l.lessonId) === String(lessonId))) {
    group.lessons.push({ lessonId, name: lesson.topic, addedBy: req.user.name });
    await group.save();
  }
  res.json({ group });
});

// LEAVE a group (the owner cannot leave until somebody else owns it)
const leaveGroup = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const group = await StudyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "That group is gone" });
  if (String(group.ownerId) === String(req.user.id)) return res.status(400).json({ error: "You own this group. Remove it instead." });
  group.members = (group.members || []).filter((m) => String(m.userId) !== String(req.user.id));
  await group.save();
  res.json({ group });
});

// REMOVE somebody from a group (owner only)
const removeMember = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const group = await StudyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "That group is gone" });
  if (String(group.ownerId) !== String(req.user.id)) return res.status(403).json({ error: "Only the owner can remove people" });
  if (String(req.params.userId) === String(req.user.id)) return res.status(400).json({ error: "You cannot remove yourself" });
  group.members = (group.members || []).filter((m) => String(m.userId) !== String(req.params.userId));
  await group.save();
  res.json({ group });
});

// DELETE a group (owner only)
const deleteGroup = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad group id" });
  const group = await StudyGroup.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
  if (!group) return res.status(404).json({ error: "That group is gone" });
  await Invitation.deleteMany({ kind: "group", targetId: group._id });
  res.json({ deleted: true });
});

/* ---------- invitations ---------- */

// INVITE somebody to a lesson (or to my classroom)
const inviteSomeone = asyncHandler(async (req, res) => {
  const { kind, targetId, people, message } = req.body || {};
  const email = String(people?.[0] || people || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return res.status(400).json({ error: "That does not look like an email address" });

  let targetName = "";
  if (kind === "lesson") {
    if (!isValidId(targetId)) return res.status(400).json({ error: "Bad lesson id" });
    const lesson = await Lesson.findOne({ _id: targetId, createdBy: req.user.id }).select("topic");
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    targetName = lesson.topic;
  } else if (kind === "class") {
    if (req.user.role !== "teacher") return res.status(403).json({ error: "Only teachers can invite to a class" });
    if (!req.user.classCode) return res.status(400).json({ error: "Create your class code first" });
    targetName = `${req.user.name}'s class`;
  } else {
    return res.status(400).json({ error: "Unknown invitation type" });
  }

  const user = await User.findOne({ email });
  if (user && String(user._id) === String(req.user.id)) return res.status(400).json({ error: "That is your own email address" });
  if (user && kind === "class" && user.classCode === req.user.classCode) return res.status(409).json({ error: "They are already in your class" });

  const invitation = await Invitation.create({
    fromId: req.user.id,
    fromName: req.user.name,
    toId: user ? user._id : null,
    toEmail: email,
    toName: user ? user.name : "",
    kind,
    targetId: kind === "lesson" ? targetId : null,
    targetName,
    message: String(message || "").slice(0, 300),
  });
  res.status(201).json({ invitation: inviteView(invitation) });
});

// MY INBOX: the invitations waiting for me
const listInvites = asyncHandler(async (req, res) => {
  const invites = await Invitation.find({
    status: "pending",
    $or: [{ toId: req.user.id }, { toEmail: String(req.user.email).toLowerCase() }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ invitations: invites.map(inviteView) });
});

// WHAT I SENT
const listSentInvites = asyncHandler(async (req, res) => {
  const invites = await Invitation.find({ fromId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ invitations: invites.map(inviteView) });
});

/*
  ACCEPT or DECLINE.
  Accepting is what actually does the thing: joins the group, copies the
  lesson into their library, or puts them in the classroom.
*/
const respondToInvite = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad invitation id" });
  const accept = req.body?.accept === true || req.body?.accept === "true";

  const invitation = await Invitation.findById(req.params.id);
  if (!invitation) return res.status(404).json({ error: "That invitation is gone" });
  if (invitation.status !== "pending") return res.status(409).json({ error: "You already answered this invitation" });

  // Is this invitation meant for me?
  const forMe =
    (invitation.toId && String(invitation.toId) === String(req.user.id)) ||
    (invitation.toEmail && invitation.toEmail === String(req.user.email).toLowerCase());
  if (!forMe) return res.status(403).json({ error: "This invitation is not for you" });

  if (!accept) {
    invitation.status = "declined";
    invitation.respondedAt = new Date();
    await invitation.save();
    return res.json({ invitation: inviteView(invitation), accepted: false });
  }

  // ---- accepting: do the thing ----
  if (invitation.kind === "group" && invitation.targetId) {
    const group = await StudyGroup.findById(invitation.targetId);
    if (group && !(group.members || []).some((m) => String(m.userId) === String(req.user.id))) {
      group.members.push({ userId: req.user.id, name: req.user.name, email: req.user.email, role: "member" });
      await group.save();
    }
  } else if (invitation.kind === "lesson" && invitation.targetId) {
    // A copy in their own library, so they can play it and earn their own XP.
    const source = await Lesson.findById(invitation.targetId).lean();
    if (source) {
      const mine = await Lesson.findOne({ createdBy: req.user.id, topic: source.topic }).lean();
      if (!mine) {
        await Lesson.create({
          topic: source.topic,
          sourceType: source.sourceType,
          imageUrl: source.imageUrl,
          imagePublicId: "",
          createdBy: req.user.id,
          concepts: source.concepts,
          droppedNodes: source.droppedNodes,
        });
      }
    }
  } else if (invitation.kind === "class") {
    const teacher = await User.findById(invitation.fromId).select("classCode").lean();
    if (teacher?.classCode) await User.updateOne({ _id: req.user.id }, { classCode: teacher.classCode });
  }

  invitation.status = "accepted";
  invitation.respondedAt = new Date();
  invitation.toId = invitation.toId || req.user.id;
  await invitation.save();
  res.json({ invitation: inviteView(invitation), accepted: true });
});

module.exports = {
  createGroup,
  listGroups,
  getGroup,
  inviteToGroup,
  addLessonToGroup,
  leaveGroup,
  removeMember,
  deleteGroup,
  inviteSomeone,
  listInvites,
  listSentInvites,
  respondToInvite,
};
