/*
  DUEL PAGE - two players answer the same questions and the score is live.
    #/play/duel          the lobby (create a duel or join with a code)
    #/play/duel/<code>  the duel itself
  The score is polled from the server every second, so no websockets needed.
*/
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { RoundView } from '../games/RoundView.jsx';
import { PlayShell, Notice } from '../components/PlayShell.jsx';
import { Icon } from '../components/Icon.jsx';
import { go } from '../utils/router.js';

export function DuelPage({ code }) {
  const [phase, setPhase] = useState(code ? 'loading' : 'lobby'), [error, setError] = useState('');
  const [duel, setDuel] = useState(null), [joinCode, setJoinCode] = useState(''), [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null), [roundKey, setRoundKey] = useState(0);
  const timer = useRef(null);

  const poll = async () => {
    try {
      const d = await api(`/duel/${code}`);
      setDuel(d);
      setPhase(d.status === 'done' ? 'done' : 'play');
      if (d.status === 'done') setResult(d);
    } catch (e) { setError(e.message); setPhase('error'); }
  };

  useEffect(() => {
    if (!code) return;
    poll();
    timer.current = setInterval(poll, 1200);
    return () => clearInterval(timer.current);
  }, [code]);

  const create = async () => {
    setBusy(true); setError('');
    try { const d = await api('/duel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ size: 8 }) }); go('/play/duel/' + d.code); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const join = async () => {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    setBusy(true); setError('');
    try { await api('/duel/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c }) }); go('/play/duel/' + c); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  /* ---------- Lobby ---------- */
  if (!code) {
    return (
      <PlayShell color="#f43f5e" kicker="LIVE DUEL" title="Duel" onExit={() => go('/app/games')}>
        <div className="duel-lobby">
          <div className="duel-card">
            <span className="duel-ico"><Icon name="bolt" size={26} /></span>
            <h2>Start a duel</h2>
            <p>You get a code. Your friend joins with it and you both answer the same questions — fastest correct answers win the round.</p>
            <button className="btn primary lg" disabled={busy} onClick={create}>{busy ? 'Creating…' : <><Icon name="plus" size={18} /> Create duel</>}</button>
          </div>
          <div className="duel-card">
            <span className="duel-ico"><Icon name="users" size={26} /></span>
            <h2>Join a duel</h2>
            <p>Got a 4-letter code from a friend? Type it here.</p>
            <div className="duel-join">
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={6} aria-label="Duel code" />
              <button className="btn primary" disabled={busy || joinCode.trim().length < 4} onClick={join}>Join</button>
            </div>
          </div>
          {error && <div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div>}
        </div>
      </PlayShell>
    );
  }

  /* ---------- The duel ---------- */
  if (phase === 'error') return <PlayShell title="Duel" onExit={() => go('/app/games')}><Notice title="Duel problem" text={error} action={<button className="btn primary" onClick={() => go('/app/games')}>Back to games</button>} /></PlayShell>;
  if (!duel) return <PlayShell title="Duel" onExit={() => go('/app/games')}><Notice busy title="Loading the duel…" /></PlayShell>;

  if (phase === 'done') {
    const iWon = (result.myScore || 0) > (result.theirScore || 0);
    const tie = (result.myScore || 0) === (result.theirScore || 0);
    return (
      <PlayShell color="#f43f5e" kicker="DUEL OVER" title={`${result.hostName} vs ${result.guestName}`} progress={1} onExit={() => go('/app/games')}>
        <div className="duel-result">
          <h2>{tie ? 'A draw!' : iWon ? 'You win!' : `${result.hostName === '' ? 'They' : 'They'} win!`}</h2>
          <div className="duel-scores">
            <div className={iWon ? 'me win' : ''}><b>{result.myScore}</b><span>You</span></div>
            <span className="duel-vs">—</span>
            <div className={!iWon && !tie ? 'me win' : ''}><b>{result.theirScore}</b><span>Them</span></div>
          </div>
          <button className="btn primary lg" onClick={() => go('/app/games')}>Back to games</button>
        </div>
      </PlayShell>
    );
  }

  const waiting = duel.status === 'waiting';
  const answered = duel.iAnswered;

  return (
    <PlayShell color="#f43f5e" kicker="LIVE DUEL" title={`${duel.hostName} vs ${duel.guestName || '…'}`} progress={duel.total ? duel.roundIndex / duel.total : 0} onExit={() => go('/app/games')}
      right={<span className="play-chip">{duel.myScore} <Icon name="trophy" size={14} /> {duel.theirScore}</span>}>
      {waiting && <Notice busy title="Waiting for your opponent…" text={`Share the code ${code} so they can join.`} />}
      {!waiting && duel.round && !answered && (
        <RoundView key={`${duel.roundIndex}-${roundKey}`} round={duel.round} index={duel.roundIndex} total={duel.total}
          onNext={async r => { try { await api(`/duel/${code}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correct: r.correct, timeMs: r.timeMs }) }); } catch {} poll(); }} />
      )}
      {!waiting && duel.round && answered && (
        <Notice title="Waiting for the other player…" text={`Round ${duel.roundIndex + 1} of ${duel.total}.`} busy />
      )}
    </PlayShell>
  );
}
