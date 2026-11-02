/*
  SENTENCE UNSCRAMBLE - rebuild one sentence from its jumbled words.
  The server stores the sentence in the correct order, joined with spaces.
*/
import React, { useState } from 'react';
import { shuffle } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';
import '../styles/games/visual.css';

export function SentenceUnscramble({ game, submitted, onAnswer }) {
  const words = game.words || [];
  const [bank] = useState(() => shuffle(words.map((_, i) => i)));
  const [placed, setPlaced] = useState([]); // word indexes, in the learner's order

  const put = (i) => {
    if (submitted || placed.includes(i)) return;
    const next = [...placed, i];
    setPlaced(next);
    // Answer as soon as the sentence is complete.
    if (next.length === words.length) onAnswer(next.map(k => words[k]).join(' '));
  };
  const take = (pos) => {
    if (submitted) return;
    setPlaced(p => p.filter((_, i) => i !== pos));
  };

  if (!words.length) return <div className="uns-empty"><p>This game could not be built from its data.</p></div>;

  return (
    <div className="uns-game">
      <div className="uns-line" aria-live="polite">
        {placed.length ? placed.map((k, pos) => (
          <button key={pos} className="uns-word" disabled={submitted} onClick={() => take(pos)}>{words[k]}</button>
        )) : <span className="uns-placeholder">Tap the words below in the right order…</span>}
      </div>

      <div className="uns-bank">
        {bank.map(i => (
          <button key={i} className={`uns-chip ${placed.includes(i) ? 'used' : ''}`} disabled={submitted || placed.includes(i)} onClick={() => put(i)}>
            {words[i]}
          </button>
        ))}
      </div>

      <div className="uns-tools">
        <button className="btn ghost" disabled={submitted || !placed.length} onClick={() => setPlaced([])}>
          <Icon name="refresh" size={17} /> Clear
        </button>
      </div>
    </div>
  );
}
