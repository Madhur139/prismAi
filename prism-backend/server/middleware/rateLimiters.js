/**
 * middleware/rateLimiters.js
 * ----------------------------------------------------------------------------
 * Stricter limit for AI routes, because every AI call costs money/quota.
 * 8 requests per minute per IP.
 */
const rateLimit = require("express-rate-limit");

const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 8,
  message: { error: "Too many generations, slow down." },
});

module.exports = { generateLimiter };
