/*
  CUSTOM GAME EDITOR - write your own question and add it to a lesson concept.
  Supports Multiple Choice, Fill in the Blank, True/False and a few other
  text-based game types. Every game is validated by the backend before saving.
*/
import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Icon } from './Icon.jsx';
import { Panel } from './ui.jsx';
import { GAME_META } from '../constants/games.js';

/* Game types a real person can reasonably write by hand. */
const HAND_TYPES = [
  'MULTIPLE_CHOICE', 'SUPER_QUIZ', 'FILL_BLANK', 'TRUE_FALSE',
  'ODD_ONE_OUT', 'TWO_TRUE_ONE_FALSE', 'CLOZE',
];

const DEFAULTS = {
  MULTIPLE_CHOICE: { options: ['', '', '', ''], answer: '' },
  SUPER_QUIZ:      { options: ['', '', '', ''], answer: '' },
  ODD_ONE_OUT:     { options: ['', '', '', ''], answer: '' },
  TWO_TRUE_ONE_FALSE: { options: ['', '', ''], answer: '' },
  FILL_BLANK:      { options: [], answer: '' },
  TRUE_FALSE:      { options: [], answer: 'True' },
  CLOZE:           { options: [], answer: '' },
};

const NEEDS_OPTIONS = ['MULTIPLE_CHOICE', 'SUPER_QUIZ', 'ODD_ONE_OUT', 'TWO_TRUE_ONE_FALSE', 'CODE_OUTPUT', 'CHART_QUESTION', 'WORD_LADDER'];
const IS_MC = ['MULTIPLE_CHOICE', 'SUPER_QUIZ', 'ODD_ONE_OUT'];

export function CustomGameEditor({ lessonId, conceptIndex, conceptTitle, onAdded, onClose }) {
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState(DEFAULTS[type].answer);
  const [options, setOptions] = useState([...DEFAULTS[type].options]);
  const [hint, setHint] = useState('');
  const [explanation, setExplanation] = useState('');
  const [level, setLevel] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Reset type-specific fields when the type changes.
  useEffect(() => {
    setAnswer(DEFAULTS[type].answer);
    setOptions([...DEFAULTS[type].options]);
    setErr('');
  }, [type]);

  const setOption = (i, v) => {
    const next = [...options];
    next[i] = v;
    setOptions(next);
  };

  const submit = async () => {
    setErr('');
    if (!prompt.trim()) return setErr('Please write a question.');
    const body = {
      conceptIndex,
      type,
      prompt: prompt.trim(),
      answer: type === 'CLOZE' ? answer : answer.trim(),
      hint: hint.trim(),
      explanation: explanation.trim(),
      level: Number(level),
    };
    if (NEEDS_OPTIONS.includes(type)) {
      body.options = options.map((o) => o.trim()).filter(Boolean);
    }
    if (type === 'TRUE_FALSE') body.answer = answer === 'True' ? 'True' : 'False';

    setBusy(true);
    try {
      const d = await api(`/lessons/${lessonId}/custom-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (onAdded) onAdded(d.game);
      onClose?.();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Panel title={`Add your own question — ${conceptTitle}`} subtitle="Write it, I'll check it before saving.">
      <div className="custom-editor">
        <div className="custom-row">
          <label>Game type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="custom-select">
            {HAND_TYPES.map(t => <option key={t} value={t}>{GAME_META[t]?.label || t}</option>)}
          </select>
        </div>

        <div className="custom-row">
          <label>Question / statement</label>
          <textarea
            value={prompt} onChange={e => setPrompt(e.target.value)}
            rows={3}
            placeholder={type === 'TRUE_FALSE' ? 'Write a statement (not a question).' : 'Write your question.'}
            className="custom-input"
          />
          {type === 'FILL_BLANK' && <span className="custom-hint">Include exactly one "____" for the missing word.</span>}
          {type === 'CLOZE' && <span className="custom-hint">Include 2 or 3 "____" blanks. Join answers with "|".</span>}
        </div>

        {NEEDS_OPTIONS.includes(type) && (
          <div className="custom-options">
            <label>Options</label>
            {options.map((o, i) => (
              <div key={i} className="custom-opt-row">
                <input value={o} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="custom-input" />
              </div>
            ))}
            {IS_MC.includes(type) && <span className="custom-hint">Pick exactly 4 options. The correct answer must match one of them.</span>}
          </div>
        )}

        {!NEEDS_OPTIONS.includes(type) && type !== 'TRUE_FALSE' && type !== 'CLOZE' && (
          <div className="custom-row">
            <label>Correct answer</label>
            <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="The right answer" className="custom-input" />
          </div>
        )}

        {type === 'TRUE_FALSE' && (
          <div className="custom-row">
            <label>Correct answer</label>
            <select value={answer} onChange={e => setAnswer(e.target.value)} className="custom-select">
              <option value="True">True</option>
              <option value="False">False</option>
            </select>
          </div>
        )}

        {type === 'CLOZE' && (
          <div className="custom-row">
            <label>Answers (join with "|")</label>
            <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="word1 | word2 | word3" className="custom-input" />
            <span className="custom-hint">One answer per blank, separated by "|".</span>
          </div>
        )}

        <div className="custom-row">
          <label>Difficulty</label>
          <select value={level} onChange={e => setLevel(e.target.value)} className="custom-select">
            <option value="1">Easy</option>
            <option value="2">Normal</option>
            <option value="3">Hard</option>
          </select>
        </div>

        <div className="custom-row">
          <label>Hint (optional)</label>
          <input value={hint} onChange={e => setHint(e.target.value)} placeholder="A nudge towards the method, not the answer" className="custom-input" />
        </div>

        <div className="custom-row">
          <label>Explanation (optional)</label>
          <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} placeholder="Why is this the right answer?" className="custom-input" />
        </div>

        {err && <div className="field-err">{err}</div>}

        <div className="custom-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? <><Icon name="loader" size={14} className="ide-spin" /> Saving…</> : <><Icon name="plus" size={14} /> Add question</>}
          </button>
        </div>
      </div>
    </Panel>
  );
}
