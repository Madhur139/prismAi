/*
  ACHIEVEMENTS PAGE
  - Shows every badge Prism can award, greyed out until earned.
  - Route: #/app/achievements
*/
import React, { useEffect } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { AchievementBadge } from '../components/AchievementBadge.jsx';
import { BADGES, earned, checkBadges, badgeOf } from '../utils/achievements.js';
import { readStats, setStat } from '../utils/stats.js';
import { ART } from '../utils/coverImage.js';
import { Empty, Panel } from '../components/ui.jsx';
import { go } from '../utils/router.js';


export function Achievements({ notify }) {
  const badges = earned();
  const stats = readStats();

  // Award badges based on current stats whenever the page loads.
  useEffect(() => {
    const won = checkBadges(stats);
    if (won.length && notify) notify(`New badge${won.length > 1 ? 's' : ''}: ${won.map(w => badgeOf(w).title).join(', ')}`, 'success');
  }, [stats, notify]);

  const toggleTeacher = async () => {
    const nextRole = stats.teacherMode ? 'student' : 'teacher';
    try {
      const d = await api('/auth/role', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: nextRole }) });
      setStat('teacherMode', nextRole === 'teacher');
      notify?.(nextRole === 'teacher' ? 'Teacher mode on — open the Classroom tab.' : 'Teacher mode off.', 'success');
    } catch (e) { notify?.(e.message, 'error'); }
  };

  return (
    <div className="page narrow achievements">
      <div className="page-intro">
        <div>
          <h2>Badges</h2>
          <p>Earn badges by studying, fixing mistakes and helping others.</p>
        </div>
        <div className="badge-count">{badges.length} / {BADGES.length}</div>
      </div>

      {badges.length === 0 && (
        <div className="page-intro" style={{ justifyContent: 'center', marginTop: '40px' }}>
          <Empty art="/images/empty/achievements.svg" title="No badges yet" text="Start studying to earn your first badge. Complete lessons, fix mistakes, and review flashcards to unlock achievements." action={
            <button className="btn primary" onClick={() => go('/app/create')}>
              <Icon name="book" size={17} /> Create Lesson
            </button>
          } />
        </div>
      )}

      <Panel title="Your badges" subtitle="Grey = not earned yet">
        <div className="badge-grid">
          {BADGES.map(b => {
            const got = badges.includes(b.id);
            return (
              <div key={b.id} className={`badge-card ${got ? 'earned' : 'locked'}`}>
                <div className="badge-face">
                  <AchievementBadge id={b.id} />
                </div>
                <div className="badge-info">
                  <div className={got ? 'badge-title earned-title' : 'badge-title locked-title'}>{b.title}</div>
                  <small>{got ? b.desc : 'Keep going to unlock this.'}</small>
                </div>
                {got && <span className="badge-check"><Icon name="check" size={16} /></span>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Teacher mode" subtitle="Open the Classroom tab to create a class and assign lessons.">
        <div className="set-row">
          <div className="set-text"><b>Teacher mode</b><small>Create a class code, add students and set homework.</small></div>
          <button className={`toggle ${stats.teacherMode ? 'on' : ''}`} onClick={toggleTeacher} role="switch" aria-checked={stats.teacherMode}><i /></button>
        </div>
      </Panel>
    </div>
  );
}
