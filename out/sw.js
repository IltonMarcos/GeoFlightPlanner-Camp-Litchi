const VERSION = 'v3';
const CACHE_NAME = `gfp-cache-${VERSION}`;
// Detect base path from SW registration scope (works in GitHub Pages subpaths)
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const OFFLINE_URL = `${BASE}/offline.html`;
const PRECACHE_URLS = [
  `${BASE}/`,
  OFFLINE_URL,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/favicon.ico`,
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(PRECACHE_URLS);
    } catch (_) {
      // best-effort precache; ignore failures for offline install
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // App shell navigation: network, then offline fallback
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, net.clone()).catch(() => {});
        return net;
      } catch (_) {
        const cached = await caches.match(request);
        return cached || caches.match(OFFLINE_URL);
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStatic = isSameOrigin && ([
    '.css', '.js', '.woff2', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'
  ].some(ext => url.pathname.endsWith(ext)));

  if (isStatic) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          cache.put(request, response.clone()).catch(() => {});
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // Default: network falling back to cache
  event.respondWith((async () => {
    try {
      const net = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, net.clone()).catch(() => {});
      return net;
    } catch (_) {
      const cached = await caches.match(request);
      return cached || Response.error();
    }
  })());
});
