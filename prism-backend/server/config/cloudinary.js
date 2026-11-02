/**
 * config/cloudinary.js
 * ----------------------------------------------------------------------------
 * Logs in to your Cloudinary account (image hosting) and exports the
 * ready-to-use `cloudinary` object for other files.
 */
const { v2: cloudinary } = require("cloudinary");
const env = require("./env");

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true, // always return https:// URLs
});

module.exports = cloudinary;
