const CACHE_NAME = 'salescalc-v2'; // Increment version to force update
const urlsToCache = [
  '/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Always fetch from network for Supabase
  if (url.origin.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first strategy for HTML files (including index.html)
  if (event.request.headers.get('accept').includes('text/html') || 
      url.pathname === '/' || 
      url.pathname === '/index.html' ||
      url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Return fresh response, don't cache HTML
          return response;
        })
        .catch(() => {
          // Fallback to cache only if offline
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Network-first for JavaScript and CSS (with cache fallback)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for other assets (images, fonts, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        return caches.match('/index.html');
      })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-quotations') {
    event.waitUntil(syncQuotations());
  }
});

async function syncQuotations() {
  console.log('Background sync: syncing quotations');
}
