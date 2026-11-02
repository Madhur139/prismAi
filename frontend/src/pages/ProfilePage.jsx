/*
  PROFILE PAGE - name + avatar editing, level, real achievements and per-game accuracy.
  The avatar is stored in the browser (localStorage) so it persists after refresh.
*/
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Field, Modal, Panel } from '../components/ui.jsx';
import { WeeklyReport } from '../components/WeeklyReport.jsx';
import { GAME_META } from '../constants/games.js';
import { avatarFor, countToday, initial } from '../utils/helpers.js';
import { useReveal } from '../utils/reveal.js';

const LEVEL_XP = 250;

/* Remembers which badges have already been announced, so a badge is only ever
   celebrated once. */
const BADGE_STORE = 'prism_badges_seen';

export function Profile({ user, progress, lessons = [], onUserChange, notify }) {
  useReveal();
  const xp = progress?.totalXP || 0, streak = progress?.streakCount || 0, attempts = progress?.recentAttempts || [], accuracy = progress?.accuracy;
  const level = Math.floor(xp / LEVEL_XP) + 1, into = xp % LEVEL_XP;
  const [editing, setEditing] = useState(false), [name, setName] = useState(user?.name || ''), [busy, setBusy] = useState(false), avatarRef = useRef(null);

  const pickAvatar = e => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('image/')) return notify?.('Choose a PNG, JPG, WEBP, or GIF image.', 'error');
    if (f.size > 2 * 1024 * 1024) return notify?.('Profile image must be 2MB or smaller.', 'error');
    const r = new FileReader(); r.onload = () => { onUserChange?.({ ...user, avatar: String(r.result || '') }); notify?.('Profile image updated.', 'success'); }; r.readAsDataURL(f);
  };
  const removeAvatar = () => { onUserChange?.({ ...user, avatar: '' }); notify?.('Profile image removed.', 'success'); };
  const save = async () => {
    if (!name.trim()) return; setBusy(true);
    try { const d = await api('/auth/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) }); onUserChange?.({ ...d.user, avatar: user?.avatar || '' }); setEditing(false); notify?.('Profile updated.', 'success'); }
    catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };

  const badges = [
    { icon: 'play', title: 'First steps', text: 'Play your first round', ok: attempts.length > 0 },
    { icon: 'bolt', title: 'Century', text: 'Earn 100 XP', ok: xp >= 100 },
    { icon: 'flame', title: 'On a roll', text: '3-day streak', ok: streak >= 3 },
    { icon: 'trophy', title: 'Week warrior', text: '7-day streak', ok: streak >= 7 },
    { icon: 'book', title: 'Curator', text: 'Create 3 lessons', ok: lessons.length >= 3 },
    { icon: 'target', title: 'Sharp mind', text: '80%+ accuracy', ok: accuracy != null && accuracy >= 80 && attempts.length >= 10 },
  ];
  const skills = useMemo(() => {
    const by = {}; attempts.forEach(a => { if (!a.gameType) return; const x = by[a.gameType] || (by[a.gameType] = { ok: 0, n: 0 }); x.n++; if (a.correct) x.ok++; });
    return Object.entries(by).map(([t, v]) => ({ t, pct: Math.round(v.ok / v.n * 100), n: v.n })).sort((a, b) => b.n - a.n);
  }, [attempts]);

  /* Celebrate badges that were earned since the last visit. */
  const unlockedKey = badges.filter(b => b.ok).map(b => b.title).sort().join('|');
  useEffect(() => {
    const unlocked = unlockedKey ? unlockedKey.split('|') : [];
    let store = { init: false, titles: [] };
    try { store = JSON.parse(localStorage.getItem(BADGE_STORE) || 'null') || store; } catch { /* ignore */ }
    if (!store.init) {
      try { localStorage.setItem(BADGE_STORE, JSON.stringify({ init: true, titles: unlocked })); } catch { /* ignore */ }
      return;
    }
    const fresh = unlocked.filter(t => !store.titles.includes(t));
    try { localStorage.setItem(BADGE_STORE, JSON.stringify({ init: true, titles: unlocked })); } catch { /* ignore */ }
    if (!fresh.length) return;
    notify?.(fresh.length === 1 ? `Badge unlocked — ${fresh[0]}!` : `${fresh.length} new badges unlocked!`, 'success');
  }, [unlockedKey, notify]);

  return (
    <div className="page profile">
      <section className="profile-hero">
        <div className="profile-cover" aria-hidden="true" />
        <div className="profile-id">
          <div className="avatar-xl-wrap">
            <button className="avatar xl" onClick={() => avatarRef.current?.click()} title="Change profile image">{avatarFor(user) ? <img src={avatarFor(user)} alt="Profile" /> : initial(user?.name)}<span className="avatar-edit"><Icon name="camera" size={20} /></span></button>
            <input ref={avatarRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickAvatar} hidden />
          </div>
          <div className="profile-name"><h2>{user?.name || 'Learner'}</h2><p>{user?.email}</p>{avatarFor(user) && <button className="link-btn" onClick={removeAvatar}>Remove photo</button>}</div>
          <button className="btn primary" onClick={() => { setName(user?.name || ''); setEditing(true); }}><Icon name="pencil" size={16} /> Edit profile</button>
        </div>
        <div className="level-card"><div className="level-row"><b>Level {level}</b><span>{into} / {LEVEL_XP} XP to level {level + 1}</span></div><div className="bar big"><i style={{ width: `${into / LEVEL_XP * 100}%` }} /></div></div>
      </section>

      <div className="stat-grid" data-reveal="" style={{ '--d': '.06s' }}>
        <div className="mini-stat"><b>{xp.toLocaleString()}</b><span>Total XP</span></div>
        <div className="mini-stat"><b>{streak}</b><span>Day streak</span></div>
        <div className="mini-stat"><b>{lessons.length}</b><span>Lessons</span></div>
        <div className="mini-stat"><b>{Math.min(100, Math.round(countToday(attempts) / 10 * 100))}%</b><span>Daily goal</span></div>
      </div>

      <div data-reveal="" style={{ '--d': '.18s' }}>
        <WeeklyReport user={user} />
      </div>

      <div className="two-col" data-reveal="" style={{ '--d': '.12s' }}>
        <Panel title="Achievements" subtitle={`${badges.filter(b => b.ok).length} of ${badges.length} unlocked`}>
          <div className="badges">{badges.map(b => <div key={b.title} className={`badge ${b.ok ? 'on' : ''}`}><span><Icon name={b.icon} size={22} /></span><b>{b.title}</b><small>{b.text}</small></div>)}</div>
        </Panel>
        <Panel title="Game skills" subtitle="Accuracy by game type">
          {skills.length ? <div className="skills">{skills.map(s => <div className="skill" key={s.t}><div className="mc-row"><span>{GAME_META[s.t]?.label || s.t}</span><b>{s.pct}%</b></div><div className="bar"><i style={{ width: s.pct + '%', background: GAME_META[s.t]?.color }} /></div></div>)}</div>
            : <p className="muted pad">Play a few rounds and your strengths will show up here.</p>}
        </Panel>
      </div>

      {editing && <Modal eyebrow="LEARNER PROFILE" title="Edit profile" onClose={() => setEditing(false)}>
        <Field label="Display name"><input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus maxLength={80} /></Field>
        <div className="modal-actions"><button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button><button className="btn primary" disabled={busy || !name.trim()} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </Modal>}
    </div>
  );
}
