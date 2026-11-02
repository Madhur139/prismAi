/*
  GENERAL HELPERS
  - Small reusable functions used by multiple pages/components.
*/
export function getStoredUser() { try { return JSON.parse(localStorage.getItem('prism_user') || 'null'); } catch { return null; } }
export function initial(name = '?') { return String(name).trim().charAt(0).toUpperCase() || '?'; }
export function firstName(name = '') { return String(name).trim().split(/\s+/)[0] || 'learner'; }
export function gameCount(l) { return (l.concepts || []).reduce((n, c) => n + (c.microGames || []).length, 0); }
/**
 * Short summary of a lesson, e.g. "4 concepts · 7 games".
 * The lessons list endpoint returns concepts without their games, so the game
 * part is only included when we actually know it.
 */
export function lessonMeta(l) {
  const concepts = (l.concepts || []).length;
  // The lessons list gives us a ready-made gameCount; the detail view has the
  // games themselves. Use whichever we have.
  const games = l.gameCount != null ? l.gameCount : gameCount(l);
  return games ? `${concepts} concept${concepts === 1 ? '' : 's'} · ${games} game${games === 1 ? '' : 's'}` : `${concepts} concept${concepts === 1 ? '' : 's'}`;
}
export function normalize(v) { return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' '); }

/**
 * Is this hint actually worth showing?
 * A hint that is only a number or a calculation ("4", "4*10", "15 + 25") gives
 * the working away instead of helping the learner think, so it is dropped.
 * A formula hint ("Use V = IR") is exactly what we want, so it is kept.
 */
export function usableHint(hint) {
  const h = String(hint ?? '').trim();
  if (!h) return '';
  if (/^[\d\s.,+\-*/^%()x×÷]+$/i.test(h)) return '';
  return h;
}
export function shuffle(a) { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
export function ytId(u) { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; }
export function avatarFor(user) { return user?.avatar || ''; }
export function greeting() { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
export function dayKey(d) { return new Date(d).toLocaleDateString('en-CA'); }
export function countToday(attempts = []) { const k = dayKey(new Date()); return attempts.filter(a => a.at && dayKey(a.at) === k).length; }
export function timeAgo(date) {
  const s = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return 'just now'; const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; const d = Math.round(h / 24); if (d < 30) return d + ' d ago';
  return new Date(date).toLocaleDateString();
}
