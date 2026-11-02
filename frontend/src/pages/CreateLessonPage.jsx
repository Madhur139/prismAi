/*
  CREATE LESSON PAGE - topic text and/or an image go to POST /api/lessons/generate.
  The "Import" tab sends a PDF, a YouTube link or pasted notes to POST /api/lessons/import.
*/
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Field, Panel, Spinner } from '../components/ui.jsx';

const SUGGESTIONS = ['Photosynthesis', 'Newton’s laws', 'Fractions & decimals', 'French vocabulary', 'Human digestive system', 'JavaScript arrays'];
const STEPS = ['Reading your material', 'Finding the key concepts', 'Designing the games', 'Verifying every answer'];
const IMPORT_STEPS = ['Reading the file', 'Picking the key ideas', 'Building the games', 'Checking every answer'];

export function Create({ onCreated, notify }) {
  const [mode, setMode] = useState('create');
  const [topic, setTopic] = useState(() => { try { const t = sessionStorage.getItem('prism_prefill_topic'); sessionStorage.removeItem('prism_prefill_topic'); return t || ''; } catch { return ''; } });
  const [file, setFile] = useState(null), [preview, setPreview] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [drag, setDrag] = useState(false), [step, setStep] = useState(0);
  // Import options
  const [pdf, setPdf] = useState(null), [videoUrl, setVideoUrl] = useState(''), [notes, setNotes] = useState('');
  const fileRef = useRef(null), pdfRef = useRef(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (!busy) { setStep(0); return; } const id = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 4500); return () => clearInterval(id); }, [busy]);

  const take = f => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Please choose an image file.');
    if (f.size > 8 * 1024 * 1024) return setError('Image must be 8MB or smaller.');
    setFile(f); setError(''); setPreview(URL.createObjectURL(f));
  };
  const clearFile = e => { e.stopPropagation(); setFile(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; };

  const submit = async e => {
    e.preventDefault();
    if (!topic.trim() && !file) return setError('Add a topic or upload an image.');
    setBusy(true); setError('');
    try {
      const fd = new FormData(); if (topic.trim()) fd.append('topic', topic.trim()); if (file) fd.append('image', file);
      const d = await api('/lessons/generate', { method: 'POST', body: fd });
      // The lesson is always built from the picture, but storing a copy of it
      // needs image hosting. If that failed, say so instead of failing silently.
      if (d.warning) notify(`Lesson created, but the picture could not be stored. ${d.warning}`, 'error');
      else notify('Lesson generated successfully.', 'success');
      await onCreated(d.lesson._id);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const submitImport = async e => {
    e.preventDefault();
    if (!pdf && !videoUrl.trim() && !notes.trim()) return setError('Add a PDF, a YouTube link or some notes.');
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      if (pdf) fd.append('file', pdf);
      if (videoUrl.trim()) fd.append('url', videoUrl.trim());
      if (notes.trim()) fd.append('text', notes.trim());
      const d = await api('/lessons/import', { method: 'POST', body: fd });
      notify('Lesson imported successfully.', 'success'); await onCreated(d.lesson._id);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const takePdf = f => {
    if (!f) return;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) return setError('Please choose a PDF file.');
    if (f.size > 12 * 1024 * 1024) return setError('PDF must be 12MB or smaller.');
    setPdf(f); setError('');
  };

  if (busy) return (
    <div className="page narrow create-page">
      <Panel className="building">
        <div className="build-orb"><i /><i /><i /><Icon name="sparkles" size={34} /></div>
        <h2>{mode === 'import' ? 'Building your imported lesson…' : 'Building your lesson…'}</h2>
        <p>This usually takes 10–30 seconds.</p>
        <ul className="build-steps">{(mode === 'import' ? IMPORT_STEPS : STEPS).map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}><span>{i < step ? <Icon name="check" size={14} stroke={3} /> : i === step ? <Spinner /> : null}</span>{s}</li>)}</ul>
      </Panel>
    </div>
  );

  return (
    <div className="page create-page">
      <div className="studio-intro"><span className="pill"><Icon name="sparkles" size={15} /> Lesson studio</span><h2>What do you want to learn?</h2><p>Give Prism a topic, notes, or a diagram. It turns the material into concepts and playable micro-games.</p></div>

      <div className="mode-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'on' : ''} onClick={() => { setMode('create'); setError(''); }}><Icon name="sparkles" size={16} /> Create from a topic</button>
        <button role="tab" aria-selected={mode === 'import'} className={mode === 'import' ? 'on' : ''} onClick={() => { setMode('import'); setError(''); }}><Icon name="upload" size={16} /> Import material</button>
      </div>

      {mode === 'create' ? (
      <form className="create-grid" onSubmit={submit}>
        <Panel className="create-main">
          <Field label="Topic or learning goal" hint={`${topic.length}/500`}>
            <textarea value={topic} onChange={e => setTopic(e.target.value)} maxLength="500" rows="5" placeholder="e.g. Explain photosynthesis for a grade 8 learner…" />
          </Field>
          <div className="suggestions">{SUGGESTIONS.map(s => <button type="button" key={s} onClick={() => setTopic(s)}><Icon name="plus" size={13} />{s}</button>)}</div>
          <div className="divider"><span>or add a photo</span></div>
          <div className={`dropzone ${file ? 'has-file' : ''} ${drag ? 'drag' : ''}`} role="button" tabIndex={0}
            onClick={() => fileRef.current?.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => take(e.target.files?.[0])} hidden />
            {preview ? <img src={preview} alt="Selected preview" /> : <div className="dz-ico"><Icon name="upload" size={24} /></div>}
            <div className="dz-copy"><b>{file ? file.name : 'Drop an image or click to upload'}</b><span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ready to analyze` : 'PNG, JPG or WEBP · max 8MB'}</span></div>
            {file && <button type="button" className="icon-btn" onClick={clearFile} aria-label="Remove image"><Icon name="trash" size={17} /></button>}
          </div>
          {error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}
          <button className="btn primary lg full">Generate playable lesson <Icon name="arrow-right" size={20} /></button>
        </Panel>
        <aside className="create-side">
          <div className="tip-card"><h4>What you’ll get</h4>
            <ul>
              <li><span><Icon name="layers" size={18} /></span><div><b>Key concepts</b><small>Clear summaries for each idea</small></div></li>
              <li><span><Icon name="gamepad" size={18} /></span><div><b>Micro-games</b><small>Quizzes, word games, crosswords & more</small></div></li>
              <li><span><Icon name="shield" size={18} /></span><div><b>Boss mode</b><small>Test yourself when you’re ready</small></div></li>
            </ul>
          </div>
          <div className="tip-card soft"><h4>Tips</h4><p>Be specific: “Calvin cycle for grade 10” beats “biology”. Photos of diagrams unlock the Diagram Hotspot game.</p></div>
        </aside>
      </form>
      ) : (
      <form className="create-grid" onSubmit={submitImport}>
        <Panel className="create-main">
          <Field label="A PDF of your notes" hint="max 12MB">
            <div className={`dropzone ${pdf ? 'has-file' : ''}`} role="button" tabIndex={0} onClick={() => pdfRef.current?.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && pdfRef.current?.click()}>
              <input ref={pdfRef} type="file" accept="application/pdf,.pdf" onChange={e => takePdf(e.target.files?.[0])} hidden />
              <div className="dz-ico"><Icon name="book" size={24} /></div>
              <div className="dz-copy"><b>{pdf ? pdf.name : 'Choose a PDF'}</b><span>{pdf ? `${(pdf.size / 1024 / 1024).toFixed(1)} MB · ready to read` : 'PDF with selectable text · max 12MB'}</span></div>
              {pdf && <button type="button" className="icon-btn" onClick={e => { e.stopPropagation(); setPdf(null); if (pdfRef.current) pdfRef.current.value = ''; }} aria-label="Remove PDF"><Icon name="trash" size={17} /></button>}
            </div>
          </Field>
          <div className="divider"><span>or</span></div>
          <Field label="A YouTube video" hint="we read the captions">
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
          <div className="divider"><span>or paste your notes</span></div>
          <Field label="Notes" hint="plain text is fine">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="6" placeholder="Paste the study material here…" />
          </Field>
          {error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}
          <button className="btn primary lg full">Build lesson from this <Icon name="arrow-right" size={20} /></button>
        </Panel>
        <aside className="create-side">
          <div className="tip-card"><h4>How import works</h4>
            <ul>
              <li><span><Icon name="book" size={18} /></span><div><b>Reads the text</b><small>PDF pages or video captions</small></div></li>
              <li><span><Icon name="brain" size={18} /></span><div><b>Finds the ideas</b><small>Concepts, key facts and vocabulary</small></div></li>
              <li><span><Icon name="gamepad" size={18} /></span><div><b>Makes the games</b><small>The same micro-games as a normal lesson</small></div></li>
            </ul>
          </div>
          <div className="tip-card soft"><h4>Good to know</h4><p>Scanned PDFs (photos of pages) have no text to read — type the notes instead, or use a photo in the Create tab.</p></div>
        </aside>
      </form>
      )}
    </div>
  );
}
