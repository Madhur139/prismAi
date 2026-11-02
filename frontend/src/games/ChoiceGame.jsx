/*
  CHOICE GAME - multiple choice / super quiz answers.
  Keyboard: press 1-4 or A-D to answer.
*/
import React, { useEffect } from 'react';
import { normalize } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';

export function ChoiceGame({ game, value, submitted, onAnswer }) {
  const opts = game.options || [];
  useEffect(() => {
    if (submitted) return;
    const f = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase(), i = /^[1-9]$/.test(k) ? +k - 1 : 'abcdefghi'.indexOf(k);
      if (k.length === 1 && i >= 0 && i < opts.length) onAnswer(opts[i]);
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [submitted, opts, onAnswer]);
  return (
    <div className="choice-grid">
      {opts.map((o, i) => {
        const right = normalize(o) === normalize(game.answer), mine = normalize(o) === normalize(value);
        const state = !submitted ? '' : right ? 'correct' : mine ? 'wrong' : 'dim';
        return (
          <button key={i} disabled={submitted} className={'choice ' + state} onClick={() => onAnswer(o)}>
            <span className="choice-key">{submitted && right ? <Icon name="check" size={16} stroke={3} /> : submitted && mine ? <Icon name="x" size={16} stroke={3} /> : String.fromCharCode(65 + i)}</span>
            <span className="choice-text">{o}</span>
          </button>
        );
      })}
    </div>
  );
}
