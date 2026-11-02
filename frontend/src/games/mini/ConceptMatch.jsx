/*
  CONCEPT MATCH - a memory game. Flip cards to match a term with its meaning.
  Keyboard: Enter/Space activates the focused card, Tab moves between cards.
*/
import React, { useState, useEffect, useRef } from 'react';
import { PlayShell } from '../../components/PlayShell.jsx';
import { Icon } from '../../components/Icon.jsx';
import { MiniIntro, MiniResult } from './MiniFrame.jsx';
import { CONCEPT_PAIRS, MATCH_SIZES } from '../miniData.js';
import { getScore, saveScore } from '../../utils/miniScores.js';
import { shuffle } from '../../utils/helpers.js';

const TYPE = 'CONCEPT_MATCH';

export function ConceptMatch({ meta, onExit }) {
  const [phase, setPhase] = useState('intro');
  const [difficulty, setDifficulty] = useState('easy');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getScore(TYPE));
  const flipTimer = useRef(null);
  const tick = useRef(null);

  const pairs = MATCH_SIZES[difficulty];

  /* Deal a new board. */
  const deal = () => {
    const chosen = shuffle(CONCEPT_PAIRS).slice(0, pairs);
    const deck = shuffle(chosen.flatMap((p, i) => ([
      { key: i + '-a', pair: i, face: p.term, kind: 'term' },
      { key: i + '-b', pair: i, face: p.def, kind: 'def' },
    ])));
    setCards(deck);
    setFlipped([]); setMatched([]); setMoves(0); setTime(0); setScore(0); setBusy(false);
    setPhase('playing');
  };

  /* Timer runs only while the board is in play. */
  useEffect(() => {
    if (phase !== 'playing') return;
    tick.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(tick.current);
  }, [phase]);

  useEffect(() => () => clearTimeout(flipTimer.current), []);

  /* Flip a card. Two flipped cards are compared, then turned back if wrong. */
  const flip = i => {
    if (phase !== 'playing' || busy) return;
    if (matched.includes(i) || flipped.includes(i)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length < 2) return;

    setMoves(m => m + 1);
    const a = cards[next[0]], b = cards[next[1]];
    if (a.pair === b.pair) {
      setMatched(m => [...m, ...next]);
      setFlipped([]);
    } else {
      setBusy(true);
      flipTimer.current = setTimeout(() => { setFlipped([]); setBusy(false); }, 850);
    }
  };

  /* Win check. */
  useEffect(() => {
    if (phase !== 'playing' || !cards.length) return;
    if (matched.length !== cards.length) return;
    const earned = Math.max(20, 1000 - (moves - pairs) * 35 - time * 2);
    setScore(earned);
    if (saveScore(TYPE, earned)) setBest(earned);
    setPhase('over');
  }, [matched, cards.length, phase, moves, time, pairs]);

  const found = matched.length / 2;

  return (
    <PlayShell
      color={meta.color}
      kicker="MINI GAME"
      title={meta.title}
      progress={cards.length ? matched.length / cards.length : 0}
      onExit={onExit}
      right={phase === 'playing' ? <>
        <span className="play-chip">{found}/{pairs} pairs</span>
        <span className="play-chip"><Icon name="clock" size={14} /> {time}s</span>
      </> : null}
    >
      {phase === 'intro' && (
        <MiniIntro
          icon="grid"
          title="Match every term to its meaning"
          text="Flip two cards. If they go together, they lock in. Clear the board before you run out of patience."
          rules={['Pairs are drawn from science, maths, history, geography and computing', 'You get one flip at a time, so remember where things are', 'Fewer moves and less time means a higher score']}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onStart={deal}
        />
      )}

      {phase === 'playing' && (
        <div className="cm-board" style={{ '--cols': cards.length <= 8 ? 4 : cards.length <= 12 ? 4 : 4 }}>
          {cards.map((c, i) => {
            const isOpen = flipped.includes(i) || matched.includes(i);
            const isDone = matched.includes(i);
            return (
              <button
                key={c.key}
                className={`cm-card ${isOpen ? 'open' : ''} ${isDone ? 'done' : ''} ${busy && flipped.includes(i) ? 'miss' : ''}`}
                onClick={() => flip(i)}
                aria-label={isOpen ? c.face : 'Hidden card'}
              >
                <span className="cm-inner">
                  <span className="cm-face cm-back"><Icon name="sparkles" size={22} /></span>
                  <span className={`cm-face cm-front ${c.kind}`}>{c.face}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {phase === 'over' && (
        <MiniResult
          won
          title="Board cleared!"
          text="Every term found its meaning. Nicely done."
          stats={[
            { label: 'Moves', value: moves },
            { label: 'Time', value: `${time}s` },
            { label: 'Pairs', value: pairs },
          ]}
          score={score}
          best={best}
          onRestart={deal}
          onExit={onExit}
        />
      )}
    </PlayShell>
  );
}
