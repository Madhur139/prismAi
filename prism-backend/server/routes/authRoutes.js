/**
 * routes/authRoutes.js
 * ----------------------------------------------------------------------------
 * Routes = list of URLs -> which controller runs.
 * Mounted in server.js at /api/auth, so "/register" = /api/auth/register.
 * These are PUBLIC (no login needed).
 */
const express = require("express");
const { register, login, getMe, updateProfile, updateRole } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register); // body: { name, email, password, role? }
router.post("/login", login);
router.get("/me", protect, getMe); //                  -> the fresh account
router.patch("/me", protect, updateProfile); //       body: { email, password }
router.patch("/role", protect, updateRole); //       body: { role: 'teacher' | 'student' }

module.exports = router;
