/*
  HELP BOARD
  - The global board: every question somebody got stuck on.
  - Anybody can answer. The server checks the answer, so the right one is
    marked and the wrong ones are not.
  - The person who asked can accept the answer that helped.
*/
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Empty, Panel, Spinner } from '../components/ui.jsx';
import { GAME_META } from '../constants/games.js';
import { timeAgo } from '../utils/helpers.js';
import { go } from '../utils/router.js';

export function HelpPage({ user }) {
  const [tab, setTab] = useState('board');
  const isTeacher = user?.role === 'teacher';
  const [requests, setRequests] = useState(null), [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [open, setOpen] = useState(null); // the question being answered
  const [text, setText] = useState(''), [file, setFile] = useState(null), [busy, setBusy] = useState(false);
  const [askOpen, setAskOpen] = useState(false), [title, setTitle] = useState(''), [note, setNote] = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [b, m] = await Promise.all([api('/help?limit=40'), api('/help/mine')]);
      setRequests(b.requests || []);
      setMine(m.requests || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('text', text.trim());
      if (file) fd.append('image', file);
      const d = await api(`/help/${open._id}/answer`, { method: 'POST', body: fd });
      setOpen(d.request);
      setText(''); setFile(null);
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const accept = async (r, a) => {
    try {
      const d = await api(`/help/${r._id}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id }) });
      setOpen(d.request);
      load();
    } catch (e) { setError(e.message); }
  };

  /* Remove a question for good (the asker, or a teacher). */
  const remove = async (r) => {
    if (!window.confirm('Remove this question and its picture?')) return;
    setBusy(true);
    try {
      await api(`/help/${r._id}`, { method: 'DELETE' });
      if (open && open._id === r._id) setOpen(null);
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const ask = async () => {
    if (!title.trim()) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      if (note.trim()) fd.append('note', note.trim());
      if (file) fd.append('image', file);
      await api('/help', { method: 'POST', body: fd });
      setAskOpen(false); setTitle(''); setNote(''); setFile(null);
      setTab('mine');
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const pick = f => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Only pictures can be attached.');
    if (f.size > 8 * 1024 * 1024) return setError('The picture must be 8MB or smaller.');
    setFile(f); setError('');
  };

  // A preview of the attached picture, so it is obvious what was added.
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const card = (r, isMine = false) => {
    const meta = GAME_META[r.gameType] || {};
    const good = (r.answers || []).filter(a => a.correct);
    return (
      <article className={`help-card ${r.status === 'solved' ? 'solved' : ''}`} key={r._id}>
        <div className="help-card-head">
          <span className="help-asker">{r.askerName}</span>
          {r.conceptName && <span className="soft-tag">{r.conceptName}</span>}
          {r.gameType && <span className="gbadge" style={{ '--c': meta.color || '#7c6cff' }}><Icon name={meta.icon || 'sparkles'} size={13} />{meta.label || r.gameType}</span>}
          <span className="help-time">{timeAgo(r.createdAt)}</span>
          {(r.mine || isTeacher) && (
            <button className="icon-btn help-del" onClick={() => remove(r)} title="Remove this question" aria-label="Remove this question">
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>
        <h4 className="help-title">{r.title || r.prompt}</h4>
        {r.prompt && r.prompt !== r.title && <p className="help-prompt">{r.prompt}</p>}
        {r.note && <p className="help-note"><Icon name="pencil" size={13} /> {r.note}</p>}
        {r.imageUrl && <img className="help-img" src={r.imageUrl} alt="The question" loading="lazy" />}
        <div className="help-foot">
          <span className="help-count"><Icon name="users" size={14} /> {r.answerCount || 0} answer{(r.answerCount || 0) === 1 ? '' : 's'}{good.length ? ' · one is right' : ''}</span>
          <div className="row-gap">
            {r.status === 'solved'
              ? <span className="help-done"><Icon name="check" size={14} stroke={3} /> Solved</span>
              : <button className="btn primary sm" onClick={() => { setOpen(r); setText(''); }}><Icon name="pencil" size={14} /> I can help</button>}
            {isMine && r.status === 'open' && <button className="btn ghost sm" onClick={() => api(`/help/${r._id}/close`, { method: 'POST' }).then(load)}>Close</button>}
          </div>
        </div>

        {(r.answers || []).length > 0 && (
          <div className="help-answers">
            {(r.answers || []).map((a, i) => (
              <div className={`help-answer-row ${a.correct ? 'right' : ''} ${a.accepted ? 'accepted' : ''}`} key={i}>
                <div className="help-answer-who"><b>{a.userName}</b>{a.correct && <span className="help-ok"><Icon name="check" size={12} stroke={3} /> correct</span>}{a.accepted && <span className="help-picked">accepted</span>}</div>
                <p>{a.text}</p>
                {a.imageUrl && <img className="help-img small" src={a.imageUrl} alt="Their working" loading="lazy" />}
                {isMine && a.correct && !a.accepted && r.status === 'open' && (
                  <button className="link-btn" onClick={() => accept(r, a)}>Accept this answer</button>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="page help-page">
      <div className="page-intro">
        <div>
          <h2>Help board.</h2>
          <p>Stuck on something? Post it. Another learner might know the answer — and you will earn XP for helping them.</p>
        </div>
        <button className="btn primary" onClick={() => setAskOpen(true)}><Icon name="plus" size={18} /> Ask a question</button>
      </div>

      <div className="review-tabs" role="tablist" aria-label="Help board sections">
        <button type="button" role="tab" aria-selected={tab === 'board'} className={'review-tab' + (tab === 'board' ? ' on' : '')} onClick={() => setTab('board')}>
          <Icon name="globe" size={17} /><b>All questions</b><span className="review-count">{(requests || []).filter(r => r.status === 'open').length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'mine'} className={'review-tab' + (tab === 'mine' ? ' on' : '')} onClick={() => setTab('mine')}>
          <Icon name="user" size={17} /><b>My questions</b><span className="review-count">{mine.length}</span>
        </button>
      </div>

      {error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}
      {loading && <div className="skeleton text" />}

      {!loading && tab === 'board' && (
        requests?.length ? <div className="help-list">{requests.map(r => card(r))}</div>
          : <Empty icon="check" title="Nothing to help with right now" text="When somebody gets stuck, their question shows up here." />
      )}

      {!loading && tab === 'mine' && (
        mine.length ? <div className="help-list">{mine.map(r => card(r, true))}</div>
          : <Empty icon="users" title="You have not asked anything" text="If you get stuck in a game, tap “Stuck?” and the question goes here." action={<button className="btn primary" onClick={() => setAskOpen(true)}>Ask a question</button>} />
      )}

      {/* ---------- answer a question ---------- */}
      {open && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && setOpen(null)}>
          <section className="ask-help wide" role="dialog" aria-modal="true" aria-label="Answer this question">
            <button className="icon-btn ask-x" onClick={() => setOpen(null)} aria-label="Close"><Icon name="x" size={20} /></button>
            <span className="eyebrow">HELP THEM OUT</span>
            <h3>{open.title || open.prompt}</h3>
            {open.prompt && open.prompt !== open.title && <p className="ask-sub">{open.prompt}</p>}
            {open.note && <p className="help-note"><Icon name="pencil" size={13} /> {open.note}</p>}
            {open.imageUrl && <img className="help-img" src={open.imageUrl} alt="The question" />}
            <textarea value={text} onChange={e => setText(e.target.value)} rows="4" maxLength={1000} placeholder="Write your answer…" aria-label="Your answer" />
            <label className="ask-drop small" role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => pick(e.target.files?.[0])} hidden />
              {preview ? <img src={preview} alt="Attached" /> : <Icon name="camera" size={18} />}
              <span>{file ? file.name : 'Add your working (optional)'}</span>
            </label>
            {error && <div className="alert error"><Icon name="alert" size={17} /><span>{error}</span></div>}
            <div className="ask-actions">
              <button className="btn primary" disabled={busy || !text.trim()} onClick={send}>{busy ? <><Spinner /> Sending…</> : <><Icon name="send" size={17} /> Send my answer</>}</button>
              <button className="btn ghost" disabled={busy} onClick={() => setOpen(null)}>Cancel</button>
            </div>
            <p className="ask-note">If your answer is right, you get +20 XP and the person who asked sees it straight away.</p>
          </section>
        </div>
      )}

      {/* ---------- ask a question ---------- */}
      {askOpen && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && setAskOpen(false)}>
          <section className="ask-help" role="dialog" aria-modal="true" aria-label="Ask a question">
            <button className="icon-btn ask-x" onClick={() => setAskOpen(false)} aria-label="Close"><Icon name="x" size={20} /></button>
            <span className="eyebrow">ASK THE COMMUNITY</span>
            <h3>What are you stuck on?</h3>
            <p className="ask-sub">Write the question. Add a picture if you have one.</p>
            <input className="ask-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Your question" aria-label="Your question" />
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="3" maxLength={500} placeholder="Any extra detail (optional)" aria-label="Extra detail" />
            <label className="ask-drop small" role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => pick(e.target.files?.[0])} hidden />
              {preview ? <img src={preview} alt="Attached" /> : <Icon name="camera" size={18} />}
              <span>{file ? file.name : 'Add a picture (optional)'}</span>
            </label>
            {error && <div className="alert error"><Icon name="alert" size={17} /><span>{error}</span></div>}
            <div className="ask-actions">
              <button className="btn primary" disabled={busy || !title.trim()} onClick={ask}>{busy ? <><Spinner /> Posting…</> : <><Icon name="send" size={17} /> Post my question</>}</button>
              <button className="btn ghost" disabled={busy} onClick={() => setAskOpen(false)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
