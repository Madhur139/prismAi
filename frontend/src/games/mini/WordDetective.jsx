/*
  WORD DETECTIVE - guess a hidden word from its hint before you run out of lives.
  Letters can be tapped on the on-screen keyboard, or the whole word can be
  typed into the guess box.
*/
import React, { useState, useEffect, useRef } from 'react';
import { PlayShell } from '../../components/PlayShell.jsx';
import { Icon } from '../../components/Icon.jsx';
import { MiniIntro, MiniResult } from './MiniFrame.jsx';
import { DETECTIVE_WORDS, DETECTIVE_LENGTHS, DETECTIVE_LIVES } from '../miniData.js';
import { getScore, saveScore } from '../../utils/miniScores.js';
import { shuffle } from '../../utils/helpers.js';

const TYPE = 'WORD_DETECTIVE';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function WordDetective({ meta, onExit }) {
  const [phase, setPhase] = useState('intro');
  const [difficulty, setDifficulty] = useState('easy');
  const [entry, setEntry] = useState(null);
  const [found, setFound] = useState([]);
  const [missed, setMissed] = useState([]);
  const [lives, setLives] = useState(6);
  const [maxLives, setMaxLives] = useState(6);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getScore(TYPE));
  const [guess, setGuess] = useState('');
  const [note, setNote] = useState('');
  const tick = useRef(null);

  const [minLen, maxLen] = DETECTIVE_LENGTHS[difficulty];

  /* Pick a word that fits the current difficulty. */
  const pickWord = () => {
    const pool = DETECTIVE_WORDS.filter(w => w.word.length >= minLen && w.word.length <= maxLen);
    const list = pool.length ? pool : DETECTIVE_WORDS;
    setEntry(list[Math.floor(Math.random() * list.length)]);
    setFound([]); setMissed([]); setGuess(''); setNote(''); setTime(0); setScore(0);
    setMaxLives(DETECTIVE_LIVES[difficulty]);
    setLives(DETECTIVE_LIVES[difficulty]);
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    tick.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(tick.current);
  }, [phase]);

  /* Win / lose. */
  const finish = (won) => {
    const earned = won ? Math.max(20, lives * 100 + Math.max(0, 400 - time * 3)) : 0;
    setScore(earned);
    if (earned && saveScore(TYPE, earned)) setBest(earned);
    setPhase('over');
    setNote(won ? 'Solved!' : 'Out of lives.');
  };

  /* Guess a single letter. */
  const guessLetter = letter => {
    if (phase !== 'playing' || !entry) return;
    if (found.includes(letter) || missed.includes(letter)) return;
    if (entry.word.includes(letter)) {
      const next = [...found, letter];
      setFound(next);
      setNote('');
      if (entry.word.split('').every(ch => next.includes(ch))) finish(true);
    } else {
      const nextLives = lives - 1;
      setMissed(m => [...m, letter]);
      setLives(nextLives);
      setNote(`${letter} is not in the word.`);
      if (nextLives <= 0) finish(false);
    }
  };

  /* Guess the whole word. */
  const submitWord = e => {
    e.preventDefault();
    if (phase !== 'playing' || !entry) return;
    const value = guess.trim().toUpperCase();
    if (!value) return;
    if (value === entry.word) { setFound(entry.word.split('')); finish(true); }
    else {
      const nextLives = lives - 1;
      setLives(nextLives);
      setNote(`“${value}” is not it.`);
      setGuess('');
      if (nextLives <= 0) finish(false);
    }
  };

  /* Reveal one letter, but it costs a life. */
  const useHint = () => {
    if (phase !== 'playing' || !entry) return;
    const hidden = entry.word.split('').filter(ch => !found.includes(ch));
    if (!hidden.length) return;
    setFound(f => [...f, hidden[0]]);
    const nextLives = lives - 1;
    setLives(nextLives);
    setNote(`Revealed ${hidden[0]} — that cost you a life.`);
    setTimeout(() => {
      if (entry.word.split('').every(ch => [...found, hidden[0]].includes(ch))) finish(true);
    }, 60);
    if (nextLives <= 0) finish(false);
  };

  const shown = Math.max(0, maxLives - lives); // 0..4 body parts drawn
  const remaining = entry ? entry.word.split('').filter(ch => !found.includes(ch)).length : 0;

  return (
    <PlayShell
      color={meta.color}
      kicker="MINI GAME"
      title={meta.title}
      progress={entry ? (entry.word.length - remaining) / entry.word.length : 0}
      onExit={onExit}
      right={phase === 'playing' ? <>
        <span className="play-chip"><Icon name="heart" size={14} fill="currentColor" /> {lives}</span>
        <span className="play-chip"><Icon name="clock" size={14} /> {time}s</span>
      </> : null}
    >
      {phase === 'intro' && (
        <MiniIntro
          icon="search"
          title="Read the hint, find the word"
          text="A vocabulary word is hidden. Guess letters one at a time, or type the whole word if you are sure."
          rules={['Each wrong letter costs you one of your lives', 'A hint reveals a letter, but it also costs a life', 'Fewer mistakes and less time means a higher score']}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onStart={pickWord}
        />
      )}

      {phase === 'playing' && entry && (
        <div className="stage">
          <div className="wd-top">
            <div className="wd-clue">
              <span className="gbadge" style={{ '--c': meta.color }}><Icon name="sparkles" size={14} />{entry.category}</span>
              <p className="wd-hint">{entry.hint}</p>
            </div>
            <div className="wd-figure" aria-label={`${lives} lives left`}>
              <svg viewBox="0 0 120 140" role="img" aria-hidden="true">
                <path d="M18 132 H104 M40 132 V18 H100" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M100 18 V36" stroke="currentColor" strokeWidth="3" />
                {shown >= 1 && <circle className="wd-part" cx="100" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="5" />}
                {shown >= 2 && <path className="wd-part" d="M100 62 V92" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
                {shown >= 3 && <path className="wd-part" d="M100 70 L86 86 M100 70 L114 86" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
                {shown >= 4 && <path className="wd-part" d="M100 92 L88 122 M100 92 L112 122" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />}
              </svg>
            </div>
          </div>

          <div className="wd-slots">
            {entry.word.split('').map((ch, i) => (
              <span key={i} className={`wd-slot ${found.includes(ch) ? 'on' : ''}`}>
                <b>{found.includes(ch) ? ch : ''}</b>
              </span>
            ))}
          </div>

          {note && <p className="wd-note">{note}</p>}

          <form className="wd-guess" onSubmit={submitWord}>
            <input value={guess} onChange={e => setGuess(e.target.value)} maxLength={entry.word.length} placeholder="Type the whole word…" aria-label="Guess the whole word" autoComplete="off" />
            <button className="btn primary" disabled={!guess.trim()}>Guess</button>
            <button type="button" className="btn ghost" onClick={useHint} disabled={lives <= 1}><Icon name="bolt" size={16} /> Hint</button>
          </form>

          <div className="wd-keys">
            {ALPHABET.map(l => {
              const isFound = found.includes(l), isMissed = missed.includes(l);
              return (
                <button
                  key={l}
                  className={`wd-key ${isFound ? 'found' : ''} ${isMissed ? 'missed' : ''}`}
                  onClick={() => guessLetter(l)}
                  disabled={isFound || isMissed || phase !== 'playing'}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'over' && (
        <MiniResult
          won={score > 0}
          title={score > 0 ? 'Word cracked!' : 'Out of lives'}
          text={score > 0 ? `The word was “${entry?.word}”.` : `The word was “${entry?.word}”. You got ${found.length} letters.`}
          stats={[
            { label: 'Lives left', value: Math.max(0, lives) },
            { label: 'Time', value: `${time}s` },
            { label: 'Letters', value: `${found.length}/${entry?.word.length || 0}` },
          ]}
          score={score}
          best={best}
          onRestart={pickWord}
          onExit={onExit}
        />
      )}
    </PlayShell>
  );
}
