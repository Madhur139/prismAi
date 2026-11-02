/*
  GROUP CHAT
  - The conversation inside a study group.
  - New messages are polled every few seconds, the same way the duel and the
    classroom work.
*/
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { Icon } from './Icon.jsx';
import { Spinner } from './ui.jsx';

export function GroupChat({ groupId, me, wide = false }) {
  const [messages, setMessages] = useState([]), [text, setText] = useState(''), [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null), last = useRef('');

  const load = async (since) => {
    try {
      const d = await api(`/groups/${groupId}/messages${since ? `?since=${encodeURIComponent(since)}` : ''}`);
      const list = d.messages || [];
      if (!list.length) return;
      setMessages(m => [...m, ...list]);
      last.current = list[list.length - 1].at;
    } catch { /* the chat can wait */ }
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(last.current), 3000);
    return () => clearInterval(id);
  }, [groupId]);

  // Keep the newest message in view.
  useEffect(() => { if (end.current) end.current.scrollIntoView({ block: 'nearest' }); }, [messages.length]);

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true); setError('');
    try {
      const d = await api(`/groups/${groupId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: body }) });
      setMessages(m => [...m, d.message]);
      setText('');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className={'group-chat' + (wide ? ' wide' : '')}>
      <div className="chat-log">
        {messages.length ? messages.map((m, i) => (
          m.kind === 'system'
            ? <p className="chat-system" key={i}>{m.text}</p>
            : (
              <div className={`chat-line ${String(m.userId) === String(me?.id) ? 'mine' : ''}`} key={i}>
                <span className="chat-who">{m.userName}</span>
                <p>{m.text}</p>
              </div>
            )
        )) : <p className="chat-empty">No messages yet. Say hello to the people you work with.</p>}
        <div ref={end} />
      </div>

      {error && <div className="alert error"><Icon name="alert" size={16} /><span>{error}</span></div>}

      <form className="chat-input" onSubmit={send}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…" maxLength={1000} aria-label="Message" />
        <button className="btn primary" disabled={busy || !text.trim()} aria-label="Send message">
          {busy ? <Spinner /> : <Icon name="send" size={17} />}
        </button>
      </form>
    </div>
  );
}
