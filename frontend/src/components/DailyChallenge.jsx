/*
  DAILY CHALLENGE
  - One random lesson/game picked each day. Same challenge for everyone,
    so friends can compare scores. Stored in localStorage so it persists
    until the next day.
*/
import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Panel, Empty } from '../components/ui.jsx';
import { gameIcon } from '../constants/games.js';
import { go, playLessonUrl } from '../utils/router.js';

const KEY = 'prism_daily';
const DEFAULT_TYPE = 'MULTIPLE_CHOICE';

function todayKey() { return new Date().toLocaleDateString('en-CA'); }

/** A challenge must always have the fields the card renders, even when the
 *  lessons list came from the API without its game details. */
function normalizeChallenge(c) {
  if (!c) return null;
  return {
    ...c,
    lesson: c.lesson || 'Lesson',
    concept: c.concept || 'General',
    game: c.game || 'Answer the question',
    type: c.type || DEFAULT_TYPE,
    answer: c.answer || '',
  };
}

export function DailyChallenge({ lessons, notify }) {
  const [challenge, setChallenge] = useState(null);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // New shape is { date, challenge }; older builds stored the challenge
        // itself. Accept both so a stale entry cannot break the dashboard.
        const c = data?.challenge || data;
        if (c && c.date === todayKey()) { setChallenge(normalizeChallenge(c)); return; }
      } catch {}
    }
    if (!lessons?.length) { setChallenge(null); return; }
    const lesson = lessons[Math.floor(Math.random() * lessons.length)];
    const concepts = lesson?.concepts || [];
    const concept = concepts.length ? concepts[Math.floor(Math.random() * concepts.length)] : null;
    const games = concept?.microGames || [];
    const game = games.length ? games[Math.floor(Math.random() * games.length)] : null;
    const c = {
      lessonId: lesson._id,
      lesson: lesson.topic || 'Lesson',
      concept: concept?.conceptName || 'General',
      game: game?.prompt || 'Answer the question',
      type: game?.type || DEFAULT_TYPE,
      answer: game?.answer || '',
      date: todayKey(),
    };
    try { localStorage.setItem(KEY, JSON.stringify({ date: c.date, challenge: c })); } catch {}
    setChallenge(c);
  }, [lessons]);

  const answerCorrect = (userAns) => {
    if (!challenge) return false;
    return String(userAns || '').trim().toLowerCase() === String(challenge.answer || '').trim().toLowerCase();
  };

  if (!challenge) return <Empty icon="target" title="No daily challenge yet" text="Create a lesson and a daily challenge will appear here." />;

  return (
    <Panel title="Daily challenge" subtitle="One question, every day — same for every learner.">
      <div className="daily-card">
        <div className="daily-head">
          <span className="daily-chip"><Icon name={gameIcon(challenge.type) || 'target'} size={14} /> {String(challenge.type || DEFAULT_TYPE).replace(/_/g, ' ')}</span>
          <span className="daily-source">{challenge.lesson} · {challenge.concept}</span>
        </div>
        <div className="daily-question">{challenge.game}</div>
        {!picked && (
          <div className="daily-answer">
            <input className="daily-input" placeholder="Your answer" />
            <button className="btn primary sm" onClick={() => {
              const inp = document.querySelector('.daily-input');
              const userAns = inp ? inp.value : '';
              const ok = answerCorrect(userAns);
              setPicked(ok);
              const msg = ok ? 'Correct! Challenge complete.' : 'Not quite — the answer was "' + challenge.answer + '".';
              notify?.(msg, ok ? 'success' : 'error');
              if (ok) go(playLessonUrl(challenge.lessonId));
            }}>Check</button>
          </div>
        )}
        {picked === true && <div className="daily-ok"><Icon name="check" size={18} /> Challenge complete — keep the streak going.</div>}
        {picked === false && <div className="daily-no"><Icon name="x" size={18} /> Try again tomorrow.</div>}
      </div>
    </Panel>
  );
}
