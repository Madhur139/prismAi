/*
  COMMAND PALETTE
  - Press ⌘K (or Ctrl+K) to jump to a page, search your lessons or run an action.
  - Keyboard first: arrows to move, Enter to open, Escape to close.
  - `useCommandPalette` wires the global shortcut; the component only renders.
*/
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { go } from '../utils/router.js';

/* Static destinations offered by the palette. */
const PAGES = [
  { label: 'Overview', icon: 'home', path: '/app', hint: 'Your learning dashboard' },
  { label: 'Prism AI', icon: 'sparkles', path: '/app/ai', hint: 'Ask anything, get an explanation' },
  { label: 'Create lesson', icon: 'plus', path: '/app/create', hint: 'From a topic or a photo' },
  { label: 'My lessons', icon: 'book', path: '/app/lessons', hint: 'Everything you are learning' },
  { label: 'Write & AI check', icon: 'pencil', path: '/app/write', hint: 'Answer in your own words' },
  { label: 'Arcade', icon: 'gamepad', path: '/app/games', hint: 'Quick-play games' },
  { label: 'Profile', icon: 'user', path: '/app/profile', hint: 'Level, badges and skills' },
  { label: 'Settings', icon: 'settings', path: '/app/settings', hint: 'Theme, sounds and reminders' },
];

/** Opens the palette when ⌘K / Ctrl+K is pressed. */
export function useCommandPalette(onOpen) {
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpen]);
}

export function CommandPalette({ lessons = [], open, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ(''); setSel(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const items = PAGES
      .filter(p => !term || p.label.toLowerCase().includes(term) || p.hint.toLowerCase().includes(term))
      .map(p => ({ ...p, kind: 'page' }));
    if (term) {
      lessons
        .filter(l => (l.topic || '').toLowerCase().includes(term))
        .slice(0, 6)
        .forEach(l => items.push({ kind: 'lesson', label: l.topic, hint: 'Open this lesson', path: '/app/lesson/' + l._id, icon: 'book' }));
    }
    return items;
  }, [q, lessons]);

  useEffect(() => { if (sel >= results.length) setSel(0); }, [results.length, sel]);
  useEffect(() => { listRef.current?.querySelector('.cp-item.active')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  if (!open) return null;

  const pick = item => { onClose(); go(item.path); };

  const onKeyDown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[sel]) pick(results[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className="cp-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="cp" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cp-input">
          <Icon name="search" size={19} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page or search your lessons…"
            aria-label="Search commands"
          />
          <kbd>esc</kbd>
        </div>

        <div className="cp-list" ref={listRef}>
          {results.length ? results.map((r, i) => (
            <button key={r.kind + r.label} className={'cp-item' + (i === sel ? ' active' : '')} onMouseEnter={() => setSel(i)} onClick={() => pick(r)}>
              <span className="cp-ico"><Icon name={r.icon} size={17} /></span>
              <span className="cp-copy"><b>{r.label}</b><small>{r.hint}</small></span>
              <kbd>↵</kbd>
            </button>
          )) : <p className="cp-none">No matches for “{q}”.</p>}
        </div>

        <div className="cp-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
