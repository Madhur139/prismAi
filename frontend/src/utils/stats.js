/*
  BADGE STATS STORE
  - Tracks badge-relevant metrics in localStorage (prism_stats).
  - The backend /api/progress/me only returns XP/streak/weak concepts,
    so we keep rounds, perfects, flashcards reviewed, etc. here.
*/
const KEY = 'prism_stats';
const base = {
  rounds: 0,
  perfects: 0,
  lessonsCompleted: 0,
  mistakesFixed: 0,
  flashcards: 0,
  streak: 0,
  teacherMode: false,
  helpAnswers: 0,
  pomodoros: 0,
};

export function readStats() {
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...base }; }
}

export function saveStats(next) {
  const value = { ...readStats(), ...next };
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
  return value;
}

export function incrementStat(key, amount = 1) {
  const s = readStats();
  s[key] = (s[key] || 0) + amount;
  saveStats(s);
  return s;
}

export function setStat(key, value) {
  const s = readStats();
  s[key] = value;
  saveStats(s);
  return s;
}

export function resetStats() {
  try { localStorage.removeItem(KEY); } catch {}
}
