/*
  GROUP PAGE
  - One study group, on its own page: #/app/groups/<id>
  - Three tabs: who is in it, the chat, and studying together.
  - It used to live in a modal, which was far too small for a chat.
*/
import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Spinner } from '../components/ui.jsx';
import { GroupChat } from '../components/GroupChat.jsx';
import { StudyTogether } from '../components/StudyTogether.jsx';
import { go, playLessonUrl } from '../utils/router.js';

const TABS = [
  { key: 'members', icon: 'users', label: 'Members' },
  { key: 'chat', icon: 'send', label: 'Chat' },
  { key: 'study', icon: 'bolt', label: 'Study together' },
];

export function GroupPage({ id, user, lessons = [] }) {
  const [group, setGroup] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [tab, setTab] = useState('members');
  const [inviteOpen, setInviteOpen] = useState(false), [emails, setEmails] = useState(''), [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { const d = await api(`/groups/${id}`); setGroup(d.group); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const invite = async () => {
    const people = emails.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean);
    if (!people.length) return;
    setBusy(true); setError('');
    try {
      const d = await api(`/groups/${id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ people, message }) });
      if (d.skipped?.length) setError(`${d.skipped.length} skipped (already a member or already invited).`);
      setEmails(''); setMessage(''); setInviteOpen(false);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const shareLesson = async (lessonId) => {
    setBusy(true);
    try { const d = await api(`/groups/${id}/lessons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId }) }); setGroup(d.group); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const leave = async () => {
    if (!window.confirm('Leave this group?')) return;
    setBusy(true);
    try { await api(`/groups/${id}/leave`, { method: 'POST' }); go('/app/groups'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const removeMember = async (userId) => {
    setBusy(true);
    try { const d = await api(`/groups/${id}/members/${userId}`, { method: 'DELETE' }); setGroup(d.group); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const removeGroup = async () => {
    if (!window.confirm('Delete this group for everybody?')) return;
    setBusy(true);
    try { await api(`/groups/${id}`, { method: 'DELETE' }); go('/app/groups'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (loading) return <div className="page"><div className="skeleton text" /></div>;
  if (error && !group) return (
    <div className="page narrow">
      <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>
      <button className="btn ghost" onClick={() => go('/app/groups')}><Icon name="arrow-left" size={17} /> All groups</button>
    </div>
  );
  if (!group) return null;

  const isOwner = String(group.ownerId) === String(user?.id);

  return (
    <div className="page group-page">
      <button className="back-btn" onClick={() => go('/app/groups')}><Icon name="arrow-left" size={17} /> All groups</button>

      <section className="group-hero">
        <span className="group-hero-ico"><Icon name="users" size={24} /></span>
        <div className="group-hero-copy">
          <div className="lesson-kicker">
            <span className="soft-tag">{group.topic || 'Study group'}</span>
            <span>{group.members.length} member{group.members.length === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>{group.lessons.length} lesson{group.lessons.length === 1 ? '' : 's'}</span>
            {isOwner && <span className="soft-tag">you own this</span>}
          </div>
          <h2>{group.name}</h2>
          {group.description && <p>{group.description}</p>}
        </div>
        <div className="group-hero-actions">
          <button className="btn primary" onClick={() => setInviteOpen(true)}><Icon name="users" size={17} /> Invite people</button>
          {isOwner
            ? <button className="btn ghost" onClick={removeGroup}><Icon name="trash" size={17} /> Delete</button>
            : <button className="btn ghost" onClick={leave}>Leave group</button>}
        </div>
      </section>

      {error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}

      <div className="group-tabs big" role="tablist" aria-label="Group sections">
        {TABS.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={16} /> {t.label}
            {t.key === 'members' && <span className="tab-count">{group.members.length}</span>}
          </button>
        ))}
      </div>

      <div className="group-tab-body">
        {tab === 'chat' && <GroupChat groupId={group._id} me={user} wide />}
        {tab === 'study' && <StudyTogether groupId={group._id} me={user} />}

        {tab === 'members' && (
          <div className="group-two-col">
            <section className="panel">
              <h3>Members ({group.members.length})</h3>
              <div className="group-members">
                {group.members.map(m => (
                  <div className="group-member" key={m.userId}>
                    <span className="student-avatar">{(m.name || '?').charAt(0).toUpperCase()}</span>
                    <div><b>{m.name}</b><small>{m.role === 'owner' ? 'owner' : 'member'}</small></div>
                    {isOwner && m.role !== 'owner' && (
                      <button className="icon-btn" onClick={() => removeMember(m.userId)} title="Remove from the group" aria-label={`Remove ${m.name}`}>
                        <Icon name="x" size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <h3>Shared lessons ({group.lessons.length})</h3>
              {group.lessons.length ? (
                <div className="group-lessons-list">
                  {group.lessons.map(l => (
                    <div className="group-lesson" key={l.lessonId}>
                      <Icon name="book" size={15} />
                      <span>{l.name}</span>
                      <button className="btn ghost sm" onClick={() => go(playLessonUrl(l.lessonId))}><Icon name="play" size={13} /> Play</button>
                    </div>
                  ))}
                </div>
              ) : <p className="muted">No lessons shared yet. Share one and the group can study it together.</p>}

              {lessons.length > 0 && (
                <div className="group-share">
                  <span className="setup-label">Share one of your lessons</span>
                  <div className="chip-row">
                    {lessons.slice(0, 8).map(l => (
                      <button key={l._id} className="chip" onClick={() => shareLesson(l._id)}>
                        <Icon name="plus" size={13} />{l.topic.length > 24 ? l.topic.slice(0, 24) + '…' : l.topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {inviteOpen && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && setInviteOpen(false)}>
          <section className="ask-help" role="dialog" aria-modal="true" aria-label="Invite people">
            <button className="icon-btn ask-x" onClick={() => setInviteOpen(false)} aria-label="Close"><Icon name="x" size={20} /></button>
            <span className="eyebrow">INVITE</span>
            <h3>Who works with you on this?</h3>
            <p className="ask-sub">Enter email addresses, separated by commas. They will get an invitation and can accept or decline it.</p>
            <textarea value={emails} onChange={e => setEmails(e.target.value)} rows="3" placeholder="sam@example.com, alex@example.com" aria-label="Email addresses" />
            <input className="ask-title" value={message} onChange={e => setMessage(e.target.value)} maxLength={300} placeholder="A short message (optional)" aria-label="Message" />
            <div className="ask-actions">
              <button className="btn primary" disabled={busy || !emails.trim()} onClick={invite}>{busy ? <><Spinner /> Sending…</> : <><Icon name="send" size={17} /> Send invitations</>}</button>
              <button className="btn ghost" disabled={busy} onClick={() => setInviteOpen(false)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
