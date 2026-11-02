/*
  NUMBER SUDOKU - fill the grid so every row, column and box contains each
  number exactly once. Keyboard: arrows to move, digits to enter, Backspace to
  clear. A number pad is shown for touch devices.
*/
import React, { useState, useEffect, useRef } from 'react';
import { PlayShell } from '../../components/PlayShell.jsx';
import { Icon } from '../../components/Icon.jsx';
import { MiniIntro, MiniResult } from './MiniFrame.jsx';
import { SUDOKU_SIZES } from '../miniData.js';
import { boxDims, findConflict, generatePuzzle } from '../../utils/sudoku.js';
import { getScore, saveScore } from '../../utils/miniScores.js';

const TYPE = 'NUMBER_SUDOKU';

/* How many wrong entries end the game, per difficulty. */
const MISTAKE_LIMIT = { easy: 8, medium: 6, hard: 5 };

export function NumberSudoku({ meta, onExit }) {
  const [phase, setPhase] = useState('intro');
  const [difficulty, setDifficulty] = useState('easy');
  const [puzzle, setPuzzle] = useState([]);
  const [solution, setSolution] = useState([]);
  const [grid, setGrid] = useState([]);
  const [notes, setNotes] = useState({});
  const [selected, setSelected] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getScore(TYPE));
  const [noteMode, setNoteMode] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [status, setStatus] = useState('');
  const tick = useRef(null);

  const n = SUDOKU_SIZES[difficulty];
  const { bw, bh } = boxDims(n);
  const limit = MISTAKE_LIMIT[difficulty];

  /* Build a fresh puzzle. Generation is fast, but we yield a frame first so
     the button press is painted before the grid appears. */
  const start = () => {
    setPhase('loading');
    setTimeout(() => {
      const { puzzle: p, solution: s } = generatePuzzle(n, n === 9 ? 44 : n === 6 ? 16 : 6);
      setPuzzle(p); setSolution(s);
      setGrid(p.map(r => [...r]));
      setNotes({}); setSelected(null); setMistakes(0); setTime(0); setScore(0); setConflict(null); setStatus('');
      setPhase('playing');
    }, 40);
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    tick.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(tick.current);
  }, [phase]);

  const isGiven = (r, c) => puzzle[r]?.[c] !== 0 && puzzle[r][c] !== undefined;
  const keyOf = (r, c) => `${r},${c}`;

  /* Enter a number into the selected cell. */
  const put = (r, c, value) => {
    if (phase !== 'playing' || isGiven(r, c)) return;
    const k = keyOf(r, c);

    if (noteMode) {
      setNotes(prev => {
        const list = prev[k] ? [...prev[k]] : [];
        const i = list.indexOf(value);
        if (i >= 0) list.splice(i, 1); else list.push(value);
        list.sort((a, b) => a - b);
        return { ...prev, [k]: list };
      });
      return;
    }

    const next = grid.map(row => [...row]);
    next[r][c] = value;
    setGrid(next);

    if (value !== 0 && solution[r][c] !== value) {
      const bad = findConflict(next, solution, n);
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setConflict(bad);
      setStatus('That number does not fit.');
      if (nextMistakes >= limit) {
        const earned = Math.max(0, Math.round(600 - nextMistakes * 40 - time * 2));
        setScore(earned);
        if (earned && saveScore(TYPE, earned)) setBest(earned);
        setPhase('over');
        return;
      }
      return;
    }

    setConflict(null);
    setStatus('');

    // Win check: every cell filled and correct.
    const done = next.every((row, ri) => row.every((v, ci) => v !== 0 && v === solution[ri][ci]));
    if (done) {
      const earned = Math.max(20, 1200 - nextMistakes * 60 - time * 2);
      setScore(earned);
      if (saveScore(TYPE, earned)) setBest(earned);
      setPhase('over');
    }
  };

  const clearCell = (r, c) => {
    if (phase !== 'playing' || isGiven(r, c)) return;
    const next = grid.map(row => [...row]);
    next[r][c] = 0;
    setGrid(next);
    setConflict(null);
  };

  /* Keyboard controls. */
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = e => {
      if (!selected) return;
      const { r, c } = selected;
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); put(r, c, +e.key); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); clearCell(r, c); return; }
      if (e.key === 'ArrowUp' && r > 0) { e.preventDefault(); setSelected({ r: r - 1, c }); }
      if (e.key === 'ArrowDown' && r < n - 1) { e.preventDefault(); setSelected({ r: r + 1, c }); }
      if (e.key === 'ArrowLeft' && c > 0) { e.preventDefault(); setSelected({ r, c: c - 1 }); }
      if (e.key === 'ArrowRight' && c < n - 1) { e.preventDefault(); setSelected({ r, c: c + 1 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, selected, grid, notes, noteMode]);

  const filled = grid.reduce((s, row) => s + row.filter(Boolean).length, 0);
  const total = n * n;
  const sameRow = selected ? grid[selected.r] : null;
  const sameCol = selected ? grid.map(row => row[selected.c]) : null;

  return (
    <PlayShell
      color={meta.color}
      kicker="MINI GAME"
      title={meta.title}
      progress={total ? filled / total : 0}
      onExit={onExit}
      right={phase === 'playing' ? <>
        <span className="play-chip">{filled}/{total}</span>
        <span className="play-chip"><Icon name="alert" size={14} /> {mistakes}/{limit}</span>
        <span className="play-chip"><Icon name="clock" size={14} /> {time}s</span>
      </> : null}
    >
      {phase === 'intro' && (
        <MiniIntro
          icon="layers"
          title="Every row, column and box"
          text="Fill the grid so that each number appears once in every row, column and outlined box. Wrong entries cost you."
          rules={['Tap a cell, then tap a number - or use the arrow keys and your keyboard', 'Scribble small pencil notes with the Notes button', 'Fewer mistakes and less time means a higher score']}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onStart={start}
        />
      )}

      {phase === 'loading' && (
        <div className="play-notice"><span className="spinner" style={{ width: 36, height: 36, borderWidth: 4, color: meta.color }} /><h2>Building your puzzle…</h2><p>Making sure it has one right answer.</p></div>
      )}

      {phase === 'playing' && (
        <div className="stage">
          <div className="sd-toolbar">
            <button className={`btn sm ${noteMode ? 'soft' : 'ghost'}`} onClick={() => setNoteMode(v => !v)} aria-pressed={noteMode}><Icon name="pencil" size={15} /> Notes</button>
            {selected && !isGiven(selected.r, selected.c) && <button className="btn sm ghost" onClick={() => clearCell(selected.r, selected.c)}><Icon name="trash" size={15} /> Clear</button>}
            <span className="sd-status">{status || (selected ? `Cell ${selected.r + 1}·${selected.c + 1}` : 'Pick a cell')}</span>
          </div>

          <div className="sd-wrap">
            <div className="sd-board" style={{ '--n': n }} role="grid" aria-label="Sudoku grid">
              {grid.map((row, r) => row.map((v, c) => {
                const k = keyOf(r, c);
                const given = isGiven(r, c);
                const isSel = selected && selected.r === r && selected.c === c;
                const inRow = selected && selected.r === r;
                const inCol = selected && selected.c === c;
                const isConflict = conflict && conflict.r === r && conflict.c === c;
                const wrong = !given && v !== 0 && v !== solution[r][c];
                // "good" only marks a value the player entered correctly.
                const right = !given && v !== 0 && v === solution[r][c];
                return (
                  <button
                    key={k}
                    className={`sd-cell ${given ? 'given' : ''} ${isSel ? 'sel' : ''} ${inRow || inCol ? 'peer' : ''} ${isConflict || wrong ? 'bad' : ''} ${right ? 'good' : ''} ${(c + 1) % bw === 0 && c < n - 1 ? 'edge-r' : ''} ${(r + 1) % bh === 0 && r < n - 1 ? 'edge-b' : ''}`}
                    onClick={() => setSelected({ r, c })}
                    role="gridcell"
                    aria-label={`Row ${r + 1} column ${c + 1}${v ? `, ${v}` : ''}`}
                  >
                    {v !== 0 ? v : (notes[k]?.length ? <span className="sd-notes">{notes[k].join('')}</span> : null)}
                  </button>
                );
              }))}
            </div>

            <div className="sd-pad" style={{ '--pad-cols': n === 4 ? 4 : 3 }}>
              {Array.from({ length: n }, (_, i) => i + 1).map(num => (
                <button key={num} className="sd-num" onClick={() => selected && put(selected.r, selected.c, num)} disabled={!selected}>
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'over' && (
        <MiniResult
          won={filled === total}
          title={filled === total ? 'Puzzle solved!' : 'Too many mistakes'}
          text={filled === total ? 'Every row, column and box checks out.' : 'The grid did not work out this time. Give it another go.'}
          stats={[
            { label: 'Filled', value: `${filled}/${total}` },
            { label: 'Mistakes', value: mistakes },
            { label: 'Time', value: `${time}s` },
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
