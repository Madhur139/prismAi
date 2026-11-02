/*
  MINI GAME DISPATCHER
  - Picks the right mini game for a type and keeps the route list in one place.
  - Every mini game renders inside the shared PlayShell, so they look and
    behave exactly like the lesson and arcade games.
*/
import React from 'react';
import { PlayShell, Notice } from '../../components/PlayShell.jsx';
import { MINI_GAMES } from '../../constants/games.js';
import { go } from '../../utils/router.js';
import { ConceptMatch } from './ConceptMatch.jsx';
import { WordDetective } from './WordDetective.jsx';
import { NumberSudoku } from './NumberSudoku.jsx';
import { LogicMines } from './LogicMines.jsx';
import { ReactionSprint } from './ReactionSprint.jsx';

const ENGINES = {
  CONCEPT_MATCH: ConceptMatch,
  WORD_DETECTIVE: WordDetective,
  NUMBER_SUDOKU: NumberSudoku,
  LOGIC_MINES: LogicMines,
  REACTION_SPRINT: ReactionSprint,
};

export function MiniGame({ type }) {
  const meta = MINI_GAMES.find(g => g.type === type);
  const Engine = ENGINES[type];

  if (!meta || !Engine) {
    return (
      <PlayShell title="Game not found" onExit={() => go('/app/games')}>
        <Notice title="Unknown mini game" text="That link may be out of date." action={<button className="btn primary" onClick={() => go('/app/games')}>Back to arcade</button>} />
      </PlayShell>
    );
  }

  return <Engine meta={meta} onExit={() => go('/app/games')} />;
}
