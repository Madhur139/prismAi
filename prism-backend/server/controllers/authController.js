/**
 * controllers/authController.js
 * ----------------------------------------------------------------------------
 * Controller = the real logic behind an endpoint.
 *   register -> POST /api/auth/register
 *   login    -> POST /api/auth/login
 */
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const UserProgress = require("../models/UserProgress");
const asyncHandler = require("../middleware/asyncHandler");
const { signToken } = require("../utils/helpers");

// REGISTER: create account + empty progress record, return a login token
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ error: "name, email and a password of 8+ chars are required" });

  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ error: "Email already registered" });

  // Teachers get the teacher tools; everybody else is a student.
  const role = req.body?.role === "teacher" ? "teacher" : "student";

  // bcrypt.hash(password, 12): 12 = cost factor (higher = harder to crack, slower)
  const user = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 12) });
  await UserProgress.create({ userId: user._id }); // start with 0 XP

  res.status(201).json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// LOGIN: compare the typed password with the stored hash
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const user = email && (await User.findOne({ email: String(email).toLowerCase() }));

  // Same error for "no such user" and "wrong password" so attackers can't tell which
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash)))
    return res.status(401).json({ error: "Invalid credentials" });

  res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// UPDATE PROFILE: change safe profile fields without changing the login secret
const updateProfile = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name || name.length > 80) return res.status(400).json({ error: "Name must be between 1 and 80 characters" });
  const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// WHO AM I: the freshest version of the signed-in account (role included).
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("name email role classCode").lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role || "student", classCode: user.classCode || "" } });
});

// BECOME A TEACHER (or go back to being a learner).
// Teacher mode is self-service: the classroom code is what actually controls
// who can see a class, so the role only unlocks the teacher tools.
const updateRole = asyncHandler(async (req, res) => {
  const role = req.body?.role === "teacher" ? "teacher" : "student";
  const user = await User.findByIdAndUpdate(req.user.id, { role }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  // A teacher who steps down also gives up their class.
  if (role === "student") await User.updateOne({ _id: user._id }, { classCode: "" });
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

module.exports = { register, login, getMe, updateProfile, updateRole };
