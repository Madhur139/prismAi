/*
  SNAKE CROSSWORD - interlocking clues. The grid itself is built by utils/crossword.js.
  Keyboard: type to fill (cursor follows the word), arrows to move, Backspace to go back, Enter to check.
*/
import React, { useState, useMemo, useRef } from 'react';
import { blankGrid, buildCrossword } from '../utils/crossword.js';
import { Icon } from '../components/Icon.jsx';

export function SnakeCrossword({ game, onResolve }) {
  const puzzle = useMemo(() => buildCrossword(game.clues || []), [game]);
  const size = puzzle.size;
  const [letters, setLetters] = useState(() => blankGrid(puzzle.grid)), [checked, setChecked] = useState(false), [solved, setSolved] = useState(false);
  const refs = useRef({}), dirRef = useRef('A');

  const cells = useMemo(() => puzzle.grid.flatMap((row, r) => row.map((ch, c) => (ch ? { r, c, a: ch } : null)).filter(Boolean)), [puzzle]);
  const bounds = useMemo(() => {
    if (!cells.length) return null;
    const rs = cells.map(c => c.r), cs = cells.map(c => c.c);
    return { r0: Math.min(...rs), r1: Math.max(...rs), c0: Math.min(...cs), c1: Math.max(...cs) };
  }, [cells]);
  const starts = useMemo(() => { const m = {}; puzzle.numbered.forEach(w => { m[`${w.row},${w.col}`] = w.num; }); return m; }, [puzzle]);

  const has = (r, c) => r >= 0 && c >= 0 && r < size && c < size && !!puzzle.grid[r][c];
  const focus = (r, c) => { const el = refs.current[`${r},${c}`]; if (el) el.focus(); };
  const dirsAt = (r, c) => { const d = []; if (has(r, c - 1) || has(r, c + 1)) d.push('A'); if (has(r - 1, c) || has(r + 1, c)) d.push('D'); return d; };

  const update = (r, c, v) => {
    if (solved) return;
    const ch = v.replace(/[^a-z]/gi, '').slice(-1).toUpperCase();
    setLetters(prev => { const n = prev.map(x => x.slice()); n[r][c] = ch; return n; }); setChecked(false);
    if (ch) {
      let d = dirRef.current; const ds = dirsAt(r, c);
      if (!ds.includes(d)) { d = ds[0] || d; dirRef.current = d; }
      const nr = r + (d === 'D' ? 1 : 0), nc = c + (d === 'A' ? 1 : 0);
      if (has(nr, nc)) focus(nr, nc);
    }
  };
  const onKey = (e, r, c) => {
    const mv = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
    if (mv) { e.preventDefault(); dirRef.current = mv[0] ? 'D' : 'A'; if (has(r + mv[0], c + mv[1])) focus(r + mv[0], c + mv[1]); return; }
    if (e.key === 'Enter') { e.preventDefault(); check(); return; }
    if (e.key === 'Backspace' && !letters[r][c]) {
      e.preventDefault(); const d = dirRef.current, pr = r - (d === 'D' ? 1 : 0), pc = c - (d === 'A' ? 1 : 0);
      if (has(pr, pc)) { setLetters(prev => { const n = prev.map(x => x.slice()); n[pr][pc] = ''; return n; }); focus(pr, pc); }
    }
  };
  const check = () => {
    if (solved) return;
    const ok = cells.every(c => letters[c.r][c.c] === c.a); setChecked(true);
    if (ok) { setSolved(true); setTimeout(() => onResolve(true), 700); }
  };
  const reset = () => { if (solved) return; setLetters(blankGrid(puzzle.grid)); setChecked(false); };

  if (!bounds) return <div className="cw-empty-note"><p>This puzzle couldn't be built from its clues.</p><button className="btn ghost" onClick={() => onResolve(false)}>Skip</button></div>;

  const rows = Array.from({ length: bounds.r1 - bounds.r0 + 1 }, (_, i) => bounds.r0 + i), cols = Array.from({ length: bounds.c1 - bounds.c0 + 1 }, (_, i) => bounds.c0 + i);
  const across = puzzle.numbered.filter(w => w.dir === 'A'), down = puzzle.numbered.filter(w => w.dir === 'D');
  const Clues = ({ title, list, icon }) => list.length ? <div className="clue-group"><h4><Icon name={icon} size={15} /> {title}</h4>{list.map(w => <div className="clue-row" key={`${w.num}${w.dir}`}><b>{w.num}</b><span>{w.clue}</span><small>{w.word.length}</small></div>)}</div> : null;

  return (
    <div className="crossword">
      <h2 className="prompt">{game.prompt || 'Solve the crossword'}</h2>
      <div className="cw-body">
        <div className="cw-board" style={{ '--n': cols.length, gridTemplateColumns: `repeat(${cols.length}, var(--cw))` }}>
          {rows.map(r => cols.map(c => puzzle.grid[r][c]
            ? <div key={`${r}-${c}`} className={`cw-cell ${checked ? (letters[r][c] === puzzle.grid[r][c] ? 'right' : 'wrong') : ''} ${solved ? 'solved' : ''}`}>
                {starts[`${r},${c}`] && <sup>{starts[`${r},${c}`]}</sup>}
                <input ref={el => { refs.current[`${r},${c}`] = el; }} value={letters[r][c]} maxLength={2} autoComplete="off" autoCapitalize="characters" spellCheck="false" aria-label={`Row ${r + 1}, column ${c + 1}`}
                  onFocus={e => { e.target.select(); const d = dirsAt(r, c); if (d.length === 1) dirRef.current = d[0]; }}
                  onChange={e => update(r, c, e.target.value)} onKeyDown={e => onKey(e, r, c)} />
              </div>
            : <div key={`${r}-${c}`} className="cw-blank" />))}
        </div>
        <div className="clue-panel"><Clues title="Across" list={across} icon="arrow-right" /><Clues title="Down" list={down} icon="chevron-right" /></div>
      </div>
      <div className="cw-actions">
        <button className="btn primary" onClick={check} disabled={solved}>{solved ? <>Solved <Icon name="check" size={18} /></> : <>Check crossword <Icon name="check" size={18} /></>}</button>
        <button className="btn ghost" onClick={reset} disabled={solved}><Icon name="refresh" size={17} /> Clear</button>
        {!solved && <button className="btn ghost" onClick={() => onResolve(false)}>Skip</button>}
      </div>
      {checked && !solved && <p className="cw-note">Some letters are off — use the crossings to narrow them down.</p>}
    </div>
  );
}
