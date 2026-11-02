/*
  WRITE & CHECK LAUNCHER (#/app/write)
  Pick a lesson (or type any topic), difficulty and number of questions, then start.
  The session itself opens on its own full-screen page.
*/
import React, { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { LessonCover, Segmented } from '../components/ui.jsx';
import { useReveal } from '../utils/reveal.js';
import { go, writeUrl } from '../utils/router.js';

const SUGGEST = ['Photosynthesis', 'The French Revolution', 'How vaccines work', 'JavaScript closures'];

/* Difficulty + question count options for the shared Segmented control. */
const DIFFICULTIES = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];
const COUNTS = [[3, '3'], [5, '5'], [8, '8']];

export function WritePage({ lessons }) {
  const [topic, setTopic] = useState(''), [d, setD] = useState('medium'), [n, setN] = useState(5), [concept, setConcept] = useState({});
  useReveal();
  const startFree = t => { const v = (t ?? topic).trim(); if (v) go(writeUrl('free', { topic: v, d, n })); };
  return (
    <div className="page write">
      <section className="write-hero">
        <div><span className="eyebrow">WRITE & AI CHECK</span><h2>Explain it in your own words.</h2><p>Prism AI asks a real question, you write the answer, and it grades you with a score, the reason why, and an ideal answer to learn from.</p></div>
        <div className="write-hero-art" aria-hidden="true"><Icon name="pencil" size={64} stroke={1.6} /></div>
      </section>

      <div className="panel opts" data-reveal="" style={{ '--d': '.08s' }}>
        <div className="opt"><b>Difficulty</b><Segmented label="Difficulty" options={DIFFICULTIES} value={d} onChange={setD} /></div>
        <div className="opt"><b>Questions</b><Segmented label="Number of questions" options={COUNTS} value={n} onChange={setN} /></div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h3>Write about any topic</h3><span>No lesson needed</span></div></div>
        <form className="free-topic" onSubmit={e => { e.preventDefault(); startFree(); }}>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Causes of World War I" maxLength={200} aria-label="Topic" />
          <button className="btn primary" disabled={!topic.trim()}><Icon name="pencil" size={17} /> Start writing</button>
        </form>
        <div className="suggestions">{SUGGEST.map(s => <button key={s} onClick={() => startFree(s)}><Icon name="plus" size={13} />{s}</button>)}</div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h3>Or practise a lesson</h3><span>Questions come from your concepts and earn XP</span></div></div>
        {lessons.length ? <div className="play-list">{lessons.map(l => (
          <div className="play-row" key={l._id}>
            <LessonCover lesson={l} className="mini" />
            <div className="pr-info"><b>{l.topic}</b><span>{(l.concepts || []).length} concepts</span></div>
            <select className="mini-select" value={concept[l._id] || ''} onChange={e => setConcept({ ...concept, [l._id]: e.target.value })} aria-label={`Concept for ${l.topic}`}>
              <option value="">All concepts</option>{(l.concepts || []).map(c => <option key={c.conceptName} value={c.conceptName}>{c.conceptName}</option>)}
            </select>
            <button className="btn primary sm" onClick={() => go(writeUrl(l._id, { concept: concept[l._id], d, n }))}><Icon name="pencil" size={14} /> Write</button>
          </div>))}</div>
          : <p className="muted pad">You have no lessons yet — create one, or use a topic above.</p>}
      </div>
    </div>
  );
}
