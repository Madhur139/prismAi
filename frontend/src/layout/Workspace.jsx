/*
  WORKSPACE LAYOUT
  - Sidebar + top bar shown after login. Navigation links are defined in NAV below.
  - Loads progress + lessons once and shares them with the pages.
*/
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Logo, Ring, ThemeToggle, useToast } from '../components/ui.jsx';
import { CommandPalette, useCommandPalette } from '../components/CommandPalette.jsx';
import { Onboarding, markOnboarded, shouldOnboard } from '../components/Onboarding.jsx';
import { AISearch } from '../pages/AISearchPage.jsx';
import { Create } from '../pages/CreateLessonPage.jsx';
import { Dashboard } from '../pages/DashboardPage.jsx';
import { Games } from '../pages/GamesPage.jsx';
import { HelpPage } from '../pages/HelpPage.jsx';
import { GroupsPage } from '../pages/GroupsPage.jsx';
import { GroupPage } from '../pages/GroupPage.jsx';
import { InviteBell } from '../components/InviteBell.jsx';
import { WritePage } from '../pages/WritePage.jsx';
import { LessonPage } from '../pages/LessonPage.jsx';
import { Lessons } from '../pages/LibraryPage.jsx';
import { ReviewPage } from '../pages/ReviewPage.jsx';
import { TeacherPage } from '../pages/TeacherPage.jsx';
import { Profile } from '../pages/ProfilePage.jsx';
import { Settings } from '../pages/SettingsPage.jsx';
import { Flashcards } from '../pages/FlashcardsPage.jsx';
import { Achievements } from '../pages/AchievementsPage.jsx';
import { avatarFor, countToday, firstName, greeting, initial } from '../utils/helpers.js';
import { go, useHash } from '../utils/router.js';

