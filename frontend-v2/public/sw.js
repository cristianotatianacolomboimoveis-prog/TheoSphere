const CACHE_NAME = 'theosphere-v6-offline';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Cache-First para Assets Estáticos do Next.js (_next/static)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((res) => {
        return res || fetch(request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, fetchRes.clone());
            return fetchRes;
          });
        });
      })
    );
    return;
  }

  // 2. Cache-First para APIs de Bíblia Externas (Capítulos)
  // Intercepta bible-api.com e bolls.life
  if (url.hostname.includes('bible-api.com') || url.hostname.includes('bolls.life')) {
    event.respondWith(
      caches.match(request).then((cachedRes) => {
        if (cachedRes) return cachedRes;
        return fetch(request).then((networkRes) => {
          if (networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // 3. Network-First para a API do Backend do TheoSphere
  if (url.pathname.includes('/api/v1/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // 4. Stale-While-Revalidate para páginas e outros assets
  event.respondWith(
    caches.match(request).then((cachedRes) => {
      const fetchPromise = fetch(request).then((networkRes) => {
        if (networkRes.ok && request.method === 'GET') {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return networkRes;
      });
      return cachedRes || fetchPromise;
    })
  );
});
