/* Tiny WebAudio beeps for right/wrong answers (respects the "Game sounds" setting). */
import { readSettings } from './settings.js';
export function playTone(correct) {
  if (!readSettings().gameSounds) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = new C(), notes = correct ? [523, 784] : [196, 150];
    notes.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.11;
      o.type = correct ? 'sine' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2);
    });
    setTimeout(() => c.close?.(), 600);
  } catch {}
}
