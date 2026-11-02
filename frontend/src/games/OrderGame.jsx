/*
  ORDERING - put the steps of a process in the right order.
  Tap the steps in order, or press the number keys 1-9 to pick from the bank.
*/
import React, { useState, useEffect } from 'react';
import { shuffle } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';

export function OrderGame({ game, submitted, onResolve }) {
  const steps = game.steps || [];
  const [bank] = useState(() => shuffle(steps.map((_, i) => i))); // scrambled pool
  const [placed, setPlaced] = useState([]); // step indexes, in the learner's order
  const [checked, setChecked] = useState(false);

  const put = (stepIdx) => {
    if (submitted || placed.includes(stepIdx)) return;
    setPlaced(p => [...p, stepIdx]);
  };
  const take = (pos) => {
    if (submitted) return;
    setPlaced(p => p.filter((_, i) => i !== pos));
  };
  const check = () => {
    if (submitted) return;
    const ok = placed.length === steps.length && placed.every((s, i) => s === i);
    setChecked(true);
    onResolve(ok);
  };

  // Number keys pick the n-th item still waiting in the bank.
  useEffect(() => {
    if (submitted) return;
    const f = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (!n) return;
      const waiting = bank.filter(i => !placed.includes(i));
      if (n >= 1 && n <= waiting.length) { e.preventDefault(); put(waiting[n - 1]); }
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [bank, placed, submitted]);

  const slotState = (pos) => {
    if (!checked) return '';
    return placed[pos] === pos ? 'right' : 'wrong';
  };

  return (
    <div className="order-game">
      <div className="order-slots">
        {steps.map((_, i) => (
          <button key={i} className={`order-slot ${placed[i] !== undefined ? 'filled' : ''} ${slotState(i)}`} disabled={submitted} onClick={() => take(i)}>
            <span className="order-num">{i + 1}</span>
            <span className="order-text">{placed[i] !== undefined ? steps[placed[i]] : 'Tap a step below'}</span>
          </button>
        ))}
      </div>

      <div className="order-bank">
        {bank.map((i, n) => (
          <button key={i} className={`order-chip ${placed.includes(i) ? 'used' : ''}`} disabled={submitted || placed.includes(i)} onClick={() => put(i)}>
            {steps[i]}
            {!placed.includes(i) && !submitted && <em>{n + 1}</em>}
          </button>
        ))}
      </div>

      <div className="order-tools">
        <button className="btn primary" onClick={check} disabled={submitted || placed.length !== steps.length}>
          {checked ? 'Checked' : 'Check order'} <Icon name="check" size={18} />
        </button>
        <button className="btn ghost" disabled={submitted || !placed.length} onClick={() => { setPlaced([]); setChecked(false); }}>
          <Icon name="refresh" size={17} /> Clear
        </button>
        {!submitted && <button className="btn ghost" onClick={() => onResolve(false)}>Skip</button>}
      </div>

      {checked && !submitted && <p className="hint-line">Some steps are out of order — swap them and try again.</p>}
    </div>
  );
}
