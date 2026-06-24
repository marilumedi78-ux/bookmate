// Escucha Libros Service Worker — versioned cache with update support
// CACHE_VERSION is auto-generated at build time by scripts/inject-sw-version.mjs
const CACHE_VERSION = '1781568428134';
const CACHE_NAME = `escuchalibros-${CACHE_VERSION}`;

// Precache the app shell so the app loads instantly on subsequent visits
const PRECACHE_URLS = ['/', '/manifest.json', '/logo.svg'];

// Maximum size of the runtime cache (in entries). When exceeded, oldest
// entries are evicted first (LRU-ish).
const MAX_CACHE_ENTRIES = 100;

// ─── Install — precache the app shell ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // addAll fails atomically if any URL fails — we want resilient caching
      // so we add each URL individually and ignore failures.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {})
        )
      );
    })
  );
  // Don't skipWaiting — let the app show the "update available" banner first
  // so the user knows a refresh is coming (better UX than sudden reload).
});

// ─── Activate — clean old caches and claim clients ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Listen for control messages from the app ───
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    // Allow the app to check which SW version is active
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});

// ─── Fetch strategy ───
// - API calls (/api/*): always network (don't cache — they may be stale)
// - Same-origin GET requests: network first, fall back to cache (offline support)
// - Cross-origin requests: stale-while-revalidate (good for fonts, images from CDNs)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API calls entirely — they need fresh data
  if (url.pathname.startsWith('/api/')) return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Skip non-http(s) (e.g. data: URIs, blob: URIs)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // ─── Same-origin: network-first (always try fresh, fall back to cache) ───
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
              // Evict old entries if cache is getting large
              pruneCache(cache);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
  } else {
    // ─── Cross-origin: stale-while-revalidate (good for CDN assets) ───
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
                pruneCache(cache);
              });
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});

// ─── Prune cache if it grows too large (basic LRU) ───
async function pruneCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length > MAX_CACHE_ENTRIES) {
      // Delete the oldest 20% of entries
      const toDelete = keys.slice(0, Math.floor(MAX_CACHE_ENTRIES * 0.2));
      await Promise.all(toDelete.map((req) => cache.delete(req)));
    }
  } catch {}
}
