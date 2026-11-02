/*
  INVITE BELL
  - The bell in the top bar. It shows how many invitations are waiting for
    you and lets you accept or decline them without leaving the page.
*/
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { Icon } from './Icon.jsx';
import { Spinner } from './ui.jsx';
import { timeAgo } from '../utils/helpers.js';

const KIND_LABEL = { group: 'study group', lesson: 'lesson', class: 'class' };

export function InviteBell() {
  const [open, setOpen] = useState(false), [invites, setInvites] = useState([]), [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const box = useRef(null), panel = useRef(null);

  const load = async () => {
    try {
      const d = await api('/invites');
      setInvites(d.invitations || []);
    } catch { /* the bell is not important enough to shout about */ }
  };

  // Keep the count fresh.
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // Click anywhere else to close. The panel is portalled to <body>, so it is
  // NOT inside the bell - we have to check both boxes, or the panel closes
  // the moment you reach for the Accept button.
  useEffect(() => {
    if (!open) return;
    const f = e => {
      const inBell = box.current && box.current.contains(e.target);
      const inPanel = panel.current && panel.current.contains(e.target);
      if (!inBell && !inPanel) setOpen(false);
    };
    const k = e => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', f);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k); };
  }, [open]);

  const respond = async (inv, accept) => {
    setBusy(inv._id); setError('');
    try {
      await api(`/invites/${inv._id}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accept }) });
      setInvites(list => list.filter(i => i._id !== inv._id));
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const count = invites.length;

  return (
    <div className="invite-bell" ref={box}>
      <button className="icon-btn" onClick={() => { setOpen(o => !o); load(); }} aria-label={count ? `${count} invitations waiting` : 'Invitations'} title="Invitations">
        <Icon name="users" size={19} />
        {count > 0 && <span className="bell-count">{count}</span>}
      </button>

      {open && createPortal(
        <div className="invite-panel" role="dialog" aria-label="Invitations" ref={panel}>
          <div className="invite-panel-head">
            <b>Invitations</b>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" size={16} /></button>
          </div>

          {error && <div className="alert error"><Icon name="alert" size={16} /><span>{error}</span></div>}

          {invites.length ? (
            <div className="invite-list">
              {invites.map(i => (
                <div className="invite-item" key={i._id}>
                  <span className="invite-ico"><Icon name={i.kind === 'class' ? 'shield' : i.kind === 'lesson' ? 'book' : 'users'} size={16} /></span>
                  <div className="invite-copy">
                    <b>{i.fromName}</b> invited you to a {KIND_LABEL[i.kind] || 'group'}.
                    <strong>{i.targetName}</strong>
                    {i.message && <small>“{i.message}”</small>}
                    <em>{timeAgo(i.createdAt)}</em>
                  </div>
                  <div className="invite-actions">
                    <button className="btn primary sm" disabled={busy === i._id} onClick={() => respond(i, true)}>
                      {busy === i._id ? <Spinner /> : <><Icon name="check" size={14} stroke={3} /> Accept</>}
                    </button>
                    <button className="btn ghost sm" disabled={busy === i._id} onClick={() => respond(i, false)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="invite-empty">No invitations right now. When somebody invites you to a group, a lesson or a class, it shows up here.</p>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
