/*
  TIMELINE - put the events in the right order.
  Every card carries its own date, so the learner sorts whole "date + event" cards.
*/
import React, { useState } from 'react';
import { shuffle } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';
import '../styles/games/visual.css';

export function Timeline({ game, submitted, onResolve }) {
  const steps = game.steps || [];
  const dates = game.dates || [];
  const [bank] = useState(() => shuffle(steps.map((_, i) => i)));
  const [placed, setPlaced] = useState([]); // step indexes, in the learner's order

  const put = (i) => {
    if (submitted || placed.includes(i)) return;
    setPlaced(p => [...p, i]);
  };
  const take = (pos) => {
    if (submitted) return;
    setPlaced(p => p.filter((_, i) => i !== pos));
  };
  const check = () => {
    if (submitted) return;
    const ok = placed.length === steps.length && placed.every((s, i) => s === i);
    onResolve(ok);
  };

  if (!steps.length) return <div className="tl-empty"><p>This game could not be built from its data.</p></div>;

  return (
    <div className="tl-game">
      <div className="tl-slots">
        {steps.map((_, i) => (
          <button key={i} className={`tl-slot ${placed[i] !== undefined ? 'filled' : ''} ${submitted ? (placed[i] === i ? 'right' : 'wrong') : ''}`} disabled={submitted} onClick={() => take(i)}>
            <span className="tl-num">{i + 1}</span>
            <span className="tl-text">
              {placed[i] !== undefined && <b>{dates[placed[i]] || ''}</b>}
              <span>{placed[i] !== undefined ? steps[placed[i]] : 'Tap an event below'}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="tl-bank">
        {bank.map(i => (
          <button key={i} className={`tl-chip ${placed.includes(i) ? 'used' : ''}`} disabled={submitted || placed.includes(i)} onClick={() => put(i)}>
            <b>{dates[i] || ''}</b>
            <span>{steps[i]}</span>
          </button>
        ))}
      </div>

      <div className="tl-tools">
        <button className="btn primary" onClick={check} disabled={submitted || placed.length !== steps.length}>
          Check order <Icon name="check" size={18} />
        </button>
        <button className="btn ghost" disabled={submitted || !placed.length} onClick={() => setPlaced([])}>
          <Icon name="refresh" size={17} /> Clear
        </button>
        {!submitted && <button className="btn ghost" onClick={() => onResolve(false)}>Skip</button>}
      </div>
    </div>
  );
}
