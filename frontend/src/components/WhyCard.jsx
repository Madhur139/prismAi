/*
  WHY CARD - shown after every answer. Always gives the reason; "Explain more with AI" asks
  POST /api/ai/explain for a deeper explanation, a memory tip and an example.
*/
import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Icon } from './Icon.jsx';
import { Spinner } from './ui.jsx';

export function WhyCard({ correct, question, answer, userAnswer, explanation, topic }) {
  const [more, setMore] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const base = explanation || `The correct answer is “${answer}”.`;
  const ask = async () => {
    setBusy(true); setErr('');
    try { setMore(await api('/ai/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, correctAnswer: String(answer), userAnswer: String(userAnswer || ''), topic, explanation }) })); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className={`why ${correct ? 'good' : 'bad'}`}>
      <div className="why-head"><Icon name="sparkles" size={16} /><b>{correct ? 'Why this is right' : 'Why it’s different'}</b></div>
      <p>{base}</p>
      {more && <div className="why-more">
        <p>{more.reason}</p>
        {more.tip && <div className="why-line"><Icon name="bolt" size={15} /><span><b>Remember:</b> {more.tip}</span></div>}
        {more.example && <pre>{more.example}</pre>}
      </div>}
      {err && <div className="field-err">{err}</div>}
      {!more && <button className="link-btn" onClick={ask} disabled={busy}>{busy ? <><Spinner /> Thinking…</> : <><Icon name="sparkles" size={15} /> Explain more with AI</>}</button>}
    </div>
  );
}
