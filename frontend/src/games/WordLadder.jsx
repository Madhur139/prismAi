/*
  WORD LADDER - a chain of words where each word differs from the next by
  exactly one letter. The learner picks the word that continues the ladder.

  Design: the chain is drawn as connected tiles and the single changed letter
  is highlighted on every tile, so the pattern is visible before answering.
  The last tile is an empty "?" slot that fills with the word that was picked
  (or with the right answer once the round is submitted).
*/
import React, { useEffect } from 'react';
import { normalize } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';
import '../styles/games/code.css';

/* Index of the letter that changed between two ladder words, -1 if none. */
function diffAt(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return -1;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

/* One ladder word, with the changed letter marked. */
function LadderWord({ text, mark }) {
  return (
    <span className="ladder-word">
      {String(text).split('').map((ch, i) => (
        <span key={i} className={i === mark ? 'ladder-letter changed' : 'ladder-letter'}>{ch}</span>
      ))}
    </span>
  );
}

export function WordLadder({ game = {}, value, submitted, onAnswer = () => {} }) {
  const ladder = (Array.isArray(game.ladder) ? game.ladder : []).filter(w => typeof w === 'string' && w.length);
  const options = (Array.isArray(game.options) ? game.options : []).filter(o => o !== null && o !== undefined).map(String);
  const answer = game.answer === null || game.answer === undefined ? '' : String(game.answer);
  const last = ladder.length ? ladder[ladder.length - 1] : '';

  /* Keyboard: press 1-4 or A-D to answer, like the multiple-choice game. */
  useEffect(() => {
    if (submitted || !options.length) return;
    const f = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const i = /^[1-9]$/.test(k) ? +k - 1 : 'abcdefghi'.indexOf(k);
      if (k.length === 1 && i >= 0 && i < options.length) onAnswer(options[i]);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [submitted, options, onAnswer]);

  const picked = value === null || value === undefined ? '' : String(value);
  const right = normalize(picked) === normalize(answer) && answer !== '';
  /* Before submitting the slot is empty; afterwards it shows the picked word,
     or the right answer when nothing was picked (e.g. a timeout). */
  const slotWord = submitted ? (picked || answer) : '';
  const slotState = submitted ? (picked ? (right ? 'right' : 'miss') : 'right') : '';

  const status = !submitted
    ? 'One letter changes at every step. Pick the word that continues the ladder.'
    : right
      ? `Correct - "${answer}" continues the ladder.`
      : `Not quite - the ladder continues with "${answer}".`;

  return (
    <div className="ladder-wrap">
      {ladder.length > 0 ? (
        <div className="ladder-chain">
          {ladder.map((w, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="ladder-link" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>}
              <div className="ladder-tile">
                <LadderWord text={w} mark={i > 0 ? diffAt(ladder[i - 1], w) : -1} />
              </div>
            </React.Fragment>
          ))}
          <span className="ladder-link" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
          <div className={'ladder-tile slot' + (slotState ? ' ' + slotState : '')}>
            {slotWord
              ? <LadderWord text={slotWord} mark={diffAt(last, slotWord)} />
              : <span className="ladder-q" aria-hidden="true">?</span>}
          </div>
        </div>
      ) : (
        <div className="ladder-empty">
          <Icon name="sparkles" size={18} />
          <span>No ladder was supplied for this question - answer it from the options.</span>
        </div>
      )}

      {options.length ? (
        <div className="ladder-opts">
          {options.map((o, i) => {
            const isRight = normalize(o) === normalize(answer);
            const isMine = normalize(o) === normalize(picked);
            const state = !submitted ? '' : isRight ? 'correct' : isMine ? 'wrong' : 'dim';
            return (
              <button
                key={i}
                type="button"
                className={'ladder-opt' + (state ? ' ' + state : '')}
                disabled={submitted}
                onClick={() => onAnswer(o)}
                aria-label={`Option ${String.fromCharCode(65 + i)}: ${o}`}
              >
                <span className="ladder-opt-key" aria-hidden="true">
                  {submitted && isRight ? <Icon name="check" size={15} stroke={3} />
                    : submitted && isMine ? <Icon name="x" size={15} stroke={3} />
                      : String.fromCharCode(65 + i)}
                </span>
                <span className="ladder-opt-text">{o}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="ladder-empty">
          <Icon name="sparkles" size={18} />
          <span>There are no answer options for this ladder.</span>
        </div>
      )}

      <p className="hint-line ladder-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
