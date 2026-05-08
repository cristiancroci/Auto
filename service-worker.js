// service-worker.js (versione corretta per project page)
const CACHE_NAME = 'vault-shell-v1';
const APP_SHELL = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'drive-sync.js' // aggiungi qui altri asset statici necessari
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

  // 1) Navigation requests (pagina) -> network-first fallback cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(resp => {
        // aggiorna cache della shell se serve
        caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone()));
        return resp;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // 2) Static app shell assets -> cache-first
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/+/, ''); // rimuove leading slash
  if (APP_SHELL.includes(pathname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // 3) Altri request -> network-first fallback cache
  event.respondWith(
    fetch(req).then(resp => resp).catch(() => caches.match(req))
  );
});
