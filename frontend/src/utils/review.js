/*
  REVIEW HELPERS
  - Small helpers for the spaced repetition queue and the mistake notebook.
*/

/** "Due now", "Due tomorrow", "Due in 4 days" ... */
export function dueLabel(dueAt) {
  if (!dueAt) return 'Due now';
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return 'Due now';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(due); target.setHours(0, 0, 0, 0);
  const days = Math.round((target - today) / 86400000);
  if (days <= 0) return 'Due now';
  if (days === 1) return 'Due tomorrow';
  if (days < 7) return `Due in ${days} days`;
  if (days < 14) return 'Due next week';
  return `Due in ${Math.round(days / 7)} weeks`;
}

/** How well a concept is going, in one short label. */
export function streakLabel(streak = 0) {
  if (streak <= 0) return 'Needs work';
  if (streak === 1) return 'Just started';
  if (streak < 3) return 'Coming along';
  if (streak < 5) return 'Going well';
  return 'Strong';
}

/** A tone for a concept, used to colour the review cards. */
export function streakTone(streak = 0) {
  if (streak <= 0) return 'bad';
  if (streak < 3) return 'warn';
  return 'good';
}
