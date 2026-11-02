/*
  CLOZE - fill the 2 or 3 gaps in a sentence.
  The server stores the missing words joined with "|", e.g. "glucose|carbon dioxide".
*/
import React, { useEffect, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { splitSpoken } from '../utils/voice.js';

export function Cloze({ game, submitted, onAnswer, voiceText }) {
  const answers = String(game.answer || '').split('|').filter(Boolean);
  const parts = String(game.prompt || '').split(/_{2,}/);
  const [words, setWords] = useState(() => answers.map(() => ''));

  // Start fresh whenever the round changes.
  useEffect(() => { setWords(answers.map(() => '')); }, [game.prompt, answers.length]);

  // Voice mode: the spoken answer is split over the blanks.
  useEffect(() => {
    if (!voiceText) return;
    setWords(splitSpoken(voiceText, answers.length).map(w => String(w).trim()));
  }, [voiceText, answers.length]);

  const set = (i, v) => setWords(w => w.map((x, j) => (j === i ? v : x)));
  const ready = answers.length > 0 && words.every(w => String(w).trim());
  const submit = () => { if (!ready || submitted) return; onAnswer(words.map(w => String(w).trim().toLowerCase()).join('|')); };

  if (!answers.length) return <div className="cloze-empty"><p>This game could not be built from its data.</p></div>;

  return (
    <div className="cloze-game">
      <div className="cloze-sentence">
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {p}
            {i < answers.length && (
              <input
                className="cloze-input"
                value={words[i] || ''}
                disabled={submitted}
                onChange={e => set(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                placeholder="?"
                aria-label={`Missing word ${i + 1}`}
                autoComplete="off"
                spellCheck="false"
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="cloze-tools">
        <button className="btn primary" disabled={submitted || !ready} onClick={submit}>Check <Icon name="check" size={18} /></button>
      </div>
      <p className="hint-line">Fill every gap, then press Enter.</p>
    </div>
  );
}
