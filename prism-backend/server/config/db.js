/**
 * config/db.js
 * ----------------------------------------------------------------------------
 * Connects to MongoDB using Mongoose. Called once from server.js.
 */
const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    // Without a database the app is useless, so stop the process
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
