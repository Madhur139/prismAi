/**
 * services/diagramService.js
 * ----------------------------------------------------------------------------
 * Builds a labelled diagram for a concept, so that the DIAGRAM_HOTSPOT and
 * MULTI_LABEL games work for lessons that were made from a topic instead of
 * from a photo.
 *
 * HOW IT WORKS
 * The text model draws the diagram as SVG and we tell it exactly where every
 * part has to sit. Because we fix the layout, we also know where each part is
 * and can build the clickable boxes ourselves - no guessing.
 *
 *   part 1 -> top left     (25, 25)
 *   part 2 -> top right    (75, 25)
 *   part 3 -> bottom left  (25, 75)
 *   part 4 -> bottom right (75, 75)
 *
 * The SVG is drawn in a 0-100 x 0-100 space, which is the same space the
 * hotspot percentages use, so the boxes land exactly on the drawing.
 */
const { SchemaType } = require("@google/generative-ai");
const genAI = require("../config/gemini");
const { GEMINI_MODEL } = require("../config/env");

// Where each part has to be drawn, and the box that belongs to it.
const SLOTS = [
  { cx: 25, cy: 25 },
  { cx: 75, cy: 25 },
  { cx: 25, cy: 75 },
  { cx: 75, cy: 75 },
];
const PART_SIZE = 13; // half of the clickable box around the centre

/* The clickable box of every slot, in percent (0-100). */
const boxes = () => SLOTS.map(s => ({
  x: Math.max(0, s.cx - PART_SIZE),
  y: Math.max(0, s.cy - PART_SIZE),
  w: PART_SIZE * 2,
  h: PART_SIZE * 2,
}));

// ---- 1. pick the parts -------------------------------------------------
const PARTS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    parts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    single: { type: SchemaType.STRING },
    pair: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["title", "parts", "single", "pair"],
};

async function askParts({ topic, concept, summary }) {
  const prompt = `I need a simple labelled diagram for a school lesson.
Topic: "${topic}". Concept: "${concept}"${summary ? ` — ${summary}` : ""}.

Give me:
- "title": a short caption for the diagram.
- "parts": exactly 4 short labels (1-3 words each) for the parts that belong in the diagram. They must be things that can really be drawn: no abstract ideas.
- "single": one of the 4 parts - the easiest one to identify.
- "pair": exactly 2 of the 4 parts that belong to the same group.
Only output the data.`;
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json", responseSchema: PARTS_SCHEMA, temperature: 0.4 },
  });
  const r = await model.generateContent(prompt);
  const json = JSON.parse(String(r.response.text()).replace(/```json|```/g, "").trim());
  const parts = (json.parts || []).map((p) => String(p).trim()).filter(Boolean).slice(0, 4);
  if (parts.length < 3) throw new Error("The AI could not think of enough parts to draw.");
  return { title: String(json.title || concept).slice(0, 80), parts, single: String(json.single || parts[0]), pair: (json.pair || []).map(String).slice(0, 2) };
}

// ---- 2. draw the SVG ---------------------------------------------------
async function askSvg({ title, parts }) {
  const rules = parts.map((p, i) => `part ${i + 1} = "${p}" -> centre (${SLOTS[i].cx}, ${SLOTS[i].cy})`).join("; ");
  const prompt = `Draw one simple educational diagram as SVG.

Title: ${title}
${rules}

RULES (follow them exactly, the app depends on it):
- Output ONLY the <svg> element. No markdown, no explanation, no XML declaration.
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
- A white background <rect width="100" height="100" fill="#ffffff"/>.
- First draw ONE big container shape that holds everything: a large rounded rectangle or a big circle centred at (50,50), about 46 wide and 46 tall, filled very light grey (#f4f3fb) with a thin grey outline (#c9c6e0). This is the "whole" thing (the cell, the organ, the machine).
- Then draw the ${parts.length} parts INSIDE that container, one per position above. Each part is a simple, clearly different shape (circle, rounded rectangle, ellipse, triangle...) with a flat pastel fill and a darker outline (stroke-width 1.2). Put the shape centred on the given point with a radius of about 9.
- Put the label of the part as <text> directly BELOW its shape, centred, font-size 4.2, fill="#15132e", text-anchor="middle", font-family="sans-serif". Label text may be smaller (3.8) if it is long.
- No other text, no title text, no numbers, no legend, no gradients, no filters, no <script>, no external references.
- Keep it clean and readable on a phone.`;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.3 },
  });
  const r = await model.generateContent(prompt);
  return cleanSvg(String(r.response.text()));
}

/* Keep only the SVG and make sure it is safe and small enough. */
function cleanSvg(text) {
  let svg = String(text || "").trim();
  const start = svg.indexOf("<svg");
  const end = svg.lastIndexOf("</svg>");
  if (start === -1 || end === -1) throw new Error("The AI did not return a diagram.");
  svg = svg.slice(start, end + 6);

  // Safety: no scripts, no external files.
  if (/<script|onload=|href=|xlink:href/i.test(svg)) throw new Error("The diagram contained something that is not allowed.");
  // The fixed viewBox is what makes the clickable boxes land correctly.
  if (!/viewBox="0 0 100 100"/.test(svg)) {
    svg = svg.replace(/viewBox="[^"]*"/, 'viewBox="0 0 100 100"');
  }
  if (!/viewBox="0 0 100 100"/.test(svg)) throw new Error("The diagram came back in the wrong size.");
  if (svg.length > 60000) throw new Error("The diagram came back too big.");
  return svg;
}

/**
 * Build a diagram for a concept.
 * Returns { svg, title, parts, single, pair }.
 */
async function buildDiagram({ topic, concept, summary }) {
  const plan = await askParts({ topic, concept, summary });
  const svg = await askSvg({ title: plan.title, parts: plan.parts });
  return { ...plan, svg };
}

module.exports = { buildDiagram, SLOTS, boxes };
