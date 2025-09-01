const CACHE_NAME = 'freedom-game-v3';
const APP_SHELL = [
  '/',
  '/tablet',
  '/icon.svg',
  '/logo.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activate new SW immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  // Take control of open clients
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Never cache API or socket
  if (request.url.includes('/api/') || request.url.includes('/socket.io/')) return;
  // Network-first for app assets to always pull latest UI
  event.respondWith((async () => {
    try {
      const fresh = await fetch(request);
      // Не кэшируем частичные (206) и неуспешные ответы
      if (!fresh || !fresh.ok || fresh.status === 206) {
        return fresh;
      }
      const copy = fresh.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(()=>{});
      return fresh;
    } catch (e) {
      const cached = await caches.match(request);
      return cached || Promise.reject(e);
    }
  })());
});


