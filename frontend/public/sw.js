/*
  SERVICE WORKER - makes Prism work offline.
  It caches the app shell (HTML, JS, CSS, logo) so a lesson can be opened
  without a connection. API calls are never cached: scores must be real.
*/
const CACHE = 'prism-v1';
const SHELL = ['/', '/index.html', '/prism-logo.svg', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never cache the API or anything from another origin.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Cache first for the app shell, then update it in the background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || caches.match('/index.html'));
      return hit || net;
    })
  );
});
