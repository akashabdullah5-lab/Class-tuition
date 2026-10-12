/* ══ Teacher's Schedule — Service Worker ══ */
const CACHE_NAME = 'teachers-schedule-v4';

// App shell. Firestore data is NOT cached here (it's handled in the app).
const STATIC_ASSETS = [
  './',
  './index.html',
];

// Install — cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1) Firebase SDK files (version-pinned, never change) → cache first.
  //    First launch downloads them once; every launch after is instant.
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(hit => {
          if (hit) return hit;
          return fetch(req).then(res => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // 2) Live Firebase / Google API calls and fonts → always straight to network
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('maateen')
  ) {
    return; // let the browser handle it normally
  }

  // 3) App shell → stale-while-revalidate:
  //    open instantly from cache, quietly fetch the newest copy for next time.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(req).then(cached => {
        const network = fetch(req)
          .then(res => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached || cache.match('./index.html'));
        return cached || network;
      })
    )
  );
});
