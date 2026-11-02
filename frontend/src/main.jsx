/*
  APP ENTRY POINT
  - Vite starts the React app from this file.
  - Loads Tailwind + the Prism design system, applies the saved theme, mounts <App />.
  - Registers the service worker so Prism also works offline.
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './tailwind.css';
import './styles/app.css';
import { initTheme } from './utils/settings.js';

initTheme();
createRoot(document.getElementById('root')).render(<App />);

/* Offline support: only in a real build, so the dev server stays simple. */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Offline mode is a bonus, never a requirement. */
    });
  });
}
