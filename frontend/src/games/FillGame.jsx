/* FILL GAME - type the missing word. Press Enter to check. */
import React from 'react';
import { Icon } from '../components/Icon.jsx';

export function FillGame({ value, setValue, submitted, onAnswer }) {
  return (
    <div className="fill-game">
      <input autoFocus disabled={submitted} value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && value.trim() && !submitted && onAnswer(value)} placeholder="Type your answer…" autoComplete="off" spellCheck="false" />
      <button className="btn primary" disabled={submitted || !value.trim()} onClick={() => onAnswer(value)}>Check <Icon name="check" size={18} /></button>
    </div>
  );
}
