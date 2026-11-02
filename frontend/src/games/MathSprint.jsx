/*
  MATH SPRINT - quick arithmetic. The server already checked that the expression
  and the answer match, so the number typed here is compared with the real result.
*/
import React from 'react';
import { Icon } from '../components/Icon.jsx';

/* Show the expression the way it is written in school: 12*8 -> 12 × 8 */
export const prettyExpr = (e) =>
  String(e || '').replace(/\*/g, '×').replace(/\//g, '÷').replace(/\s+/g, ' ').trim();

export function MathSprint({ game, value, setValue, submitted, onAnswer }) {
  const expr = prettyExpr(game.expression);

  return (
    <div className="math-game">
      {expr && <div className="math-card">{expr} = ?</div>}
      <div className="fill-game">
        <input
          autoFocus
          disabled={submitted}
          inputMode="decimal"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && String(value).trim() && !submitted) onAnswer(value); }}
          placeholder="Your answer…"
          autoComplete="off"
          spellCheck="false"
          aria-label="Your answer"
        />
        <button className="btn primary" disabled={submitted || !String(value).trim()} onClick={() => onAnswer(value)}>
          Check <Icon name="check" size={18} />
        </button>
      </div>
      <p className="hint-line">Type the number and press Enter.</p>
    </div>
  );
}
