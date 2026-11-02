/**
 * utils/askAI.js
 * ----------------------------------------------------------------------------
 * One helper for asking Gemini for strict JSON, shared by the learning
 * endpoints so they all fail the same friendly way.
 */
const genAI = require("../config/gemini");
const { GEMINI_MODEL } = require("../config/env");

/**
 * Ask Gemini for strict JSON.
 * Retries once, then turns any failure into a friendly 503.
 */
async function askJSON(prompt, schema, temperature = 0.3) {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature, responseMimeType: "application/json", responseSchema: schema },
  });
  let lastErr;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await model.generateContent(prompt);
      return JSON.parse(r.response.text());
    } catch (e) {
      lastErr = e;
    }
  }
  console.error("AI JSON call failed:", lastErr?.message);
  const err = new Error("AI service is busy. Try again in a moment.");
  err.status = 503;
  throw err;
}

/** Send an error to the client in the shape the frontend expects. */
const fail = (res, e) => res.status(e.status || 500).json({ error: e.message });

module.exports = { askJSON, fail };
