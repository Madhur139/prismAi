/**
 * services/imageStorage.js
 * ----------------------------------------------------------------------------
 * Where uploaded pictures end up.
 *
 * Cloudinary is the nice option (fast CDN, no disk used), but it needs
 * CLOUDINARY_CLOUD_NAME in the .env. When that is missing the app should
 * still work, so the picture is saved on our own server instead and served
 * from /uploads.
 *
 * Either way the caller gets the same shape back: { secure_url, public_id }.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { uploadBufferToCloudinary, deleteImage, isConfigured, configError } = require("./cloudinaryService");

// Our own little image folder, next to the server.
const DIR = path.join(__dirname, "..", "..", "uploads");

/** Write the bytes to our own server. */
function saveLocally(buffer, mimetype) {
  fs.mkdirSync(DIR, { recursive: true });
  let ext = String(mimetype || "").split("/")[1] || "jpg";
  ext = ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 5);
  if (ext === "jpeg") ext = "jpg";
  if (!ext) ext = "jpg";
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(DIR, name), buffer);
  return { secure_url: `/uploads/${name}`, public_id: `local:${name}` };
}

/**
 * Save an image and return { secure_url, public_id }.
 * Cloudinary is used when it is set up; otherwise the file is kept locally.
 */
async function saveImage(buffer, { userId, mimetype } = {}) {
  if (!buffer) throw new Error("No image was uploaded.");
  if (isConfigured()) {
    try {
      return await uploadBufferToCloudinary(buffer, userId);
    } catch (e) {
      console.warn("Cloudinary upload failed, keeping the image on our server:", e.message);
    }
  } else {
    console.warn("Cloudinary is not set up, keeping the image on our server. (" + configError() + ")");
  }
  return saveLocally(buffer, mimetype);
}

/** Remove a stored image, wherever it lives. */
function removeImage(publicId) {
  if (!publicId) return;
  if (String(publicId).startsWith("local:")) {
    try { fs.unlinkSync(path.join(DIR, String(publicId).slice(6))); } catch { /* already gone */ }
    return;
  }
  deleteImage(publicId);
}

/**
 * Turn a stored path into a full address the browser can load.
 * "/uploads/x.jpg" becomes "http://localhost:8080/uploads/x.jpg".
 */
function absoluteUrl(req, url) {
  const u = String(url || "");
  if (!u || /^https?:\/\//i.test(u)) return u;
  const host = req.get("host") || "localhost";
  return `${req.protocol}://${host}${u.startsWith("/") ? "" : "/"}${u}`;
}

module.exports = { saveImage, removeImage, absoluteUrl, DIR };
