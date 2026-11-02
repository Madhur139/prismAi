/*
  WORD SNAKE - rebuild the hidden word by tapping letters in order.
  Keyboard: type letters, Backspace to undo. Auto-submits when the snake is full.
*/
import React, { useState, useEffect } from 'react';
import { shuffle } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';

export function WordSnake({ game, submitted, onAnswer }) {
  const target = String(game.targetWords?.[0] || game.answer || '').replace(/\s+/g, '').toUpperCase();
  const [bank, setBank] = useState(() => shuffle(target.split(''))), [picked, setPicked] = useState([]);
  useEffect(() => { setBank(shuffle(target.split(''))); setPicked([]); }, [target]);

  const pick = i => {
    if (submitted || picked.includes(i) || picked.length >= target.length) return;
    const next = [...picked, i]; setPicked(next);
    if (next.length === target.length) { const w = next.map(k => bank[k]).join(''); onAnswer(w === target ? (game.answer || target) : w); }
  };
  const undo = () => { if (!submitted) setPicked(p => p.slice(0, -1)); };
  const reshuffle = () => { if (!submitted) { setBank(shuffle(target.split(''))); setPicked([]); } };

  useEffect(() => {
    const f = e => {
      if (submitted || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') { undo(); return; }
      if (/^[a-z]$/i.test(e.key)) { const ch = e.key.toUpperCase(), i = bank.findIndex((c, k) => c === ch && !picked.includes(k)); if (i >= 0) pick(i); }
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [bank, picked, submitted]);

  return (
    <div className="snake-game">
      <div className="snake-track">
        {Array.from({ length: Math.max(target.length, 3) }, (_, i) => (
          <div key={i} className={`snake-seg ${i === 0 ? 'head' : ''} ${picked[i] !== undefined ? 'filled' : ''} ${picked.length === i && !submitted ? 'next' : ''}`}>{picked[i] !== undefined ? bank[picked[i]] : ''}</div>
        ))}
      </div>
      <p className="hint-line">Tap the letters in the right order — or just type them.</p>
      <div className="letter-bank">
        {bank.map((ch, i) => <button key={i} className="letter" disabled={submitted || picked.includes(i)} onClick={() => pick(i)}>{ch}</button>)}
      </div>
      <div className="snake-tools">
        <button className="btn ghost sm" disabled={submitted || !picked.length} onClick={undo}><Icon name="arrow-left" size={16} /> Undo</button>
        <button className="btn ghost sm" disabled={submitted} onClick={reshuffle}><Icon name="refresh" size={16} /> Shuffle</button>
      </div>
    </div>
  );
}
