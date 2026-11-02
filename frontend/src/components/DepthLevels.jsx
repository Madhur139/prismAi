/*
  DEPTH LEVELS
  - One concept explained three ways: simply, normally, and in depth.
  - The AI writes all three at once, so switching between them is instant.
*/
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { Icon } from './Icon.jsx';

export function DepthLevels({ open, onClose, lessonId, conceptName, topic }) {
  const [levels, setLevels] = useState(null);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !conceptName) return;
    let live = true;
    setLoading(true); setError(''); setLevels(null); setActive(0);
    api('/ai/levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, conceptName, topic }),
    })
      .then(d => { if (live) setLevels(d.levels || []); })
      .catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [open, lessonId, conceptName, topic]);

  if (!open) return null;
  const current = levels?.[active];

  // Portalled to <body> so the panel is always centred in the viewport.
  return createPortal(
    <div className="modal-backdrop dl-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="dl" role="dialog" aria-modal="true" aria-label={`${conceptName} explained three ways`}>
        <button className="icon-btn dl-x" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>

        <span className="eyebrow">THREE WAYS</span>
        <h3>{conceptName}</h3>
        <p className="dl-sub">The same idea, at the depth you need right now.</p>

        {loading && <div className="dl-state"><span className="spinner" /> Explaining it three ways…</div>}

        {!loading && error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}

        {!loading && !error && levels?.length > 0 && (
          <>
            <div className="dl-tabs" role="tablist" aria-label="Explanation depth">
              {levels.map((l, i) => (
                <button
                  key={l.key}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  className={'dl-tab' + (i === active ? ' on' : '')}
                  onClick={() => setActive(i)}
                >
                  <b>{l.label}</b>
                  <small>{l.hint}</small>
                </button>
              ))}
            </div>
            <div className="dl-body" key={current.key} role="tabpanel">
              {current.text}
            </div>
          </>
        )}
      </section>
    </div>,
    document.body
  );
}
