/*
  ACHIEVEMENTS / BADGES
  - Defines every badge Prism can award and checks progress against stored stats.
  - Badges are kept in localStorage (prism_badges) so they survive refreshes.
  - Stats live in localStorage (prism_stats) and are updated as the learner plays.
  - Call checkBadges() after any round, lesson or settings change to award newly-unlocked badges.
*/
import { readStats } from './stats.js';

export const BADGES = [
  { id: 'first_steps',    title: 'First Steps',     icon: 'play',   tone: 'emerald',  desc: 'Complete your first lesson round.' },
  { id: 'streak_three',   title: 'On a Roll',       icon: 'flame',  tone: 'amber',    desc: 'Study three days in a row.' },
  { id: 'streak_seven',   title: 'Week Warrior',    icon: 'flame',  tone: 'orange',   desc: 'Study seven days in a row.' },
  { id: 'perfect_ten',    title: 'Perfect Ten',     icon: 'trophy', tone: 'emerald',  desc: 'Score 100% on any lesson round.' },
  { id: 'lesson_master',  title: 'Lesson Master',   icon: 'book',   tone: 'violet',   desc: 'Complete every game in a single lesson.' },
  { id: 'mistake_fixer',  title: 'Mistake Fixer',   icon: 'refresh',tone: 'blue',     desc: 'Turn ten wrong answers into right ones.' },
  { id: 'night_owl',      title: 'Night Owl',       icon: 'moon',   tone: 'indigo',   desc: 'Study after 9 PM.' },
  { id: 'early_bird',     title: 'Early Bird',      icon: 'sun',    tone: 'amber',    desc: 'Study before 8 AM.' },
  { id: 'flashcard_fan',  title: 'Flashcard Fan',   icon: 'cards',  tone: 'rose',     desc: 'Review 50 flashcards.' },
  { id: 'focus_mode',     title: 'Focus Mode',      icon: 'timer',  tone: 'indigo',   desc: 'Complete one 25-minute Pomodoro session.' },
  { id: 'teacher_pet',    title: 'Teacher Mode',    icon: 'users',  tone: 'violet',   desc: 'Turn on teacher mode.' },
  { id: 'helper',         title: 'Helpful Hand',    icon: 'heart',  tone: 'rose',     desc: 'Answer one question on the help board.' },
];

const KEY = 'prism_badges';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(ids) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {} }

export function earned() { return read(); }
export function has(id) { return read().includes(id); }

/*
  stats shape:
  { rounds, perfects, lessonsCompleted, mistakesFixed, flashcards,
    streak, lastStudyAt, teacherMode, helpAnswers, pomodoros }
*/
export function checkBadges(stats) {
  const s = stats || readStats();
  const current = read();
  const now = new Date();
  const hour = now.getHours();
  const newly = [];

  const rules = [
    ['first_steps',   s.rounds >= 1],
    ['streak_three',  s.streak >= 3],
    ['streak_seven',  s.streak >= 7],
    ['perfect_ten',   s.perfects >= 1],
    ['lesson_master', s.lessonsCompleted >= 1],
    ['mistake_fixer', s.mistakesFixed >= 10],
    ['night_owl',     hour >= 21],
    ['early_bird',    hour < 8],
    ['flashcard_fan', s.flashcards >= 50],
    ['focus_mode',    s.pomodoros >= 1],
    ['teacher_pet',   s.teacherMode],
    ['helper',        s.helpAnswers >= 1],
  ];

  rules.forEach(([id, ok]) => {
    if (ok && !current.includes(id)) { current.push(id); newly.push(id); }
  });

  if (newly.length) save(current);
  return newly;
}

export function badgeOf(id) { return BADGES.find(b => b.id === id); }
