/*
  CHART QUESTION - a tiny bar chart with a question about it.

  Design: the chart is drawn with plain divs (a bar is a positioned element
  whose height is a percentage of the tallest value), so no chart library is
  needed. Every bar is a real button: clicking a bar whose label is one of the
  answer options answers with it, otherwise the bar just reads its value out
  loud so the learner can then pick it from the options list.
*/
import React, { useEffect, useState } from 'react';
import { normalize } from '../utils/helpers.js';
import { Icon } from '../components/Icon.jsx';
import '../styles/games/code.css';

/* A point of the chart: a label and a value that may arrive as a string. */
function pointOf(d) {
  const label = d && d.label !== null && d.label !== undefined ? String(d.label) : '';
  const raw = d && d.value !== null && d.value !== undefined ? String(d.value) : '';
  const n = parseFloat(raw.replace(/,/g, ''));
  return { label, raw, n: Number.isFinite(n) ? n : 0 };
}

export function ChartQuestion({ game = {}, value, submitted, onAnswer = () => {} }) {
  const options = (Array.isArray(game.options) ? game.options : []).filter(o => o !== null && o !== undefined).map(String);
  const answer = game.answer === null || game.answer === undefined ? '' : String(game.answer);
  const points = (Array.isArray(game.data) ? game.data : []).map(pointOf).filter(p => p.label || p.raw);
  const [sel, setSel] = useState(-1);

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
  const max = points.reduce((m, p) => Math.max(m, p.n), 0);
  const top = points.findIndex(p => p.n === max && max > 0);
  /* The bar the answer points at (the answer can be a label or a value). */
  const answerIdx = points.findIndex(p => normalize(p.label) === normalize(answer) || normalize(p.raw) === normalize(answer));

  const pick = i => {
    if (submitted) return;
    const p = points[i];
    setSel(i);
    /* If the bar's label is one of the options, clicking the bar answers. */
    if (p && options.some(o => normalize(o) === normalize(p.label))) onAnswer(p.label);
  };

  const status = !submitted
    ? (sel >= 0 && points[sel] ? `${points[sel].label}: ${points[sel].raw}. Now pick the matching answer below.`
      : 'Look at the chart, then pick the answer below.')
    : right
      ? 'Correct - that is what the chart shows.'
      : `Not quite - the chart shows "${answer}".`;

  return (
    <div className="chart-wrap">
      {points.length ? (
        <div className="chart-panel">
          <div className="chart-bars" role="group" aria-label="Bar chart">
            {points.map((p, i) => {
              /* Bars are scaled to 82% of the plot height so the value label
                 always has room above the tallest bar. */
              const h = max > 0 ? (p.n / max) * 82 : 0;
              const cls = ['chart-col'];
              if (i === top) cls.push('max');
              if (sel === i) cls.push('sel');
              if (submitted) {
                if (i === answerIdx) cls.push('right');
                else if (sel === i) cls.push('miss');
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={cls.join(' ')}
                  style={{ '--h': h.toFixed(2) + '%' }}
                  onClick={() => pick(i)}
                  disabled={submitted}
                  aria-pressed={sel === i}
                  aria-label={`${p.label || 'Point'}: ${p.raw}`}
                >
                  <span className="chart-plot">
                    <span className="chart-bar" />
                    <span className="chart-val">{p.raw}</span>
                  </span>
                  <span className="chart-label">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="chart-empty">
          <Icon name="sparkles" size={18} />
          <span>No chart data was supplied for this question.</span>
        </div>
      )}

      {options.length ? (
        <div className="chart-opts">
          {options.map((o, i) => {
            const isRight = normalize(o) === normalize(answer);
            const isMine = normalize(o) === normalize(picked);
            const state = !submitted ? '' : isRight ? 'correct' : isMine ? 'wrong' : 'dim';
            return (
              <button
                key={i}
                type="button"
                className={'chart-opt' + (state ? ' ' + state : '')}
                disabled={submitted}
                onClick={() => onAnswer(o)}
                aria-label={`Option ${String.fromCharCode(65 + i)}: ${o}`}
              >
                <span className="chart-opt-key" aria-hidden="true">
                  {submitted && isRight ? <Icon name="check" size={15} stroke={3} />
                    : submitted && isMine ? <Icon name="x" size={15} stroke={3} />
                      : String.fromCharCode(65 + i)}
                </span>
                <span className="chart-opt-text">{o}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="chart-empty">
          <Icon name="sparkles" size={18} />
          <span>There are no answer options for this question.</span>
        </div>
      )}

      <p className="hint-line chart-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
