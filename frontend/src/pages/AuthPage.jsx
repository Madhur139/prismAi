/*
  AUTH PAGE - login + register. Talks to POST /api/auth/login and /api/auth/register.
*/
import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Field, Logo, ServerChip, Spinner, ThemeToggle } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { PrismArt } from '../components/PrismArt.jsx';
import { go } from '../utils/router.js';

export function Auth({ onLogin, startMode, onBack }) {
  const [mode, setMode] = useState(startMode || 'login'), [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [teacher, setTeacher] = useState(false);
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const switchMode = m => { setMode(m); setError(''); go('/' + m); };
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const payload = mode === 'register' ? { name: name.trim(), email: email.trim(), password, role: teacher ? 'teacher' : 'student' } : { email: email.trim(), password };
      const d = await api(`/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      localStorage.setItem('prism_token', d.token); localStorage.setItem('prism_user', JSON.stringify(d.user)); onLogin(d.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth">
      <div className="auth-art">
        <Logo size={36} />
        <PrismArt className="auth-prism" />
        <div className="auth-copy"><span className="eyebrow">AI MICRO-LEARNING</span><h1>Turn study time into something you actually want to play.</h1><p>Generate lessons, practice with adaptive games, and build momentum one round at a time.</p></div>
        <div className="auth-chips"><span><Icon name="sparkles" size={15} /> AI lessons</span><span><Icon name="gamepad" size={15} /> Game practice</span><span><Icon name="bolt" size={15} /> XP + streaks</span></div>
      </div>
      <div className="auth-panel">
        <div className="auth-top"><button type="button" className="back-btn" onClick={onBack}><Icon name="arrow-left" size={17} /> Back</button><ThemeToggle /></div>
        <div className="auth-card">
          <div className="auth-mobile-logo"><Logo size={32} /></div>
          <div className="tabs" role="tablist" aria-label="Log in or create an account">
            <span className="tabs-ind" style={{ transform: `translateX(${mode === 'register' ? 100 : 0}%)` }} />
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Log in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Create account</button>
          </div>
          <h2>{mode === 'login' ? 'Welcome back.' : 'Start learning differently.'}</h2>
          <p className="muted">{mode === 'login' ? 'Continue where you left off.' : 'Your first lesson is a few clicks away.'}</p>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" required /></Field>}
            <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></Field>
            <Field label="Password"><div className="pw"><input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" required /><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></Field>
            {mode === 'register' && (
              <label className="teacher-check">
                <input type="checkbox" checked={teacher} onChange={e => setTeacher(e.target.checked)} />
                <span><b>I am a teacher</b><small>Unlocks the classroom: a class code, your students and homework you can set.</small></span>
              </label>
            )}
            {error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}
            <button className="btn primary lg full" disabled={busy}>{busy ? <><Spinner /> Connecting…</> : mode === 'login' ? 'Enter Prism' : 'Create my account'}</button>
          </form>
          <ServerChip />
          <div className="auth-foot"><Icon name="lock" size={14} /> Private workspace · your content stays tied to your account</div>
        </div>
      </div>
    </div>
  );
}
