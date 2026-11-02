/*
  MY LESSONS / LIBRARY - search, sort and open saved lessons, or jump straight into a game.
*/
import React, { useState, useMemo } from 'react';
import { Empty, LessonCover } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { ART } from '../utils/coverImage.js';
import { gameCount, lessonMeta, timeAgo } from '../utils/helpers.js';
import { useReveal } from '../utils/reveal.js';
import { go, playLessonUrl } from '../utils/router.js';

export function Lessons({ lessons, loading }) {
  const [query, setQuery] = useState(''), [sort, setSort] = useState('new');
  useReveal();
  const filtered = useMemo(() => {
    const list = lessons.filter(l => l.topic.toLowerCase().includes(query.toLowerCase()));
    return [...list].sort((a, b) => sort === 'new' ? new Date(b.createdAt) - new Date(a.createdAt) : a.topic.localeCompare(b.topic));
  }, [lessons, query, sort]);
  return (
    <div className="page library">
      <div className="page-intro" data-reveal=""><div><h2>Everything you’re learning.</h2><p>Open a lesson to review concepts, or jump straight into a game.</p></div><button className="btn primary" onClick={() => go('/app/create')}><Icon name="plus" size={18} /> New lesson</button></div>
      <div className="toolbar" data-reveal="" style={{ '--d': '.06s' }}>
        <div className="search"><Icon name="search" size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search lessons…" aria-label="Search lessons" /></div>
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort lessons"><option value="new">Newest first</option><option value="name">Name A–Z</option></select>
      </div>
      <div className="library-grid" data-reveal="" style={{ '--d': '.12s' }}>
        {filtered.map(l => (
          <article className="lib-card" key={l._id}>
            <a href={'#/app/lesson/' + l._id} className="lib-link"><LessonCover  lesson={l} className="tall"  /></a>
            <div className="lib-info">
              <span className="soft-tag">{l.sourceType}</span>
              <a href={'#/app/lesson/' + l._id}><h3>{l.topic}</h3></a>
              <p>{lessonMeta(l)}{l.createdAt ? ` · ${timeAgo(l.createdAt)}` : ''}</p>
              <div className="lib-actions"><button className="btn primary sm" onClick={() => go(playLessonUrl(l._id))}><Icon name="play" size={14} fill="currentColor" /> Play</button><a className="btn ghost sm" href={'#/app/lesson/' + l._id}>Open</a></div>
            </div>
          </article>
        ))}
        {!filtered.length && <div className="empty-wide"><Empty art={ART.library} title={loading ? 'Loading lessons…' : 'No matching lessons'} text={query ? 'Try another search term.' : 'Create a lesson and it will appear here.'} /></div>}
      </div>
    </div>
  );
}
