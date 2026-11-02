/*
  SHARED LESSON PAGE - a read-only view of a lesson somebody shared.
    #/shared/<token>
  No login needed: the page only shows the lesson, it never changes it.
*/
import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { GameBadge, LessonCover, Panel, Skeleton } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { go } from '../utils/router.js';

export function SharedLesson({ token }) {
  const [lesson, setLesson] = useState(null), [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api(`/lessons/shared/${token}`).then(d => live && setLesson(d.lesson)).catch(e => live && setError(e.message));
    return () => { live = false; };
  }, [token]);

  if (error) return (
    <div className="page narrow">
      <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>
      <button className="btn ghost" onClick={() => go('/')}><Icon name="arrow-left" size={17} /> Go to Prism</button>
    </div>
  );
  if (!lesson) return <div className="page"><Skeleton className="hero-sk" /><Skeleton style={{ height: 220 }} /></div>;

  const games = lesson.concepts.reduce((n, c) => n + (c.microGames || []).length, 0);

  return (
    <div className="page lesson-page">
      <section className="lesson-hero" data-reveal="">
        <LessonCover lesson={lesson} className="hero" />
        <div className="lesson-hero-copy">
          <div className="lesson-kicker"><span className="soft-tag">Shared lesson</span><span>{lesson.concepts.length} concepts</span><span>·</span><span>{games} games</span></div>
          <h2>{lesson.topic}</h2>
          <p>Read-only view. Create your own copy to play it and earn XP.</p>
          <div className="row-gap">
            <button className="btn primary lg" onClick={() => go('/login')}><Icon name="play" size={18} fill="currentColor" /> Play it yourself</button>
          </div>
        </div>
      </section>

      <Panel title="Concepts" subtitle="What this lesson covers">
        <div className="concept-list">
          {lesson.concepts.map((c, ci) => (
            <div className="concept" key={ci}>
              <span className="concept-num">{String(ci + 1).padStart(2, '0')}</span>
              <div className="concept-main">
                <h4>{c.conceptName}</h4>
                <p>{c.summary || ''}</p>
                <div className="concept-games">{(c.microGames || []).map((g, gi) => (
                  <span className="game-chip" key={gi}><GameBadge type={g.type} /></span>
                ))}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
