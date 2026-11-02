/**
 * services/cloudinaryService.js
 * ----------------------------------------------------------------------------
 * Upload / delete images on Cloudinary.
 */
const cloudinary = require("../config/cloudinary");

/**
 * Is Cloudinary actually set up?
 * The cloud name is the piece people forget, and without it the SDK throws
 * "Must supply cloud_name" the moment an upload starts.
 */
function isConfigured() {
  const c = cloudinary.config() || {};
  return !!(c.cloud_name && c.api_key && c.api_secret);
}

/** A short, readable reason when Cloudinary cannot be used. */
function configError() {
  const c = cloudinary.config() || {};
  if (!c.cloud_name) return "Cloudinary is not configured: CLOUDINARY_CLOUD_NAME is missing from the backend .env";
  if (!c.api_key) return "Cloudinary is not configured: CLOUDINARY_API_KEY is missing from the backend .env";
  if (!c.api_secret) return "Cloudinary is not configured: CLOUDINARY_API_SECRET is missing from the backend .env";
  return "Cloudinary is not configured";
}

// Uploads an image that lives in RAM (a Buffer) to Cloudinary.
// `upload_stream` uses callbacks, so we wrap it in a Promise to use `await`.
// It always REJECTS on failure - it never throws synchronously, so callers
// can simply .catch() it.
function uploadBufferToCloudinary(buffer, userId) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) return reject(new Error(configError()));

    let stream;
    try {
      stream = cloudinary.uploader.upload_stream(
        { folder: `prism_ai/${userId}`, resource_type: "image", overwrite: false },
        (err, result) => (err ? reject(err) : resolve(result)) // result has secure_url + public_id
      );
    } catch (e) {
      // A misconfiguration can throw straight away instead of calling back.
      return reject(e);
    }
    stream.end(buffer); // push the bytes into the stream
  });
}

// Deletes an image. Errors are ignored on purpose: a leftover image
// is not worth failing the user's request over.
function deleteImage(publicId) {
  if (!publicId) return;
  try {
    const r = cloudinary.uploader.destroy(publicId);
    if (r && typeof r.catch === "function") r.catch(() => {});
  } catch { /* ignore */ }
}

module.exports = { uploadBufferToCloudinary, deleteImage, isConfigured, configError };
