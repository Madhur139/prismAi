/*
  WRITE & CHECK - full-screen page at #/play/write/<lessonId|free>?topic=&concept=&d=&n=
  1. AI writes an open question (from a lesson concept or a topic)
  2. you write the answer in your own words
  3. AI grades it: score, feedback, WHY, strengths, improvements and a model answer
  Lesson-based sessions also save XP through /api/progress/submit.
*/
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { PlayShell, Notice } from '../components/PlayShell.jsx';
import { Ring, Spinner, useToast } from '../components/ui.jsx';
import { usableHint } from '../utils/helpers.js';
import { readSettings } from '../utils/settings.js';
import { go } from '../utils/router.js';

const POST = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const COLORS = { correct: 'var(--good)', partial: 'var(--warn)', incorrect: 'var(--bad)' };
const LABEL = { correct: 'Excellent', partial: 'Partly there', incorrect: 'Not yet' };
const ICON = { correct: 'check', partial: 'target', incorrect: 'x' };

export function WritePlayer({ id, query }) {
  const lessonId = id === 'free' ? null : id, topic = query.topic || '', concept = query.concept || '';
  const diff = ['easy', 'medium', 'hard'].includes(query.d) ? query.d : 'medium', total = Math.min(10, Math.max(1, parseInt(query.n, 10) || 5));
  const [toast, notify] = useToast();
  const [phase, setPhase] = useState('loading'), [error, setError] = useState(''), [q, setQ] = useState(null), [answer, setAnswer] = useState(''), [result, setResult] = useState(null);
  const [idx, setIdx] = useState(0), [history, setHistory] = useState([]), [showHint, setShowHint] = useState(false), [save, setSave] = useState(null), [lessonTitle, setLessonTitle] = useState('');
  const started = useRef(Date.now()), box = useRef(null), asked = useRef([]);
  const explainLike5 = readSettings().explainLike5;

  const back = () => go(lessonId ? '/app/lesson/' + lessonId : '/app/write');
  const exit = () => { if ((phase === 'write' && answer.trim().length > 20) || (history.length && phase !== 'done')) { if (!window.confirm('Leave this session? Your progress won’t be saved.')) return; } back(); };

  const nextQuestion = async () => {
    setPhase('loading'); setError(''); setResult(null); setAnswer(''); setShowHint(false);
    try {
      const d = await api('/ai/question', POST({ lessonId, topic, conceptName: concept, difficulty: diff, avoid: asked.current, explainLike5 }));
      asked.current.push(d.question); setQ(d); started.current = Date.now(); setPhase('write');
    } catch (e) { setError(e.message); setPhase('error'); }
  };
  useEffect(() => {
    if (!lessonId && !topic.trim()) { setError('Choose a topic first.'); setPhase('error'); return; }
    if (lessonId) api(`/lessons/${lessonId}`).then(d => setLessonTitle(d.lesson?.topic || '')).catch(() => {});
    nextQuestion();
  }, []);
  useEffect(() => { if (phase === 'write') box.current?.focus(); }, [phase]);

  const check = async () => {
    const text = answer.trim(); if (text.length < 2 || phase !== 'write') return;
    setPhase('checking');
    try {
      const r = await api('/ai/check', POST({ question: q.question, answer: text, lessonId, conceptName: lessonId ? q.conceptName : '', topic: topic || lessonTitle, explainLike5 }));
      setResult(r); setPhase('result');
    } catch (e) { notify(e.message, 'error'); setPhase('write'); }
  };
  const retry = () => { setPhase('write'); setResult(null); };
  const finish = async all => {
    setPhase('done');
    if (!lessonId) return;
    setSave({ state: 'saving' });
    try {
      const results = all.map(h => ({ conceptName: h.conceptName, gameType: 'FILL_BLANK', correct: h.score >= 70, timeMs: h.timeMs }));
      const d = await api('/progress/submit', POST({ lessonId, results }));
      setSave({ state: 'saved', xp: d.gainedXP, total: d.totalXP, streak: d.streakCount });
    } catch (e) { setSave({ state: 'error', error: e.message }); }
  };
  const next = () => {
    const all = [...history, { question: q.question, answer: answer.trim(), conceptName: q.conceptName, score: result.score, verdict: result.verdict, timeMs: Date.now() - started.current, modelAnswer: result.modelAnswer }];
    setHistory(all);
    if (idx + 1 >= total) finish(all); else { setIdx(idx + 1); nextQuestion(); }
  };
  const skip = () => { asked.current = asked.current.slice(); nextQuestion(); };

  // Ctrl/Cmd + Enter = check, Enter = next (on result)
  useEffect(() => {
    const f = e => {
      if (phase === 'write' && (e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); check(); }
      if (phase === 'result' && e.key === 'Enter' && !e.repeat && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  });

  const avg = history.length ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length) : 0;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const title = lessonTitle || topic || 'Write & Check';

  return (
    <PlayShell color="#06b6d4" kicker="WRITE & AI CHECK" title={title} progress={phase === 'done' ? 1 : idx / total} onExit={exit} toast={toast}
      right={phase !== 'done' ? <span className="play-chip">{idx + 1}/{total}</span> : null}>
      {phase === 'loading' && <Notice busy title="Writing your question…" text="Prism AI is preparing something worth thinking about." />}
      {phase === 'error' && <Notice title="Couldn’t get a question" text={error} action={<div className="row-gap"><button className="btn primary" onClick={nextQuestion}>Try again</button><button className="btn ghost" onClick={back}>Go back</button></div>} />}

      {(phase === 'write' || phase === 'checking' || phase === 'result') && q && (
        <div className="stage write">
          <div className="stage-top"><span className="gbadge" style={{ '--c': '#06b6d4' }}><Icon name="pencil" size={14} />Write & check</span><span className="concept-pill">{q.conceptName}</span><span className="soft-tag">{diff}</span></div>
          <h2 className="prompt">{q.question}</h2>

          <div className={`answer-box ${phase === 'result' ? 'locked' : ''}`}>
            <textarea ref={box} value={answer} onChange={e => setAnswer(e.target.value)} disabled={phase !== 'write'} rows={6} maxLength={1500} placeholder="Write your answer in your own words…" aria-label="Your answer" />
            <div className="answer-foot"><span>{words} word{words === 1 ? '' : 's'} · {answer.length}/1500</span>{phase === 'write' && <span className="kbd-hint">Ctrl + Enter to check</span>}</div>
          </div>

          {phase !== 'result' && <>
            {usableHint(q.hint) && (showHint ? <p className="hint-box"><Icon name="sparkles" size={16} /> {usableHint(q.hint)}</p> : phase === 'write' && <button className="link-btn" onClick={() => setShowHint(true)}>Need a hint?</button>)}
            <div className="write-actions">
              <button className="btn primary lg" onClick={check} disabled={phase === 'checking' || answer.trim().length < 2}>{phase === 'checking' ? <><Spinner /> AI is checking…</> : <><Icon name="sparkles" size={18} /> Check with AI</>}</button>
              <button className="btn ghost lg" onClick={skip} disabled={phase === 'checking'}>Skip question</button>
            </div>
          </>}

          {phase === 'result' && result && (
            <div className="check-result" style={{ '--vc': COLORS[result.verdict] }}>
              <div className="cr-head">
                <Ring value={result.score} size={104} stroke={10}><b className="ring-num">{result.score}</b><span>/ 100</span></Ring>
                <div className="cr-copy"><span className={`verdict ${result.verdict}`}><Icon name={ICON[result.verdict]} size={15} stroke={3} />{LABEL[result.verdict]}</span><p>{result.feedback}</p></div>
              </div>
              <div className="why good"><div className="why-head"><Icon name="sparkles" size={16} /><b>Why this score</b></div><p>{result.reason}</p></div>
              {(result.strengths?.length > 0 || result.improvements?.length > 0) && (
                <div className="cr-lists">
                  {result.strengths?.length > 0 && <div><h5 className="ok"><Icon name="check" size={15} stroke={3} /> What you did well</h5><ul>{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                  {result.improvements?.length > 0 && <div><h5 className="up"><Icon name="target" size={15} /> How to improve</h5><ul>{result.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                </div>
              )}
              <div className="model"><h5><Icon name="book" size={15} /> Ideal answer</h5><p>{result.modelAnswer}</p></div>
              <div className="write-actions">
                <button className="btn primary lg" onClick={next} autoFocus>{idx + 1 >= total ? 'Finish' : 'Next question'} <Icon name="arrow-right" size={18} /></button>
                {result.verdict !== 'correct' && <button className="btn ghost lg" onClick={retry}><Icon name="refresh" size={17} /> Improve my answer</button>}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'done' && (
        <section className="summary">
          {avg >= 80 && <div className="confetti" aria-hidden="true">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ '--x': `${(i * 29) % 100}%`, '--d': `${(i % 9) * 0.1}s`, '--c': ['#ff5d8f', '#ffd84d', '#37e0a0', '#2cb8ff', '#8b7bff'][i % 5] }} />)}</div>}
          <div className="summary-top">
            <Ring value={avg} size={150} stroke={13}><b className="ring-num">{avg}</b><span>avg score</span></Ring>
            <div className="summary-copy"><span className="eyebrow">WRITE & CHECK COMPLETE</span><h2>{avg >= 80 ? 'Brilliant writing!' : avg >= 55 ? 'Good understanding.' : 'Keep practising — you’ll get there.'}</h2><p>{history.filter(h => h.score >= 70).length} of {history.length} answers were strong.</p></div>
          </div>
          {save && <div className="summary-stats three">
            <div><Icon name="bolt" size={18} /><b>{save.state === 'saving' ? <Spinner /> : save.xp != null ? '+' + save.xp : '—'}</b><span>XP earned</span></div>
            <div><Icon name="flame" size={18} /><b>{save.state === 'saving' ? <Spinner /> : save.streak ?? '—'}</b><span>Day streak</span></div>
            <div><Icon name="trophy" size={18} /><b>{save.state === 'saving' ? <Spinner /> : save.total != null ? Number(save.total).toLocaleString() : '—'}</b><span>Total XP</span></div>
          </div>}
          {save?.state === 'error' && <div className="alert error"><Icon name="alert" size={18} /><span>Couldn’t save your progress ({save.error}).</span><button className="link-btn" onClick={() => finish(history)}>Retry</button></div>}
          <div className="review-list">{history.map((h, i) => (
            <details key={i} className="review"><summary><span className={`dot ${h.verdict}`} /><span className="rq">{h.question}</span><b>{h.score}</b></summary>
              <div className="review-body"><h6>Your answer</h6><p>{h.answer}</p><h6>Ideal answer</h6><p>{h.modelAnswer}</p></div></details>))}</div>
          <div className="summary-actions"><button className="btn primary lg" onClick={() => { setHistory([]); setIdx(0); asked.current = []; setSave(null); nextQuestion(); }}><Icon name="refresh" size={18} /> Write more</button><button className="btn ghost lg" onClick={back}>{lessonId ? 'Back to lesson' : 'Back'}</button></div>
        </section>
      )}
    </PlayShell>
  );
}
