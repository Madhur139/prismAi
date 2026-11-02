/*
  LISTEN PLAYER
  - Reads a lesson summary out loud with the browser's built-in speech engine.
  - Nothing is downloaded and no AI is called while you listen: the script is
    plain text and the voice ships with the device, so it works offline.
  - The speech engine itself lives in utils/voice.js, shared with Voice Mode.
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';
import { canSpeak, listVoices, onVoicesChanged, speakWithOptions, stopSpeaking } from '../utils/voice.js';

const RATES = [0.75, 1, 1.25, 1.5];

export function ListenPlayer({ open, onClose, script, title, durationSec, loading, error }) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState('');
  const handleRef = useRef(null);

  const supported = canSpeak();

  /* Voices arrive asynchronously in Chrome, so we wait for the change event. */
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const all = listVoices();
      setVoices(all);
      setVoiceURI(v => v || all.find(x => x.lang?.startsWith('en') && x.default)?.voiceURI || all[0]?.voiceURI || '');
    };
    load();
    return onVoicesChanged(load);
  }, [supported]);

  /* Never keep talking after the panel closes. */
  const stop = useCallback(() => {
    stopSpeaking();
    handleRef.current = null;
    setPlaying(false); setPaused(false); setProgress(0);
  }, []);

  useEffect(() => {
    if (!open) stop();
    return stop;
  }, [open, stop]);

  const speak = useCallback(() => {
    if (!supported || !script) return;
    const handle = speakWithOptions(script, {
      rate,
      voiceURI,
      onProgress: p => setProgress(Math.min(1, p)),
      onEnd: () => { setPlaying(false); setPaused(false); setProgress(1); },
    });
    if (!handle) return;
    handleRef.current = handle;
    setPlaying(true); setPaused(false); setProgress(0);
  }, [supported, script, rate, voiceURI]);

  const toggle = () => {
    if (!playing) return speak();
    if (paused) { handleRef.current?.resume(); setPaused(false); }
    else { handleRef.current?.pause(); setPaused(true); }
  };

  /* Restart the reading when the speed or the voice changes. */
  const changeRate = r => { setRate(r); if (playing) setTimeout(speak, 60); };
  const changeVoice = v => { setVoiceURI(v); if (playing) setTimeout(speak, 60); };

  if (!open) return null;

  const minutes = durationSec ? Math.max(1, Math.round(durationSec / 60)) : 0;

  // Portalled to <body> so the panel is always centred in the viewport.
  return createPortal(
    <div className="modal-backdrop lp-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="lp" role="dialog" aria-modal="true" aria-label="Listen to a summary">
        <button className="icon-btn lp-x" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>

        <span className="lp-ico"><Icon name="play" size={26} fill="currentColor" /></span>
        <h3>{title || 'Listen'}</h3>

        {loading && <div className="lp-state"><span className="spinner" /> Writing your summary…</div>}

        {!loading && error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}

        {!loading && !error && !supported && (
          <div className="alert error"><Icon name="alert" size={18} /><span>This browser cannot read text aloud. You can still read the summary below.</span></div>
        )}

        {!loading && !error && script && (
          <>
            <div className="lp-controls">
              <button className="btn primary" onClick={toggle} disabled={!supported}>
                <Icon name={playing && !paused ? 'pause' : 'play'} size={18} fill="currentColor" />
                {playing ? (paused ? 'Resume' : 'Pause') : 'Listen'}
              </button>
              <button className="btn ghost" onClick={stop} disabled={!playing}><Icon name="x" size={17} /> Stop</button>
              {minutes > 0 && <span className="lp-meta"><Icon name="clock" size={15} /> about {minutes} min</span>}
            </div>

            <div className="lp-progress" aria-hidden="true"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>

            <div className="lp-options">
              <label className="lp-option">
                <span>Speed</span>
                <div className="seg">
                  {RATES.map(r => (
                    <button key={r} type="button" className={rate === r ? 'on' : ''} onClick={() => changeRate(r)} aria-pressed={rate === r}>{r}×</button>
                  ))}
                </div>
              </label>
              {voices.length > 0 && (
                <label className="lp-option">
                  <span>Voice</span>
                  <select value={voiceURI} onChange={e => changeVoice(e.target.value)}>
                    {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                  </select>
                </label>
              )}
            </div>

            <div className="lp-script">{script}</div>
          </>
        )}
      </section>
    </div>,
    document.body
  );
}
