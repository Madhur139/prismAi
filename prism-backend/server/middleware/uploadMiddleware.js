/**
 * middleware/uploadMiddleware.js
 * ----------------------------------------------------------------------------
 * Multer reads uploaded files from multipart forms.
 * memoryStorage keeps the file in RAM as a Buffer (no disk writes),
 * so we can send it straight to Gemini and Cloudinary.
 *
 * Use in a route like: upload.single("image")  -> file ends up in req.file
 */
const multer = require("multer");

/*
  Some browsers send a strange (or empty) mime type for a perfectly good
  picture, so we also look at the file name before saying no.
*/
const IMAGE_EXT = /\.(png|jpe?g|webp|heic|heif|gif|bmp|avif)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 }, // max 8 MB, one file
  fileFilter: (_req, file, cb) => {
    const looksLikeImage = /^image\//i.test(file.mimetype || "") || IMAGE_EXT.test(file.originalname || "");
    if (looksLikeImage) cb(null, true);
    else cb(new Error("Only picture files are allowed (PNG, JPEG, WEBP, HEIC)"));
  },
});

/*
  The import route takes a different kind of file: a PDF of notes.
  It has its own limits so an image upload is never affected by it.
*/
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname || "");
    if (isPdf) cb(null, true);
    else cb(new Error("Only PDF files can be imported"));
  },
});

module.exports = upload;
module.exports.uploadPdf = uploadPdf;
