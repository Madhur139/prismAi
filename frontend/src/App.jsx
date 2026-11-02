/*
  PRISM APP ROOT
  - Chooses what to show for the current route:
      landing (#/), auth (#/login, #/register), workspace (#/app/...), full-screen games (#/play/...)
*/
import React, { useState, useEffect } from 'react';
import { Workspace } from './layout/Workspace.jsx';
import { Auth } from './pages/AuthPage.jsx';
import { Landing } from './pages/LandingPage.jsx';
import { PlayPage } from './pages/PlayPage.jsx';
import { SharedLesson } from './pages/SharedLessonPage.jsx';
import { getStoredUser } from './utils/helpers.js';
import { go, useRoute } from './utils/router.js';

export function App() {
  const [user, setUser] = useState(getStoredUser), { path, query } = useRoute();
  useEffect(() => { const f = () => setUser(null); window.addEventListener('prism:logout', f); return () => window.removeEventListener('prism:logout', f); }, []);
  const protectedPath = path.startsWith('/app') || path.startsWith('/play');
  useEffect(() => {
    if (user && (path === '/' || path === '/login' || path === '/register')) go('/app');
    if (!user && protectedPath) go('/login');
  }, [user, path]);
  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  const logout = () => { localStorage.removeItem('prism_token'); localStorage.removeItem('prism_user'); setUser(null); go('/'); };
  const updateUser = next => { setUser(next); try { localStorage.setItem('prism_user', JSON.stringify(next)); } catch {} };

  // A shared lesson is public: anybody with the link can read it.
  const shared = path.match(/^\/shared\/([\w-]+)/);
  if (shared) return <SharedLesson token={shared[1]} />;

  if (user && path.startsWith('/play')) return <PlayPage path={path} query={query} />;
  if (user) return <Workspace user={user} onUserChange={updateUser} onLogout={logout} />;
  if (path === '/login' || path === '/register' || protectedPath) return <Auth startMode={path === '/register' ? 'register' : 'login'} onBack={() => go('/')} onLogin={u => setUser(u)} />;
  return <Landing onStart={m => go('/' + m)} />;
}
