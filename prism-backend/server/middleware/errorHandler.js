/**
 * middleware/errorHandler.js
 * ----------------------------------------------------------------------------
 * Central error handler: every error thrown in any route ends up here.
 * Express knows it's an error handler because it has 4 parameters.
 */
const multer = require("multer");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // Upload problems (file too big, etc.) -> 400 with a friendly message
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ error: err.code === "LIMIT_FILE_SIZE" ? "Image too large (max 8MB)" : err.message });
  }
  // Wrong file type (thrown by uploadMiddleware's fileFilter)
  if (err?.message?.startsWith("Only PNG")) return res.status(400).json({ error: err.message });

  // Image hosting is not set up (missing cloud name / keys). Say what to fix
  // instead of a generic 500, so the problem is obvious straight away.
  if (/Cloudinary is not configured|Must supply cloud_name|Missing required.*CLOUDINARY/i.test(err?.message || "")) {
    return res.status(503).json({ error: err.message });
  }

  console.error(err); // full details only in the server log
  res.status(500).json({ error: "Internal server error" }); // generic message to the client
}

module.exports = errorHandler;
