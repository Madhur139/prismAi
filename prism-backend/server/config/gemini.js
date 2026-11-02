/**
 * config/gemini.js
 * ----------------------------------------------------------------------------
 * Creates the Gemini AI client ONCE and shares it.
 * The exact model + JSON schema are chosen later in services/geminiService.js.
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("./env");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

module.exports = genAI;
