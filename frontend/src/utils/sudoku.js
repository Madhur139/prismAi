/*
  SUDOKU ENGINE
  - Generates a valid, uniquely-solvable puzzle for a given grid size.
  - Pure logic lives here so the React component only handles the UI.
  - Sizes: 4 (2x2 boxes), 6 (2x3 boxes) and 9 (3x3 boxes).
*/

/** Box width/height for a grid of `n` cells per side. */
export function boxDims(n) {
  if (n === 4) return { bw: 2, bh: 2 };
  if (n === 6) return { bw: 3, bh: 2 };
  return { bw: 3, bh: 3 };
}

const rand = n => Math.floor(Math.random() * n);

/** Shuffle a copy of the array (Fisher-Yates). */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Is placing `v` at (r,c) legal in a partially filled grid? */
function fits(grid, n, bw, bh, r, c, v) {
  for (let i = 0; i < n; i++) {
    if (grid[r][i] === v || grid[i][c] === v) return false;
  }
  const r0 = r - (r % bh), c0 = c - (c % bw);
  for (let i = 0; i < bh; i++) for (let j = 0; j < bw; j++) {
    if (grid[r0 + i][c0 + j] === v) return false;
  }
  return true;
}

/** Fill an empty grid with a valid solution using randomised backtracking. */
export function generateSolved(n) {
  const { bw, bh } = boxDims(n);
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  const fill = pos => {
    if (pos === n * n) return true;
    const r = Math.floor(pos / n), c = pos % n;
    for (const v of shuffle(Array.from({ length: n }, (_, i) => i + 1))) {
      if (!fits(grid, n, bw, bh, r, c, v)) continue;
      grid[r][c] = v;
      if (fill(pos + 1)) return true;
      grid[r][c] = 0;
    }
    return false;
  };
  fill(0);
  return grid;
}

/** Count solutions, stopping as soon as `limit` is reached. */
export function countSolutions(grid, n, limit = 2) {
  const { bw, bh } = boxDims(n);
  const work = grid.map(row => [...row]);
  let found = 0;

  const solve = () => {
    let br = -1, bc = -1;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (work[r][c] === 0) { br = r; bc = c; }
    }
    if (br === -1) { found++; return found >= limit; }
    for (let v = 1; v <= n; v++) {
      if (!fits(work, n, bw, bh, br, bc, v)) continue;
      work[br][bc] = v;
      if (solve()) { work[br][bc] = 0; return true; }
      work[br][bc] = 0;
    }
    return false;
  };
  solve();
  return found;
}

/** True when the grid has exactly one solution. */
export function hasUniqueSolution(grid, n) {
  return countSolutions(grid, n, 2) === 1;
}

/**
 * Build a puzzle: start from a valid solution and dig holes while the puzzle
 * still has a single solution.
 * `holes` is the target number of empty cells to remove.
 */
export function generatePuzzle(n, holes) {
  const solution = generateSolved(n);
  const puzzle = solution.map(row => [...row]);
  const order = shuffle(Array.from({ length: n * n }, (_, i) => i));
  let removed = 0;

  for (const idx of order) {
    if (removed >= holes) break;
    const r = Math.floor(idx / n), c = idx % n;
    const backup = puzzle[r][c];
    if (backup === 0) continue;
    puzzle[r][c] = 0;
    // Keep the puzzle only if it is still uniquely solvable.
    if (!hasUniqueSolution(puzzle, n)) puzzle[r][c] = backup;
    else removed++;
  }
  return { puzzle, solution };
}

/** Check a filled grid against the solution and find the first conflict. */
export function findConflict(grid, solution, n) {
  const { bw, bh } = boxDims(n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const v = grid[r][c];
    if (v === 0 || v === solution[r][c]) continue;
    for (let i = 0; i < n; i++) {
      if (i !== c && grid[r][i] === v) return { r, c, type: 'row' };
      if (i !== r && grid[i][c] === v) return { r, c, type: 'column' };
    }
    const r0 = r - (r % bh), c0 = c - (c % bw);
    for (let i = 0; i < bh; i++) for (let j = 0; j < bw; j++) {
      if ((r0 + i !== r || c0 + j !== c) && grid[r0 + i][c0 + j] === v) return { r, c, type: 'box' };
    }
  }
  return null;
}
