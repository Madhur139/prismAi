/*
  PRISM AI - Clean AI Chat Interface
  Streaming responses, modern minimal styling
*/
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Spinner } from '../components/ui.jsx';
import { useReveal } from '../utils/reveal.js';
import { go } from '../utils/router.js';

const KNOWLEDGE = [
  { k: ['array', 'arrays'], a: 'Arrays store ordered collections of values. Add with **push()**, remove from the end with **pop()**, and loop with **forEach()** or **map()**.\n```js\nconst fruits = ["apple", "mango"];\nfruits.push("banana");\n```' },
  { k: ['function', 'functions'], a: 'A function is a reusable block of code. It can take parameters and return a value.\n```js\nfunction add(a, b) { return a + b; }\n```' },
  { k: ['dom'], a: 'The **DOM** is the browser’s live model of a page. JavaScript can select elements, change text and classes, and react to events.' },
  { k: ['flex', 'flexbox'], a: '**Flexbox** lays items out along a row or column and makes alignment easy.\n```css\n.row { display: flex; gap: 16px; align-items: center; }\n```' },
];
const SUGGEST = ['What are JavaScript arrays?', 'Explain map() simply', 'How does the DOM work?', 'What is the latest React version?'];

function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
    p.length > 4 && p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p.length > 2 && p.startsWith('`') && p.endsWith('`') ? <code key={i}>{p.slice(1, -1)}</code>
        : <React.Fragment key={i}>{p}</React.Fragment>);
}

