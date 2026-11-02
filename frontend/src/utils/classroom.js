/*
  CLASSROOM HELPERS
  - Small helpers shared by the teacher and student classroom screens.
*/

/** "Due tomorrow", "Due in 3 days", "Overdue by 2 days", "No deadline" */
export function dueLabel(dueAt) {
  if (!dueAt) return '';
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(due); target.setHours(0, 0, 0, 0);
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 7) return `Due in ${days} days`;
  if (days < 14) return 'Due next week';
  return `Due in ${Math.round(days / 7)} weeks`;
}

/** 'late' | 'soon' | 'ok' - how urgent a deadline is. */
export function dueTone(dueAt) {
  if (!dueAt) return 'ok';
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return 'ok';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(due); target.setHours(0, 0, 0, 0);
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return 'late';
  if (days <= 1) return 'soon';
  return 'ok';
}

/** A short date like "24 Oct". */
export function shortDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** How a learner is doing on one piece of work. */
export function workStatus(row, targetRounds = 0, targetAccuracy = 0) {
  if (!row || !row.started) return { key: 'none', label: 'Not started' };
  const needRounds = targetRounds || 1;
  const needAccuracy = targetAccuracy || 0;
  const done = row.attempts >= needRounds && (!needAccuracy || (row.accuracy != null && row.accuracy >= needAccuracy));
  if (!done) return { key: 'doing', label: `${row.attempts}/${needRounds} rounds` };
  if (needAccuracy && row.accuracy != null && row.accuracy < needAccuracy) return { key: 'close', label: `${row.accuracy}% — below ${needAccuracy}%` };
  return { key: 'done', label: 'Done' };
}
