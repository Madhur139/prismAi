/**
 * middleware/authMiddleware.js
 * ----------------------------------------------------------------------------
 * A "middleware" = a function that runs BEFORE the controller.
 * `protect` blocks anyone who isn't logged in.
 *
 * It reads the header "Authorization: Bearer <token>", verifies the token,
 * and puts the user's info on req.user so controllers know WHO is calling.
 */
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/env");

async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET); // { id, email }
    /*
      The token only holds the id, so we read the rest from the database.
      That way a role change (student -> teacher) works straight away,
      without asking the learner to log in again.
    */
    const user = await User.findById(payload.id).select("name email role classCode").lean();
    if (!user) return res.status(401).json({ error: "Account not found" });
    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role || "student",
      classCode: user.classCode || "",
    };
    next(); // all good -> continue to the controller
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = protect;
