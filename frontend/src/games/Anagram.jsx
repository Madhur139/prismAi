/*
  ANAGRAM - rebuild the hidden word from jumbled letter tiles.
  Mirrors the WordSnake engine: tap the letters in order (or just type them),
  Backspace undoes the last letter and Shuffle re-jumbles the tiles. The
  answer is submitted as soon as every tile has been used.
*/
import React, { useEffect, useState } from 'react';
import { shuffle } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';
import '../styles/games/odd.css';

export function Anagram({ game, submitted, onAnswer }) {
  // The first target word is the one to rebuild; fall back to the answer.
  const target = String(game?.targetWords?.[0] || game?.answer || '').replace(/\s+/g, '').toUpperCase();
  const answer = String(game?.answer ?? '').trim();

  // The tiles are shuffled once, so they do not jump around on every render.
  const [bank, setBank] = useState(() => shuffle(target.split('')));
  const [picked, setPicked] = useState([]);

  // A new word means a new set of tiles.
  useEffect(() => {
    setBank(shuffle(target.split('')));
    setPicked([]);
  }, [target]);

  const pick = i => {
    if (submitted || picked.includes(i) || picked.length >= target.length) return;
    const next = [...picked, i];
    setPicked(next);
    if (next.length === target.length) {
      const built = next.map(k => bank[k]).join('');
      const right = built.toUpperCase() === target.toUpperCase();
      if (typeof onAnswer === 'function') onAnswer(right ? (answer || target) : built);
    }
  };

  const undo = () => { if (!submitted) setPicked(p => p.slice(0, -1)); };
  const reshuffle = () => { if (!submitted) { setBank(shuffle(target.split(''))); setPicked([]); } };

  // Typing a letter picks the next free tile with that letter, Backspace undoes.
  useEffect(() => {
    const f = e => {
      if (submitted || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') { undo(); return; }
      if (/^[a-z]$/i.test(e.key)) {
        const ch = e.key.toUpperCase();
        const i = bank.findIndex((c, k) => c === ch && !picked.includes(k));
        if (i >= 0) pick(i);
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [bank, picked, submitted]);

  // No word to rebuild - never throw, just say so.
  if (!target) {
    return (
      <div className="anag-game">
        <p className="anag-empty">There is no word to unscramble yet.</p>
      </div>
    );
  }

  const built = picked.map(k => bank[k]).join('');
  const right = built.toUpperCase() === target.toUpperCase();
  const status = !submitted
    ? `${picked.length} of ${target.length} letters placed - type the letters or tap the tiles.`
    : right
      ? 'Correct - the word is complete.'
      : `The word was: ${answer || target}`;

  return (
    <div className="anag-game">
      <div className="anag-slots" role="img" aria-label={`Word so far: ${built || 'nothing yet'}`}>
        {Array.from({ length: target.length }, (_, i) => {
          const filled = picked[i] !== undefined;
          const state = !submitted ? '' : right ? 'ok' : 'no';
          return (
            <div
              key={i}
              className={`anag-slot ${filled ? 'filled' : ''} ${!filled && picked.length === i && !submitted ? 'next' : ''} ${filled && submitted ? state : ''}`}
            >
              {filled ? bank[picked[i]] : ''}
            </div>
          );
        })}
      </div>

      <p className="anag-status" role="status" aria-live="polite">{status}</p>

      <div className="anag-bank">
        {bank.map((ch, i) => (
          <button
            key={i}
            className="anag-tile"
            disabled={submitted || picked.includes(i)}
            onClick={() => pick(i)}
            aria-label={`Letter ${ch}`}
          >
            {ch}
          </button>
        ))}
      </div>

      <div className="anag-tools">
        <button className="btn ghost sm" disabled={submitted || !picked.length} onClick={undo}>
          <Icon name="arrow-left" size={16} /> Undo
        </button>
        <button className="btn ghost sm" disabled={submitted} onClick={reshuffle}>
          <Icon name="refresh" size={16} /> Shuffle
        </button>
      </div>
    </div>
  );
}
