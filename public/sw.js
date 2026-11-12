/* Naviya service worker: makes the app installable and lets it open without a connection.
   Pages: network first (always newest when online). Static files: served from cache, refreshed in the background.
   API calls and map tiles are never cached here (live data, and OpenStreetMap's tile policy). */
const VERSION = 'naviya-v1';
const SHELL = ['/explore.html', '/style.css', '/icons.css', '/icons.svg', '/icons.js', '/malaysia.css', '/search-layout.css', '/responsive.css', '/phone-qr.css', '/journey.css', '/mobile.css', '/malaysia.js', '/account-link.js', '/mobile-nav.js', '/phone-qr.js', '/app-shell.js', '/favicon.svg', '/vendor/leaflet.css', '/vendor/leaflet.js', '/manifest.webmanifest', '/app-icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/account') || url.pathname.startsWith('/signin')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((res) => {
      if (res.ok && url.pathname.endsWith('explore.html')) caches.open(VERSION).then((c) => c.put('/explore.html', res.clone()));
      return res;
    }).catch(() => caches.match('/explore.html')));
    return;
  }
  event.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  }));
});
