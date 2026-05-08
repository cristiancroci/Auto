// service-worker.js
const CACHE_NAME = 'vault-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // aggiungi qui altri asset statici (css, js, fonts)
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // App shell: cache-first for same-origin static assets
  if (APP_SHELL.includes(url.pathname) || url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // Runtime: network-first for dynamic requests
  event.respondWith(
    fetch(req).then(resp => resp).catch(() => caches.match(req))
  );
});
