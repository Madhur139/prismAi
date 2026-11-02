/*
  SETTINGS STORAGE
  - Saves dark mode, sounds, reminder toggles and accessibility options in the
    browser.
  - First visit follows the device's light/dark preference.
*/
const KEY = 'prism_settings';
const sysDark = () => { try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; } };
const base = { gameSounds: true, dailyReminders: true, dyslexiaFont: false, highContrast: false, reduceMotion: false, voiceMode: false, subjectTheme: 'auto', explainLike5: false };

export function readSettings() {
  let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  return { ...base, darkMode: sysDark(), ...s };
}

/* Voice mode is read straight from storage, so a game page can check it
   without having to keep the settings in React state. */
export function voiceSetting() { return !!readSettings().voiceMode; }
export function applyTheme(dark) { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }

/*
  ACCESSIBILITY
  The extra options are written onto <html> as data attributes, so the
  stylesheet can react to them without any JavaScript in the components.
*/
export function applyAccessibility(s) {
  const el = document.documentElement;
  el.dataset.font = s.dyslexiaFont ? 'dyslexia' : 'default';
  el.dataset.contrast = s.highContrast ? 'high' : 'normal';
  el.dataset.motion = s.reduceMotion ? 'reduced' : 'full';
}

/* Subject theme: colours the UI differently per subject. Stored on <html> as data-subject. */
export function applySubjectTheme(theme) {
  document.documentElement.dataset.subject = theme || 'auto';
}

export function saveSettings(next) {
  const value = { ...readSettings(), ...next };
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
  applyTheme(value.darkMode);
  applyAccessibility(value);
  applySubjectTheme(value.subjectTheme);
  window.dispatchEvent(new CustomEvent('prism:settings', { detail: value }));
  return value;
}
export function setTheme(dark) { return saveSettings({ darkMode: !!dark }); }
export function initTheme() {
  const s = readSettings();
  applyTheme(s.darkMode);
  applyAccessibility(s);
  applySubjectTheme(s.subjectTheme);
  return s;
}
