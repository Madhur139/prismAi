/*
  CLASSROOM PANELS
  - The teacher-facing pieces: the weekly report, "who needs help", the AI
    reteach note, the assign dialog, class duels and the roster.
  - Split into small pieces so TeacherPage stays readable.
*/
import React, { useState } from 'react';
import { Icon } from '../Icon.jsx';
import { Field, Modal, Panel, Spinner } from '../ui.jsx';
import { shortDate, dueLabel, dueTone, workStatus } from '../../utils/classroom.js';

/* ---------- a deadline badge, used in a few places ---------- */
export function DueBadge({ dueAt }) {
  const label = dueLabel(dueAt);
  if (!label) return null;
  return <span className={'due-badge ' + dueTone(dueAt)}><Icon name="clock" size={12} /> {label}</span>;
}

/* ---------- the class weekly report ---------- */
export function ClassWeekly({ data }) {
  if (!data) return null;
  const max = Math.max(1, ...data.byDay.map(d => d.rounds));
  const delta = data.accuracy != null && data.previousAccuracy != null ? data.accuracy - data.previousAccuracy : null;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Panel title="This week" subtitle={`${data.active} of ${data.classSize} students active`} action={<span className="soft-tag">Class report</span>}>
      <div className="weekly-stats">
        <div className="weekly-stat"><b>{data.week.rounds}</b><span>rounds</span></div>
        <div className="weekly-stat"><b>{data.accuracy == null ? '—' : data.accuracy + '%'}</b><span>accuracy{delta != null && delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}</span></div>
        <div className="weekly-stat"><b>{data.week.xp}</b><span>XP earned</span></div>
        <div className="weekly-stat"><b>{data.openAssignments}</b><span>with a deadline</span></div>
      </div>

      <div className="weekly-chart" role="img" aria-label={`Rounds per day this week: ${data.byDay.map(d => d.rounds).join(', ')}`}>
        {data.byDay.map((d, i) => (
          <div className="weekly-col" key={d.date} title={`${days[i]}: ${d.rounds} rounds by ${data.activeByDay[i]} students`}>
            <div className="weekly-bar"><i style={{ height: `${Math.max(4, (d.rounds / max) * 100)}%` }} /></div>
            <span>{days[i]}</span>
          </div>
        ))}
      </div>

      {(data.strongest || data.weakest) && (
        <div className="weekly-foot">
          <div>
            {data.strongest && <span className="weekly-chip good"><Icon name="trophy" size={14} /> Strongest: {data.strongest.conceptName} ({data.strongest.pct}%)</span>}
            {data.weakest && <span className="weekly-chip warn"><Icon name="target" size={14} /> Weakest: {data.weakest.conceptName} ({data.weakest.pct}%)</span>}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ---------- who needs help + the AI note ---------- */
export function NeedsHelp({ classData, insight, onAskInsight, insightBusy }) {
  const shared = classData?.sharedWeak || [];
  const students = classData?.needsHelp || [];

  return (
    <Panel
      title="Who needs help"
      subtitle="Where the class is struggling"
      action={
        <button className="btn ghost sm" onClick={onAskInsight} disabled={insightBusy}>
          {insightBusy ? <Spinner /> : <Icon name="sparkles" size={15} />} {insight ? 'Refresh' : 'Ask AI'}
        </button>
      }
    >
      {insight ? (
        <div className="insight">
          <div className="insight-head"><Icon name="sparkles" size={16} /><b>{insight.headline}</b></div>
          <p className="insight-summary">{insight.summary}</p>
          {insight.nextSteps?.length > 0 && (
            <ul className="insight-list">
              {insight.nextSteps.map((s, i) => <li key={i}><Icon name="arrow-right" size={14} />{s}</li>)}
            </ul>
          )}
          {insight.watchOut?.length > 0 && (
            <div className="insight-watch">
              <b>Check in with</b>
              {insight.watchOut.map((s, i) => <span key={i}>{s}</span>)}
            </div>
          )}
        </div>
      ) : shared.length || students.length ? (
        <div className="help-grid">
          {shared.length > 0 && (
            <div className="help-block">
              <h5><Icon name="layers" size={15} /> Tricky for the whole class</h5>
              <div className="help-tags">
                {shared.map(c => (
                  <span className="help-tag" key={c.conceptName}>
                    {c.conceptName} <b>{c.count}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
          {students.length > 0 && (
            <div className="help-block">
              <h5><Icon name="users" size={15} /> Students to check in with</h5>
              <div className="help-students">
                {students.map(s => (
                  <div className="help-student" key={s._id}>
                    <span className="student-avatar small">{(s.name || '?').charAt(0).toUpperCase()}</span>
                    <div>
                      <b>{s.name}</b>
                      <small>{s.missCount} miss{s.missCount === 1 ? '' : 'es'} · {s.weakConcepts.slice(0, 2).join(', ') || 'various'}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="muted pad">Nobody is struggling right now. Once your class starts practising, the tricky concepts show up here.</p>
      )}
    </Panel>
  );
}

/* ---------- assign a piece of work ---------- */
export function AssignModal({ lesson, onClose, onAssign }) {
  const [title, setTitle] = useState(lesson?.topic || '');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [targetRounds, setTargetRounds] = useState(6);
  const [targetAccuracy, setTargetAccuracy] = useState(70);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!lesson) return;
    setBusy(true);
    try {
      await onAssign({ lessonId: lesson._id, title, instructions, dueAt: dueAt || null, targetRounds, targetAccuracy });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <Modal eyebrow="SET WORK" title={lesson ? `Assign “${lesson.topic}”` : 'Assign work'} onClose={() => !busy && onClose()}>
      <Field label="Title for the class"><input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} /></Field>
      <Field label="Instructions" hint="optional">
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} maxLength={500} rows={3} placeholder="e.g. Do the practice round, then try boss mode." />
      </Field>
      <Field label="Due date" hint="optional">
        <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
      </Field>
      <div className="assign-targets">
        <Field label="Finish after" hint="rounds">
          <input type="number" min="0" max="100" value={targetRounds} onChange={e => setTargetRounds(+e.target.value || 0)} />
        </Field>
        <Field label="And reach" hint="% accuracy, 0 = any">
          <input type="number" min="0" max="100" value={targetAccuracy} onChange={e => setTargetAccuracy(+e.target.value || 0)} />
        </Field>
      </div>
      <p className="muted assign-note">Students see a green tick when they reach both numbers. Leave a number at 0 to skip it.</p>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? <><Spinner /> Saving…</> : <><Icon name="plus" size={18} /> Assign to class</>}</button>
      </div>
    </Modal>
  );
}

/* ---------- one assignment, with every student's progress ---------- */
export function AssignmentRow({ assignment, onOpenStudent }) {
  const [open, setOpen] = useState(false);
  const done = assignment.studentsDone || 0;
  const started = assignment.studentsStarted || 0;
  const total = assignment.students?.length || 0;

  return (
    <div className={'assignment-card' + (open ? ' open' : '')}>
      <div className="assignment-head">
        <div className="assignment-copy">
          <b>{assignment.title}</b>
          <span>
            {done}/{total} done
            {started > done && ` · ${started - done} in progress`}
            {assignment.targetRounds ? ` · target ${assignment.targetRounds} rounds` : ''}
            {assignment.targetAccuracy ? ` · ${assignment.targetAccuracy}%` : ''}
          </span>
        </div>
        <div className="assignment-meta">
          <DueBadge dueAt={assignment.dueAt} />
          <button className="btn ghost sm" onClick={() => setOpen(v => !v)}>
            {open ? 'Hide' : 'Details'} <Icon name={open ? 'chevron-right' : 'chevron-right'} size={14} className={open ? 'flip' : ''} />
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="assignment-progress"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      )}

      {open && (
        <div className="assignment-students">
          {(assignment.students || []).map(s => {
            const st = workStatus(s, assignment.targetRounds, assignment.targetAccuracy);
            return (
              <button className={'assignment-student ' + st.key} key={s.studentId} onClick={() => onOpenStudent?.(s.studentId)}>
                <span className="student-avatar small">{(s.name || '?').charAt(0).toUpperCase()}</span>
                <div className="as-copy">
                  <b>{s.name}</b>
                  <small>
                    {s.started ? `${s.attempts} rounds · ${s.accuracy == null ? '—' : s.accuracy + '%'}` : 'has not started'}
                    {s.missedConcepts?.length ? ` · missed ${s.missedConcepts.slice(0, 2).join(', ')}` : ''}
                  </small>
                </div>
                <span className="as-status">{st.label}</span>
              </button>
            );
          })}
          {!total && <p className="muted pad">Nobody has joined your class yet.</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- class duels ---------- */
export function DuelPanel({ lessons, duels, onCreate, onStart, onJoin, busy, isTeacher }) {
  const [lessonId, setLessonId] = useState(lessons[0]?._id || '');
  const [code, setCode] = useState('');

  return (
    <Panel title="Class duels" subtitle="Everybody answers the same rounds at once" action={<span className="soft-tag">Live</span>}>
      {isTeacher ? (
        <div className="duel-create">
          <select value={lessonId} onChange={e => setLessonId(e.target.value)} aria-label="Lesson for the duel">
            {lessons.length ? lessons.map(l => <option key={l._id} value={l._id}>{l.topic}</option>) : <option value="">No lessons yet</option>}
          </select>
          <button className="btn primary sm" disabled={busy || !lessonId} onClick={() => onCreate(lessonId)}>
            {busy ? <Spinner /> : <Icon name="bolt" size={15} />} Start a duel
          </button>
        </div>
      ) : (
        <div className="duel-create">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Duel code" maxLength={4} aria-label="Duel code" />
          <button className="btn primary sm" disabled={busy || code.length < 4} onClick={() => onJoin(code.trim())}>
            {busy ? <Spinner /> : <Icon name="bolt" size={15} />} Join
          </button>
        </div>
      )}

      {duels?.length ? (
        <div className="duel-list">
          {duels.map(d => (
            <div className="duel-row" key={d.code}>
              <span className="duel-code">{d.code}</span>
              <div className="duel-copy">
                <b>{d.title || 'Class duel'}</b>
                <small>
                  {d.players} player{d.players === 1 ? '' : 's'}
                  {d.teacherName ? ` · by ${d.teacherName}` : ''}
                  {d.status === 'playing' ? ` · round ${(d.roundIndex || 0) + 1}` : ''}
                </small>
              </div>
              {d.status === 'waiting' && isTeacher && <button className="btn soft sm" onClick={() => onStart(d.code)}>Start</button>}
              {d.status === 'waiting' && !isTeacher && <button className="btn soft sm" onClick={() => onJoin(d.code)}>Join</button>}
              {d.status === 'playing' && <button className="btn primary sm" onClick={() => onJoin(d.code)}>Play</button>}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted pad">{isTeacher ? 'Start a duel and your class can join with the code.' : 'No duels open right now.'}</p>
      )}
    </Panel>
  );
}

/* ---------- named classes + roster import ---------- */
export function RosterPanel({ classrooms, activeCode, onSelect, onCreate, onImport, onRename, busy }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [roster, setRoster] = useState('');
  const [invites, setInvites] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    await onCreate({ name, subject });
    setName(''); setSubject(''); setShowNew(false);
  };

  const runImport = async () => {
    const added = await onImport(roster);
    if (added) { setInvites(added); setRoster(''); }
  };

  return (
    <Panel
      title="Classes & roster"
      subtitle={classrooms?.length ? `${classrooms.length} class${classrooms.length === 1 ? '' : 'es'}` : 'No classes yet'}
      action={<button className="btn ghost sm" onClick={() => setShowNew(v => !v)}><Icon name={showNew ? 'x' : 'plus'} size={15} /> New class</button>}
    >
      {showNew && (
        <div className="roster-new">
          <Field label="Class name"><input value={name} onChange={e => setName(e.target.value)} placeholder="Physics - Period 3" maxLength={80} /></Field>
          <Field label="Subject" hint="optional"><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Physics" maxLength={60} /></Field>
          <div className="row-gap">
            <button className="btn primary sm" onClick={create} disabled={busy || !name.trim()}>Create class</button>
            <button className="btn ghost sm" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      {classrooms?.length ? (
        <div className="class-list">
          {classrooms.map(c => (
            <button key={c._id} className={'class-row' + (c.code === activeCode ? ' on' : '')} onClick={() => onSelect(c)}>
              <span className="class-ico"><Icon name="users" size={17} /></span>
              <div>
                <b>{c.name || 'Untitled class'}</b>
                <small>{c.subject ? c.subject + ' · ' : ''}{c.code} · {c.studentCount} student{c.studentCount === 1 ? '' : 's'}</small>
              </div>
              {c.code === activeCode && <span className="class-on">active</span>}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted pad">Create a named class, then import your roster.</p>
      )}

      <div className="roster-import">
        <Field label="Import a roster" hint="one per line: Name, email">
          <textarea value={roster} onChange={e => setRoster(e.target.value)} rows={3} placeholder={'Aarav Sharma, aarav@example.com\nPriya Menon'} />
        </Field>
        <button className="btn soft sm" onClick={runImport} disabled={busy || !roster.trim()}>
          {busy ? <Spinner /> : <Icon name="upload" size={15} />} Generate join codes
        </button>
        {invites?.length > 0 && (
          <div className="invite-list">
            {invites.map((i, n) => (
              <div className="invite-row" key={i.code}>
                <span className="invite-name">{i.name}{i.email ? ` · ${i.email}` : ''}</span>
                <span className="invite-code">{i.code}</span>
                <button className="link-btn" onClick={() => navigator.clipboard?.writeText(i.code)}><Icon name="copy" size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
