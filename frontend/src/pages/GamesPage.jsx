/*
  ARCADE PAGE - quick-play games + play your own lessons. Every "Play" opens a full-screen game page.
*/
import React from 'react';
import { Icon } from '../components/Icon.jsx';
import { LessonCover, Panel } from '../components/ui.jsx';
import { ARCADE, MINI_GAMES } from '../constants/games.js';
import { gameCount } from '../utils/helpers.js';
import { gameCover, hideBrokenImage } from '../utils/coverImage.js';
import { useReveal } from '../utils/reveal.js';
import { go, playLessonUrl } from '../utils/router.js';

export function Games({ lessons }) {
  useReveal();
  return (
    <div className="page games">
      <section className="arcade-hero">
        <div><span className="eyebrow">PLAY & PRACTICE</span><h2>Learning feels better as a game.</h2><p>Short challenges, instant feedback and streaks. Questions come from your own lessons whenever you have them — and earn real XP.</p></div>
        <div className="arcade-art" aria-hidden="true"><Icon name="gamepad" size={72} stroke={1.5} /></div>
      </section>

      <div className="arcade-grid" data-reveal="" style={{ '--d': '.08s' }}>
        {ARCADE.map(a => (
          <button key={a.type} className="arcade-card" style={{ '--c': a.color }} onClick={() => go('/play/arcade/' + a.type)}>
            <span className="ac-photo">
              <img src={gameCover(a.type)} alt="" loading="lazy" decoding="async" onError={hideBrokenImage} />
              <i className="ac-photo-veil" />
            </span>
            <span className="ac-ico"><Icon name={a.icon} size={28} /></span>
            <h3>{a.title}</h3><p>{a.text}</p>
            <span className="ac-foot"><span>{a.time ? `${a.time}s per round` : 'Untimed'}</span><b>Play <Icon name="arrow-right" size={16} /></b></span>
          </button>
        ))}
      </div>

      <section className="mini-section" data-reveal="" style={{ '--d': '.14s' }}>
        <div className="mini-section-head">
          <div>
            <span className="eyebrow">PLAY TOGETHER</span>
            <h2>Live duel</h2>
            <p>Race a friend through the same questions. Same questions, same rounds — quickest wins the round.</p>
          </div>
        </div>
        <div className="mini-grid">
          <button className="mini-card" style={{ '--c': '#f43f5e' }} onClick={() => go('/play/duel')}>
            <span className="mini-card-ico"><Icon name="bolt" size={22} /></span>
            <b>Start a duel</b>
            <small>Get a code, send it to a friend, and play head to head.</small>
            <span className="mini-card-go">Play <Icon name="arrow-right" size={14} /></span>
          </button>
        </div>
      </section>

      <section className="mini-section" data-reveal="" style={{ '--d': '.14s' }}>
        <div className="mini-section-head">
          <div>
            <span className="eyebrow">MINI GAMES</span>
            <h2>Skill games</h2>
            <p>Quick, self-contained challenges. No lesson needed — just your memory, logic and reflexes.</p>
          </div>
        </div>
        <div className="mini-grid">
          {MINI_GAMES.map(g => (
            <a key={g.type} className="mini-card" href={'#/play/mini/' + g.type} style={{ '--c': g.color }}>
              <span className="mini-card-ico"><Icon name={g.icon} size={22} /></span>
              <b>{g.title}</b>
              <small>{g.text}</small>
              <span className="mini-card-go">Play <Icon name="arrow-right" size={14} /></span>
            </a>
          ))}
        </div>
      </section>

      <button className="write-banner" onClick={() => go('/app/write')}>
        <span className="wb-ico"><Icon name="pencil" size={26} /></span>
        <span className="wb-copy"><b>Write & AI check</b><small>Answer open questions in your own words. AI grades you, explains why, and shows the ideal answer.</small></span>
        <span className="wb-go">Try it <Icon name="arrow-right" size={16} /></span>
      </button>

      <Panel title="Play your lessons" subtitle="Practice or take on the boss">
        {lessons.length ? <div className="play-list">{lessons.slice(0, 8).map(l => (
          <div className="play-row" key={l._id}>
            <LessonCover lesson={l} className="mini" />
            <div className="pr-info"><b>{l.topic}</b><span>{gameCount(l)} games · {(l.concepts || []).length} concepts</span></div>
            <button className="btn primary sm" onClick={() => go(playLessonUrl(l._id))}><Icon name="play" size={14} fill="currentColor" /> Practice</button>
            <button className="btn danger-soft sm" onClick={() => go(playLessonUrl(l._id, { mode: 'boss', topics: null, types: null }))}><Icon name="skull" size={14} /> Boss</button>
          </div>))}</div>
          : <p className="muted pad">Create a lesson to practice it here. Until then the arcade uses built-in questions.</p>}
      </Panel>
    </div>
  );
}
