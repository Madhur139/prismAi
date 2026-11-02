/*
  LOGIC MINES - clear every safe cell and use the numbers to find the hazards.
  Right-click (or long-press on touch) flags a suspected hazard. The first
  click is always safe.
*/
import React, { useState, useEffect, useRef } from 'react';
import { PlayShell } from '../../components/PlayShell.jsx';
import { Icon } from '../../components/Icon.jsx';
import { MiniIntro, MiniResult } from './MiniFrame.jsx';
import { MINES_SIZES } from '../miniData.js';
import { getScore, saveScore } from '../../utils/miniScores.js';

const TYPE = 'LOGIC_MINES';

/**
 * Place mines on a fresh board, keeping the first-clicked cell and its
 * neighbours safe, then count the hazards around every cell.
 */
function buildBoard(cols, rows, mineCount, safeR, safeC) {
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ mine: false, n: 0, revealed: false, flagged: false })));
  const forbidden = new Set([`${safeR},${safeC}`]);
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const r = safeR + dr, c = safeC + dc;
    if (r >= 0 && r < rows && c >= 0 && c < cols) forbidden.add(`${r},${c}`);
  }
  let placed = 0;
  const max = Math.min(mineCount, rows * cols - forbidden.size);
  let guard = 0;
  while (placed < max && guard++ < rows * cols * 40) {
    const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols);
    if (forbidden.has(`${r},${c}`) || grid[r][c].mine) continue;
    grid[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && grid[rr][cc].mine) n++;
    }
    grid[r][c].n = n;
  }
  return grid;
}

/** Flood reveal: open the cell and any neighbour with no adjacent hazard. */
function flood(grid, startR, startC) {
  const stack = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop();
    const cell = grid[r][c];
    if (!cell || cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.n !== 0) continue;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < grid.length && cc >= 0 && cc < grid[0].length) stack.push([rr, cc]);
    }
  }
}

export function LogicMines({ meta, onExit }) {
  const [phase, setPhase] = useState('intro');
  const [difficulty, setDifficulty] = useState('easy');
  const gridRef = useRef([]);
  const [version, setVersion] = useState(0);
  const [flags, setFlags] = useState(0);
  const [time, setTime] = useState(0);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getScore(TYPE));
  const startedRef = useRef(false);
  const tick = useRef(null);
  const holdTimer = useRef(null);
  const longPressed = useRef(false);

  const { cols, rows, mines } = MINES_SIZES[difficulty];
  const cells = gridRef.current;
  const bump = () => setVersion(v => v + 1);

  const start = () => {
    gridRef.current = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ mine: false, n: 0, revealed: false, flagged: false })));
    startedRef.current = false;
    setFlags(0); setTime(0); setDead(false); setWon(false); setScore(0);
    bump();
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing' || !startedRef.current) return;
    tick.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(tick.current);
  }, [phase, version]);

  const reveal = (r, c) => {
    if (phase !== 'playing' || dead || won) return;
    const grid = gridRef.current;

    if (!startedRef.current) {
      startedRef.current = true;
      const fresh = buildBoard(cols, rows, mines, r, c);
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) grid[i][j] = { ...fresh[i][j] };
    }

    const cell = grid[r][c];
    if (cell.revealed || cell.flagged) return;

    if (cell.mine) {
      cell.revealed = true;
      for (const row of grid) for (const other of row) if (other.mine) other.revealed = true;
      setDead(true);
      bump();
      return;
    }

    flood(grid, r, c);
    const safeLeft = grid.flat().filter(x => !x.mine && !x.revealed).length;
    if (safeLeft === 0) setWon(true);
    bump();
  };

  const toggleFlag = (r, c) => {
    if (phase !== 'playing' || dead || won) return;
    const cell = gridRef.current[r][c];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    setFlags(f => f + (cell.flagged ? 1 : -1));
    bump();
  };

  /* Long-press to flag on touch devices. */
  const onPointerDown = (e, r, c) => {
    if (e.pointerType === 'mouse') return;
    longPressed.current = false;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => { longPressed.current = true; toggleFlag(r, c); }, 450);
  };
  const clearHold = () => { clearTimeout(holdTimer.current); longPressed.current = false; };
  useEffect(() => () => clearTimeout(holdTimer.current), []);

  /* Win / lose scoring. */
  useEffect(() => {
    if (phase !== 'playing' || !won) return;
    const earned = Math.max(20, 1500 - flags * 40 - time * 3);
    setScore(earned);
    if (saveScore(TYPE, earned)) setBest(earned);
    setPhase('over');
  }, [won, phase, flags, time]);

  useEffect(() => {
    if (phase !== 'playing' || !dead) return;
    setScore(0);
    setPhase('over');
  }, [dead, phase]);

  const revealed = cells.flat().filter(c => c.revealed).length;
  const safeTotal = Math.max(0, rows * cols - mines);
  const left = mines - flags;

  return (
    <PlayShell
      color={meta.color}
      kicker="MINI GAME"
      title={meta.title}
      progress={safeTotal ? revealed / safeTotal : 0}
      onExit={onExit}
      right={phase === 'playing' ? <>
        <span className="play-chip"><Icon name="shield" size={14} /> {left} left</span>
        <span className="play-chip"><Icon name="clock" size={14} /> {time}s</span>
      </> : null}
    >
      {phase === 'intro' && (
        <MiniIntro
          icon="target"
          title="Clear the grid without hitting a hazard"
          text="Every cell may hide a hazard. The number tells you how many hazards touch it. Clear every safe cell to win."
          rules={['Tap to open a cell, right-click or long-press to flag a hazard', 'Your first tap is always safe', 'Fewer flags and less time means a higher score']}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onStart={start}
        />
      )}

      {phase === 'playing' && (
        <div className="stage">
          <div className="lm-board" style={{ '--cols': cols }}>
            {cells.map((row, r) => row.map((cell, c) => {
              const isMine = cell.revealed && cell.mine;
              const n = cell.revealed && !cell.mine ? cell.n : 0;
              return (
                <button
                  key={`${r}-${c}`}
                  className={`lm-cell ${cell.revealed ? 'open' : ''} ${cell.flagged ? 'flag' : ''} ${isMine ? 'boom' : ''} n${n}`}
                  onClick={() => { if (!longPressed.current) reveal(r, c); clearHold(); }}
                  onContextMenu={e => { e.preventDefault(); toggleFlag(r, c); }}
                  onPointerDown={e => onPointerDown(e, r, c)}
                  onPointerUp={clearHold}
                  onPointerLeave={clearHold}
                  onPointerCancel={clearHold}
                  aria-label={`Row ${r + 1} column ${c + 1}${cell.revealed ? (isMine ? ', hazard' : n ? `, ${n} hazards nearby` : ', clear') : cell.flagged ? ', flagged' : ''}`}
                >
                  {cell.flagged && !cell.revealed ? <Icon name="flag" size={16} fill="currentColor" /> : null}
                  {isMine ? <Icon name="bolt" size={16} fill="currentColor" /> : null}
                  {n > 0 ? <b>{n}</b> : null}
                </button>
              );
            }))}
          </div>
        </div>
      )}

      {phase === 'over' && (
        <MiniResult
          won={won}
          title={won ? 'Grid cleared!' : 'Hazard hit'}
          text={won ? 'Every safe cell found in time.' : 'The grid was not cleared this time. Read the numbers and try again.'}
          stats={[
            { label: 'Cells cleared', value: `${revealed}/${rows * cols}` },
            { label: 'Flags', value: flags },
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
