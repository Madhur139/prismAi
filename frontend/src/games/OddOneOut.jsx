/*
  ODD ONE OUT - four options, three of them belong together and one does not.
  The learner picks a single option and the round view checks it against
  game.answer. After submitting, the right option turns green, the wrong pick
  turns red and the rest fade back.
  Keyboard: press 1-4 (or A-D) to choose.
*/
import React, { useEffect, useMemo } from 'react';
import { Icon } from '../components/Icon.jsx';
import { normalize } from '../utils/helpers.js';
import '../styles/games/odd.css';

/* The data can arrive empty or malformed, so keep only usable strings. */
const cleanOptions = (list) =>
  (Array.isArray(list) ? list : []).map(o => String(o ?? '').trim()).filter(Boolean);

export function OddOneOut({ game, value, submitted, onAnswer }) {
  const options = useMemo(() => cleanOptions(game?.options), [game?.options]);
  const answer = String(game?.answer ?? '').trim();

  // Number keys and letters pick an option, like the multiple choice game.
  useEffect(() => {
    if (submitted || !options.length || typeof onAnswer !== 'function') return;
    const f = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const i = /^[1-9]$/.test(k) ? +k - 1 : 'abcdefghij'.indexOf(k);
      if (k.length === 1 && i >= 0 && i < options.length) onAnswer(options[i]);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [submitted, options, onAnswer]);

  // Nothing to choose from - never throw, just say so.
  if (!options.length) {
    return (
      <div className="ooo-game">
        <p className="ooo-empty">This question has no options to choose from.</p>
      </div>
    );
  }

  const rightKey = normalize(answer);
  const mineKey = normalize(value);

  const status = !submitted
    ? 'Pick the one that does not belong.'
    : rightKey && mineKey === rightKey
      ? 'Yes - that is the odd one out.'
      : answer
        ? `The odd one out was: ${answer}`
        : 'Not quite - try the next question.';

  return (
    <div className="ooo-game">
      <p className="ooo-task"><Icon name="target" size={15} /> Find the one that does not belong</p>

      <div className="ooo-opts">
        {options.map((opt, i) => {
          const right = normalize(opt) === rightKey;
          const mine = normalize(opt) === mineKey;
          const state = !submitted ? (mine ? 'picked' : '') : right ? 'correct' : mine ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              className={`ooo-opt ${state}`}
              disabled={submitted}
              onClick={() => typeof onAnswer === 'function' && onAnswer(opt)}
            >
              <span className="ooo-key">
                {submitted && right ? <Icon name="check" size={16} stroke={3} />
                  : submitted && mine ? <Icon name="x" size={16} stroke={3} />
                    : String.fromCharCode(65 + i)}
              </span>
              <span className="ooo-text">{opt}</span>
            </button>
          );
        })}
      </div>

      <p className="ooo-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
