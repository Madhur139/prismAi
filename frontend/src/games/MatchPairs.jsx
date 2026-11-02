/*
  MATCH THE PAIRS - connect each term with its meaning.
  Click a term on the left, then its match on the right.
*/
import React, { useState, useEffect } from 'react';
import { shuffle } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';

export function MatchPairs({ game, submitted, onResolve }) {
  const pairs = game.pairs || [];
  const [lefts] = useState(() => shuffle(pairs.map((_, i) => i)));
  const [rights] = useState(() => shuffle(pairs.map((_, i) => i)));
  const [picked, setPicked] = useState(null); // index of the chosen term
  const [solved, setSolved] = useState([]); // indexes of matched pairs
  const [wrong, setWrong] = useState(null); // {left, right} of the last miss

  const isSolved = (i) => solved.includes(i);

  const chooseRight = (ri) => {
    if (submitted || picked === null || isSolved(ri)) return;
    if (picked === ri) {
      const next = [...solved, picked];
      setSolved(next); setPicked(null); setWrong(null);
      if (next.length === pairs.length) setTimeout(() => onResolve(true), 450);
    } else {
      setWrong({ left: picked, right: ri }); setPicked(null);
      setTimeout(() => setWrong(null), 600);
    }
  };

  useEffect(() => {
    if (submitted) return;
    const f = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (!n || n < 1 || n > pairs.length) return;
      const open = lefts.filter(i => !isSolved(i));
      if (n <= open.length) setPicked(open[n - 1]);
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [lefts, solved, pairs.length, submitted]);

  return (
    <div className="match-game">
      <div className="match-grid">
        <div className="match-col">
          {lefts.map((i, n) => (
            <button key={i} className={`match-item ${isSolved(i) ? 'solved' : ''} ${picked === i ? 'on' : ''} ${wrong?.left === i ? 'wrong' : ''}`} disabled={submitted || isSolved(i)} onClick={() => { setPicked(i); setWrong(null); }}>
              <span className="match-key">{n + 1}</span>
              <span className="match-text">{pairs[i].left}</span>
              {isSolved(i) && <span className="match-tick"><Icon name="check" size={15} stroke={3} /></span>}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rights.map((i) => (
            <button key={i} className={`match-item ${isSolved(i) ? 'solved' : ''} ${wrong?.right === i ? 'wrong' : ''}`} disabled={submitted || isSolved(i)} onClick={() => chooseRight(i)}>
              <span className="match-text">{pairs[i].right}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="order-tools">
        <span className="match-count"><Icon name="link" size={16} /> {solved.length} / {pairs.length} matched</span>
        {!submitted && <button className="btn ghost" onClick={() => onResolve(false)}>Skip</button>}
      </div>

      {submitted && (
        <div className="match-key-list">
          {pairs.map((p, i) => (
            <div key={i}><b>{p.left}</b><span><Icon name="arrow-right" size={14} /> {p.right}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
