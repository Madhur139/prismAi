/*
  CODE EDITOR - Syntax highlighted editor with perfect alignment.
  Dual-layer: highlighted HTML behind transparent textarea.
*/
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Icon } from './Icon.jsx';

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };

const KEYWORDS_JS = new Set([
  'const','let','var','function','return','if','else','for','while','do','switch',
  'case','break','continue','try','catch','throw','class','extends','import','export',
  'default','async','await','new','this','typeof','instanceof','in','of','void',
  'delete','debugger','true','false','null','undefined','super','yield'
]);

const KEYWORDS_PY = new Set([
  'def','class','if','else','elif','for','while','try','except','finally','with',
  'import','from','as','return','True','False','None','and','or','not','in','is',
  'lambda','yield','global','nonlocal','pass','break','continue','raise','assert',
  'del','async','await'
]);

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightJS(code) {
  let html = escapeHtml(code);
  html = html.replace(/\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g, m => `<span class="ide-token-comment">${escapeHtml(m)}</span>`);
  html = html.replace(/`[^`]*`/g, m => `<span class="ide-token-string">${escapeHtml(m)}</span>`);
  html = html.replace(/"[^"]*"|'[^']*'/g, m => `<span class="ide-token-string">${escapeHtml(m)}</span>`);
  html = html.replace(/\b\d+\.?\d*\b/g, m => `<span class="ide-token-number">${m}</span>`);
  html = html.replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|throw|class|extends|import|export|default|async|await|new|this|typeof|instanceof|true|false|null|undefined|super|yield)\b/g, m => `<span class="ide-token-keyword">${m}</span>`);
  html = html.replace(/\b(console|document|window|setTimeout|setInterval|parseInt|parseFloat|isNaN|Array|Object|String|Number|Boolean|Math|JSON)\b/g, m => `<span class="ide-token-builtin">${m}</span>`);
  return html;
}

function highlightPY(code) {
  let html = escapeHtml(code);
  html = html.replace(/#[^\n\r]*/g, m => `<span class="ide-token-comment">${escapeHtml(m)}</span>`);
  html = html.replace(/'''[\s\S]*?'''|"""[\s\S]*?"""/g, m => `<span class="ide-token-string">${escapeHtml(m)}</span>`);
  html = html.replace(/(f|r|u|b)?["'][^"']*["']/g, m => `<span class="ide-token-string">${escapeHtml(m)}</span>`);
  html = html.replace(/\b\d+\.?\d*\b/g, m => `<span class="ide-token-number">${m}</span>`);
  html = html.replace(/\b(def|class|if|else|elif|for|while|try|except|finally|with|import|from|as|return|True|False|None|and|or|not|in|is|lambda|yield|global|nonlocal|pass|break|continue|raise|assert|del|async|await)\b/g, m => `<span class="ide-token-keyword">${m}</span>`);
  html = html.replace(/\b(print|len|range|str|int|float|list|dict|set|tuple|open|sum|max|min|abs|round|sorted|reversed|enumerate|zip|map|filter|super|self|__init__|__name__)\b/g, m => `<span class="ide-token-builtin">${m}</span>`);
  return html;
}

function highlightHTML(code) {
  let html = escapeHtml(code);
  html = html.replace(/<!--[\s\S]*?-->/g, m => `<span class="ide-token-comment">${escapeHtml(m)}</span>`);
  html = html.replace(/<\/[\w:]+>|<[\w:]+(\s+[\w:_-]+(=["'][^"']*["'])?)*\s*\/?>|<[\w:]+/g, m => `<span class="ide-token-tag">${escapeHtml(m)}</span>`);
  html = html.replace(/(\s[\w:_-]+=)(["'][^"']*["'])/g, (m, attr, val) => `<span class="ide-token-attr">${escapeHtml(attr)}</span><span class="ide-token-string">${escapeHtml(val)}</span>`);
  return html;
}

function highlightCSS(code) {
  let html = escapeHtml(code);
  html = html.replace(/\/\*[\s\S]*?\*\//g, m => `<span class="ide-token-comment">${escapeHtml(m)}</span>`);
  html = html.replace(/"[^"]*"|'[^']*'/g, m => `<span class="ide-token-string">${escapeHtml(m)}</span>`);
  html = html.replace(/#[\da-fA-F]{3,6}\b/g, m => `<span class="ide-token-number">${m}</span>`);
  html = html.replace(/\b\d+\.?\d*(px|em|rem|%|s|ms)?\b/g, m => `<span class="ide-token-number">${m}</span>`);
  html = html.replace(/([.#][\w_-]+)/g, m => `<span class="ide-token-selector">${m}</span>`);
  html = html.replace(/([\w-]+)(\s*:)/g, (m, prop, colon) => `<span class="ide-token-property">${prop}</span>${colon}`);
  return html;
}

export function highlightCode(code, language) {
  if (!code) return '';
  switch (language) {
    case 'javascript': return highlightJS(code);
    case 'python': return highlightPY(code);
    case 'html': return highlightHTML(code);
    case 'css': return highlightCSS(code);
    default: return escapeHtml(code);
  }
}

/* ---------- Editor ---------- */
export function CodeEditor({ value, language, onChange, fontSize }) {
  const ref = useRef(null);
  const highlightRef = useRef(null);
  const [findReplace, setFindReplace] = useState({ open: false, query: '', replace: '', matches: [], index: -1 });
  const [wordWrap, setWordWrap] = useState(false);

  const lines = String(value || '').split('\n');
  const lineCount = lines.length;

  const syncHighlightScroll = useCallback(() => {
    if (!ref.current || !highlightRef.current) return;
    highlightRef.current.scrollTop = ref.current.scrollTop;
    highlightRef.current.scrollLeft = ref.current.scrollLeft;
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.addEventListener('scroll', syncHighlightScroll);
    return () => ref.current.removeEventListener('scroll', syncHighlightScroll);
  }, [syncHighlightScroll]);

  const handleKeyDown = (e) => {
    if (!ref.current) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const val = ref.current.value;
      const indent = '  ';
      ref.current.value = val.slice(0, start) + indent + val.slice(end);
      ref.current.selectionStart = ref.current.selectionEnd = start + indent.length;
      onChange(ref.current.value);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const val = ref.current.value;
      const before = val.slice(0, start);
      const after = val.slice(end);
      const lineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.slice(lineStart);
      const match = currentLine.match(/^(\s*)/);
      const indent = match ? match[1] : '';
      const increasedIndent = /\{|\:|\)\s*=>|for|while|if|else|function|class\s/.test(currentLine.trim()) ? '  ' : '';
      ref.current.value = before + '\n' + indent + increasedIndent + after;
      ref.current.selectionStart = ref.current.selectionEnd = start + 1 + indent.length + increasedIndent.length;
      onChange(ref.current.value);
      return;
    }

    if (e.key.length === 1 && PAIRS[e.key]) {
      const char = e.key;
      const close = PAIRS[char];
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const val = ref.current.value;
      if (start !== end) {
        e.preventDefault();
        ref.current.value = val.slice(0, start) + char + val.slice(start, end) + close + val.slice(end);
        ref.current.selectionStart = ref.current.selectionEnd = end + 1;
        onChange(ref.current.value);
        return;
      }
      const charAfter = val[start];
      if (charAfter === close) {
        e.preventDefault();
        ref.current.selectionStart = ref.current.selectionEnd = start + 1;
        return;
      }
      e.preventDefault();
      ref.current.value = val.slice(0, start) + char + close + val.slice(end);
      ref.current.selectionStart = ref.current.selectionEnd = start + 1;
      onChange(ref.current.value);
      return;
    }

    if (e.key === 'Backspace') {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const val = ref.current.value;
      if (start === end && start > 0 && start < val.length) {
        const before = val[start - 1];
        const after = val[start];
        const pairClose = Object.entries(PAIRS).find(([_, v]) => v === before);
        if (pairClose && pairClose[0] === after) {
          e.preventDefault();
          ref.current.value = val.slice(0, start - 1) + val.slice(start + 1);
          ref.current.selectionStart = ref.current.selectionEnd = start - 1;
          onChange(ref.current.value);
          return;
        }
      }
    }
  };

  const findInEditor = useCallback(() => {
    if (!findReplace.query) {
      setFindReplace(prev => ({ ...prev, matches: [], index: -1 }));
      return;
    }
    const text = String(value || '');
    const regex = new RegExp(findReplace.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match.index);
    }
    setFindReplace(prev => ({ ...prev, matches, index: matches.length > 0 ? 0 : -1 }));
  }, [value, findReplace.query]);

  const goToMatch = useCallback((dir) => {
    if (!findReplace.matches.length) return;
    let next = findReplace.index + dir;
    if (next < 0) next = findReplace.matches.length - 1;
    if (next >= findReplace.matches.length) next = 0;
    setFindReplace(prev => ({ ...prev, index: next }));
    const pos = findReplace.matches[next];
    if (ref.current) {
      ref.current.setSelectionRange(pos, pos + findReplace.query.length);
      ref.current.focus();
    }
  }, [findReplace.index, findReplace.matches, findReplace.query, value]);

  const replaceCurrent = useCallback(() => {
    if (findReplace.index < 0 || !findReplace.matches.length) return;
    const pos = findReplace.matches[findReplace.index];
    const newVal =
      String(value || '').slice(0, pos) +
      findReplace.replace +
      String(value || '').slice(pos + findReplace.query.length);
    onChange(newVal);
    setFindReplace(prev => ({ ...prev, matches: [], index: -1 }));
    findInEditor();
  }, [findReplace.index, findReplace.matches, findReplace.query, findReplace.replace, value, onChange, findInEditor]);

  const replaceAll = useCallback(() => {
    if (!findReplace.query) return;
    const regex = new RegExp(findReplace.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    onChange(String(value || '').replace(regex, findReplace.replace));
    setFindReplace(prev => ({ ...prev, matches: [], index: -1 }));
  }, [findReplace.query, findReplace.replace, value, onChange]);

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);
  const highlightedHTML = highlightCode(value, language);

  return (
    <div className="ide-editor-wrap" style={{ fontSize }}>
      {/* Find & Replace Bar */}
      {findReplace.open && (
        <div className="ide-find-bar">
          <input
            className="ide-find-input"
            placeholder="Find"
            value={findReplace.query}
            onChange={e => setFindReplace(prev => ({ ...prev, query: e.target.value }))}
          />
          <input
            className="ide-find-input"
            placeholder="Replace"
            value={findReplace.replace}
            onChange={e => setFindReplace(prev => ({ ...prev, replace: e.target.value }))}
          />
          <button className="ide-btn ide-btn-ghost ide-btn-sm" onClick={() => setFindReplace(prev => ({ ...prev, open: !prev.open }))}>
            <Icon name="x" size={14} />
          </button>
          {findReplace.matches.length > 0 && (
            <span className="ide-find-count">{findReplace.index + 1} / {findReplace.matches.length}</span>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="ide-btn ide-btn-ghost ide-btn-sm" onClick={() => goToMatch(-1)}>↑</button>
            <button className="ide-btn ide-btn-ghost ide-btn-sm" onClick={() => goToMatch(1)}>↓</button>
          </div>
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button className="ide-btn ide-btn-ghost ide-btn-sm" onClick={replaceCurrent}>Replace</button>
            <button className="ide-btn ide-btn-ghost ide-btn-sm" onClick={replaceAll}>Replace All</button>
          </div>
        </div>
      )}

      <div className="ide-editor-header">
        <span className="ide-lang-badge">{language}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`ide-btn ide-btn-ghost ide-btn-sm ${wordWrap ? 'on' : ''}`}
            onClick={() => setWordWrap(!wordWrap)}
            title="Word wrap"
          >
            <Icon name="text" size={12} />
          </button>
          <button
            className={`ide-btn ide-btn-ghost ide-btn-sm ${findReplace.open ? 'on' : ''}`}
            onClick={() => setFindReplace(prev => ({ ...prev, open: !prev.open, matches: [], index: -1 }))}
            title="Find & Replace"
          >
            <Icon name="search" size={12} />
          </button>
        </div>
      </div>

      <div className="ide-editor-body" ref={highlightRef}>
        {/* Layer 1: Syntax highlighted background */}
        <div className="ide-highlight-bg" dangerouslySetInnerHTML={{ __html: highlightedHTML }} />
        {/* Layer 2: Transparent textarea for typing */}
        <textarea
          ref={ref}
          className="ide-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          wrap={wordWrap ? 'soft' : 'off'}
          style={{
            fontSize,
            paddingLeft: '42px',
            width: '100%',
            height: '100%',
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            overflow: 'hidden',
            resize: 'none',
            tabSize: 4,
          }}
          aria-label="Code editor"
        />
      </div>
    </div>
  );
}
