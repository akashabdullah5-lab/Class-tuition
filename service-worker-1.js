/* ══ Teacher's Schedule — Service Worker ══ */
const CACHE_NAME = 'teachers-schedule-v3';

// Only cache the main page shell — Firebase data comes from cloud
const STATIC_ASSETS = [
  './',
  './index.html',
];

// Install — cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
// This ensures Firebase calls always go through (never cached)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always let Firebase, Google APIs, and font requests go straight to network
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('maateen')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For the app shell: network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Update cache with fresh response
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(event.request) || caches.match('./index.html');
      })
  );
});
