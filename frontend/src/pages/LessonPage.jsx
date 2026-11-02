/*
  LESSON PAGE - overview of one lesson. "Start" buttons open the full-screen game page (#/play/lesson/<id>).
  It also shows how well the learner knows each concept (mastery rings) and
  lets them add games, export flashcards or share the lesson.
*/
import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { VideoCard } from '../components/VideoCard.jsx';
import { ListenPlayer } from '../components/ListenPlayer.jsx';
import { DepthLevels } from '../components/DepthLevels.jsx';
import { PlaySetup } from '../components/PlaySetup.jsx';
import { GameBadge, LessonCover, Modal, Panel, Ring, Skeleton, Spinner } from '../components/ui.jsx';
import { CustomGameEditor } from '../components/CustomGameEditor.jsx';
import { Icon } from '../components/Icon.jsx';
import { GAME_META, LEVEL_NAMES } from '../constants/games.js';
import { gameCount } from '../utils/helpers.js';
import { exportLesson } from '../utils/exportFlashcards.js';
import { useReveal } from '../utils/reveal.js';
import { go, playLessonUrl, writeUrl } from '../utils/router.js';

/* The game types a learner can ask us to add. "Auto" lets the AI decide. */
const ADD_TYPES = ['TRUE_FALSE', 'ORDERING', 'MATCH_PAIRS', 'MATH_SPRINT', 'ODD_ONE_OUT', 'TWO_TRUE_ONE_FALSE', 'ANAGRAM', 'CLOZE', 'MEMORY_MATCH', 'ODD_EQUATION', 'WORD_LADDER', 'CODE_OUTPUT', 'CHART_QUESTION', 'SENTENCE_UNSCRAMBLE', 'TIMELINE', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'SUPER_QUIZ', 'WORD_SNAKE'];

