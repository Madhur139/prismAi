/*
  ODD EQUATION - four sums are shown, exactly one of them is wrong.
  The maths is checked here in the browser too, so the learner can see which
  equation is broken after answering.
*/
import React, { useEffect } from 'react';
import { normalize } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';
import '../styles/games/puzzle.css';

/* Safe maths: only digits and + - * / ( ) . are allowed, everything else is rejected. */
export function evalEq(text) {
  const cleaned = String(text || '').replace(/\s+/g, '');
  if (!/^[0-9+\-*/().]+$/.test(cleaned)) return NaN;
  try {
    const v = Function(`"use strict"; return (${cleaned});`)();
    return typeof v === 'number' && Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

/* True when the equation "12*8=96" actually adds up. */
export function equationHolds(text) {
  const parts = String(text || '').split('=');
  if (parts.length !== 2) return false;
  const left = evalEq(parts[0]);
  const right = parseFloat(String(parts[1]).replace(/,/g, ''));
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return Math.abs(left - right) < 1e-6;
}

export function OddEquation({ game, value, submitted, onAnswer }) {
  const options = game.options || [];

  useEffect(() => {
    if (submitted) return;
    const f = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const i = /^[1-9]$/.test(k) ? +k - 1 : 'abcdefghi'.indexOf(k);
      if (k.length === 1 && i >= 0 && i < options.length) onAnswer(options[i]);
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [submitted, options, onAnswer]);

  if (!options.length) return <div className="oddeq-empty"><p>This game could not be built from its data.</p></div>;

  return (
    <div className="oddeq-game">
      <div className="oddeq-grid">
        {options.map((opt, i) => {
          const isAnswer = normalize(opt) === normalize(game.answer);
          const mine = normalize(opt) === normalize(value);
          const holds = equationHolds(opt);
          const state = !submitted ? '' : isAnswer ? 'correct' : mine ? 'wrong' : 'dim';
          return (
            <button key={i} className={`oddeq-card ${state}`} disabled={submitted} onClick={() => onAnswer(opt)}>
              <span className="oddeq-key">{String.fromCharCode(65 + i)}</span>
              <span className="oddeq-text">{opt}</span>
              {submitted && holds && <span className="oddeq-ok"><Icon name="check" size={15} stroke={3} /></span>}
            </button>
          );
        })}
      </div>
      <p className="hint-line">Tap the equation that does not add up.</p>
    </div>
  );
}
