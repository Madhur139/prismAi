/*
  SETTINGS PAGE - theme, sounds, reminders and account. Saved through utils/settings.js.
*/
import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Field, Modal, ServerChip, Toggle, Segmented } from '../components/ui.jsx';
import { readSettings, saveSettings } from '../utils/settings.js';
import { avatarFor, initial } from '../utils/helpers.js';

export function Settings({ user, onUserChange, onLogout, notify }) {
  const [settings, setSettings] = useState(readSettings), [editing, setEditing] = useState(false), [name, setName] = useState(user?.name || ''), [busy, setBusy] = useState(false);
  const isTeacher = user?.role === 'teacher';
  const update = patch => { const next = saveSettings({ ...settings, ...patch }); setSettings(next); notify?.('Preference saved.', 'success'); };
  const saveProfile = async () => {
    if (!name.trim()) return; setBusy(true);
    try { const d = await api('/auth/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) }); onUserChange?.({ ...d.user, avatar: user?.avatar || '' }); setEditing(false); notify?.('Profile updated.', 'success'); }
    catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };
  /* Teacher mode: switch the role on the server and keep the app in sync. */
  const toggleTeacher = async () => {
    setBusy(true);
    const role = isTeacher ? 'student' : 'teacher';
    try {
      const d = await api('/auth/role', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
      onUserChange?.({ ...d.user, avatar: user?.avatar || '' });
      notify?.(role === 'teacher' ? 'Teacher mode on — open the Classroom tab.' : 'Teacher mode off.', 'success');
    } catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };
  const toggleDaily = async () => {
    const next = !settings.dailyReminders; update({ dailyReminders: next });
    if (next && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch {} }
  };
  return (
    <div className="page narrow settings">
      <div className="page-intro"><div><h2>Make Prism yours.</h2><p>Control how your learning space looks, sounds, and keeps you on track.</p></div></div>

      <section className="panel set-card">
        <h3>Account</h3>
        <div className="set-row"><div className="avatar">{avatarFor(user) ? <img src={avatarFor(user)} alt="" /> : initial(user?.name)}</div><div className="set-text"><b>{user?.name}</b><small>{user?.email}</small></div><button className="btn ghost" onClick={() => { setName(user?.name || ''); setEditing(true); }}>Edit</button></div>
      </section>

      <section className="panel set-card">
        <h3>Appearance</h3>
        <div className="theme-pick">
          {[[false, 'Light', 'sun'], [true, 'Dark', 'moon']].map(([d, l, ic]) => <button key={l} className={`theme-opt ${settings.darkMode === d ? 'on' : ''} ${d ? 'dark' : 'light'}`} onClick={() => update({ darkMode: d })}><span className="theme-prev"><i /><i /><i /></span><span className="theme-label"><Icon name={ic} size={16} /> {l}</span></button>)}
        </div>
        <div className="set-row">
          <div className="set-text">
            <b>Subject theme</b>
            <small>Colours the app differently depending on what you are studying.</small>
          </div>
          <Segmented options={[[ 'auto', 'Auto', '#7c6cff' ], [ 'math', 'Math', '#22c6e8' ], [ 'science', 'Science', '#10b981' ], [ 'language', 'Language', '#c05cf5' ], [ 'history', 'History', '#f97316' ]]} value={settings.subjectTheme} onChange={v => update({ subjectTheme: v })} label="Subject theme" />
          <div className="theme-chip" style={{ backgroundColor: settings.subjectTheme === 'auto' ? 'var(--brand)' : settings.subjectTheme === 'math' ? '#22c6e8' : settings.subjectTheme === 'science' ? '#10b981' : settings.subjectTheme === 'language' ? '#c05cf5' : '#f97316' }}></div>
        </div>
      </section>

      <section className="panel set-card">
        <h3>Accessibility</h3>
        <div className="set-row"><div className="set-text"><b>Readable font</b><small>Uses a wider, dyslexia-friendly typeface for longer texts.</small></div><Toggle on={settings.dyslexiaFont} onClick={() => update({ dyslexiaFont: !settings.dyslexiaFont })} label="Toggle readable font" /></div>
        <div className="set-row"><div className="set-text"><b>High contrast</b><small>Stronger borders and darker text everywhere.</small></div><Toggle on={settings.highContrast} onClick={() => update({ highContrast: !settings.highContrast })} label="Toggle high contrast" /></div>
        <div className="set-row"><div className="set-text"><b>Reduce motion</b><small>Turns off the confetti and slide animations.</small></div><Toggle on={settings.reduceMotion} onClick={() => update({ reduceMotion: !settings.reduceMotion })} label="Toggle reduce motion" /></div>
        <div className="set-row">
          <div className="set-text">
            <b>Voice mode</b>
            <small>{settings.voiceMode ? 'Questions are read out loud. You can answer by speaking.' : 'Read questions out loud and answer them by talking.'}</small>
          </div>
          <Toggle on={settings.voiceMode} onClick={() => update({ voiceMode: !settings.voiceMode })} label="Toggle voice mode" />
        </div>
      </section>

      <section className="panel set-card">
        <h3>Learning experience</h3>
        <div className="set-row"><div className="set-text"><b>Daily reminders</b><small>{settings.dailyReminders ? 'Reminders are enabled on this device.' : 'Daily reminders are off.'}</small></div><Toggle on={settings.dailyReminders} onClick={toggleDaily} label="Toggle daily reminders" /></div>
        <div className="set-row"><div className="set-text"><b>Game sounds</b><small>{settings.gameSounds ? 'Answer sounds are on.' : 'Game sounds are muted.'}</small></div><Toggle on={settings.gameSounds} onClick={() => update({ gameSounds: !settings.gameSounds })} label="Toggle game sounds" /></div>
        <div className="set-row"><div className="set-text"><b>Explain like I'm 5</b><small>AI answers use simpler words and shorter sentences.</small></div><Toggle on={settings.explainLike5} onClick={() => update({ explainLike5: !settings.explainLike5 })} label="Toggle explain like I'm 5" /></div>
      </section>

      <section className="panel set-card">
        <h3>Teaching</h3>
        <div className="set-row">
          <div className="set-text"><b>Teacher mode</b><small>{isTeacher ? 'You are a teacher — the classroom tab has your class code and students.' : 'Turn this on to get a class code, see your students and set them homework.'}</small></div>
          <Toggle on={isTeacher} onClick={toggleTeacher} label="Toggle teacher mode" />
        </div>
      </section>

      <section className="panel set-card">
        <h3>Connection</h3>
        <div className="set-row"><div className="set-text"><b>Backend status</b><small>Check that the Prism API is reachable.</small></div><ServerChip /></div>
      </section>

      <section className="panel set-card danger">
        <h3>Session</h3>
        <div className="set-row"><div className="set-text"><b>Sign out</b><small>Sign out of Prism on this device.</small></div><button className="btn ghost" onClick={onLogout}><Icon name="logout" size={17} /> Sign out</button></div>
      </section>

      {editing && <Modal eyebrow="ACCOUNT" title="Edit profile" onClose={() => setEditing(false)}>
        <Field label="Display name"><input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveProfile()} autoFocus maxLength={80} /></Field>
        <div className="modal-actions"><button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button><button className="btn primary" disabled={busy || !name.trim()} onClick={saveProfile}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </Modal>}
    </div>
  );
}
