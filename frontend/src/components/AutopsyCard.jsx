/*
  AUTOPSY CARD - shown after a wrong answer.
  Calls POST /api/ai/autopsy for a diagnostic breakdown of exactly why the
  learner's specific answer missed the mark, plus the correct reasoning and a
  similar practice question.
*/
import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Icon } from './Icon.jsx';
import { Spinner } from './ui.jsx';

export function AutopsyCard({ question, correctAnswer, userAnswer, topic, explanation, onPractice }) {
  const [more, setMore] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');

  const ask = async () => {
    setBusy(true); setErr('');
    try {
      setMore(await api('/ai/autopsy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, correctAnswer: String(correctAnswer), userAnswer: String(userAnswer || ''), topic, explanation }),
      }));
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (!more && !busy && !err) {
    return (
      <button className="link-btn autopsy-trigger" onClick={ask}>
        <Icon name="x" size={14} /> Autopsy this mistake
      </button>
    );
  }

  if (err) {
    return (
      <div className="why bad">
        <div className="why-head"><Icon name="alert" size={16} /><b>Couldn't run the autopsy</b></div>
        <p>{err}</p>
        <button className="link-btn" onClick={ask}>Try again</button>
      </div>
    );
  }

  return (
    <div className="why autopsy">
      <div className="why-head"><Icon name="alert" size={16} /><b>Why your answer missed the mark</b></div>
      <div className="autopsy-row">
        <div className="autopsy-box">
          <div className="autopsy-label">What you likely misunderstood</div>
          <p>{more.misunderstanding}</p>
        </div>
        <div className="autopsy-box">
          <div className="autopsy-label">Why “{String(userAnswer || '')}” is wrong</div>
          <p>{more.whyWrong}</p>
        </div>
      </div>
      <div className="autopsy-box full">
        <div className="autopsy-label">The right way to think about it</div>
        <p>{more.correctReasoning}</p>
      </div>
      <div className="autopsy-practice">
        <div className="autopsy-label">Try a similar one</div>
        <p className="autopsy-q">{more.similarQuestion}</p>
        <p className="autopsy-a"><b>Answer:</b> {more.similarAnswer}</p>
        {onPractice && <button className="btn primary sm" onClick={() => onPractice(more.similarQuestion)}>Practice this</button>}
      </div>
      {busy && <div className="autopsy-busy"><Spinner /> Working…</div>}
    </div>
  );
}
