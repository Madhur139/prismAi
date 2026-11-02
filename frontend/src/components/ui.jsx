/*
  SHARED UI COMPONENTS
  - Logo, Field, Spinner, Empty, StatCard, Ring, Modal, Toast hook, ThemeToggle, covers and badges.
  - Shared controls: Toggle, Skeleton, IconButton, Segmented.
*/
import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/client.js';
import { Icon } from './Icon.jsx';
import { GAME_META, gameIcon } from '../constants/games.js';
import { coverFor, hideBrokenImage } from '../utils/coverImage.js';
import { readSettings, setTheme } from '../utils/settings.js';

export function Logo({ size = 30, text = true, className = '' }) {
  return <span className={'logo ' + className}><img src="/prism-logo.svg" width={size} height={size} alt="" />{text && <span className="logo-word">Prism<em>AI</em></span>}</span>;
}
export function Field({ label, hint, children }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Spinner() { return <span className="spinner" aria-hidden="true" />; }

/*
  SHARED CONTROLS
  - Toggle    : accessible on/off switch
  - Skeleton  : animated loading placeholder shaped like the content it replaces
  - IconButton: icon-only button that always carries an accessible name
  - Segmented : single-choice segmented control
*/

/** Accessible switch. `label` becomes the accessible name for screen readers. */
export function Toggle({ on, onClick, label }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={onClick}><i /></button>;
}

/** Loading placeholder. `variant` shapes it: 'line' | 'text' | 'card'. */
export function Skeleton({ variant = '', style, className = '' }) {
  return <div className={`skeleton ${variant} ${className}`} style={style} aria-hidden="true" />;
}

/** Icon-only button. A `label` is required so the control is never unnamed. */
export function IconButton({ icon, label, onClick, className = '', size = 19, ...rest }) {
  return <button type="button" className={`icon-btn ${className}`} onClick={onClick} aria-label={label} title={label} {...rest}><Icon name={icon} size={size} /></button>;
}

/** Single-choice segmented control. `options` is an array of [value, label] pairs. */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([k, l]) => <button key={k} type="button" className={value === k ? 'on' : ''} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}
export function Empty({ icon = 'sparkles', title, text, action, art }) {
  return (
    <div className="empty">
      {art
        ? <img className="empty-art" src={art} alt="" />
        : <div className="empty-ico"><Icon name={icon} size={26} /></div>}
      <b>{title}</b>{text && <span>{text}</span>}{action}
    </div>
  );
}
export function StatCard({ icon, label, value, detail, tone = 'violet' }) {
  return <div className={'stat ' + tone}><div className="stat-ico"><Icon name={icon} size={20} /></div><div className="stat-body"><span className="stat-label">{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></div>;
}
export function Panel({ title, subtitle, action, children, className = '' }) {
  return <section className={'panel ' + className}>{(title || action) && <div className="panel-head"><div><h3>{title}</h3>{subtitle && <span>{subtitle}</span>}</div>{action}</div>}{children}</section>;
}
export function Ring({ value = 0, size = 120, stroke = 10, label, children }) {
  const id = 'ring' + useId().replace(/\W/g, ''), r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.min(100, Math.max(0, value)) / 100);
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: 'var(--c1)' }} /><stop offset="1" style={{ stopColor: 'var(--c2)' }} /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}
export function Modal({ eyebrow, title, onClose, children }) {
  useEffect(() => { const f = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
  /*
    Rendered into <body> through a portal. The page wrapper animates with a
    transform, and a transformed ancestor becomes the containing block for
    position: fixed children - without the portal the modal would be placed
    against the page instead of the viewport.
  */
  return createPortal(
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-btn modal-x" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}<h3>{title}</h3>{children}
      </div>
    </div>,
    document.body
  );
}
export function useToast() {
  const [t, setT] = useState(null), timer = useRef();
  const notify = useCallback((message, type = 'info') => { setT({ message, type, id: Date.now() }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 4500); }, []);
  const node = t ? <div className={'toast ' + t.type} role="status" key={t.id}><Icon name={t.type === 'error' ? 'alert' : 'check'} size={18} /><span>{t.message}</span><button onClick={() => setT(null)} aria-label="Dismiss"><Icon name="x" size={15} /></button></div> : null;
  return [node, notify];
}
export function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(() => readSettings().darkMode);
  useEffect(() => { const f = e => setDark(e.detail.darkMode); window.addEventListener('prism:settings', f); return () => window.removeEventListener('prism:settings', f); }, []);
  return <button className={'icon-btn ' + className} onClick={() => setTheme(!dark)} aria-label="Toggle dark mode" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={19} /></button>;
}
export function ServerChip() {
  const [ok, setOk] = useState(null);
  useEffect(() => { let live = true; fetch(API + '/health').then(r => r.json()).then(d => live && setOk(d.db ? 'ok' : 'nodb')).catch(() => live && setOk('off')); return () => { live = false; }; }, []);
  const t = { ok: 'Server connected', nodb: 'Server up, database not connected', off: `Server unreachable at ${API}` }[ok] || 'Checking server…';
  return <div className={'server-chip ' + (ok || '')}><i />{t}</div>;
}
export function GameBadge({ type }) {
  const m = GAME_META[type] || { label: type, color: '#7c6cff' };
  return <span className="gbadge" style={{ '--c': m.color }}><Icon name={gameIcon(type)} size={14} />{m.label}</span>;
}
export function gradIndex(s = '') { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 6; }

/**
 * LESSON COVER
 * Image priority: the learner's own uploaded picture first, then a matching
 * photo for the topic, then the generated gradient (always the base layer,
 * so a missing file still looks intentional).
 */
export function LessonCover({ lesson, className = '' }) {
  const first = lesson.concepts?.[0]?.microGames?.[0]?.type;
  const photo = lesson.imageUrl || coverFor(lesson.topic);
  return (
    <div className={`cover g${gradIndex(lesson.topic)} ${className}`}>
      {photo
        ? <img src={photo} alt="" loading="lazy" decoding="async" onError={hideBrokenImage} />
        : <><i className="cover-blob" /><Icon name={gameIcon(first)} size={30} /></>}
    </div>
  );
}
