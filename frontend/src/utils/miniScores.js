/*
  MINI GAME SCORES
  - Best score per mini game, kept in the browser (localStorage).
  - These are skill games, so scores are local only and never touch the
    backend, XP or progress.
*/

const KEY = 'prism_mini_scores';

/** All stored best scores as { GAME_TYPE: score }. */
export function getScores() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

/** Best score for one game (0 when nothing has been played yet). */
export function getScore(game) {
  return getScores()[game] || 0;
}

/**
 * Store a score if it beats the previous best.
 * Returns true when a new best was set.
 */
export function saveScore(game, score) {
  const value = Number(score) || 0;
  const all = getScores();
  if (value <= (all[game] || 0)) return false;
  all[game] = value;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
  return true;
}
