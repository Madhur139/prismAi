/*
  ASK FOR HELP
  - The learner is stuck on a question. They post it (with a photo if they
    have one) to the community board, and somebody else answers.
  - The game keeps polling while the round is live, so the answer can come
    straight back to the question that caused it.

  The question text and the correct answer both come from the server (it
  reads the lesson), so nothing here can be tampered with.
*/
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { Icon } from './Icon.jsx';
import { Spinner } from './ui.jsx';

export function AskHelp({ open, onClose, game, conceptName, lessonId, conceptIndex, gameIndex, requestId, onPosted }) {
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null), [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (open) { setNote(''); setFile(null); setPreview(''); setError(''); } }, [open]);

  if (!open) return null;

  const pick = f => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Only pictures can be attached.');
    if (f.size > 8 * 1024 * 1024) return setError('The picture must be 8MB or smaller.');
    setFile(f); setPreview(URL.createObjectURL(f)); setError('');
  };

  const post = async () => {
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      if (lessonId) fd.append('lessonId', lessonId);
      if (conceptIndex !== undefined && conceptIndex !== null) fd.append('conceptIndex', String(conceptIndex));
      if (gameIndex !== undefined && gameIndex !== null) fd.append('gameIndex', String(gameIndex));
      if (conceptName) fd.append('conceptName', conceptName);
      if (game?.type) fd.append('gameType', game.type);
      if (note.trim()) fd.append('note', note.trim());
      if (file) fd.append('image', file);
      const d = await api('/help', { method: 'POST', body: fd });
      onPosted?.(d.request);
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return createPortal(
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}>
      <section className="ask-help" role="dialog" aria-modal="true" aria-label="Ask for help">
        <button className="icon-btn ask-x" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>

        <span className="eyebrow">STUCK?</span>
        <h3>Ask the community</h3>
        <p className="ask-sub">Post this question and any learner can answer it. You will get the answer right here in your game.</p>

        <div className="ask-question">
          <span className="soft-tag">{conceptName || 'Your question'}</span>
          <p>{game?.prompt || 'Your question'}</p>
        </div>

        <label className="ask-drop" role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept="image/*" onChange={e => pick(e.target.files?.[0])} hidden />
          {preview ? <img src={preview} alt="Attached" /> : <div className="dz-ico"><Icon name="camera" size={22} /></div>}
          <span>{preview ? 'Picture attached' : 'Add a picture (optional)'}</span>
        </label>

        <textarea value={note} onChange={e => setNote(e.target.value)} rows="2" maxLength={400} placeholder="What have you tried? (optional)" aria-label="Your note" />

        {error && <div className="alert error"><Icon name="alert" size={17} /><span>{error}</span></div>}

        <div className="ask-actions">
          <button className="btn primary" disabled={busy} onClick={post}>{busy ? <><Spinner /> Posting…</> : <><Icon name="send" size={17} /> Post my question</>}</button>
          <button className="btn ghost" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
        <p className="ask-note">A question that gets an answer from somebody else earns no XP — but the helper does.</p>
      </section>
    </div>,
    document.body
  );
}
