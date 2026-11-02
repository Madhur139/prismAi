/*
  PLAY PAGE - every game opens here, on its own full-screen page (no sidebar).
    #/play/lesson/<id>?cfg=...   a lesson session (practice or boss mode)
    #/play/arcade/<TYPE>         a quick-play arcade run
    #/play/mini/<TYPE>           a standalone mini game
  Closing the page returns to where the player came from.
*/
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import { RoundView } from '../games/RoundView.jsx';
import { buildArcade } from '../games/arcadeData.js';
import { MiniGame } from '../games/mini/MiniGame.jsx';
import { DuelPage } from './DuelPage.jsx';
import { ClassDuelPage } from './ClassDuelPage.jsx';
import { BossBar } from '../components/BossBar.jsx';
import { Summary } from '../components/Summary.jsx';
import { useToast } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { PlayShell, Notice } from '../components/PlayShell.jsx';
import { WritePlayer } from './WritePlayer.jsx';
import { ARCADE, GAME_META } from '../constants/games.js';
import { shuffle } from '../utils/helpers.js';
import { go, parseCfg } from '../utils/router.js';
import { incrementStat, readStats } from '../utils/stats.js';
import { checkBadges, badgeOf } from '../utils/achievements.js';

/* ---------- Drill my mistakes ---------- */
/*
  Replays the exact questions the learner got wrong and has not answered
  correctly since. The games come straight from the mistake notebook.
*/
function DrillPlayer() {
  const [toast, notify] = useToast();
  const [phase, setPhase] = useState('loading'), [error, setError] = useState('');
  const [rounds, setRounds] = useState([]), [idx, setIdx] = useState(0), [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  const load = async () => {
    setPhase('loading'); setError('');
    try {
      const d = await api('/progress/drill?limit=15');
      if (!d.drills?.length) { setPhase('empty'); return; }
      setRounds(d.drills.map(x => ({ conceptName: x.conceptName, game: x.game, lessonId: x.lessonId, imageUrl: x.game?.imageUrl || '' })));
      setIdx(0); setResults([]); setSummary(null); setPhase('play');
    } catch (e) { setError(e.message); setPhase('error'); }
  };
  useEffect(() => { load(); }, []);

  const onNext = r => {
    const all = [...results, r];
    setResults(all);
    if (idx + 1 >= rounds.length) {
      // Save against the lesson each question came from, so XP and the
      // mistake notebook both stay correct.
      const byLesson = {};
      all.forEach((x, i) => {
        const lid = rounds[i]?.lessonId;
        if (!lid) return;
        (byLesson[lid] = byLesson[lid] || []).push(x);
      });
      const ids = Object.keys(byLesson);
      (async () => {
        let xp = 0;
        for (const lid of ids) {
          try { const d = await api('/progress/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: lid, results: byLesson[lid] }) }); xp += d.gainedXP || 0; }
          catch {}
        }
        setSummary({ results: all, xp, state: 'saved', total: null, streak: null });
        setPhase('done');
      })();
    } else setIdx(idx + 1);
  };

  if (phase === 'loading') return <PlayShell title="Drill" onExit={() => go('/app/review')}><Notice busy title="Collecting your mistakes…" text="Finding the questions you still get wrong." /></PlayShell>;
  if (phase === 'error') return <PlayShell title="Drill" onExit={() => go('/app/review')}><Notice title="Could not start the drill" text={error} action={<div className="row-gap"><button className="btn primary" onClick={load}>Try again</button><button className="btn ghost" onClick={() => go('/app/review')}>Back</button></div>} /></PlayShell>;
  if (phase === 'empty') return (
    <PlayShell title="Drill" onExit={() => go('/app/review')}>
      <Notice title="Nothing to drill" text="You have not got a question wrong that is still unfixed. Play a lesson and come back if you miss something."
        action={<button className="btn primary" onClick={() => go('/app/games')}>Play something</button>} />
    </PlayShell>
  );
  if (phase === 'done' && summary) {
    const ok = summary.results.filter(r => r.correct).length;
    return (
      <PlayShell color="#f43f5e" kicker="DRILL" title="Drill complete" progress={1} onExit={() => go('/app/review')} toast={toast}>
        <Summary summary={{ ...summary, boss: false }} onAgain={load} onExit={() => go('/app/review')} exitLabel="Back to review" againLabel="Drill again" />
        <p className="best-streak">You fixed <b>{ok}</b> of {summary.results.length} mistakes.</p>
      </PlayShell>
    );
  }

  const round = rounds[idx];
  return (
    <PlayShell color="#f43f5e" kicker="DRILL MY MISTAKES" title="Questions you still get wrong" progress={rounds.length ? idx / rounds.length : 0} onExit={() => go('/app/review')} toast={toast}
      right={<span className="play-chip">{results.filter(r => r.correct).length} <Icon name="check" size={14} stroke={3} /></span>}>
      {round && <RoundView key={idx} round={round} imageUrl={round.imageUrl} index={idx} total={rounds.length} onNext={onNext} topic="Your mistakes" />}
    </PlayShell>
  );
}

export function PlayPage({ path, query }) {
  const lm = path.match(/^\/play\/lesson\/([^/]+)/), am = path.match(/^\/play\/arcade\/([^/]+)/);
  if (lm) return <LessonPlayer key={lm[1] + (query.cfg || '')} id={lm[1]} cfg={parseCfg(query)} />;
  if (am) return <ArcadePlayer key={am[1]} type={am[1]} />;
  const wm = path.match(/^\/play\/write\/([^/]+)/);
  if (wm) return <WritePlayer key={wm[1] + JSON.stringify(query)} id={wm[1]} query={query} />;
  const mm = path.match(/^\/play\/mini\/([^/]+)/);
  if (mm) return <MiniGame key={mm[1]} type={mm[1]} />;
  const dm = path.match(/^\/play\/duel(?:\/([^/]+))?/);
  if (dm) return <DuelPage key={dm[1] || 'lobby'} code={dm[1] || ''} />;
  const cdm = path.match(/^\/play\/class-duel\/([^/]+)/);
  if (cdm) return <ClassDuelPage key={cdm[1]} code={cdm[1]} />;
  if (path.startsWith('/play/drill')) return <DrillPlayer />;
  return <PlayShell title="Game not found" onExit={() => go('/app/games')}><Notice title="We couldn’t find that game" text="The link may be out of date." action={<button className="btn primary" onClick={() => go('/app/games')}>Back to arcade</button>} /></PlayShell>;
}

/* ---------- Lesson session ---------- */
function LessonPlayer({ id, cfg }) {
  const [toast, notify] = useToast();
  const cfgKey = JSON.stringify(cfg || {}), config = useMemo(() => { const c = JSON.parse(cfgKey); return { mode: ['boss', 'exam'].includes(c.mode) ? c.mode : 'practice', topics: c.topics || null, types: c.types || null, level: c.level || null }; }, [cfgKey]);
  const boss = config.mode === 'boss', exam = config.mode === 'exam';
  const [phase, setPhase] = useState('loading'), [error, setError] = useState(''), [lesson, setLesson] = useState(null), [rounds, setRounds] = useState([]), [imageUrl, setImageUrl] = useState('');
  const [idx, setIdx] = useState(0), [results, setResults] = useState([]), [lives, setLives] = useState(3), [hits, setHits] = useState(0), [summary, setSummary] = useState(null);

  const load = async () => {
    setPhase('loading'); setError('');
    try {
      const q = config.level ? `&level=${config.level}` : '';
      const [ld, sd] = await Promise.all([api(`/lessons/${id}`), api(`/lessons/${id}/session?size=30${q}`)]);
      const L = ld.lesson, okR = r => (!config.topics || config.topics.includes(r.conceptName)) && (!config.types || config.types.includes(r.game.type));
      let rs = (sd.rounds || []).filter(okR);
      if (rs.length < 3) { const local = []; L.concepts.forEach(c => c.microGames.forEach(g => { const r = { conceptName: c.conceptName, game: g }; if (okR(r)) local.push(r); })); rs = shuffle(local); }
      if (!rs.length) throw new Error('No games match your selection.');
      rs = rs.slice(0, exam ? 12 : boss ? 10 : 8);
      setLesson(L); setRounds(rs); setImageUrl(sd.imageUrl || L.imageUrl || ''); setIdx(0); setResults([]); setLives(3); setHits(0); setSummary(null); setPhase('play');
    } catch (e) { setError(e.message); setPhase('error'); }
  };
  useEffect(() => { load(); }, [id, cfgKey]);

  const save = async all => {
    setSummary(s => ({ ...s, state: 'saving', error: '' }));
    try {
      const d = await api('/progress/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: id, results: all }) });
      setSummary(s => ({ ...s, xp: d.gainedXP, total: d.totalXP, streak: d.streakCount, state: 'saved' }));
      // Track badge stats: completed a lesson + streak from backend
      incrementStat('lessonsCompleted', 1);
      incrementStat('streak', 1);
      const won = checkBadges(readStats());
      if (won.length) notify(`New badge${won.length > 1 ? 's' : ''}: ${won.map(w => badgeOf(w).title).join(', ')}`, 'success');
    } catch (e) { setSummary(s => ({ ...s, state: 'error', error: e.message })); notify(e.message, 'error'); }
  };
  const onNext = r => {
    const all = [...results, r]; let L = lives, h = hits;
    if (boss) { if (r.correct) h = hits + 1; else L = lives - 1; setHits(h); setLives(L); }
    // Track badge stats: rounds played and perfect scores
    incrementStat('rounds', 1);
    if (r.correct) incrementStat('perfects', 1);
    setResults(all);
    if (idx + 1 >= rounds.length || (boss && L <= 0)) { setSummary({ results: all, boss, exam, won: boss && L > 0, state: 'saving' }); setPhase('done'); save(all); }
    else setIdx(idx + 1);
  };
  const back = () => go('/app/lesson/' + id);
  const exit = () => { if (phase === 'play' && results.length && !window.confirm('Leave this game? Your progress in this session won’t be saved.')) return; back(); };

  const color = boss ? '#f43f5e' : exam ? '#8b5cf6' : '#7c6cff';
  return (
    <PlayShell color={color} kicker={exam ? 'EXAM' : boss ? 'BOSS MODE' : 'PRACTICE'} title={lesson?.topic || 'Loading…'} progress={phase === 'done' ? 1 : rounds.length ? idx / rounds.length : 0} onExit={exit} toast={toast}
      right={boss && phase === 'play' ? null : phase === 'play' ? <span className="play-chip">{results.filter(r => r.correct).length} <Icon name="check" size={14} stroke={3} /></span> : null}>
      {phase === 'loading' && <Notice busy title="Preparing your game…" text="Picking the best rounds for you." />}
      {phase === 'error' && <Notice title="Couldn’t start the game" text={error} action={<div className="row-gap"><button className="btn primary" onClick={load}>Try again</button><button className="btn ghost" onClick={back}>Back to lesson</button></div>} />}
      {phase === 'play' && rounds[idx] && <>
        {boss && <BossBar total={rounds.length} hits={hits} lives={lives} />}
        <RoundView key={idx} round={rounds[idx]} imageUrl={imageUrl} index={idx} total={rounds.length} onNext={onNext} topic={lesson?.topic} exam={exam}
          lessonId={id} conceptIndex={rounds[idx].conceptIndex} gameIndex={rounds[idx].gameIndex} />
      </>}
      {phase === 'done' && summary && <Summary summary={summary} onAgain={load} onExit={back} exitLabel="Back to lesson" againLabel={exam ? 'Sit it again' : boss ? 'Fight again' : 'Practice again'} onRetry={() => save(summary.results)} />}
    </PlayShell>
  );
}

/* ---------- Arcade run ---------- */
function ArcadePlayer({ type }) {
  const [toast, notify] = useToast();
  const meta = ARCADE.find(a => a.type === type);
  const [phase, setPhase] = useState('loading'), [rounds, setRounds] = useState([]), [idx, setIdx] = useState(0), [results, setResults] = useState([]), [streak, setStreak] = useState(0), [best, setBest] = useState(0), [summary, setSummary] = useState(null);

  const start = async () => {
    setPhase('loading');
    let lessons = []; try { lessons = (await api('/lessons')).lessons || []; } catch {}
    const rs = buildArcade(type, lessons);
    if (!rs.length) { setPhase('error'); return; }
    setRounds(rs); setIdx(0); setResults([]); setStreak(0); setBest(0); setSummary(null); setPhase('play');
  };
  useEffect(() => { if (meta) start(); }, [type]);

  const finishRun = async all => {
    setSummary({ results: all, state: 'saved', xp: 0, total: null, streak: null }); setPhase('done');
    // Rounds that came from the learner's own lessons also earn real XP.
    const byLesson = {};
    all.forEach((r, i) => { const lid = rounds[i]?.lessonId; if (lid) (byLesson[lid] = byLesson[lid] || []).push(r); });
    const ids = Object.keys(byLesson); if (!ids.length) return;
    setSummary(s => ({ ...s, state: 'saving' }));
    try {
      let xp = 0, last = null;
      for (const lid of ids) {
        last = await api('/progress/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: lid, results: byLesson[lid] }) });
        xp += last.gainedXP || 0;
      }
      setSummary(s => ({ ...s, state: 'saved', xp, total: last.totalXP, streak: last.streakCount }));
    } catch (e) { setSummary(s => ({ ...s, state: 'error', error: e.message })); notify(e.message, 'error'); }
  };
  const onNext = r => {
    const all = [...results, r]; setResults(all);
    const s = r.correct ? streak + 1 : 0; setStreak(s); setBest(b => Math.max(b, s));
    if (idx + 1 >= rounds.length) finishRun(all); else setIdx(idx + 1);
  };
  const exit = () => { if (phase === 'play' && results.length && !window.confirm('Leave this run?')) return; go('/app/games'); };

  if (!meta) return <PlayShell title="Game not found" onExit={() => go('/app/games')}><Notice title="Unknown game" action={<button className="btn primary" onClick={() => go('/app/games')}>Back to arcade</button>} /></PlayShell>;
  return (
    <PlayShell color={meta.color} kicker="ARCADE" title={meta.title} progress={phase === 'done' ? 1 : rounds.length ? idx / rounds.length : 0} onExit={exit} toast={toast}
      right={phase === 'play' ? <><span className="play-chip"><Icon name="flame" size={15} fill="currentColor" /> {streak}</span><span className="play-chip">{results.filter(r => r.correct).length} <Icon name="check" size={14} stroke={3} /></span></> : null}>
      {phase === 'loading' && <Notice busy title="Warming up…" text="Gathering questions." />}
      {phase === 'error' && <Notice title="No questions available" action={<button className="btn primary" onClick={() => go('/app/games')}>Back to arcade</button>} />}
      {phase === 'play' && rounds[idx] && <RoundView key={idx} round={rounds[idx]} index={idx} total={rounds.length} timeLimit={meta.time} onNext={onNext} />}
      {phase === 'done' && summary && <>
        <Summary summary={{ ...summary, boss: false }} onAgain={start} onExit={() => go('/app/games')} exitLabel="Back to arcade" againLabel="Play again" />
        <p className="best-streak">Best streak this run: <b>{best}</b></p>
      </>}
    </PlayShell>
  );
}
