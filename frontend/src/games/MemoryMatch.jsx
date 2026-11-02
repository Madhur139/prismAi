/*
  MEMORY MATCH - flip the cards and find every pair.
  The data is the same as MATCH_PAIRS: pairs of { left, right }.
*/
import React, { useState, useEffect, useRef } from 'react';
import { shuffle } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';
import '../styles/games/puzzle.css';

export function MemoryMatch({ game, submitted, onResolve }) {
  const pairs = game.pairs || [];
  // Two cards per pair: one showing the term, one showing the meaning.
  const [cards] = useState(() => shuffle(pairs.flatMap((p, i) => [{ pair: i, side: 'left' }, { pair: i, side: 'right' }])));
  const [flipped, setFlipped] = useState([]); // card positions that are face up
  const [matched, setMatched] = useState([]); // pair indexes already found
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);

  // All pairs found -> the round is a win.
  useEffect(() => {
    if (submitted || !pairs.length) return;
    if (matched.length === pairs.length) {
      const t = setTimeout(() => onResolve(true), 550);
      return () => clearTimeout(t);
    }
  }, [matched, pairs.length, submitted, onResolve]);

  const flip = (i) => {
    if (submitted || lock.current) return;
    const card = cards[i];
    if (!card || matched.includes(card.pair) || flipped.includes(i)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length < 2) return;

    lock.current = true;
    setMoves(m => m + 1);
    const [a, b] = next.map(n => cards[n]);
    if (a.pair === b.pair) {
      // A pair! It stays face up for good.
      setMatched(m => [...m, a.pair]);
      setFlipped([]);
      lock.current = false;
    } else {
      setTimeout(() => { setFlipped([]); lock.current = false; }, 800);
    }
  };

  if (!pairs.length) return <div className="mem-empty"><p>This game could not be built from its data.</p></div>;

  return (
    <div className="mem-game">
      <div className="mem-grid">
        {cards.map((card, i) => {
          const faceUp = flipped.includes(i) || matched.includes(card.pair);
          const text = card.side === 'left' ? pairs[card.pair].left : pairs[card.pair].right;
          return (
            <button
              key={i}
              className={`mem-card ${faceUp ? 'up' : 'down'} ${matched.includes(card.pair) ? 'done' : ''}`}
              onClick={() => flip(i)}
              disabled={submitted}
              aria-label={faceUp ? text : 'Hidden card'}
            >
              <span className="mem-face">
                {faceUp ? text : <Icon name="sparkles" size={22} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mem-foot">
        <span className="mem-count" aria-live="polite">
          <Icon name="link" size={16} /> {matched.length} / {pairs.length} pairs · {moves} {moves === 1 ? 'try' : 'tries'}
        </span>
        {!submitted && <button className="btn ghost" onClick={() => onResolve(false)}>Skip</button>}
      </div>
    </div>
  );
}
