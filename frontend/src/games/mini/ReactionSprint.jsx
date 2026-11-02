/*
  REACTION SPRINT - wait for the panel to turn green, then tap as fast as you
  can. Five rounds, then you get your average and a score.
  Tapping before the green light is a false start and adds a penalty.
*/
import React, { useState, useEffect, useRef } from 'react';
import { PlayShell } from '../../components/PlayShell.jsx';
import { Icon } from '../../components/Icon.jsx';
import { MiniIntro, MiniResult } from './MiniFrame.jsx';
import { REACTION_ROUNDS, REACTION_MIN_DELAY, REACTION_MAX_DELAY } from '../miniData.js';
import { getScore, saveScore } from '../../utils/miniScores.js';

const TYPE = 'REACTION_SPRINT';
const FALSE_START_PENALTY = 1000; // ms added to the average for an early tap

export function ReactionSprint({ meta, onExit }) {
  const [phase, setPhase] = useState('intro');
  const [round, setRound] = useState(0);
  const [signal, setSignal] = useState('wait'); // wait | ready | hit | early
  const [times, setTimes] = useState([]);
  const [lastMs, setLastMs] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getScore(TYPE));
  const readyAt = useRef(0);
  const delayTimer = useRef(null);
  const nextTimer = useRef(null);

  useEffect(() => () => { clearTimeout(delayTimer.current); clearTimeout(nextTimer.current); }, []);

  /** Arm the signal: after a random delay the panel turns green. */
  const arm = (r) => {
    setRound(r);
    setSignal('wait');
    setLastMs(0);
    const delay = REACTION_MIN_DELAY + Math.random() * (REACTION_MAX_DELAY - REACTION_MIN_DELAY);
    delayTimer.current = setTimeout(() => {
      readyAt.current = performance.now();
      setSignal('ready');
    }, delay);
  };

  const start = () => {
    setTimes([]); setScore(0);
    setPhase('playing');
    arm(0);
  };

  /** Score the average: faster is better, false starts cost you. */
  const finish = (all) => {
    const avg = all.reduce((s, t) => s + t, 0) / (all.length || 1);
    const earned = Math.max(0, Math.min(2000, Math.round((700 - avg) * 5)));
    setScore(earned);
    if (earned && saveScore(TYPE, earned)) setBest(earned);
    setPhase('over');
  };

  const tap = () => {
    if (phase !== 'playing') return;
    if (signal === 'wait') {
      // False start.
      clearTimeout(delayTimer.current);
      setSignal('early');
      setLastMs(FALSE_START_PENALTY);
      const all = [...times, FALSE_START_PENALTY];
      setTimes(all);
      nextTimer.current = setTimeout(() => {
        if (all.length >= REACTION_ROUNDS) finish(all);
        else arm(all.length);
      }, 1100);
      return;
    }
    if (signal !== 'ready') return;

    const ms = Math.round(performance.now() - readyAt.current);
    setLastMs(ms);
    setSignal('hit');
    const all = [...times, ms];
    setTimes(all);
    nextTimer.current = setTimeout(() => {
      if (all.length >= REACTION_ROUNDS) finish(all);
      else arm(all.length);
    }, 1000);
  };

  const avg = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : 0;
  const fastest = times.length ? Math.min(...times) : 0;

  return (
    <PlayShell
      color={meta.color}
      kicker="MINI GAME"
      title={meta.title}
      progress={times.length / REACTION_ROUNDS}
      onExit={onExit}
      right={phase === 'playing' ? <span className="play-chip">Round {round + 1}/{REACTION_ROUNDS}</span> : null}
    >
      {phase === 'intro' && (
        <MiniIntro
          icon="bolt"
          title="Wait for green, then tap"
          text="The panel changes colour at a random moment. Tap the instant it turns green. Five rounds, and the average decides your score."
          rules={['Tapping before the green light is a false start and adds a 1 second penalty', 'Your fastest round is recorded too', 'Faster reactions score more']}
          onStart={start}
          startLabel="Start the sprint"
        />
      )}

      {phase === 'playing' && (
        <div className="stage">
          <button className={`rs-panel rs-${signal}`} onClick={tap} aria-label="Reaction area">
            {signal === 'wait' && <><span className="rs-light" /><b>Wait for green…</b><small>Do not tap yet</small></>}
            {signal === 'ready' && <><span className="rs-light" /><b>TAP NOW!</b><small>As fast as you can</small></>}
            {signal === 'hit' && <><span className="rs-light" /><b>{lastMs} ms</b><small>{lastMs < 250 ? 'Lightning!' : lastMs < 400 ? 'Quick!' : 'Getting there'}</small></>}
            {signal === 'early' && <><span className="rs-light" /><b>Too early!</b><small>+1 second penalty</small></>}
          </button>

          <div className="rs-rounds">
            {Array.from({ length: REACTION_ROUNDS }, (_, i) => (
              <span key={i} className={`rs-dot ${i < times.length ? 'done' : ''} ${i === round ? 'now' : ''}`} />
            ))}
          </div>

          <div className="rs-stats">
            <div><b>{avg || '—'}</b><span>Average (ms)</span></div>
            <div><b>{fastest || '—'}</b><span>Fastest (ms)</span></div>
            <div><b>{times.length}/{REACTION_ROUNDS}</b><span>Rounds done</span></div>
          </div>
        </div>
      )}

      {phase === 'over' && (
        <MiniResult
          won={avg > 0 && avg < 400}
          title={avg < 250 ? 'Lightning reflexes!' : avg < 400 ? 'Sharp reactions!' : 'Sprint complete'}
          text={`You averaged ${avg} ms across ${times.length} rounds.`}
          stats={[
            { label: 'Average', value: `${avg} ms` },
            { label: 'Fastest', value: `${fastest} ms` },
            { label: 'Rounds', value: times.length },
          ]}
          score={score}
          best={best}
          onRestart={start}
          onExit={onExit}
        />
      )}
    </PlayShell>
  );
}