function RichText({ text, streaming = false }) {
  const blocks = [];
  String(text || '').split('```').forEach((block, i) => {
    if (i % 2 === 1) {
      blocks.push(<pre key={`c${i}`}><code>{block.replace(/^[a-z0-9+#-]*\n/i, '').trim()}</code></pre>);
    } else {
      const out = [];
      let list = null;
      block.split('\n').forEach(ln => {
        const t = ln.trim();
        const li = t.match(/^([-*•]|\d+[.)])\s+(.*)$/);
        const h = t.match(/^#{1,4}\s+(.*)$/);
        if (li) {
          const ordered = /^\d/.test(li[1]);
          if (!list || list.ordered !== ordered) { list = { ordered, items: [] }; out.push(list); }
          list.items.push(li[2]);
        } else {
          list = null;
          if (h) out.push({ h: h[1] });
          else if (t) out.push({ p: t });
        }
      });
      out.forEach((o, k) => {
        const key = `b${i}-${k}`;
        if (o.items) {
          blocks.push(o.ordered ? (
            <ol key={key}>{o.items.map((x, n) => <li key={n}><Inline text={x} /></li>)}</ol>
          ) : (
            <ul key={key}>{o.items.map((x, n) => <li key={n}><Inline text={x} /></li>)}</ul>
          ));
        } else if (o.h) {
          blocks.push(<h4 key={key}><Inline text={o.h} /></h4>);
        } else {
          blocks.push(<p key={key}><Inline text={o.p} /></p>);
        }
      });
    }
  });
  return (
    <div className="rich">
      {blocks}
      {streaming && <span className="streaming-cursor" />}
    </div>
  );
}

export function AISearch({ lessons = [], notify }) {
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const scrollRef = useRef(null);
  useReveal();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy, streamingId]);

  const related = useMemo(() => {
    const last = [...msgs].reverse().find(m => m.role === 'user')?.text.toLowerCase();
    if (!last) return [];
    return lessons.filter(l => last.split(/\s+/).some(w => w.length > 3 && l.topic.toLowerCase().includes(w))).slice(0, 3);
  }, [msgs, lessons]);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const ask = useCallback(async (text) => {
    const query = (text ?? q).trim();
    if (!query || busy) return;
    setQ('');
    setBusy(true);

    const userId = Date.now();
    setMsgs(m => [...m, { id: userId, role: 'user', text: query, time: now() }]);

    const aiId = Date.now() + 1;
    setStreamingId(aiId);
    setMsgs(m => [...m, { id: aiId, role: 'ai', text: '', time: now(), streaming: true, query }]);

    try {
      const d = await api('/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const fullText = d.answer || d.result || d.message || 'No answer returned.';
      const sources = d.sources || [];

      let displayed = '';
      const chunkSize = 3;
      for (let i = 0; i < fullText.length; i += chunkSize) {
        displayed = fullText.slice(0, i + chunkSize);
        setMsgs(m => m.map(msg => msg.id === aiId ? { ...msg, text: displayed } : msg));
        await new Promise(r => setTimeout(r, 12));
      }

      setMsgs(m => m.map(msg => msg.id === aiId
        ? { ...msg, text: fullText, sources, streaming: false }
        : msg));
      setStreamingId(null);
    } catch (err) {
      const hit = KNOWLEDGE.find(x => x.k.some(k => query.toLowerCase().includes(k)));
      const fallback = hit ? hit.a : `I couldn’t reach the AI service. ${err.message}`;
      setMsgs(m => m.map(msg => msg.id === aiId
        ? { ...msg, text: fallback, sources: [], offline: true, error: !hit, streaming: false }
        : msg));
      setStreamingId(null);
      notify?.(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }, [q, busy]);

  const makeLesson = topic => { try { sessionStorage.setItem('prism_prefill_topic', (topic || '').slice(0, 500)); } catch { } go('/app/create'); };
  const copy = async t => { try { await navigator.clipboard.writeText(t); notify?.('Copied to clipboard.', 'success'); } catch { notify?.('Couldn’t copy.', 'error'); } };
  const clearChat = () => { setMsgs([]); setStreamingId(null); };

  return (
    <section className="ai">
      <div className="ai-scroll" ref={scrollRef}>
        {!msgs.length && (
          <div className="ai-welcome" data-reveal="">
            <div className="ai-core">
              <Icon name="sparkles" size={28} />
            </div>
            <h2>Ask Prism AI</h2>
            <p>Ask anything — get answers with sources and explanations.</p>
            <div className="suggestions center">{SUGGEST.map(x => (
              <button key={x} onClick={() => ask(x)}>{x}</button>
            ))}</div>
            <button className="btn ghost" onClick={clearChat} style={{ marginTop: 10 }}>
              <Icon name="trash" size={15} /> Clear chat
            </button>
          </div>
        )}
        {msgs.map(m => m.role === 'user'
          ? <div className="msg user" key={m.id}>
              <div className="bubble">{m.text}</div>
              <div className="bubble-head"><small>{m.time}</small></div>
            </div>
          : (
            <div className="msg ai" key={m.id}>
              <div className="msg-avatar"><Icon name="sparkles" size={18} /></div>
              <div className={`bubble ${m.error ? 'err' : ''}`}>
                <div className="bubble-head"><b>Prism AI</b><small>{m.offline ? 'Offline' : 'Online'} · {m.time}</small></div>
                {m.streaming ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <RichText text={m.text} streaming />
                  </div>
                ) : (
                  <RichText text={m.text} />
                )}
                {m.sources?.length > 0 && <div className="sources"><h5><Icon name="globe" size={15} /> Sources</h5>{m.sources.map((s, i) => (
                  <a key={s.url || i} href={s.url} target="_blank" rel="noreferrer"><b>{i + 1}. {s.title}</b>{s.snippet && <span>{s.snippet}</span>}</a>
                ))}</div>}
                {!m.error && <div className="bubble-actions"><button onClick={() => copy(m.text)}><Icon name="copy" size={15} /> Copy</button><button onClick={() => makeLesson(m.query)}><Icon name="plus" size={15} /> Save to lesson</button></div>}
              </div>
            </div>
          ))}
        {busy && !streamingId && <div className="msg ai"><div className="msg-avatar"><Icon name="sparkles" size={18} /></div><div className="bubble typing"><span className="think-dot"></span><span className="think-dot"></span><span className="think-dot"></span></div></div>}
        {related.length > 0 && !busy && <div className="related"><span>Related</span>{related.map(l => (
          <a key={l._id} href={'#/app/lesson/' + l._id}><Icon name="book" size={15} />{l.topic}</a>
        ))}</div>}
      </div>
      <form className="ai-input" onSubmit={e => { e.preventDefault(); ask(); }}>
        <Icon name="search" size={19} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ask anything…" aria-label="Ask Prism AI" />
        <button className="btn primary" disabled={busy || !q.trim()}>{busy ? <Spinner /> : <><span className="hide-sm">Ask</span><Icon name="send" size={17} /></>}</button>
      </form>
    </section>
  );
}
