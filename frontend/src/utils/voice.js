/*
  VOICE MODE
  - speak(text) reads a question out loud.
  - listen() captures one spoken answer.
  - matchSpoken() works out which option somebody said.

  Both use the Web Speech API that is built into the browser, so the audio
  never leaves the device and nothing is sent to the server.
*/

/* Is the browser able to read text out loud? */
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/* Is the browser able to hear the learner? (Chrome and Edge do, Safari mostly does) */
export const canListen = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/** Read a piece of text out loud. Returns a function that stops it. */
export function speak(text, { lang = 'en-US', rate = 0.95, pitch = 1 } = {}) {
  if (!canSpeak() || !text) return () => {};
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = lang; u.rate = rate; u.pitch = pitch;
    window.speechSynthesis.speak(u);
  } catch { /* some browsers block speech without a user gesture */ }
  return () => stopSpeaking();
}

/** Stop reading out loud. */
export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
}

/**
 * Read text out loud with more control: choose a voice, follow the progress and
 * pause/resume. Used by the Listen panel (a longer, scripted read).
 * Returns a handle, or null when the browser cannot speak.
 */
export function speakWithOptions(text, { lang = 'en-US', rate = 1, pitch = 1, voiceURI = '', onProgress, onEnd } = {}) {
  if (!canSpeak() || !text) return null;
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = lang; u.rate = rate; u.pitch = pitch;
  if (voiceURI) {
    const v = (window.speechSynthesis.getVoices() || []).find(x => x.voiceURI === voiceURI);
    if (v) u.voice = v;
  }
  u.onboundary = e => {
    if (e.name === 'word' && typeof e.charIndex === 'number') onProgress?.(e.charIndex / String(text).length);
  };
  u.onend = () => onEnd?.(true);
  u.onerror = () => onEnd?.(false);
  try { window.speechSynthesis.speak(u); } catch { return null; }
  return {
    pause: () => { try { window.speechSynthesis.pause(); } catch { /* ignore */ } },
    resume: () => { try { window.speechSynthesis.resume(); } catch { /* ignore */ } },
    stop: () => stopSpeaking(),
  };
}

/** The voices this browser offers, for a picker. */
export function listVoices() {
  if (!canSpeak()) return [];
  try { return window.speechSynthesis.getVoices() || []; } catch { return []; }
}

/**
 * Called when the voice list has loaded. Chrome delivers the voices
 * asynchronously, so a picker has to wait for this.
 * Returns an unsubscribe function.
 */
export function onVoicesChanged(handler) {
  if (!canSpeak()) return () => {};
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
}

/**
 * Listen for one spoken answer.
 * Resolves with the transcript (empty string if nothing was heard).
 */
export function listen({ lang = 'en-US', timeout = 9000 } = {}) {
  return new Promise((resolve) => {
    const Ctor = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!Ctor) return resolve('');
    let done = false;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    const timer = setTimeout(() => finish(''), timeout);
    const finish = (text) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { rec.stop(); } catch {}
      resolve(text || '');
    };
    rec.onresult = e => finish(e.results?.[0]?.[0]?.transcript || '');
    rec.onerror = () => finish('');
    rec.onend = () => finish('');
    try { rec.start(); } catch { clearTimeout(timer); resolve(''); }
  });
}

/* Lowercase, drop punctuation, squeeze the spaces. */
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Which option did the learner say?
 * Returns the option string, or null when nothing matched well enough.
 */
export function matchSpoken(spoken, options = []) {
  const s = norm(spoken);
  if (!s || !options.length) return null;
  let best = null, bestScore = 0;

  options.forEach((o) => {
    const t = norm(o);
    if (!t) return;
    let score = 0;
    if (t === s) score = 1;
    else if (t.startsWith(s) || s.startsWith(t)) score = 0.85;
    else if (t.includes(s) || s.includes(t)) score = 0.75;
    else {
      // How many of the option's words were said?
      const said = new Set(s.split(' '));
      const words = t.split(' ');
      let hits = 0;
      words.forEach((w) => { if (said.has(w)) hits++; });
      score = words.length ? hits / words.length : 0;
    }
    if (score > bestScore) { bestScore = score; best = o; }
  });

  return bestScore >= 0.5 ? best : null;
}

/**
 * Split a spoken answer into the blanks of a cloze question.
 * "glucose and carbon dioxide" -> ["glucose", "carbon dioxide"]
 */
export function splitSpoken(spoken, count) {
  const s = String(spoken || '').trim();
  if (!s || count <= 1) return [s];
  const words = s.split(/\s+/);
  if (words.length === count) return words;
  // Too many words: cut them into count parts as evenly as possible.
  const per = Math.ceil(words.length / count);
  const parts = [];
  for (let i = 0; i < count; i++) parts.push(words.slice(i * per, (i + 1) * per).join(' '));
  return parts;
}
