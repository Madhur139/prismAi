/*
  CODE OUTPUT - the learner reads a short snippet and picks what it prints or
  returns.

  Design: the snippet is shown in an editor-style block (dark surface, line
  numbers and a light hand-rolled syntax colouring - no library). The answer
  options are cards that turn green / red / dim once the round is submitted.
*/
import React, { useEffect } from 'react';
import { normalize } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';
import '../styles/games/code.css';

/* Words that get the keyword colour. Covers the usual JS and Python ones. */
const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'break', 'continue', 'new', 'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await',
  'try', 'catch', 'finally', 'throw', 'typeof', 'def', 'print', 'lambda', 'None', 'True', 'False',
  'elif', 'and', 'or', 'not', 'in', 'is', 'pass', 'raise', 'with', 'as', 'yield',
]);

/* Matches comments, strings, numbers and words - in that order. */
const TOKENS = /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)/g;

/* Split one line of code into coloured pieces. Plain strings are returned as
   they are, so the rendered text always matches the original snippet. */
function highlight(line, keyBase) {
  const out = [];
  let last = 0, m, i = 0;
  TOKENS.lastIndex = 0;
  while ((m = TOKENS.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const cls = m[1] ? 'code-c' : m[2] ? 'code-s' : m[3] ? 'code-n' : KEYWORDS.has(m[4]) ? 'code-k' : '';
    if (cls) out.push(<span key={keyBase + (i++)} className={cls}>{m[0]}</span>);
    else out.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function CodeOutput({ game = {}, value, submitted, onAnswer = () => {} }) {
  const options = (Array.isArray(game.options) ? game.options : []).filter(o => o !== null && o !== undefined).map(String);
  const answer = game.answer === null || game.answer === undefined ? '' : String(game.answer);
  const snippet = game.code === null || game.code === undefined ? '' : String(game.code);
  const lines = snippet.replace(/\r\n/g, '\n').split('\n');

  /* Keyboard: press 1-4 or A-D to answer, like the multiple-choice game. */
  useEffect(() => {
    if (submitted || !options.length) return;
    const f = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const i = /^[1-9]$/.test(k) ? +k - 1 : 'abcdefghi'.indexOf(k);
      if (k.length === 1 && i >= 0 && i < options.length) onAnswer(options[i]);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [submitted, options, onAnswer]);

  const picked = value === null || value === undefined ? '' : String(value);
  const right = normalize(picked) === normalize(answer) && answer !== '';

  const status = !submitted
    ? 'Read the code carefully, then pick what it prints or returns.'
    : right
      ? 'Correct - that is what the code outputs.'
      : `Not quite - the code outputs "${answer}".`;

  return (
    <div className="code-wrap">
      {snippet.trim() ? (
        <div className="code-editor">
          <div className="code-head">
            <Icon name="pencil" size={14} />
            <span>snippet</span>
          </div>
          <pre className="code-body" aria-label="Code snippet"><code>
            {lines.map((ln, i) => (
              <span className="code-line" key={i}>
                <span className="code-num" aria-hidden="true">{i + 1}</span>
                {highlight(ln, 'l' + i + '-')}
              </span>
            ))}
          </code></pre>
        </div>
      ) : (
        <div className="code-empty">
          <Icon name="sparkles" size={18} />
          <span>No code snippet was supplied for this question.</span>
        </div>
      )}

      {options.length ? (
        <div className="code-opts">
          {options.map((o, i) => {
            const isRight = normalize(o) === normalize(answer);
            const isMine = normalize(o) === normalize(picked);
            const state = !submitted ? '' : isRight ? 'correct' : isMine ? 'wrong' : 'dim';
            return (
              <button
                key={i}
                type="button"
                className={'code-opt' + (state ? ' ' + state : '')}
                disabled={submitted}
                onClick={() => onAnswer(o)}
                aria-label={`Option ${String.fromCharCode(65 + i)}: ${o}`}
              >
                <span className="code-opt-key" aria-hidden="true">
                  {submitted && isRight ? <Icon name="check" size={15} stroke={3} />
                    : submitted && isMine ? <Icon name="x" size={15} stroke={3} />
                      : String.fromCharCode(65 + i)}
                </span>
                <span className="code-opt-text">{o}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="code-empty">
          <Icon name="sparkles" size={18} />
          <span>There are no answer options for this question.</span>
        </div>
      )}

      <p className="hint-line code-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
