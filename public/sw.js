// Cache the same-origin app shell only.
//
// API responses must never pass through here: the API is cross-origin, bearer
// authenticated, and its responses are per-session. Caching them made a stale 401
// (or another session's 200) outlive the session, so signing in silently bounced
// back to the sign-in screen and one user's data could be replayed to another.
const CACHE = 'tadoo-shell-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const cacheable = request.method === 'GET' && url.origin === self.location.origin && !url.pathname.startsWith('/api/');
  if (!cacheable) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined) }
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match('/'))));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined);
    }
    return response;
  })));
});
