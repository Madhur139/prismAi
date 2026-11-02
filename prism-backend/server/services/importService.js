/**
 * services/importService.js
 * ----------------------------------------------------------------------------
 * Turns outside material into plain text that the lesson engine can use:
 *   extractPdf(buffer)   -> the text of a PDF file
 *   extractYouTube(url)  -> the transcript of a YouTube video
 * Both are best effort: a clear error is better than a broken lesson.
 */
const pdf = require("pdf-parse-fork");

// How much text we hand to the AI (longer costs more and is not better).
const MAX_CHARS = 12000;

/** Read the text out of a PDF buffer. */
async function extractPdf(buffer) {
  const data = await pdf(buffer);
  const text = (data?.text || "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("That PDF has no readable text (it may be a scan of images).");
  return text.slice(0, MAX_CHARS);
}

/** Find the caption track of a YouTube video. */
async function extractYouTube(url) {
  const id = String(url || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1];
  if (!id) throw new Error("That does not look like a YouTube link.");

  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();

  // The tracks are hidden in the player data of the page.
  const tracks = html.match(/"captionTracks":(\[.*?\])/)?.[1];
  if (!tracks) throw new Error("This video has no captions to read.");

  let list = [];
  try { list = JSON.parse(tracks.replace(/\\u0026/g, "&")); } catch { list = []; }
  if (!list.length) throw new Error("This video has no captions to read.");

  // Prefer English, then any language.
  const track = list.find((t) => /lang="en/i.test(t.languageCode || "")) || list[0];
  const capUrl = String(track.baseUrl || "").replace(/\\u0026/g, "&");
  if (!capUrl) throw new Error("This video has no captions to read.");

  const capRes = await fetch(capUrl + (capUrl.includes("?") ? "&" : "?") + "fmt=json3", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const raw = await capRes.text();

  let text = "";
  try {
    const json = JSON.parse(raw);
    text = (json.events || [])
      .map((e) => (e.segs || []).map((s) => s.utf8 || "").join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    // Plain XML captions: strip the tags and read what is left.
    text = raw
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;#39;/g, "'")
      .replace(/&amp;quot;/g, '"')
      .replace(/&amp;amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (!text) throw new Error("The captions of this video are empty.");
  return text.slice(0, MAX_CHARS);
}

/** Clean a pasted block of text so the AI gets something readable. */
function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CHARS);
}

module.exports = { extractPdf, extractYouTube, cleanText, MAX_CHARS };
