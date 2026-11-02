/*
  VIDEO CARD - watch a quick explainer before you play.
  - Paste your own YouTube link and it is kept with this lesson (stored locally).
  - "Recommended explainers" are one-click YouTube searches for the topic and
    each concept, so they work without any API key.
*/
import React, { useState } from 'react';
import { ytId } from '../utils/helpers.js';
import { Icon } from './Icon.jsx';
import { VideoModal } from './VideoModal.jsx';

export function VideoCard({ lesson }) {
  const key = 'prism_video_' + lesson._id;
  const [url, setUrl] = useState(() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } }), [draft, setDraft] = useState(''), [err, setErr] = useState('');
  const [playing, setPlaying] = useState(false);
  const id = ytId(url);

  const save = () => { if (!ytId(draft)) return setErr('Paste a valid YouTube link.'); setErr(''); setUrl(draft); setDraft(''); try { localStorage.setItem(key, draft); } catch {} };
  const clear = () => { setUrl(''); try { localStorage.removeItem(key); } catch {} };
  const search = topic => `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' explained')}`;

  // Suggested explainers: the lesson topic plus one per concept.
  const suggestions = [
    { label: lesson.topic, topic: lesson.topic },
    ...(lesson.concepts || []).slice(0, 4).map(c => ({ label: c.conceptName, topic: c.conceptName })),
  ].filter(s => s.topic);

  return (
    <section className="panel video-card">
      <div className="video-copy">
        <h3><Icon name="video" size={20} /> Video lesson</h3>
        <p>Watch a quick explainer before you play, or paste your own YouTube link and keep it with this lesson.</p>
        <div className="video-add">
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Paste a YouTube link…" aria-label="YouTube link" />
          <button className="btn primary" onClick={save}>Add</button>
        </div>
        {err && <div className="field-err">{err}</div>}
        {id
          ? <div className="video-actions">
            <button className="btn primary" onClick={() => setPlaying(true)}><Icon name="play" size={16} fill="currentColor" /> Watch now</button>
            <button className="link-btn" onClick={clear}>Remove video</button>
          </div>
          : <a className="btn ghost" target="_blank" rel="noreferrer" href={search(lesson.topic)}>Find an explainer on YouTube <Icon name="external" size={16} /></a>}
      </div>

      {id
        ? <div className="video-frame">
          <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="Lesson video" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
        : <div className="video-empty">
          <div className="play-pulse"><Icon name="play" size={26} fill="currentColor" /></div>
          <span>No video yet</span>
          <small>Pick a suggested explainer below</small>
        </div>}

      {suggestions.length > 0 && (
        <div className="video-suggestions">
          <h4><Icon name="sparkles" size={15} /> Recommended explainers</h4>
          <div className="suggestion-chips">
            {suggestions.map(s => (
              <a key={s.label} className="suggestion-chip" target="_blank" rel="noreferrer" href={search(s.topic)}>
                <Icon name="play" size={13} fill="currentColor" />{s.label.length > 38 ? s.label.slice(0, 38) + '…' : s.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {playing && id && <VideoModal videoId={id} title={lesson.topic} onClose={() => setPlaying(false)} />}
    </section>
  );
}
