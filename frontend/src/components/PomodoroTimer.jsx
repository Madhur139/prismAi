/*
  POMODORO TIMER
  - 25-minute focus session with a 5-minute break.
  - Runs entirely in the browser; no backend needed.
  - Emits 'prism:pomodoro:done' when a session finishes so pages can award XP.
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '../components/Icon.jsx';

const WORK_MIN = 25;
const BREAK_MIN = 5;

export function PomodoroTimer({ onComplete }) {
  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [seconds, setSeconds] = useState(WORK_MIN * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const timer = useRef(null);

  const tick = useCallback(() => {
    setSeconds(s => {
      if (s <= 1) {
        if (mode === 'work') {
          setSessions(n => n + 1);
          setMode('break');
          setSeconds(BREAK_MIN * 60);
          onComplete?.('work');
        } else {
          setMode('work');
          setSeconds(WORK_MIN * 60);
          onComplete?.('break');
        }
        return 0;
      }
      return s - 1;
    });
  }, [mode, onComplete]);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(tick, 1000);
    return () => clearInterval(timer.current);
  }, [running, tick]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const isWork = mode === 'work';

  return (
    <div className="pomodoro">
      <div className="pomodoro-head">
        <span className={`pomodoro-mode ${isWork ? 'work' : 'break'}`}>
          {isWork ? <Icon name="timer" size={16} /> : <Icon name="headphones" size={16} />}
          {isWork ? 'Focus session' : 'Break time'}
        </span>
        <span className="pomodoro-sessions">{sessions} session{sessions !== 1 ? 's' : ''} today</span>
      </div>
      <div className="pomodoro-clock">{mm}:{ss}</div>
      <div className="pomodoro-controls">
        <button className={`pomodoro-btn ${running ? '' : 'pomodoro-btn-primary'}`} onClick={() => setRunning(!running)}>
          {running ? <Icon name="pause" size={18} /> : <Icon name="play" size={18} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button className="pomodoro-btn pomodoro-btn-ghost" onClick={() => { setRunning(false); setSeconds(isWork ? WORK_MIN * 60 : BREAK_MIN * 60); }}>
          <Icon name="stop" size={16} /> Reset
        </button>
        <button className="pomodoro-btn pomodoro-btn-ghost" onClick={() => setMode(isWork ? 'break' : 'work')}>
          <Icon name="arrow-right" size={16} /> {isWork ? 'Break' : 'Focus'}
        </button>
      </div>
      <div className="pomodoro-hint">
        {isWork ? 'Put your phone away and work on one lesson.' : 'Stretch, look away from the screen, breathe.'}
      </div>
    </div>
  );
}
