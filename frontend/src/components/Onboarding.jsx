/*
  ONBOARDING
  - A short, friendly welcome shown the first time a learner opens Prism.
  - The "seen" flag is stored locally, so it only ever appears once.
*/
import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';

const KEY = 'prism_onboarded';

/** True when the learner has not seen the welcome tour yet. */
export function shouldOnboard() {
  try { return !localStorage.getItem(KEY); } catch { return false; }
}

/** Remember that the tour has been seen. */
export function markOnboarded() {
  try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable - show once per session */ }
}

const STEPS = [
  {
    icon: 'sparkles',
    title: 'Welcome to Prism',
    body: 'Turn any topic — or a photo of your notes — into a playable lesson in seconds.',
    bullets: ['Type a topic or upload a diagram', 'AI splits it into clear concepts', 'Every concept becomes a micro-game'],
  },
  {
    icon: 'gamepad',
    title: 'Learn by playing',
    body: 'Short rounds with instant feedback. Miss a question and Prism brings it back until it sticks.',
    bullets: ['Six game types, plus a boss mode', 'XP, levels and daily streaks', 'Ask Prism AI anything, any time'],
  },
  {
    icon: 'target',
    title: 'Make it a habit',
    body: 'Set a daily goal, turn on reminders, and watch your progress build week by week.',
    bullets: ['Daily goal ring in the sidebar', '12-week activity heatmap', 'Badges to collect as you go'],
  },
];

export function Onboarding({ open, onClose }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) setStep(0); }, [open]);
  if (!open) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="modal-backdrop ob-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="ob" role="dialog" aria-modal="true" aria-label="Welcome to Prism">
        <button className="icon-btn ob-x" onClick={onClose} aria-label="Skip the introduction"><Icon name="x" size={19} /></button>

        <span className="ob-ico" key={step}><Icon name={s.icon} size={30} /></span>
        <h3 key={'t' + step}>{s.title}</h3>
        <p className="ob-body" key={'b' + step}>{s.body}</p>

        <ul className="ob-list">
          {s.bullets.map(b => <li key={b}><Icon name="check" size={16} stroke={3} />{b}</li>)}
        </ul>

        <div className="ob-dots" aria-hidden="true">
          {STEPS.map((_, i) => <span key={i} className={i === step ? 'on' : ''} />)}
        </div>

        <div className="ob-actions">
          {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button className="btn primary" onClick={() => last ? onClose() : setStep(step + 1)}>
            {last ? 'Start learning' : 'Next'} <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
