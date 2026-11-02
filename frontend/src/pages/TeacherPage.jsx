/*
  CLASSROOM
  - Teachers: the class code, the roster, the work they have set, the weekly
    report, who is struggling, class duels and the roster import.
  - Students: the class they joined, the work they were given, and class duels.
*/
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { LessonCover, Panel, Skeleton, Spinner } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import {
  AssignModal, AssignmentRow, ClassWeekly, DueBadge, DuelPanel, NeedsHelp, RosterPanel,
} from '../components/classroom/ClassroomPanels.jsx';
import { go, playLessonUrl } from '../utils/router.js';

export function TeacherPage({ user, lessons, notify }) {
  const isTeacher = user?.role === 'teacher';
  const [classData, setClassData] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [myClass, setMyClass] = useState(null);
  const [duels, setDuels] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [insightBusy, setInsightBusy] = useState(false);
  const [assignFor, setAssignFor] = useState(null);
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = await api('/teacher/assignments');
      setAssignments(a);
      if (isTeacher) {
        const [c, w, d, rooms] = await Promise.all([
          api('/teacher/class'),
          api('/teacher/weekly').catch(() => null),
          api('/classduel/mine').catch(() => ({ duels: [] })),
          api('/teacher/classrooms').catch(() => ({ classrooms: [] })),
        ]);
        setClassData(c); setWeekly(w); setDuels(d.duels || []); setClassrooms(rooms.classrooms || []);
        setCode(c.classCode || '');
      } else {
        const [mc, d] = await Promise.all([
          api('/teacher/my-class').catch(() => ({ joined: false })),
          api('/classduel/mine').catch(() => ({ duels: [] })),
        ]);
        setMyClass(mc); setDuels(d.duels || []);
      }
    } catch (e) { notify?.(e.message, 'error'); } finally { setLoading(false); }
  }, [isTeacher, notify]);

  useEffect(() => { load(); }, [load]);

  const makeCode = async () => {
    setBusy(true);
    try {
      const d = await api('/teacher/class', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      setCode(d.classCode); notify?.('Class code created.', 'success'); load();
    } catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };

  const join = async () => {
    setBusy(true);
    try {
      const d = await api('/teacher/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: joinCode.trim().toUpperCase() }) });
      notify?.(d.className ? `You joined ${d.className}.` : 'You joined the class.', 'success');
      setJoinCode(''); load();
    } catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };

  const doAssign = async (payload) => {
    try {
      await api('/teacher/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      notify?.('Work set for the class.', 'success');
      load();
    } catch (e) { notify?.(e.message, 'error'); }
  };

  const unassign = async id => {
    try { await api(`/teacher/assign/${id}`, { method: 'DELETE' }); notify?.('Assignment removed.', 'success'); load(); }
    catch (e) { notify?.(e.message, 'error'); }
  };

  const askInsight = async () => {
    setInsightBusy(true);
    try { const d = await api('/teacher/insight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); setInsight(d); }
    catch (e) { notify?.(e.message, 'error'); } finally { setInsightBusy(false); }
  };

  /* INVITE a student to my class. They accept it in their inbox. */
  const inviteStudent = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setBusy(true);
    try {
      await api('/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'class', people: [email] }) });
      notify?.(`Invitation sent to ${email}.`, 'success');
      setInviteEmail('');
    } catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };

  /* An assigned lesson belongs to the teacher, so we copy it into the
     student's own library the first time they open it. */
  const playAssigned = async lessonId => {
    setBusy(true);
    try {
      const d = await api('/lessons/copy-assigned', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId }) });
      go(playLessonUrl(d.lesson._id));
    } catch (e) { notify?.(e.message, 'error'); setBusy(false); }
  };

  /* ---- class duels ---- */
  const createDuel = async lessonId => {
    setBusy(true);
    try {
      const d = await api('/classduel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId }) });
      notify?.(`Duel ${d.code} is ready — share the code.`, 'success');
      load();
    } catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };
  const joinDuel = async c => {
    setBusy(true);
    try {
      await api(`/classduel/${c}/join`, { method: 'POST' });
      go(`/play/class-duel/${c}`);
    } catch (e) { notify?.(e.message, 'error'); setBusy(false); }
  };
  const startDuel = async c => {
    setBusy(true);
    try { await api(`/classduel/${c}/start`, { method: 'POST' }); notify?.('The duel has started.', 'success'); load(); }
    catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };

  /* ---- named classes + roster ---- */
  const createClassroom = async ({ name, subject }) => {
    setBusy(true);
    try { await api('/teacher/classrooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, subject }) }); notify?.('Class created.', 'success'); load(); }
    catch (e) { notify?.(e.message, 'error'); } finally { setBusy(false); }
  };
  const importRoster = async (rosterText) => {
    setBusy(true);
    try {
      const room = classrooms?.find(c => c.code === code) || classrooms?.[0];
      if (!room) { notify?.('Create a class first.', 'error'); return null; }
      const d = await api(`/teacher/classrooms/${room._id}/roster`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roster: rosterText }) });
      notify?.(`${d.count} join code${d.count === 1 ? '' : 's'} created.`, 'success');
      load();
      return d.added;
    } catch (e) { notify?.(e.message, 'error'); return null; } finally { setBusy(false); }
  };

  if (loading) return <div className="page"><Skeleton style={{ height: 200 }} /><Skeleton style={{ height: 260 }} /></div>;

  /* ======================= TEACHER ======================= */
  if (isTeacher) {
    return (
      <div className="page classroom">
        <div className="page-intro">
          <div>
            <h2>{classData?.className || 'Your classroom.'}</h2>
            <p>
              {classData?.subject ? `${classData.subject} · ` : ''}
              {classData?.total ? `${classData.total} student${classData.total === 1 ? '' : 's'}` : 'Nobody has joined yet'}
            </p>
          </div>
          {code && <span className="class-code-badge">{code}</span>}
        </div>

        <section className="panel set-card">
          <h3>Class code</h3>
          {code ? (
            <div className="code-row">
              <span className="class-code">{code}</span>
              <button className="btn ghost" disabled={busy} onClick={makeCode}>New code</button>
              <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(code); notify?.('Code copied.', 'success'); }}><Icon name="copy" size={16} /> Copy</button>
            </div>
          ) : (
            <>
              <p className="muted">You do not have a class code yet. Create one and share it with your students — they type it on their own Classroom tab to join you.</p>
              <button className="btn primary" disabled={busy} onClick={makeCode}>{busy ? <Spinner /> : <><Icon name="plus" size={17} /> Create my class code</>}</button>
            </>
          )}
        </section>

        <section className="panel set-card">
          <h3>Invite a student</h3>
          <p className="muted">Send an invitation instead of a class code. The student accepts it and joins your class.</p>
          <div className="code-row">
            <input className="code-input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="student@school.com" aria-label="Student email" />
            <button className="btn primary" disabled={busy || !inviteEmail.trim()} onClick={inviteStudent}>
              {busy ? <Spinner /> : <><Icon name="send" size={16} /> Invite</>}
            </button>
          </div>
        </section>

        <div className="two-col">
          <NeedsHelp classData={classData} insight={insight} onAskInsight={askInsight} insightBusy={insightBusy} />
          <ClassWeekly data={weekly} />
        </div>

        <Panel title="Students" subtitle={classData?.total ? `${classData.total} in your class` : 'Nobody has joined yet'}>
          {classData?.students?.length ? (
            <div className="student-list">
              {classData.students.map(s => (
                <div className="student-row" key={s._id}>
                  <div className="student-avatar">{(s.name || '?').charAt(0).toUpperCase()}</div>
                  <div className="student-info"><b>{s.name}</b><small>{s.email}</small></div>
                  <div className="student-stats">
                    <span><Icon name="bolt" size={14} /> {(s.totalXP || 0).toLocaleString()}</span>
                    <span>{s.attempts ? `${s.accuracy}% right` : 'not started'}</span>
                    {s.weakConcepts?.length > 0 && <span className="warn"><Icon name="alert" size={13} /> {s.weakConcepts.length} weak</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="muted pad">Share your class code to get started.</p>}
        </Panel>

        <Panel title="Set work" subtitle="Give a lesson to the whole class">
          <div className="assign-list">
            {lessons.length ? lessons.map(l => (
              <div className="assign-row" key={l._id}>
                <LessonCover lesson={l} className="mini" />
                <div className="pr-info"><b>{l.topic}</b><span>{l.concepts?.length || 0} concepts</span></div>
                <button className="btn primary sm" disabled={busy} onClick={() => setAssignFor(l)}><Icon name="plus" size={14} /> Assign</button>
              </div>
            )) : <p className="muted pad">Create a lesson first.</p>}
          </div>
        </Panel>

        <Panel title="Assignments" subtitle="Who has done what">
          {assignments?.assignments?.length ? (
            <div className="assignment-list">
              {assignments.assignments.map(a => (
                <AssignmentRow key={a._id} assignment={a} />
              ))}
            </div>
          ) : <p className="muted pad">Nothing assigned yet.</p>}
        </Panel>

        <div className="two-col">
          <DuelPanel lessons={lessons} duels={duels} onCreate={createDuel} onStart={startDuel} onJoin={joinDuel} busy={busy} isTeacher />
          <RosterPanel
            classrooms={classrooms}
            activeCode={code}
            onSelect={(c) => { setCode(c.code); notify?.(`Switched to ${c.name}.`, 'success'); }}
            onCreate={createClassroom}
            onImport={importRoster}
            busy={busy}
          />
        </div>

        {assignFor && (
          <AssignModal lesson={assignFor} onClose={() => setAssignFor(null)} onAssign={doAssign} />
        )}
      </div>
    );
  }

  /* ======================= STUDENT ======================= */
  return (
    <div className="page classroom animate-fade-up">
      <div className="page-intro">
        <div>
          <h2>{myClass?.classroom?.name || 'Your class.'}</h2>
          <p>
            {myClass?.classroom?.subject ? `${myClass.classroom.subject} · ` : ''}
            {myClass?.teacher?.name ? `with ${myClass.teacher.name}` : 'Join a class to see your work'}
          </p>
        </div>
        {myClass?.classroom?.code && <span className="class-code-badge">{myClass.classroom.code}</span>}
      </div>

      <section className="panel set-card">
        <h3>Join a class</h3>
        <div className="code-row">
          <input className="code-input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ABCD-1234" maxLength={9} aria-label="Class code" />
          <button className="btn primary" disabled={busy || joinCode.trim().length < 4} onClick={join}>{busy ? 'Joining…' : 'Join'}</button>
        </div>
      </section>

      <Panel title="Your work" subtitle="Lessons your teacher set">
        {assignments?.forMe?.length ? (
          <div className="assign-list">
            {assignments.forMe.map(a => {
              const need = a.targetRounds || 0;
              const pct = need ? Math.min(100, Math.round((a.attempts / need) * 100)) : (a.done ? 100 : 0);
              return (
                <div className="assign-row work-row" key={a._id}>
                  <div className="pr-info">
                    <b>{a.title}</b>
                    <span>
                      {a.instructions || `From ${a.teacherName}`}
                      {a.attempts ? ` · ${a.correct}/${a.attempts} right${a.accuracy != null ? ` (${a.accuracy}%)` : ''}` : ' · not started'}
                    </span>
                    {need > 0 && (
                      <span className="work-progress">
                        <i style={{ width: `${pct}%` }} />
                        {a.targetAccuracy ? ` · ${a.targetAccuracy}% needed` : ''}
                      </span>
                    )}
                  </div>
                  <DueBadge dueAt={a.dueAt} />
                  {a.done ? <span className="work-done"><Icon name="check" size={15} /> Done</span> : null}
                  <button className="btn primary sm" disabled={busy} onClick={() => playAssigned(a.lessonId)}>
                    {busy ? <Spinner /> : <Icon name="play" size={14} fill="currentColor" />} Practice
                  </button>
                </div>
              );
            })}
          </div>
        ) : <p className="muted pad">Nothing assigned yet. Join a class to see your work.</p>}
      </Panel>

      <DuelPanel lessons={[]} duels={duels} onCreate={createDuel} onStart={startDuel} onJoin={joinDuel} busy={busy} isTeacher={false} />
    </div>
  );
}
