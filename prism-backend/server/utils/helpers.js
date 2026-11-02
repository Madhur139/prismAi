/**
 * utils/helpers.js
 * ----------------------------------------------------------------------------
 * Small helper functions used by several controllers.
 */
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { JWT_SECRET } = require("../config/env");

// Creates a login token valid for 7 days (stores user id + email inside)
const signToken = (u) => jwt.sign({ id: u._id.toString(), email: u.email }, JWT_SECRET, { expiresIn: "7d" });

// Checks that a string looks like a real MongoDB id (prevents server errors)
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Today's date as "YYYY-MM-DD" in UTC
const todayUTC = () => new Date().toISOString().slice(0, 10);

// Days between two "YYYY-MM-DD" strings (86,400,000 ms = 1 day)
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

module.exports = { signToken, isValidId, todayUTC, dayDiff };
