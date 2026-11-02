/*
  LANDING PAGE - public home screen shown before login.
  - `data-reveal` marks elements that fade + rise in as they scroll into view.
*/
import React from 'react';
import { Icon } from '../components/Icon.jsx';
import { Logo, ThemeToggle } from '../components/ui.jsx';
import { PrismArt } from '../components/PrismArt.jsx';
import { GAME_META } from '../constants/games.js';
import { useReveal } from '../utils/reveal.js';

const TOPICS = ['Photosynthesis', 'World War II', 'Python loops', 'Fractions', 'The human heart', 'Stock markets', 'French verbs', 'Black holes', 'Newton’s laws', 'Climate change', 'Genetics', 'Algebra'];
const STEPS = [
  ['pencil', 'Drop in anything', 'Type a topic or upload a photo of your notes or a diagram.'],
  ['sparkles', 'Prism refracts it', 'AI splits it into clear concepts and builds a set of micro-games for each.'],
  ['gamepad', 'Play, level up, repeat', 'Practice in bite-size rounds. What you miss comes back until it sticks.'],
];

/* Smooth-scroll helper for the in-page links in the header. */
function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function Landing({ onStart }) {
  // Reveal-on-scroll for the sections below the hero.
  useReveal();

  return (
    <div className="land">
      <header className="land-nav">
        <Logo size={34} />
        <nav className="land-links">
          <a href="#how" onClick={e => { e.preventDefault(); scrollToId('how'); }}>How it works</a>
          <a href="#games" onClick={e => { e.preventDefault(); scrollToId('games'); }}>Games</a>
        </nav>
        <div className="land-actions">
          <ThemeToggle />
          <button className="btn ghost" onClick={() => onStart('login')}>Sign in</button>
          <button className="btn primary" onClick={() => onStart('register')}>Get started</button>
        </div>
      </header>

      <section className="land-hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="lh-copy">
          <span className="pill"><Icon name="sparkles" size={15} /> AI micro-learning</span>
          <h1>Turn anything you want to learn into a <span className="grad-text">game you want to play.</span></h1>
          <p>Type a topic or snap your notes. Prism splits it into concepts and builds short, playable lessons that adapt to what you miss.</p>
          <div className="hero-cta">
            <button className="btn primary lg" onClick={() => onStart('register')}>Start learning free <Icon name="arrow-right" size={20} /></button>
            <button className="btn ghost lg" onClick={() => onStart('login')}>I have an account</button>
          </div>
          <div className="hero-proof">
            <span><Icon name="check" size={16} stroke={3} /> Any topic or image</span>
            <span><Icon name="check" size={16} stroke={3} /> 6 game types + boss mode</span>
            <span><Icon name="check" size={16} stroke={3} /> Adaptive practice</span>
          </div>
        </div>
        <div className="lh-visual">
          <PrismArt className="hero-prism" />
          <div className="mock">
            <div className="mock-top"><span className="gbadge" style={{ '--c': '#f43f5e' }}><Icon name="bolt" size={14} />Super Quiz</span><span className="mock-count">3 / 8</span></div>
            <div className="mock-bar"><i /></div>
            <h4>Which organelle makes most of the cell’s energy?</h4>
            {['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi body'].map((o, i) => <div key={o} className={`mock-opt ${i === 1 ? 'right' : ''}`}><span>{'ABCD'[i]}</span>{o}{i === 1 && <Icon name="check" size={18} stroke={3} />}</div>)}
          </div>
          <div className="float-chip fc1"><Icon name="bolt" size={15} fill="currentColor" /> +20 XP</div>
          <div className="float-chip fc2"><Icon name="flame" size={15} fill="currentColor" /> 5 day streak</div>
          <div className="float-chip fc3"><Icon name="trophy" size={15} /> Boss defeated</div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true"><div className="marquee-track">{[...TOPICS, ...TOPICS].map((t, i) => <span key={i}>{t}</span>)}</div></div>

      <section className="land-section" id="how">
        <div className="section-head" data-reveal=""><span className="eyebrow">HOW IT WORKS</span><h2>From a blank page to playing in seconds</h2></div>
        <div className="steps">
          {STEPS.map(([ic, t, d], i) => (
            <div className="step-card" data-reveal="" style={{ '--d': `${i * 0.1}s` }} key={t}>
              <span className="step-num">0{i + 1}</span>
              <div className="step-ico"><Icon name={ic} size={24} /></div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section" id="games">
        <div className="section-head" data-reveal=""><span className="eyebrow">PLAY YOUR WAY</span><h2>Six ways to practice. One boss to beat.</h2><p>Pick the topics and games you enjoy. When you feel ready, take on boss mode: ten rounds, three lives.</p></div>
        <div className="game-tiles">
          {Object.entries(GAME_META).map(([k, m], i) => (
            <div className="game-tile" data-reveal="" style={{ '--c': m.color, '--d': `${i * 0.06}s` }} key={k}>
              <div className="gt-ico"><Icon name={m.icon} size={26} /></div>
              <h3>{m.label}</h3>
              <p>{m.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section split write-land">
        <div className="wl-demo" data-reveal="">
          <div className="wl-q"><span className="gbadge" style={{ '--c': '#06b6d4' }}><Icon name="pencil" size={14} />Write & check</span><h4>Why do leaves look green?</h4></div>
          <div className="wl-a">Chlorophyll absorbs red and blue light but reflects green, so that’s the colour we see.</div>
          <div className="wl-score"><b>92</b><div><strong>Excellent</strong><small>Why: you named the pigment and the reflected wavelength.</small></div></div>
        </div>
        <div data-reveal="" style={{ '--d': '.12s' }}>
          <span className="eyebrow">WRITE & AI CHECK</span>
          <h2>Write it. AI checks it. You learn why.</h2>
          <p>Answer open questions in your own words. Prism AI gives a score, explains the reason behind it, points out what to improve, and shows an ideal answer.</p>
          <ul className="check-list">
            <li><Icon name="check" size={18} stroke={3} />Fair grading — spelling never costs you marks</li>
            <li><Icon name="check" size={18} stroke={3} />Every answer comes with a clear reason</li>
            <li><Icon name="check" size={18} stroke={3} />Works on your lessons or any topic</li>
          </ul>
        </div>
      </section>

      <section className="land-section split">
        <div className="reveal">
          <span className="eyebrow">ADAPTIVE</span>
          <h2>It remembers what you miss.</h2>
          <p>Prism tracks the concepts you get wrong and brings them back more often, while streaks, XP and a daily goal keep you moving.</p>
          <ul className="check-list">
            <li><Icon name="check" size={18} stroke={3} />Weak concepts get extra practice</li>
            <li><Icon name="check" size={18} stroke={3} />XP, levels and daily streaks</li>
            <li><Icon name="check" size={18} stroke={3} />Ask Prism AI anything, any time</li>
          </ul>
        </div>
        <div className="mastery-card" data-reveal="" style={{ '--d': '.12s' }}>
          {[['Cell structure', 90], ['Photosynthesis', 64], ['Respiration', 38]].map(([n, w]) => <div key={n}><div className="mc-row"><span>{n}</span><b>{w}%</b></div><div className="bar"><i style={{ '--w': w + '%' }} /></div></div>)}
        </div>
      </section>

      <section className="land-cta">
        <h2>Your next lesson is one topic away.</h2>
        <button className="btn primary lg" onClick={() => onStart('register')}>Create your free account <Icon name="arrow-right" size={20} /></button>
      </section>

      <footer className="land-foot"><Logo size={24} /><span>Built for curious people.</span></footer>
    </div>
  );
}
