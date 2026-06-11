// Minimal service worker — enables installability (PWA) + fast static assets.
// Deliberately does NOT cache HTML / RSC responses, so authenticated pages are
// never served stale; only hashed static assets + icons are cached.
const STATIC_CACHE = 'menorah-static-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Dev: Turbopack chunk names are not content-hashed — cache-first would
  // serve stale CSS/JS after every edit. Bypass caching on localhost.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    /\.(?:png|svg|jpg|jpeg|webp|woff2?|ico)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
  }
  // everything else: default network (no caching of authed HTML/RSC)
});
