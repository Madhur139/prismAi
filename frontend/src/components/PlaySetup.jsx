/*
  PLAY SETUP - choose mode, topics, difficulty and games.
  Pressing Start opens the game on its own full-screen page.
*/
import React, { useState } from 'react';
import { Icon } from './Icon.jsx';
import { GAME_META, LEVEL_NAMES } from '../constants/games.js';

const MODES = [
  { key: 'practice', icon: 'target', name: 'Practice', note: '8 rounds · learn at your pace' },
  { key: 'boss', icon: 'skull', name: 'Boss mode', note: '10 rounds · 3 lives · defeat the boss' },
  { key: 'exam', icon: 'timer', name: 'Exam', note: '12 rounds · no feedback until the end' },
];

export function PlaySetup({ lesson, onStart }) {
  const concepts = lesson.concepts.map(c => c.conceptName), counts = {};
  lesson.concepts.forEach(c => c.microGames.forEach(g => { counts[g.type] = (counts[g.type] || 0) + 1; }));
  const allTypes = Object.keys(counts);
  // How many games sit at each difficulty (used for the level picker).
  const levelCounts = { 1: 0, 2: 0, 3: 0 };
  lesson.concepts.forEach(c => c.microGames.forEach(g => { levelCounts[g.level || 2] = (levelCounts[g.level || 2] || 0) + 1; }));

  const [mode, setMode] = useState('practice'), [tp, setTp] = useState(concepts), [ty, setTy] = useState(allTypes), [lvl, setLvl] = useState(0);
  const tog = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const ok = tp.length && ty.length;
  const label = !ok ? 'Pick at least one topic and one game' : mode === 'boss' ? 'Fight the boss' : mode === 'exam' ? 'Start the exam' : 'Start playing';

  return (
    <section className="panel setup">
      <div className="setup-head"><span className="eyebrow">GAME ROOM</span><h3>Choose how you want to play</h3><p>Your game opens in its own full-screen page so you can focus.</p></div>
      <div className="mode-row">
        {MODES.map(m => (
          <button key={m.key} className={`mode-card ${m.key === 'boss' ? 'boss' : ''} ${mode === m.key ? 'on' : ''}`} onClick={() => setMode(m.key)}>
            <span className="mode-ico"><Icon name={m.icon} size={22} /></span><b>{m.name}</b><small>{m.note}</small>
          </button>
        ))}
      </div>

      <div className="setup-label"><span>Difficulty</span><button onClick={() => setLvl(0)}>{lvl === 0 ? 'All levels' : 'Reset'}</button></div>
      <div className="chip-row">
        <button className={`chip ${lvl === 0 ? 'on' : ''}`} onClick={() => setLvl(0)}>{lvl === 0 && <Icon name="check" size={14} stroke={3} />}All levels</button>
        {[1, 2, 3].map(l => (
          <button key={l} className={`chip ${lvl === l ? 'on' : ''}`} disabled={!levelCounts[l]} onClick={() => setLvl(l)}>
            {lvl === l && <Icon name="check" size={14} stroke={3} />}{LEVEL_NAMES[l]} ({levelCounts[l] || 0})
          </button>
        ))}
      </div>

      <div className="setup-label"><span>Topics</span><button onClick={() => setTp(tp.length === concepts.length ? [] : concepts)}>{tp.length === concepts.length ? 'Clear' : 'Select all'}</button></div>
      <div className="chip-row">{concepts.map(c => <button key={c} className={`chip ${tp.includes(c) ? 'on' : ''}`} onClick={() => tog(tp, setTp, c)}>{tp.includes(c) && <Icon name="check" size={14} stroke={3} />}{c}</button>)}</div>
      <div className="setup-label"><span>Games</span><button onClick={() => setTy(ty.length === allTypes.length ? [] : allTypes)}>{ty.length === allTypes.length ? 'Clear' : 'Select all'}</button></div>
      <div className="pick-grid">{allTypes.map(t => { const m = GAME_META[t] || { label: t, icon: 'sparkles', color: '#7c6cff', blurb: '' }; return <button key={t} style={{ '--c': m.color }} className={`game-pick ${ty.includes(t) ? 'on' : ''}`} onClick={() => tog(ty, setTy, t)}><span className="gp-icon"><Icon name={m.icon} size={20} /></span><b>{m.label}</b><small>{m.blurb}</small><em>{counts[t]} in lesson</em></button>; })}</div>
      <button className="btn primary lg full" disabled={!ok} onClick={() => onStart({ mode, topics: tp.length === concepts.length ? null : tp, types: ty.length === allTypes.length ? null : ty, level: lvl || null })}>{label} {ok ? <Icon name="arrow-right" size={20} /> : null}</button>
    </section>
  );
}
