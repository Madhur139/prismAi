/*
  ACTIVITY HEATMAP
  - A GitHub-style grid of the last 12 weeks.
  - Prefers the server's per-day rows (GET /api/progress/activity) so it shows
    real history; falls back to the raw attempts when they are all we have.
  - Empty days stay visible so the pattern of effort can be read at a glance.
*/
import React, { useMemo } from 'react';
import { dayKey } from '../utils/helpers.js';

const WEEKS = 12;

export function Heatmap({ activity = [], attempts = [] }) {
  const { cells, labels, max, total } = useMemo(() => {
    // Count per day, from whichever source has data.
    const counts = {};
    activity.forEach(d => { if (d?.date) counts[d.date] = d.count || 0; });
    if (!Object.keys(counts).length) {
      attempts.forEach(a => { if (a.at) { const k = dayKey(a.at); counts[k] = (counts[k] || 0) + 1; } });
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    // Anchor on the Saturday that closes the current week, then walk back 12 weeks.
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const start = new Date(end);
    start.setDate(start.getDate() - (WEEKS * 7 - 1));

    const cells = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKey(d);
      cells.push({ key, count: counts[key] || 0, date: d, future: d.getTime() > today.getTime() });
    }

    const max = Math.max(1, ...cells.map(c => c.count));
    const total = cells.reduce((s, c) => s + c.count, 0);

    // A month label sits above the first column that starts a new month.
    const labels = [];
    let lastMonth = -1;
    cells.forEach((c, i) => {
      if (i % 7 !== 0) return;
      const m = c.date.getMonth();
      if (m !== lastMonth) { labels.push({ column: i / 7, label: c.date.toLocaleDateString(undefined, { month: 'short' }) }); lastMonth = m; }
    });

    return { cells, labels, max, total };
  }, [activity, attempts]);

  return (
    <div className="heatmap">
      <div className="hm-months" aria-hidden="true">
        {labels.map(l => <span key={l.label + l.column} style={{ left: `${(l.column / WEEKS) * 100}%` }}>{l.label}</span>)}
      </div>
      <div className="hm-grid" role="img" aria-label={`Activity over the last ${WEEKS} weeks: ${total} rounds played`}>
        {cells.map(c => (
          <span
            key={c.key}
            className={'hm-cell' + (c.future ? ' future' : '') + ' lvl' + (c.count ? Math.min(4, Math.ceil((c.count / max) * 4)) : 0)}
            title={`${c.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} — ${c.count} round${c.count === 1 ? '' : 's'}`}
          />
        ))}
      </div>
    </div>
  );
}
