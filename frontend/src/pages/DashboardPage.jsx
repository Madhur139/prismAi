/*
  DASHBOARD - greeting, daily goal, stats, activity chart, heatmap,
  concept mastery, focus concepts and latest lessons.
*/
import React, { useMemo, useState, useEffect } from 'react';
import { Empty, LessonCover, Panel, Ring, StatCard, useToast } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Heatmap } from '../components/Heatmap.jsx';
import { DailyChallenge } from '../components/DailyChallenge.jsx';
import { api } from '../api/client.js';
import { ART } from '../utils/coverImage.js';
import { dayKey, firstName, gameCount, greeting, lessonMeta } from '../utils/helpers.js';
import { useReveal } from '../utils/reveal.js';
import { go, playLessonUrl } from '../utils/router.js';

export function Dashboard({ user, progress, lessons, loading, activity = [] }) {
  const attempts = progress?.recentAttempts || [], accuracy = progress?.accuracy, weak = progress?.weakConcepts || [];
  const [toast, notify] = useToast();
  // Concepts that are due today thanks to spaced repetition.
  const [review, setReview] = useState(null);
  useReveal();
  useEffect(() => {
    let live = true;
    api('/progress/review').then(d => live && setReview(d)).catch(() => {});
    return () => { live = false; };
  }, []);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); const key = dayKey(d);
    return { label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), count: attempts.filter(a => a.at && dayKey(a.at) === key).length, today: i === 6 };
  }), [attempts]);

  /* Accuracy per concept, so the learner can see what is actually sticking. */
  const mastery = useMemo(() => {
    const by = {};
    attempts.forEach(a => {
      if (!a.conceptName) return;
      const x = by[a.conceptName] || (by[a.conceptName] = { ok: 0, n: 0 });
      x.n++; if (a.correct) x.ok++;
    });
    return Object.entries(by)
      .map(([name, v]) => ({ name, pct: Math.round(v.ok / v.n * 100), n: v.n }))
      .sort((a, b) => b.pct - a.pct || b.n - a.n)
      .slice(0, 6);
  }, [attempts]);

  const today = week[6].count, goal = 10, max = Math.max(4, ...week.map(d => d.count)), latest = lessons[0];
  const msg = !lessons.length ? 'Create your first lesson and Prism will turn it into games.' : today >= goal ? 'Daily goal complete — brilliant work!' : today ? `${goal - today} more round${goal - today === 1 ? '' : 's'} to hit today’s goal.` : 'A few quick rounds today keeps your streak alive.';

  return (
    <div className="page dashboard">
      <section className="hero-card">
        <div className="hero-card-copy">
          <span className="eyebrow">TODAY</span>
          <h2>{greeting()}, {firstName(user.name)}.</h2>
          <p>{msg}</p>
          <div className="row-gap">
            {latest ? <>
              <button className="btn primary lg" onClick={() => go(playLessonUrl(latest._id))}><Icon name="play" size={18} fill="currentColor" /> Continue: {latest.topic.length > 22 ? latest.topic.slice(0, 22) + '…' : latest.topic}</button>
              <button className="btn glass lg" onClick={() => go('/app/create')}><Icon name="plus" size={18} /> New lesson</button>
            </> : <button className="btn primary lg" onClick={() => go('/app/create')}><Icon name="plus" size={18} /> Create your first lesson</button>}
          </div>
        </div>
        <div className="hero-card-goal">
          <Ring value={today / goal * 100} size={132} stroke={12}><b className="ring-num">{Math.min(today, goal)}<small>/{goal}</small></b><span>rounds today</span></Ring>
          <div className="streak-pill"><Icon name="flame" size={16} fill="currentColor" /> {progress?.streakCount || 0} day streak</div>
        </div>
      </section>

      {lessons.length && <DailyChallenge lessons={lessons} notify={notify} />}

      <section className="quick-grid" data-reveal="">
        <button className="quick" onClick={() => go('/app/write')}><span style={{ '--c': '#06b6d4' }}><Icon name="pencil" size={22} /></span><b>Write & AI check</b><small>Answer in your words</small></button>
        <button className="quick" onClick={() => go('/app/games')}><span style={{ '--c': '#f43f5e' }}><Icon name="gamepad" size={22} /></span><b>Arcade</b><small>Quick-play games</small></button>
        <button className="quick" onClick={() => go('/app/ai')}><span style={{ '--c': '#7c6cff' }}><Icon name="sparkles" size={22} /></span><b>Ask Prism AI</b><small>Get anything explained</small></button>
        <button className="quick" onClick={() => go('/app/create')}><span style={{ '--c': '#10b981' }}><Icon name="plus" size={22} /></span><b>New lesson</b><small>From a topic or photo</small></button>
      </section>

      <section className="stat-grid" data-reveal="" style={{ '--d': '.06s' }}>
        <StatCard icon="bolt" tone="violet" label="Total XP" value={(progress?.totalXP || 0).toLocaleString()} detail="Lifetime" />
        <StatCard icon="flame" tone="orange" label="Current streak" value={progress?.streakCount || 0} detail="days in a row" />
        <StatCard icon="target" tone="green" label="Accuracy" value={accuracy == null ? '—' : accuracy + '%'} detail="Last 500 attempts" />
        <StatCard icon="layers" tone="pink" label="Focus concepts" value={weak.length} detail="Need practice" />
      </section>

      <div className="two-col" data-reveal="" style={{ '--d': '.12s' }}>
        <Panel title="Activity" subtitle="Rounds played in the last 7 days" action={<span className="soft-tag">{attempts.length} attempts</span>}>
          <div className="bars">{week.map((d, i) => <div className={`bar-col ${d.today ? 'today' : ''}`} key={i} title={`${d.count} rounds`}><span className="bar-val">{d.count || ''}</span><div className="bar-track"><i style={{ height: `${Math.max(d.count ? 12 : 4, d.count / max * 100)}%` }} /></div><span>{d.label}</span></div>)}</div>
        </Panel>
        <Panel title="Focus next" subtitle="Based on what you miss">
          <div className="focus-list">
            {weak.slice(0, 4).map((w, i) => (
              <button className="focus-item" key={i} onClick={() => w.lessonId && go(playLessonUrl(w.lessonId, { mode: 'practice', topics: [w.conceptName], types: null }))}>
                <span className="focus-num">{i + 1}</span>
                <span className="focus-copy"><b>{w.conceptName}</b><small>{w.misses} recent miss{w.misses === 1 ? '' : 'es'}</small></span>
                <span className="bar mini"><i style={{ width: `${Math.min(100, 20 + w.misses * 16)}%` }} /></span>
                <Icon name="play" size={16} fill="currentColor" />
              </button>
            ))}
            {!weak.length && <Empty icon="check" title="You’re all clear" text="Play a lesson and Prism will surface concepts that need another pass." />}
          </div>
        </Panel>
      </div>

      <div className="two-col" data-reveal="" style={{ '--d': '.18s' }}>
        <Panel title="Your last 12 weeks" subtitle="Every square is a day you practised" action={<span className="soft-tag">Activity</span>}>
          <Heatmap activity={activity} attempts={attempts} />
          <div className="hm-legend"><span>Less</span><i /><i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" /><span>More</span></div>
        </Panel>
        <Panel title="Concept mastery" subtitle="How well each idea is sticking" action={mastery.length > 0 && <span className="soft-tag">{mastery.length} tracked</span>}>
          {mastery.length ? (
            <div className="mastery-list">
              {mastery.map(m => (
                <div key={m.name}>
                  <div className="mc-row"><span>{m.name}</span><b>{m.pct}%</b></div>
                  <div className="bar"><i style={{ width: m.pct + '%', background: m.pct >= 80 ? 'var(--good)' : m.pct >= 50 ? 'var(--warn)' : 'var(--bad)' }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted pad">Play a few rounds and your mastery per concept will show up here.</p>
          )}
        </Panel>
      </div>

      <div data-reveal="" style={{ '--d': '.24s' }}>
        <Panel title="Today's review" subtitle="Spaced repetition — the right concepts at the right time" action={review?.count ? <span className="soft-tag">{review.count} due</span> : null}>
          {review?.byLesson?.length ? (
            <div className="focus-list">
              {review.byLesson.slice(0, 4).map(g => (
                <button className="focus-item" key={String(g.lessonId)} onClick={() => go(playLessonUrl(g.lessonId, { mode: 'practice', topics: g.concepts, types: null }))}>
                  <span className="focus-num"><Icon name="clock" size={15} /></span>
                  <span className="focus-copy"><b>{g.concepts.length} concept{g.concepts.length === 1 ? '' : 's'} due</b><small>{g.concepts.slice(0, 3).join(' · ')}{g.concepts.length > 3 ? '…' : ''}</small></span>
                  <Icon name="play" size={16} fill="currentColor" />
                </button>
              ))}
            </div>
          ) : (
            <p className="muted pad">Nothing is due right now. Play a lesson and Prism will schedule your next review.</p>
          )}
        </Panel>
      </div>

      <div data-reveal="" style={{ '--d': '.24s' }}>
        <Panel title="Continue learning" subtitle="Pick up any of your lessons" action={lessons.length > 4 && <button className="link-btn" onClick={() => go('/app/lessons')}>View all <Icon name="arrow-right" size={14} /></button>}>
          {lessons.length ? <div className="lesson-cards stagger">{lessons.slice(0, 4).map(l => (
            <a className="lesson-card" key={l._id} href={'#/app/lesson/' + l._id}>
              <LessonCover lesson={l} />
              <div className="lc-body"><b>{l.topic}</b><span>{lessonMeta(l)}</span></div>
            </a>))}</div>
            : <Empty art={ART.progress} title={loading ? 'Loading…' : 'No lessons yet'} text="Create your first AI lesson to fill your library." action={!loading && <button className="btn primary" onClick={() => go('/app/create')}>Create a lesson</button>} />}
        </Panel>
      </div>
      {toast}
    </div>
  );
}