export function LessonPage({ id, refresh, notify }) {
  const [lesson, setLesson] = useState(null), [error, setError] = useState(''), [regen, setRegen] = useState(null);
  const [mastery, setMastery] = useState(null);
  const [addFor, setAddFor] = useState(null), [addType, setAddType] = useState('AUTO'), [addBusy, setAddBusy] = useState(false);
  const [customEditor, setCustomEditor] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false), [inviteEmail, setInviteEmail] = useState(''), [inviteBusy, setInviteBusy] = useState(false);
  const [share, setShare] = useState(null), [shareBusy, setShareBusy] = useState(false);
  const [listen, setListen] = useState(null);
  const [depth, setDepth] = useState(null);
  useReveal();

  useEffect(() => {
    let live = true; setLesson(null); setError('');
    api(`/lessons/${id}`).then(d => live && setLesson(d.lesson)).catch(e => live && setError(e.message));
    // Mastery is extra information: if it fails, the lesson still works.
    api(`/progress/lesson/${id}`).then(d => live && setMastery(d)).catch(() => {});
    return () => { live = false; };
  }, [id]);

  const back = () => go('/app/lessons');
  const regenerate = async (ci, gi) => {
    setRegen(`${ci}-${gi}`);
    try {
      const d = await api(`/lessons/${id}/regenerate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conceptIndex: ci, gameIndex: gi }) });
      setLesson(l => ({ ...l, concepts: l.concepts.map((c, i) => i !== ci ? c : { ...c, microGames: c.microGames.map((g, j) => j === gi ? d.game : g) }) }));
      notify('Game regenerated.', 'success'); refresh();
    } catch (e) { notify(e.message, 'error'); } finally { setRegen(null); }
  };

  /*
    ADD GAMES - the AI writes brand-new games for this lesson.
    Without a conceptIndex the server adds one game to EVERY concept,
    so the lesson grows in every part, not just the first one.
  */
  const openAdd = (conceptIndex, title) => { setAddType('AUTO'); setAddFor({ conceptIndex, title }); };
  const addGames = async () => {
    if (!addFor) return;
    const ci = addFor.conceptIndex;
    setAddBusy(true);
    try {
      const body = JSON.stringify(ci === undefined ? { count: 1 } : { conceptIndex: ci, count: 1, type: addType === 'AUTO' ? undefined : addType });
      const d = await api(`/lessons/${id}/add-games`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const added = d.added || [];
      setLesson(l => ({
        ...l,
        concepts: l.concepts.map((c, i) => {
          const extra = added.filter(a => a.conceptIndex === i).map(a => a.game);
          return extra.length ? { ...c, microGames: [...c.microGames, ...extra] } : c;
        }),
      }));
      const n = d.count || added.length;
      notify(`${n} new game${n === 1 ? '' : 's'} added.`, 'success');
      setAddFor(null);
      refresh();
    } catch (e) { notify(e.message, 'error'); } finally { setAddBusy(false); }
  };

  /* CUSTOM GAME - write your own question for this concept. */
  const openCustom = (ci) => setCustomEditor({ conceptIndex: ci, title: lesson.concepts[ci]?.conceptName || '' });
  const saveCustom = (game) => {
    const ci = customEditor?.conceptIndex;
    if (ci === undefined) return;
    setLesson(l => ({
      ...l,
      concepts: l.concepts.map((c, i) => i === ci ? { ...c, microGames: [...c.microGames, game] } : c),
    }));
    notify('Your question was added.', 'success');
    setCustomEditor(null);
    refresh();
  };

  // SHARE - a read-only link anybody can open
  const startShare = async () => {
    setShareBusy(true);
    try {
      const d = await api(`/lessons/${id}/share`, { method: 'POST' });
      const url = `${window.location.origin}${window.location.pathname}#/shared/${d.token}`;
      setShare({ url });
      try { await navigator.clipboard.writeText(url); notify('Link copied to your clipboard.', 'success'); } catch {}
    } catch (e) { notify(e.message, 'error'); } finally { setShareBusy(false); }
  };
  const stopShare = async () => {
    setShareBusy(true);
    try { await api(`/lessons/${id}/share`, { method: 'DELETE' }); setShare(null); notify('Sharing stopped.', 'success'); }
    catch (e) { notify(e.message, 'error'); } finally { setShareBusy(false); }
  };

  // FLASHCARDS - Anki / Quizlet deck
  const doExport = () => {
    const n = exportLesson(lesson);
    if (n) notify(`${n} cards exported for Anki or Quizlet.`, 'success');
    else notify('This lesson has no cards to export yet.', 'error');
  };

  /* INVITE somebody to this lesson. They accept it and it lands in their library. */
  const sendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviteBusy(true);
    try {
      await api('/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'lesson', targetId: id, people: [email] }) });
      notify(`Invitation sent to ${email}.`, 'success');
      setInviteEmail(''); setInviteOpen(false);
    } catch (e) { notify(e.message, 'error'); } finally { setInviteBusy(false); }
  };

  /* DIAGRAM - the AI draws a labelled diagram and adds the two games that use it. */
  const addDiagram = async (ci) => {
    setDrawing(ci);
    try {
      const d = await api(`/lessons/${id}/diagram`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conceptIndex: ci }) });
      setLesson(l => ({
        ...l,
        concepts: l.concepts.map((c, i) => i !== ci ? c : { ...c, microGames: [...c.microGames, ...(d.games || [])] }),
      }));
      notify(`Diagram added: ${d.title || 'new diagram'}.`, 'success');
      refresh();
    } catch (e) { notify(e.message, 'error'); } finally { setDrawing(null); }
  };

  // LISTEN - the AI writes a spoken summary, the browser reads it out loud.
  const openListen = async () => {
    setListen({ open: true, loading: true, error: '' });
    try {
      const d = await api('/ai/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: id }) });
      setListen({ open: true, loading: false, error: '', script: d.script, title: d.title, durationSec: d.durationSec });
    } catch (e) {
      setListen({ open: true, loading: false, error: e.message });
    }
  };

  const del = async () => {
    if (!window.confirm('Delete this lesson? This cannot be undone.')) return;
    try { await api(`/lessons/${id}`, { method: 'DELETE' }); notify('Lesson deleted.', 'success'); back(); refresh(); }
    catch (e) { notify(e.message, 'error'); }
  };

  if (error) return <div className="page narrow"><button className="back-btn" onClick={back}><Icon name="arrow-left" size={17} /> Library</button><div className="alert error"><Icon name="alert" size={18} /><span>{error}</span></div></div>;
  if (!lesson) return (
    <div className="page">
      <Skeleton className="hero-sk" />
      <Skeleton style={{ height: 260 }} />
    </div>
  );

  const mRow = name => (mastery?.concepts || []).find(c => c.conceptName === name) || null;
  const weak = mastery?.weak || [];

  return (
    <div className="page lesson-page">
      <button className="back-btn" onClick={back}><Icon name="arrow-left" size={17} /> Library</button>
      <section className="lesson-hero" data-reveal="">
        <LessonCover lesson={lesson} className="hero" />
        <div className="lesson-hero-copy">
          <div className="lesson-kicker"><span className="soft-tag">{lesson.sourceType}</span><span>{lesson.concepts.length} concepts</span><span>·</span><span>{gameCount(lesson)} games</span></div>
          <h2>{lesson.topic}</h2>
          <p>A personalised practice path — weak concepts come back more often until they stick.</p>
          <div className="row-gap">
            <button className="btn primary lg" onClick={() => go(playLessonUrl(lesson._id))}><Icon name="play" size={18} fill="currentColor" /> Quick practice</button>
            <button className="btn danger-soft lg" onClick={() => go(playLessonUrl(lesson._id, { mode: 'boss', topics: null, types: null }))}><Icon name="skull" size={18} /> Boss fight</button>
            <button className="btn ghost lg" onClick={() => go(writeUrl(lesson._id))}><Icon name="pencil" size={18} /> Write & AI check</button>
            <button className="btn ghost lg" onClick={openListen}><Icon name="headphones" size={18} /> Listen</button>
            <button className="btn ghost lg" onClick={() => openAdd(undefined, 'Add a game to every concept')}>
              <Icon name="plus" size={18} /> Add more games
            </button>
            <button className="btn ghost lg" onClick={doExport}><Icon name="layers" size={18} /> Export cards</button>
            <button className="btn ghost lg" onClick={() => setInviteOpen(true)}><Icon name="users" size={18} /> Invite someone</button>
            <button className="btn ghost lg" disabled={shareBusy} onClick={startShare}>
              {shareBusy ? <Spinner /> : <Icon name="external" size={18} />} Share
            </button>
            <button className="btn ghost lg" onClick={del}><Icon name="trash" size={18} /> Delete</button>
          </div>
        </div>
      </section>

      {weak.length > 0 && (
        <section className="panel weak-panel">
          <div className="panel-head">
            <div><h3>Needs work</h3><span>{weak.length} concept{weak.length === 1 ? '' : 's'} you keep missing</span></div>
            <button className="btn primary sm" onClick={() => go(playLessonUrl(lesson._id, { mode: 'practice', topics: weak, types: null }))}>
              <Icon name="target" size={15} /> Review weak spots
            </button>
          </div>
          <div className="weak-chips">{weak.map(w => <span key={w} className="chip warn">{w}</span>)}</div>
        </section>
      )}

      <PlaySetup lesson={lesson} onStart={cfg => go(playLessonUrl(lesson._id, cfg))} />
      <VideoCard lesson={lesson} />

      <Panel title="Concepts" subtitle="What this lesson covers">
        <div className="concept-list">
          {lesson.concepts.map((c, ci) => {
            const m = mRow(c.conceptName);
            return (
              <div className="concept" key={ci}>
                <span className="concept-num">{String(ci + 1).padStart(2, '0')}</span>
                <div className="concept-main">
                  <h4>{c.conceptName}</h4>
                  <p>{c.summary || 'Practice this concept through a mix of short games.'}</p>
                  <div className="concept-games">{c.microGames.map((g, gi) => (
                    <span className="game-chip" key={gi}><GameBadge type={g.type} />
                      <span className={`level-dot lvl${g.level || 2}`} title={`${LEVEL_NAMES[g.level || 2]} difficulty`}>{g.level || 2}</span>
                      <button title="Regenerate this game" aria-label="Regenerate this game" disabled={regen === `${ci}-${gi}`} onClick={() => regenerate(ci, gi)}>{regen === `${ci}-${gi}` ? <Spinner /> : <Icon name="refresh" size={14} />}</button>
                    </span>))}</div>
                </div>
                <div className="concept-side">
                  {m && (
                    <div className="mastery" title={`${m.correct} of ${m.total} correct`}>
                      <Ring value={m.mastery} size={54} stroke={6} label={`Mastery ${m.mastery}%`}><b>{m.mastery}%</b></Ring>
                      <span className="mastery-note">{m.total ? `${m.correct}/${m.total} right` : 'not played yet'}</span>
                    </div>
                  )}
                  <div className="concept-btns">
                    <button className="btn ghost sm" onClick={() => go(playLessonUrl(lesson._id, { mode: 'practice', topics: [c.conceptName], types: null }))}><Icon name="play" size={14} fill="currentColor" /> Practice</button>
                    <button className="btn ghost sm" onClick={() => go(writeUrl(lesson._id, { concept: c.conceptName }))}><Icon name="pencil" size={14} /> Write</button>
                    <button className="btn ghost sm" onClick={() => setDepth(c.conceptName)} title="Explain this concept simply, normally and in depth"><Icon name="layers" size={14} /> 3 ways</button>
                    <button className="btn ghost sm" onClick={() => openAdd(ci, `Add a game to “${c.conceptName}”`)} title="Add a new game to this concept">
                      <Icon name="plus" size={14} /> Add game
                    </button>
                    <button className="btn ghost sm" onClick={() => openCustom(ci)} title="Write your own question for this concept">
                      <Icon name="pencil" size={14} /> Add my question
                    </button>
                    <button className="btn ghost sm" disabled={drawing !== null} onClick={() => addDiagram(ci)} title="The AI draws a labelled diagram and adds diagram games">
                      {drawing === ci ? <Spinner /> : <Icon name="image" size={14} />} {drawing === ci ? 'Drawing…' : 'Add diagram'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {addFor && (
        <Modal eyebrow="ADD GAMES" title={addFor.title} onClose={() => !addBusy && setAddFor(null)}>
          <p className="muted">Pick the kind of game you want. <b>Auto</b> lets the AI choose what fits the topic best.</p>
          <div className="add-game-list">
            <div className="pick-grid">
              <button className={`game-pick ${addType === 'AUTO' ? 'on' : ''}`} style={{ '--c': '#7c6cff' }} onClick={() => setAddType('AUTO')}>
                <span className="gp-icon"><Icon name="sparkles" size={20} /></span><b>Auto</b><small>AI picks the best type</small>
              </button>
              {ADD_TYPES.map(t => {
                const m = GAME_META[t];
                return (
                  <button key={t} className={`game-pick ${addType === t ? 'on' : ''}`} style={{ '--c': m.color }} onClick={() => setAddType(t)}>
                    <span className="gp-icon"><Icon name={m.icon} size={20} /></span><b>{m.label}</b><small>{m.blurb}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="row-gap" style={{ marginTop: 18 }}>
            <button className="btn primary" disabled={addBusy} onClick={addGames}>
              {addBusy ? <><Spinner /> Creating…</> : <><Icon name="plus" size={18} /> {addFor.conceptIndex === undefined ? 'Add to every concept' : 'Add game'}</>}
            </button>
            <button className="btn ghost" disabled={addBusy} onClick={() => setAddFor(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {customEditor && (
        <Modal eyebrow="CUSTOM QUESTION" title={`Write your own — ${customEditor.title}`} onClose={() => setCustomEditor(null)}>
          <CustomGameEditor
            lessonId={id}
            conceptIndex={customEditor.conceptIndex}
            conceptTitle={customEditor.title}
            onAdded={saveCustom}
            onClose={() => setCustomEditor(null)}
          />
        </Modal>
      )}

      {listen && (
        <ListenPlayer
          open
          onClose={() => setListen(null)}
          script={listen.script}
          title={listen.title}
          durationSec={listen.durationSec}
          loading={listen.loading}
          error={listen.error}
        />
      )}

      {depth && (
        <DepthLevels open onClose={() => setDepth(null)} lessonId={lesson._id} conceptName={depth} topic={lesson.topic} />
      )}

      {inviteOpen && (
        <Modal eyebrow="INVITE" title="Share this lesson with somebody" onClose={() => !inviteBusy && setInviteOpen(false)}>
          <p className="muted">They will get an invitation in their inbox. When they accept it, the lesson is copied into their own library so they can play it and earn their own XP.</p>
          <input className="ask-title" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="their@email.com" aria-label="Their email address" />
          <div className="modal-actions">
            <button className="btn ghost" disabled={inviteBusy} onClick={() => setInviteOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={inviteBusy || !inviteEmail.trim()} onClick={sendInvite}>
              {inviteBusy ? <><Spinner /> Sending…</> : <><Icon name="send" size={17} /> Send invitation</>}
            </button>
          </div>
        </Modal>
      )}

      {share && (
        <Modal eyebrow="SHARE" title="Anyone with this link can read the lesson" onClose={() => setShare(null)}>
          <div className="share-box">
            <input readOnly value={share.url} onFocus={e => e.target.select()} aria-label="Share link" />
            <button className="btn primary" onClick={() => { navigator.clipboard?.writeText(share.url); notify('Link copied.', 'success'); }}><Icon name="copy" size={17} /> Copy</button>
          </div>
          <p className="muted">They can read the lesson but cannot change it, and they get no XP.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={stopShare}>Stop sharing</button>
            <button className="btn primary" onClick={() => setShare(null)}>Done</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
