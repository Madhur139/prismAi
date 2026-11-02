/**
 * ============================================================================
 * server.js — ENTRY POINT (the file you run with `node server.js`)
 * ============================================================================
 * This file is now SMALL on purpose. Its only jobs are:
 *   1. load .env
 *   2. create the Express app and add global middleware
 *   3. plug in the route files (auth, lessons, progress)
 *   4. add the error handler
 *   5. connect to MongoDB and start listening
 *
 * FOLDER MAP (where everything else lives):
 *   config/       -> settings + connections (env, DB, Cloudinary, Gemini, constants)
 *   models/       -> Mongoose schemas = shape of data in MongoDB
 *   controllers/  -> the actual logic of each endpoint (what happens on a request)
 *   routes/       -> URL list: which URL calls which controller
 *   middleware/   -> code that runs BEFORE a controller (login check, file upload...)
 *   services/     -> talks to outside services (Gemini AI, Cloudinary)
 *   utils/        -> small reusable helpers (validation, dates, tokens)
 *
 * Flow of one request:
 *   Request -> server.js -> routes/ -> middleware/ -> controllers/ -> models/ & services/ -> Response
 * ============================================================================
 */

// MUST be first: loads .env into process.env before any other file reads it
require("dotenv").config();

const express = require("express");
const cors = require("cors"); // lets the React app (another port) call us
const helmet = require("helmet"); // safe security headers
const rateLimit = require("express-rate-limit"); // blocks request spam
const mongoose = require("mongoose");

const { PORT, CLIENT_ORIGIN, GEMINI_MODEL } = require("./server/config/env.js");
const connectDB = require("./server/config/db");
const errorHandler = require("./server/middleware/errorHandler");
const path = require("path");

// Route files — each one handles a group of URLs
const authRoutes = require("./server/routes/authRoutes");
const lessonRoutes = require("./server/routes/lessonRoutes");
const progressRoutes = require("./server/routes/progressRoutes");
const aiRoutes = require("./server/routes/aiRoutes");
const teacherRoutes = require("./server/routes/teacherRoutes");
const duelRoutes = require("./server/routes/duelRoutes");
const classDuelRoutes = require("./server/routes/classDuelRoutes");
const helpRoutes = require("./server/routes/helpRoutes");
const groupRoutes = require("./server/routes/groupRoutes");
const inviteRoutes = require("./server/routes/inviteRoutes");

const app = express();
// Behind a proxy (Heroku, Render, nginx) we need the real host and protocol,
// so the links we build for uploaded pictures point at the right place.
app.set("trust proxy", 1);

/* ---------- Global middleware (runs on EVERY request) ---------- */
/*
  Helmet is on, but with two things relaxed:
  - "Cross-Origin-Resource-Policy: cross-origin", because the website runs on
    a different origin than the API (localhost:5173 vs localhost:8080). With
    the default "same-origin" the browser quietly refuses to load any picture
    we serve - it returns 200, but the image never appears.
  - "img-src" allows pictures from https and blob: as well.
*/
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "blob:", "https:"],
      },
    },
  })
);
app.use(cors({ origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN.split(",") }));
app.use(express.json({ limit: "1mb" })); // read JSON bodies into req.body
// Pictures we kept on our own server (used when Cloudinary is not set up).
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d" }));
// General limit: 120 requests per minute per IP on all /api routes
app.use("/api/", rateLimit({ windowMs: 60 * 1000, max: 120 }));

/* ---------- Routes ---------- */
// Health check: "is the server alive?" (good for deployment monitors)
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1, model: GEMINI_MODEL })
);

// app.use(prefix, router): every URL inside authRoutes starts with /api/auth, etc.
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/duel", duelRoutes);
app.use("/api/classduel", classDuelRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/invites", inviteRoutes);

/* ---------- Errors ---------- */
// Any URL that matched nothing above -> 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
// Central error handler (must be LAST)
app.use(errorHandler);

/* ---------- Start ---------- */
// Connect to MongoDB FIRST, then start listening
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Prism AI backend running on :${PORT}`));
});

// Log (instead of crash on) promises that failed without a .catch()
process.on("unhandledRejection", (r) => console.error("Unhandled rejection:", r));
