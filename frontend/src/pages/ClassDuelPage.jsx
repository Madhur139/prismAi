/*
  CLASS DUEL - everybody answers the same rounds at the same time.
  The leaderboard is polled from the server, so no websockets are needed.
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client.js';
import { RoundView } from '../games/RoundView.jsx';
import { Notice, PlayShell } from '../components/PlayShell.jsx';
import { Icon } from '../components/Icon.jsx';
import { useToast } from '../components/ui.jsx';
import { go } from '../utils/router.js';

export function ClassDuelPage({ code }) {
  const [duel, setDuel] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, notify] = useToast();
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api(`/classduel/${code}`);
      setDuel(d);
      setError('');
      setPhase(d.status);
    } catch (e) {
      setError(e.message);
      setPhase('error');
    }
  }, [code]);

  // Join straight away, then keep the leaderboard fresh.
  useEffect(() => {
    let live = true;
    (async () => {
      try { await api(`/classduel/${code}/join`, { method: 'POST' }); } catch { /* maybe already in it */ }
      if (live) load();
    })();
    pollRef.current = setInterval(() => { if (live) load(); }, 4000);
    return () => { live = false; clearInterval(pollRef.current); };
  }, [code, load]);

  // Answer the round, then wait for everybody else.
  const onNext = async payload => {
    setBusy(true);
    try {
      await api(`/classduel/${code}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct: payload.correct, timeMs: payload.timeMs }),
      });
      await load();
    } catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };

  const rank = duel?.myRank ? duel.myRank : 0;
  const board = duel?.leaderboard || [];

  return (
    <PlayShell
      color="#f43f5e"
      kicker="CLASS DUEL"
      title={duel?.title || 'Class duel'}
      progress={duel?.total ? (duel.roundIndex + 1) / duel.total : 0}
      onExit={() => go('/app/class')}
      toast={toast}
      right={duel ? <span className="play-chip"><Icon name="trophy" size={14} /> {rank ? `#${rank}` : '—'}</span> : null}
    >
      {phase === 'loading' && <Notice busy title="Joining the duel…" text="Getting you into the game." />}

      {phase === 'error' && (
        <Notice title="Could not join" text={error} action={<button className="btn primary" onClick={() => go('/app/class')}>Back to the class</button>} />
      )}

      {phase === 'waiting' && (
        <Notice
          title="Waiting for the class"
          text={`${duel?.players || 0} player${(duel?.players || 0) === 1 ? ' has' : 's have'} joined. The teacher starts the duel when everybody is in.`}
          action={<div className="duel-code-big"><span>{duel?.code}</span><button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(duel?.code || ''); notify?.('Code copied.', 'success'); }}><Icon name="copy" size={16} /> Copy code</button></div>}
        />
      )}

      {phase === 'playing' && duel?.round && (
        <div className="stage">
          <div className="duel-live">
            <div className="duel-live-top">
              <span>Round {duel.roundIndex + 1} of {duel.total}</span>
              {duel.iAnswered && <span className="duel-waiting"><Icon name="clock" size={13} /> waiting for the others</span>}
            </div>
            <div className="duel-board">
              {board.map(p => (
                <div className={'duel-board-row' + (p.isMe ? ' me' : '')} key={p.name}>
                  <span className="duel-place">{p.place}</span>
                  <span className="duel-name">{p.name}{p.isMe ? ' (you)' : ''}</span>
                  <span className="duel-score">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
          <RoundView
            key={`${duel.roundIndex}-${duel.code}`}
            round={duel.round}
            index={duel.roundIndex}
            total={duel.total}
            onNext={onNext}
            nextLabel="Send my answer"
          />
        </div>
      )}

      {phase === 'done' && (
        <div className="stage">
          <div className="duel-final">
            <span className="duel-final-ico"><Icon name="trophy" size={30} /></span>
            <h2>That is the end of the duel</h2>
            <p>You scored <b>{duel?.myScore}</b> and finished <b>{rank ? '#' + rank : '—'}</b> of {board.length}.</p>
          </div>
          <div className="duel-board final">
            {board.map(p => (
              <div className={'duel-board-row' + (p.isMe ? ' me' : '')} key={p.name}>
                <span className="duel-place">{p.place}</span>
                <span className="duel-name">{p.name}{p.isMe ? ' (you)' : ''}</span>
                <span className="duel-score">{p.score}</span>
              </div>
            ))}
          </div>
          <button className="btn primary lg" onClick={() => go('/app/class')}>Back to the class</button>
        </div>
      )}
    </PlayShell>
  );
}
