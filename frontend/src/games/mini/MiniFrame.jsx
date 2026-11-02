/*
  MINI FRAME
  - Shared intro and result screens for the standalone mini games.
  - The games themselves render inside the existing PlayShell, so a mini game
    looks and behaves exactly like the rest of the app.
*/
import React from 'react';
import { Icon } from '../../components/Icon.jsx';
import { DIFFICULTIES } from '../miniData.js';

/**
 * Start screen: what the game is, how to play, a difficulty picker and the
 * start button.
 */
export function MiniIntro({ icon, title, text, rules, difficulty, onDifficulty, onStart, startLabel = 'Start playing' }) {
  return (
    <section className="mini-intro">
      <span className="mini-intro-ico"><Icon name={icon} size={34} /></span>
      <h2>{title}</h2>
      <p className="mini-intro-text">{text}</p>

      {rules?.length > 0 && (
        <ul className="mini-rules">
          {rules.map(r => <li key={r}><Icon name="check" size={16} stroke={3} />{r}</li>)}
        </ul>
      )}

      {difficulty && (
        <div className="mini-diff">
          <span className="mini-diff-label">Difficulty</span>
          <div className="seg" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map(d => (
              <button key={d.key} type="button" className={difficulty === d.key ? 'on' : ''} aria-pressed={difficulty === d.key} onClick={() => onDifficulty?.(d.key)}>
                <Icon name={d.icon} size={14} /> {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="btn primary lg" onClick={onStart}>{startLabel} <Icon name="arrow-right" size={18} /></button>
    </section>
  );
}

/**
 * End screen: win or loss, the run stats, the score and the best score.
 */
export function MiniResult({ won, title, text, stats, score, best, onRestart, onExit, restartLabel = 'Play again' }) {
  return (
    <section className="mini-result">
      <span className={`mini-result-ico ${won ? 'good' : 'bad'}`}>
        <Icon name={won ? 'trophy' : 'target'} size={30} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>

      {stats?.length > 0 && (
        <div className="mini-stats">
          {stats.map(s => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}
        </div>
      )}

      <div className="mini-score">
        <span>Score</span>
        <b>{score}</b>
        {best > 0 && <small>Best {best}</small>}
      </div>

      <div className="mini-result-actions">
        <button className="btn primary lg" onClick={onRestart}><Icon name="refresh" size={18} /> {restartLabel}</button>
        <button className="btn ghost lg" onClick={onExit}>Back to arcade</button>
      </div>
    </section>
  );
}
