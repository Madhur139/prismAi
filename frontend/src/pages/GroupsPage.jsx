/*
  GROUPS PAGE
  - Your study groups. Make one, invite the people you work with, and share
    your lessons with them.
  - People join by invitation, so they can accept or decline.
  - Each group has its own page: #/app/groups/<id> (see GroupPage.jsx).
*/
import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Empty, Panel, Spinner } from '../components/ui.jsx';
import { go } from '../utils/router.js';

export function GroupsPage({ user, lessons = [] }) {
  const [groups, setGroups] = useState(null), [sent, setSent] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [making, setMaking] = useState(false), [form, setForm] = useState({ name: '', description: '', topic: '' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [g, s, i] = await Promise.all([api('/groups'), api('/invites/sent'), api('/invites')]);
      setGroups(g.groups || []);
      setSent(s.invitations || []);
      setInbox(i.invitations || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* Accept or decline an invitation (also available in the bell). */
  const respond = async (inv, accept) => {
    setBusy(true);
    try {
      await api(`/invites/${inv._id}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accept }) });
      setInbox(list => list.filter(i => i._id !== inv._id));
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const create = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const d = await api('/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setGroups(g => [d.group, ...(g || [])]);
      setForm({ name: '', description: '', topic: '' });
      setMaking(false);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const openGroup_ = async id => {
    setBusy(true);
    try { await api(`/groups/${id}`); go(`/app/groups/${id}`); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const isOwner = g => String(g.ownerId) === String(user?.id);

  return (
    <div className="page groups-page">
      <div className="page-intro">
        <div>
          <h2>Work on it together.</h2>
          <p>Make a group, invite the people you learn with, and share lessons. They accept or decline — nothing happens until they do.</p>
        </div>
        <button className="btn primary" onClick={() => setMaking(m => !m)}><Icon name="plus" size={18} /> New group</button>
      </div>

      {error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}

      {inbox.length > 0 && (
        <section className="panel groups-inbox">
          <h3>Waiting for you</h3>
          <p className="muted">Somebody invited you. Accept to join in, or decline.</p>
          {inbox.map(i => (
            <div className="invite-item" key={i._id}>
              <span className="invite-ico"><Icon name={i.kind === 'class' ? 'shield' : i.kind === 'lesson' ? 'book' : 'users'} size={16} /></span>
              <div className="invite-copy">
                <b>{i.fromName}</b> invited you to <strong>{i.targetName}</strong>
                {i.message && <small>“{i.message}”</small>}
              </div>
              <div className="invite-actions">
                <button className="btn primary sm" disabled={busy} onClick={() => respond(i, true)}><Icon name="check" size={14} stroke={3} /> Accept</button>
                <button className="btn ghost sm" disabled={busy} onClick={() => respond(i, false)}>Decline</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {making && (
        <section className="panel groups-make">
          <h3>New group</h3>
          <div className="groups-form">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Group name (e.g. Biology crew)" maxLength={80} aria-label="Group name" />
            <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Subject" maxLength={60} aria-label="Subject" />
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is the group for?" maxLength={300} aria-label="Description" />
            <button className="btn primary" disabled={busy || !form.name.trim()} onClick={create}>{busy ? <Spinner /> : 'Create group'}</button>
          </div>
        </section>
      )}

      {loading && <div className="skeleton text" />}

      {!loading && (
        <>
          <Panel title="Your groups" subtitle={groups?.length ? `${groups.length} group${groups.length === 1 ? '' : 's'}` : 'None yet'}>
            {groups?.length ? (
              <div className="group-list">
                {groups.map(g => (
                  <article className="group-card" key={g._id}>
                    <div className="group-head">
                      <span className="group-ico"><Icon name="users" size={18} /></span>
                      <div>
                        <b>{g.name}</b>
                        <small>{g.topic || g.description || 'Study group'} · {g.members.length} member{g.members.length === 1 ? '' : 's'}</small>
                      </div>
                      {isOwner(g) && <span className="soft-tag">owner</span>}
                    </div>
                    <div className="group-foot">
                      <span className="group-lessons"><Icon name="book" size={14} /> {g.lessons.length} lesson{g.lessons.length === 1 ? '' : 's'}</span>
                      <div className="row-gap">
                        <button className="btn primary sm" onClick={() => openGroup_(g._id)}><Icon name="users" size={14} /> Open</button>
                        <button className="btn ghost sm" onClick={() => go('/app/help')}>Ask together</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty icon="users" title="No groups yet" text="Make one and invite the people you study with."
                action={<button className="btn primary" onClick={() => setMaking(true)}>Create a group</button>} />
            )}
          </Panel>

          <Panel title="Invitations you sent" subtitle="Waiting for an answer">
            {sent.length ? (
              <div className="sent-list">
                {sent.map(i => (
                  <div className="sent-row" key={i._id}>
                    <span className={'sent-dot ' + i.status} />
                    <div>
                      <b>{i.toEmail}</b>
                      <small>{i.targetName} · {i.status === 'pending' ? 'waiting for a reply' : i.status}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="muted pad">You have not invited anybody yet.</p>}
          </Panel>
        </>
      )}

    </div>
  );
}
