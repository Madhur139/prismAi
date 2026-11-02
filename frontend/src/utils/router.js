/*
  SIMPLE CLIENT ROUTER (hash based)
  - Routes look like  #/app/lessons  or  #/play/lesson/<id>?cfg=...
  - useRoute() returns { path, query } and re-renders on back/forward.
  - Games live on their own /play/... pages, separate from the dashboard shell.
*/
import { useState, useEffect } from 'react';

function read() {
  const raw = window.location.hash.slice(1) || '/';
  const i = raw.indexOf('?');
  const path = (i === -1 ? raw : raw.slice(0, i)) || '/';
  const query = Object.fromEntries(new URLSearchParams(i === -1 ? '' : raw.slice(i + 1)));
  return { path, query };
}
export function useRoute() {
  const [r, setR] = useState(read);
  useEffect(() => { const f = () => setR(read()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return r;
}
export function useHash() { return useRoute().path; }
export function go(path) { if (window.location.hash !== '#' + path) window.location.hash = path; }

/** URL of the full-screen game page for a lesson. cfg = { mode, topics, types } */
export function playLessonUrl(id, cfg) { return `/play/lesson/${id}` + (cfg ? `?cfg=${encodeURIComponent(JSON.stringify(cfg))}` : ''); }
export function parseCfg(query) { try { return query?.cfg ? JSON.parse(query.cfg) : null; } catch { return null; } }

/** Full-screen "Write & Check" page. id = lesson id or 'free'. opts = { topic, concept, d (easy|medium|hard), n } */
export function writeUrl(id = 'free', opts = {}) {
  const p = new URLSearchParams();
  Object.entries(opts).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
  const q = p.toString();
  return `/play/write/${id}` + (q ? '?' + q : '');
}
