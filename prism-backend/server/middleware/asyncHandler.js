/**
 * middleware/asyncHandler.js
 * ----------------------------------------------------------------------------
 * Wraps async controllers so any error they throw goes to errorHandler.js
 * instead of crashing the server. Use it like: asyncHandler(async (req, res) => {...})
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
