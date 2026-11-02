/*
  REVIEW
  - "Due today": the concepts that spaced repetition says to revisit, thanks to
    GET /api/progress/review.
  - "Mistakes": every question you got wrong, with your own answer and the
    explanation, from GET /api/progress/mistakes.
  - Both tabs can jump straight into a practice session.
*/
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Empty, Panel } from '../components/ui.jsx';
import { GAME_META } from '../constants/games.js';
import { dueLabel, streakLabel, streakTone } from '../utils/review.js';
import { timeAgo } from '../utils/helpers.js';
import { go, playLessonUrl } from '../utils/router.js';

export function ReviewPage({ lessons = [] }) {
  const [tab, setTab] = useState('due');
  const [review, setReview] = useState(null);
  const [mistakes, setMistakes] = useState(null);
  const [drill, setDrill] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [r, m, d] = await Promise.all([
        api('/progress/review'),
        api('/progress/mistakes?limit=80'),
        api('/progress/drill?limit=15').catch(() => ({ count: 0, drills: [] })),
      ]);
      setReview(r); setMistakes(m); setDrill(d);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const topicOf = id => lessons.find(l => l._id === String(id))?.topic || 'Your lesson';

  /* Due concepts, grouped per lesson so one click starts a focused session. */
  const dueGroups = useMemo(() => {
    const list = review?.byLesson || [];
    return list.map(g => ({
      ...g,
      topic: topicOf(g.lessonId),
      items: (review.due || []).filter(d => String(d.lessonId) === String(g.lessonId)),
    }));
  }, [review, lessons]);

  /* The mistake notebook, optionally narrowed to one concept. */
  const shownMistakes = useMemo(() => {
    const list = mistakes?.mistakes || [];
    if (!filter) return list;
    return list.filter(m => m.conceptName === filter);
  }, [mistakes, filter]);

  const startReview = (group) => {
    const topics = group.items.map(i => i.conceptName);
    if (!topics.length) return;
    go(playLessonUrl(group.lessonId, { mode: 'practice', topics, types: null }));
  };

  const startAll = () => {
    const first = dueGroups[0];
    if (first) startReview(first);
  };

  const dueCount = review?.count || 0;
  const mistakeCount = mistakes?.count || 0;

  return (
    <div className="page review-page">
      <div className="page-intro">
        <div>
          <h2>Keep it fresh.</h2>
          <p>Prism brings back the ideas you are about to forget, and keeps every mistake you made.</p>
        </div>
        {tab === 'due' && dueCount > 0 && <button className="btn primary" onClick={startAll}><Icon name="play" size={18} fill="currentColor" /> Start review</button>}
      </div>

      <div className="review-tabs" role="tablist" aria-label="Review sections">
        <button type="button" role="tab" aria-selected={tab === 'due'} className={'review-tab' + (tab === 'due' ? ' on' : '')} onClick={() => setTab('due')}>
          <Icon name="refresh" size={17} /><b>Due today</b><span className="review-count">{dueCount}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'mistakes'} className={'review-tab' + (tab === 'mistakes' ? ' on' : '')} onClick={() => setTab('mistakes')}>
          <Icon name="alert" size={17} /><b>Mistakes</b><span className="review-count">{mistakeCount}</span>
        </button>
      </div>

      {error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}
      {loading && <div className="skeleton text" />}

      {/* ---------- due today ---------- */}
      {!loading && tab === 'due' && (
        dueGroups.length ? (
          <div className="due-list">
            {dueGroups.map(g => (
              <section className="due-card" key={g.lessonId}>
                <div className="due-head">
                  <div>
                    <span className="eyebrow">REVISIT</span>
                    <h3>{g.topic}</h3>
                  </div>
                  <button className="btn primary sm" onClick={() => startReview(g)}><Icon name="play" size={14} fill="currentColor" /> Practise</button>
                </div>
                <div className="due-concepts">
                  {g.items.map(item => (
                    <div className="due-item" key={item.conceptName}>
                      <span className={'due-dot ' + streakTone(item.streak)} />
                      <div>
                        <b>{item.conceptName}</b>
                        <small>{streakLabel(item.streak)} · {dueLabel(item.dueAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Empty icon="check" title="Nothing due right now" text="Prism will bring concepts back here when they are about to fade. Keep playing and this fills up." />
        )
      )}

      {/* ---------- mistake notebook ---------- */}
      {!loading && tab === 'mistakes' && (
        <>
          {drill?.count > 0 && (
            <div className="drill-banner">
              <div>
                <b>{drill.count} question{drill.count === 1 ? '' : 's'} still wrong</b>
                <small>Drill asks you the exact questions you have not fixed yet.</small>
              </div>
              <button className="btn primary" onClick={() => go('/play/drill')}><Icon name="target" size={17} /> Drill my mistakes</button>
            </div>
          )}

          {(mistakes?.byConcept?.length || 0) > 1 && (
            <div className="mistake-filters">
              <button className={'chip' + (filter ? '' : ' on')} onClick={() => setFilter('')}>All</button>
              {mistakes.byConcept.slice(0, 8).map(c => (
                <button key={c.conceptName} className={'chip' + (filter === c.conceptName ? ' on' : '')} onClick={() => setFilter(filter === c.conceptName ? '' : c.conceptName)}>
                  {c.conceptName} <b>{c.count}</b>
                </button>
              ))}
            </div>
          )}

          {shownMistakes.length ? (
            <div className="mistake-list">
              {shownMistakes.map((m, i) => (
                <article className="mistake" key={i}>
                  <div className="mistake-head">
                    <span className="gbadge" style={{ '--c': (GAME_META[m.gameType] || {}).color || '#7c6cff' }}>
                      <Icon name={(GAME_META[m.gameType] || {}).icon || 'sparkles'} size={13} />{(GAME_META[m.gameType] || {}).label || m.gameType}
                    </span>
                    <span className="mistake-concept">{m.conceptName}</span>
                    <span className="mistake-time">{timeAgo(m.at)}</span>
                  </div>
                  {m.prompt && <p className="mistake-prompt">{m.prompt}</p>}
                  {m.userAnswer && <p className="mistake-answer"><span>You said</span> {m.userAnswer}</p>}
                  {m.explanation && <p className="mistake-why"><Icon name="sparkles" size={14} /> {m.explanation}</p>}
                  <button className="link-btn" onClick={() => go(playLessonUrl(m.lessonId, { mode: 'practice', topics: [m.conceptName], types: null }))}>
                    Practise this concept <Icon name="arrow-right" size={14} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Empty icon="check" title={filter ? 'No mistakes in that concept' : 'No mistakes yet'} text={filter ? 'Try another concept.' : 'Every question you get wrong is saved here with the explanation, so you can fix it properly.'} />
          )}
        </>
      )}
    </div>
  );
}
