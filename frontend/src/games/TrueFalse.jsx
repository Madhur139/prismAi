/*
  TRUE / FALSE - judge whether a statement is true.
  Keyboard: press T or F (or 1 / 2).
*/
import React, { useEffect } from 'react';
import { Icon } from '../components/Icon.jsx';

/* The AI may answer with "yes"/"no"/"correct" - fold all of it into true/false. */
export const asBool = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (['true', 'yes', 'correct', 'right'].includes(s)) return 'true';
  if (['false', 'no', 'incorrect', 'wrong'].includes(s)) return 'false';
  return '';
};

export function TrueFalse({ game, value, submitted, onAnswer }) {
  const answer = asBool(game.answer);

  useEffect(() => {
    if (submitted) return;
    const f = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const pick = k === 't' || k === '1' ? 'true' : k === 'f' || k === '2' ? 'false' : '';
      if (pick) onAnswer(pick);
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [submitted, onAnswer]);

  // After answering we colour the right button green and the wrong one red.
  const state = (btn) => {
    if (!submitted || !answer) return '';
    if (btn === answer) return 'correct';
    if (btn === value) return 'wrong';
    return 'dim';
  };

  return (
    <div className="tf-game">
      <div className="tf-statement">{game.prompt}</div>
      <div className="tf-buttons">
        <button className={`tf-btn yes ${state('true')}`} disabled={submitted} onClick={() => onAnswer('true')}>
          <span className="tf-ico"><Icon name="check" size={22} stroke={3} /></span>
          <b>True</b>
        </button>
        <button className={`tf-btn no ${state('false')}`} disabled={submitted} onClick={() => onAnswer('false')}>
          <span className="tf-ico"><Icon name="x" size={22} stroke={3} /></span>
          <b>False</b>
        </button>
      </div>
      <p className="hint-line">Press T for true, F for false.</p>
    </div>
  );
}
