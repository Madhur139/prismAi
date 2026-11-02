/**
 * config/env.js
 * ----------------------------------------------------------------------------
 * Reads all settings from process.env (filled from the .env file) in ONE place.
 * Other files import from here instead of touching process.env directly,
 * so if a name changes you only fix it here.
 */

// Fail fast: if a critical secret is missing, stop now with a clear message
// instead of crashing mysteriously later.
for (const k of ["MONGO_URI", "JWT_SECRET", "GEMINI_API_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing required env var: ${k}`);
    process.exit(1);
  }
}

module.exports = {
  PORT: process.env.PORT || 5000, // default port if not set
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "*", // which website may call this API
  GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY || "",
  GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID || "",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};