/*
  NAVIGATION
  - Grouped into two sections so the sidebar reads clearly: what you learn, and your account.
*/
const NAV_GROUPS = [
  {
    label: 'Learn',
    items: [
      ['dashboard', '/app', 'home', 'Overview'],
      ['ai', '/app/ai', 'sparkles', 'Prism AI'],
      ['create', '/app/create', 'plus', 'Create lesson'],
      ['lessons', '/app/lessons', 'book', 'My lessons'],
      ['review', '/app/review', 'refresh', 'Review'],
      ['write', '/app/write', 'pencil', 'Write & AI check'],
      ['flashcards', '/app/flashcards', 'cards', 'Flashcards'],
      ['games', '/app/games', 'gamepad', 'Arcade'],
      ['achievements', '/app/achievements', 'trophy', 'Badges'],
      ['groups', '/app/groups', 'users', 'Groups'],
      ['help', '/app/help', 'users', 'Help board'],
    ],
  },
  {
    label: 'Account',
    items: [
      ['class', '/app/class', 'users', 'Classroom'],
      ['profile', '/app/profile', 'user', 'Profile'],
      ['settings', '/app/settings', 'settings', 'Settings'],
    ],
  },
];
const TITLES = {
  dashboard: ['LEARNING OVERVIEW', u => `${greeting()}, ${firstName(u.name)}`],
  ai: ['PRISM AI', () => 'Ask Prism AI'],
  create: ['LESSON STUDIO', () => 'Build a lesson'],
  lessons: ['YOUR LIBRARY', () => 'Your lessons'],
  review: ['SPACED REPETITION', () => 'Review & mistakes'],
  write: ['WRITE & AI CHECK', () => 'Write your answer'],
  flashcards: ['FLASHCARDS', () => 'Review as cards'],
  games: ['GAME ARCADE', () => 'Arcade'],
  achievements: ['BADGES', () => 'Achievements'],
  code: ['CODE LAB', () => 'Write & run code'],
  help: ['HELP BOARD', () => 'Help board'],
  groups: ['STUDY GROUPS', () => 'Groups'],
  class: ['CLASSROOM', () => 'Classroom'],
  profile: ['LEARNER PROFILE', () => 'Your profile'],
  settings: ['PREFERENCES', () => 'Settings'],
};
function tabOf(path) {
  if (/^\/app\/lesson\//.test(path)) return 'lessons';
  if (/^\/app\/groups\//.test(path)) return 'groups';
  const m = path.match(/^\/app\/(create|lessons|review|ai|write|flashcards|games|achievements|code|groups|help|class|profile|settings)\/?$/);
  return m ? m[1] : 'dashboard';
}

/* Avatar link to the profile. Declared at module level so it is not rebuilt every render. */
function Avatar({ user, small }) {
  return <a href="#/app/profile" className={`avatar ${small ? 'sm' : ''}`} aria-label="Profile">{avatarFor(user) ? <img src={avatarFor(user)} alt="" /> : initial(user?.name)}</a>;
}

export function Workspace({ user, onUserChange, onLogout }) {
  const path = useHash(), tab = tabOf(path), lessonId = (path.match(/^\/app\/lesson\/([^/]+)/) || [])[1];
  const groupId = (path.match(/^\/app\/groups\/([^/]+)/) || [])[1];
  const [progress, setProgress] = useState(null), [lessons, setLessons] = useState([]), [loading, setLoading] = useState(true), [mobileNav, setMobileNav] = useState(false);
  const [activity, setActivity] = useState([]);
  const [toast, notify] = useToast();
  const [palette, setPalette] = useState(false);
  const [onboard, setOnboard] = useState(false);

  // ⌘K / Ctrl+K opens the command palette from anywhere.
  const openPalette = useCallback(() => setPalette(true), []);
  useCommandPalette(openPalette);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      // activity = one row per day, so the heatmap shows real history.
      const [p, l, a] = await Promise.all([
        api('/progress/me'),
        api('/lessons'),
        api('/progress/activity?days=90').catch(() => ({ activity: [] })),
      ]);
      setProgress(p); setLessons(l.lessons || []); setActivity(a.activity || []);
    }
    catch (e) { notify(e.message, 'error'); } finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { refresh(); }, []);
  useEffect(() => { setMobileNav(false); }, [path]);

  /*
    Keep the stored account fresh. The role and the class code can change on
    another device, so we ask the server instead of trusting local storage.
  */
  useEffect(() => {
    let live = true;
    api('/auth/me').then(d => {
      if (!live || !d.user) return;
      if (d.user.role !== user?.role || d.user.name !== user?.name) onUserChange?.({ ...user, ...d.user });
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  // First-run welcome: only for learners who have not created a lesson yet.
  useEffect(() => {
    if (loading || !shouldOnboard()) return;
    if (lessons.length > 0) { markOnboarded(); return; }
    setOnboard(true);
  }, [loading, lessons.length]);

  const closeOnboard = useCallback(() => { markOnboarded(); setOnboard(false); }, []);

  const today = countToday(progress?.recentAttempts), goal = 10;
  const [eyebrow, titleFn] = TITLES[tab], title = lessonId ? 'Lesson' : titleFn(user), eb = lessonId ? 'LESSON' : eyebrow;

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)} />}
      <aside className={mobileNav ? 'open' : ''}>
        <a href="#/app" className="side-logo"><Logo size={34} /></a>
        <nav aria-label="Main">
          {NAV_GROUPS.map(g => (
            <div className="nav-group" key={g.label}>
              <span className="nav-group-label">{g.label}</span>
              {g.items.map(([k, to, icon, label]) => (
                <a key={k} href={'#' + to} className={'nav-link ' + (tab === k ? 'active' : '')} aria-current={tab === k ? 'page' : undefined}>
                  <Icon name={icon} size={19} />{label}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="goal-card">
          <Ring value={today / goal * 100} size={56} stroke={6}><b>{Math.min(today, goal)}</b></Ring>
          <div><b>Daily goal</b><span>{today >= goal ? 'Complete — great job!' : `${goal - today} more round${goal - today === 1 ? '' : 's'} today`}</span></div>
        </div>
        <div className="side-user"><Avatar user={user} /><div className="user-text"><b>{user.name}</b><span>{user.email}</span></div><button className="icon-btn" title="Log out" aria-label="Log out" onClick={onLogout}><Icon name="logout" size={18} /></button></div>
      </aside>

      <main id="main-content">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="Open menu"><Icon name="menu" size={22} /></button>
          <div className="topbar-title"><span className="eyebrow">{eb}</span><h1>{title}</h1></div>
          <div className="top-actions">
            <button className="icon-btn search-btn" onClick={openPalette} aria-label="Search and jump to a page" title="Search (⌘K)"><Icon name="search" size={19} /></button>
            <InviteBell />
            <div className="chip-stat xp"><Icon name="bolt" size={16} fill="currentColor" />{(progress?.totalXP || 0).toLocaleString()}<em>XP</em></div>
            <div className="chip-stat fire"><Icon name="flame" size={16} fill="currentColor" />{progress?.streakCount || 0}</div>
            <ThemeToggle /><Avatar user={user} />
          </div>
        </header>
        {loading && <div className="loading-line"><i /></div>}
        {toast}
        <div className="page-wrap" key={lessonId || tab}>
          {tab === 'dashboard' && <Dashboard user={user} progress={progress} lessons={lessons} loading={loading} activity={activity} />}
          {tab === 'create' && <Create onCreated={async id => { await refresh(); go('/app/lesson/' + id); }} notify={notify} />}
          {tab === 'lessons' && !lessonId && <Lessons lessons={lessons} loading={loading} />}
          {tab === 'lessons' && lessonId && <LessonPage id={lessonId} refresh={refresh} notify={notify} />}
          {tab === 'review' && <ReviewPage lessons={lessons} />}
          {tab === 'ai' && <AISearch lessons={lessons} notify={notify} />}
          {tab === 'write' && <WritePage lessons={lessons} />}
          {tab === 'flashcards' && <Flashcards lessons={lessons} notify={notify} />}
          {tab === 'games' && <Games lessons={lessons} />}
          {tab === 'achievements' && <Achievements notify={notify} />}
          {tab === 'help' && <HelpPage user={user} />}
          {tab === 'groups' && !groupId && <GroupsPage user={user} lessons={lessons} />}
          {tab === 'groups' && groupId && <GroupPage id={groupId} user={user} lessons={lessons} />}
          {tab === 'class' && <TeacherPage user={user} lessons={lessons} notify={notify} />}
          {tab === 'profile' && <Profile user={user} progress={progress} lessons={lessons} onUserChange={onUserChange} notify={notify} />}
          {tab === 'settings' && <Settings user={user} onUserChange={onUserChange} onLogout={onLogout} notify={notify} />}
        </div>
      </main>

      <CommandPalette lessons={lessons} open={palette} onClose={() => setPalette(false)} />
      <Onboarding open={onboard} onClose={closeOnboard} />
    </div>
  );
}
