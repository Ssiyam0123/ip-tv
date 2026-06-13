// SportStream Service Worker — v2
const CACHE_VERSION = 'sportstream-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets to cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('sportstream-') && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and chrome-extension
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Skip stream/proxy requests (never cache streams)
  if (url.pathname.includes('/proxy/stream')) return;
  if (url.pathname.includes('/playback-session')) return;

  // API calls — Network first, cache fallback (short TTL)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(event.request, API_CACHE, 60));
    return;
  }

  // Static assets — Cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirstWithNetwork(event.request, STATIC_CACHE));
    return;
  }

  // HTML pages — Network first, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then((cached) => cached || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }
});

// ─── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const cloned = response.clone();
      // Store with timestamp header for TTL
      const headers = new Headers(cloned.headers);
      headers.set('sw-fetched-on', Date.now().toString());
      const timestamped = new Response(await cloned.blob(), { status: cloned.status, headers });
      cache.put(request, timestamped);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const fetchedOn = cached.headers.get('sw-fetched-on');
      if (fetchedOn && Date.now() - parseInt(fetchedOn) < maxAgeSeconds * 1000) {
        return cached;
      }
    }
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
