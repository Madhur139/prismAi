/* SESSION SUMMARY - results screen after a lesson session or arcade run. */
import React from 'react';
import { Ring, Spinner } from './ui.jsx';
import { Icon } from './Icon.jsx';

export function Summary({ summary, onAgain, onExit, exitLabel = 'Back to lesson', againLabel = 'Play again', onRetry }) {
  const { results, xp, total, streak, state } = summary;
  const ok = results.filter(r => r.correct).length, pct = results.length ? Math.round(ok / results.length * 100) : 0, by = {};
  results.forEach(r => { const x = by[r.conceptName] || (by[r.conceptName] = { ok: 0, n: 0 }); x.n++; if (r.correct) x.ok++; });
  const title = summary.boss ? (summary.won ? 'Boss defeated!' : 'The boss survived…') : pct >= 80 ? 'Excellent session!' : pct >= 50 ? 'Solid progress.' : 'Good start — keep going.';
  const sub = summary.boss ? (summary.won ? 'You kept your cool and finished the fight.' : 'Review the concepts and challenge it again.') : `${ok} of ${results.length} correct`;
  return (
    <section className="summary">
      {(summary.won || pct >= 80) && <div className="confetti" aria-hidden="true">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ '--x': `${(i * 29) % 100}%`, '--d': `${(i % 9) * 0.1}s`, '--c': ['#ff5d8f', '#ffd84d', '#37e0a0', '#2cb8ff', '#8b7bff'][i % 5] }} />)}</div>}
      <div className="summary-top">
        <Ring value={pct} size={150} stroke={13}><b className="ring-num">{pct}%</b><span>accuracy</span></Ring>
        <div className="summary-copy">
          <span className="eyebrow">{summary.boss ? 'BOSS MODE' : 'SESSION COMPLETE'}</span>
          <h2>{title}</h2><p>{sub}</p>
        </div>
      </div>
      <div className="summary-stats">
        <div><Icon name="check" size={18} /><b>{ok}/{results.length}</b><span>Correct</span></div>
        <div><Icon name="bolt" size={18} /><b>{state === 'saving' ? <Spinner /> : xp == null ? '—' : '+' + xp}</b><span>XP earned</span></div>
        <div><Icon name="flame" size={18} /><b>{state === 'saving' ? <Spinner /> : streak == null ? '—' : streak}</b><span>Day streak</span></div>
        <div><Icon name="trophy" size={18} /><b>{state === 'saving' ? <Spinner /> : total == null ? '—' : Number(total).toLocaleString()}</b><span>Total XP</span></div>
      </div>
      {state === 'error' && <div className="alert error"><Icon name="alert" size={18} /><span>Couldn’t save your progress{summary.error ? ` (${summary.error})` : ''}.</span>{onRetry && <button className="link-btn" onClick={onRetry}>Retry</button>}</div>}
      {Object.keys(by).length > 0 && <div className="summary-list">{Object.entries(by).map(([k, v]) => <div key={k}><span>{k}</span><div className="bar"><i style={{ width: `${v.ok / v.n * 100}%` }} /></div><b>{v.ok}/{v.n}</b></div>)}</div>}
      <div className="summary-actions"><button className="btn primary lg" onClick={onAgain}><Icon name="refresh" size={18} /> {againLabel}</button><button className="btn ghost lg" onClick={onExit}>{exitLabel}</button></div>
    </section>
  );
}
