/*
  WEEKLY REPORT
  - A shareable summary of the last seven days, built from
    GET /api/progress/weekly.
  - Uses the Web Share API when the device has it, and copies the text
    everywhere else.
*/
import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Icon } from './Icon.jsx';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyReport({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    api('/progress/weekly')
      .then(d => { if (live) setData(d); })
      .catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const share = async () => {
    if (!data) return;
    const text = [
      `My week in Prism`,
      `${data.week.rounds} rounds · ${data.accuracy ?? 0}% accuracy · ${data.week.xp} XP`,
      `${data.streakCount} day streak`,
      data.strongest ? `Strongest: ${data.strongest.conceptName}` : '',
    ].filter(Boolean).join('\n');
    try {
      if (navigator.share) { await navigator.share({ title: 'My week in Prism', text }); return; }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* the user closed the share sheet */ }
  };

  if (loading) return <div className="skeleton text" />;
  if (error) return <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>;
  if (!data) return null;

  const max = Math.max(1, ...data.byDay.map(d => d.rounds));
  const delta = data.accuracy != null && data.previousAccuracy != null ? data.accuracy - data.previousAccuracy : null;
  const mins = Math.round((data.week.timeMs || 0) / 60000);

  return (
    <section className="panel weekly">
      <div className="weekly-head">
        <div>
          <span className="eyebrow">THIS WEEK</span>
          <h3>Your last seven days</h3>
        </div>
        <button className="btn ghost sm" onClick={share}><Icon name={copied ? 'check' : 'external'} size={15} /> {copied ? 'Copied' : 'Share'}</button>
      </div>

      <div className="weekly-stats">
        <div className="weekly-stat">
          <b>{data.week.rounds}</b>
          <span>rounds</span>
        </div>
        <div className="weekly-stat">
          <b>{data.accuracy == null ? '—' : data.accuracy + '%'}</b>
          <span>accuracy{delta != null && delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}</span>
        </div>
        <div className="weekly-stat">
          <b>{data.week.xp}</b>
          <span>XP earned</span>
        </div>
        <div className="weekly-stat">
          <b>{data.streakCount}</b>
          <span>day streak</span>
        </div>
      </div>

      <div className="weekly-chart" role="img" aria-label={`Rounds per day this week: ${data.byDay.map(d => d.rounds).join(', ')}`}>
        {data.byDay.map((d, i) => (
          <div className="weekly-col" key={d.date} title={`${DAY_LABELS[i]}: ${d.rounds} rounds`}>
            <div className="weekly-bar"><i style={{ height: `${Math.max(4, (d.rounds / max) * 100)}%` }} /></div>
            <span>{DAY_LABELS[i].slice(0, 1)}</span>
          </div>
        ))}
      </div>

      <div className="weekly-foot">
        <div>
          {data.strongest && <span className="weekly-chip good"><Icon name="trophy" size={14} /> Strongest: {data.strongest.conceptName} ({data.strongest.pct}%)</span>}
          {data.weakest && <span className="weekly-chip warn"><Icon name="target" size={14} /> Watch: {data.weakest.conceptName} ({data.weakest.pct}%)</span>}
        </div>
        {mins > 0 && <span className="weekly-time"><Icon name="clock" size={14} /> {mins} min of practice</span>}
      </div>
    </section>
  );
}
