// minimal service worker: non caching aggressive, avoids serving stale index
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

// optional: simple fetch pass-through
self.addEventListener('fetch', event => {
  // let browser handle everything; keep SW minimal to avoid caching issues
});
