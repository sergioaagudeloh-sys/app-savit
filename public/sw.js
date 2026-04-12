const CACHE_NAME = 'savit-elite-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/mascot.png'
];

// Instalar SW y precachear recursos básicos
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Limpiar cachés antiguos
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

// Interceptar peticiones
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;

  const url = new URL(evt.request.url);

  // Ignorar peticiones a Firebase/APIs (manejado por Firestore Offline)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  evt.respondWith(
    caches.match(evt.request).then(cachedResponse => {
      // Estrategia: Cache First con Fallback a Network + Update Cache
      const fetchPromise = fetch(evt.request).then(networkResponse => {
        if (networkResponse.ok && url.origin === self.location.origin) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(evt.request, resClone));
        }
        return networkResponse;
      }).catch(err => {
        // Si falla la red y es una navegación (página), devolver index.html
        if (evt.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
