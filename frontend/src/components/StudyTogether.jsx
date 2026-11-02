/*
  STUDY TOGETHER
  - Everybody in the group answers the SAME rounds at the same time.
  - The leaderboard is polled from the server, so it needs no websockets.
  - The questions come from the lessons the group shares.
*/
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { RoundView } from '../games/RoundView.jsx';
import { Icon } from './Icon.jsx';
import { Spinner } from './ui.jsx';

export function StudyTogether({ groupId, me, onOpenLesson }) {
  const [room, setRoom] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [answered, setAnswered] = useState(false);
  const roundKey = useRef('');

  const load = async () => {
    try {
      const d = await api(`/groups/${groupId}/study`);
      const r = d.room || null;
      setRoom(r);
      // A new round means a new answer to give.
      if (r && r.status === 'playing') {
        const key = `${r.code}-${r.roundIndex}`;
        if (roundKey.current !== key) { roundKey.current = key; setAnswered(false); }
      }
    } catch { /* the room can wait */ }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [groupId]);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const d = await api(`/groups/${groupId}/study`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ size: 8 }) });
      setRoom(d.room);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const begin = async () => {
    setBusy(true);
    try { const d = await api(`/groups/${groupId}/study/${room.code}/start`, { method: 'POST' }); setRoom(d.room); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const answer = async (r) => {
    setAnswered(true);
    try {
      await api(`/groups/${groupId}/study/${room.code}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correct: r.correct, timeMs: r.timeMs }) });
      load();
    } catch { /* the poll will catch up */ }
  };

  if (error) return <div className="alert error"><Icon name="alert" size={16} /><span>{error}</span></div>;

  // No session yet
  if (!room) {
    return (
      <div className="study-empty">
        <span className="study-ico"><Icon name="bolt" size={24} /></span>
        <h4>Study together</h4>
        <p>Everybody in the group answers the same questions at the same time. The questions come from the lessons you share with the group.</p>
        <button className="btn primary" disabled={busy} onClick={start}>{busy ? <Spinner /> : <><Icon name="play" size={17} /> Start a session</>}</button>
      </div>
    );
  }

  const mePlayer = room.players.find(p => p.me);

  // Finished
  if (room.status === 'done') {
    const winner = room.players[0];
    return (
      <div className="study-done">
        <h4>That is the last round.</h4>
        <div className="study-board">
          {room.players.map((p, i) => (
            <div className={`study-player ${p.me ? 'me' : ''}`} key={p.userId}>
              <span className="study-rank">{i + 1}</span>
              <b>{p.name}</b>
              <span className="study-score">{p.score}</span>
            </div>
          ))}
        </div>
        {winner && <p className="study-note">{winner.name} won with {winner.score} correct.</p>}
        <button className="btn ghost" onClick={start}><Icon name="refresh" size={16} /> Another session</button>
      </div>
    );
  }

  return (
    <div className="study-room">
      <div className="study-head">
        <div>
          <span className="soft-tag">{room.code}</span>
          <b>{room.title}</b>
        </div>
        <span className="study-round">Round {Math.min(room.roundIndex + 1, room.total)} / {room.total}</span>
      </div>

      <div className="study-board">
        {room.players.map((p, i) => (
          <div className={`study-player ${p.me ? 'me' : ''} ${p.answered ? 'done' : ''}`} key={p.userId}>
            <span className="study-rank">{i + 1}</span>
            <b>{p.name}</b>
            <span className="study-score">{p.score}</span>
            {p.answered && <span className="study-tick"><Icon name="check" size={12} stroke={3} /></span>}
          </div>
        ))}
      </div>

      {room.status === 'waiting' && (
        <div className="study-waiting">
          <p>Waiting for everybody to join the session.</p>
          <button className="btn primary" disabled={busy} onClick={begin}>{busy ? <Spinner /> : <><Icon name="play" size={17} /> Start now</>}</button>
        </div>
      )}

      {room.status === 'playing' && room.round && (
        <div className="study-play">
          {answered
            ? <div className="study-waiting"><p>Answered — waiting for the others…</p><span className="spinner" /></div>
            : <RoundView key={`${room.code}-${room.roundIndex}`} round={room.round} index={room.roundIndex} total={room.total} onNext={answer} topic="Study together" />}
        </div>
      )}

      {mePlayer && !mePlayer.answered && room.status === 'playing' && (
        <p className="study-note">Your answer counts for you only — no XP for this one, it is practice together.</p>
      )}
    </div>
  );
}
