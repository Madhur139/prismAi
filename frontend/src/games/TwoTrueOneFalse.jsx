/*
  TWO TRUE ONE FALSE - three statements, two of them are true and one is false.
  The learner picks the statement that is false; the round view checks it
  against game.answer. After submitting, the right option turns green, the
  wrong pick turns red and the rest fade back.
  Keyboard: press 1-3 (or A-C) to choose.
*/
import React, { useEffect, useMemo } from 'react';
import { Icon } from '../components/Icon.jsx';
import { normalize } from '../utils/helpers.js';
import '../styles/games/odd.css';

/* The data can arrive empty or malformed, so keep only usable strings. */
const cleanOptions = (list) =>
  (Array.isArray(list) ? list : []).map(o => String(o ?? '').trim()).filter(Boolean);

export function TwoTrueOneFalse({ game, value, submitted, onAnswer }) {
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
      <div className="ttf-game">
        <p className="ttf-empty">This question has no statements to choose from.</p>
      </div>
    );
  }

  const rightKey = normalize(answer);
  const mineKey = normalize(value);

  const status = !submitted
    ? 'Two of these are true. Pick the false one.'
    : rightKey && mineKey === rightKey
      ? 'Yes - that is the false statement.'
      : answer
        ? `The false statement was: ${answer}`
        : 'Not quite - try the next question.';

  return (
    <div className="ttf-game">
      <p className="ttf-task"><Icon name="search" size={15} /> Two are true - find the false one</p>

      <div className="ttf-opts">
        {options.map((opt, i) => {
          const right = normalize(opt) === rightKey;
          const mine = normalize(opt) === mineKey;
          const state = !submitted ? (mine ? 'picked' : '') : right ? 'correct' : mine ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              className={`ttf-opt ${state}`}
              disabled={submitted}
              onClick={() => typeof onAnswer === 'function' && onAnswer(opt)}
            >
              <span className="ttf-key">
                {submitted && right ? <Icon name="check" size={16} stroke={3} />
                  : submitted && mine ? <Icon name="x" size={16} stroke={3} />
                    : String.fromCharCode(65 + i)}
              </span>
              <span className="ttf-text">{opt}</span>
            </button>
          );
        })}
      </div>

      <p className="ttf-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
