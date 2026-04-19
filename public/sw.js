// ══════════════════════════════════════════════════════════════
//  Sávit PWA — Service Worker (Workbox via CDN) - FIX EVALUATION
// ══════════════════════════════════════════════════════════════

/**
 * IMPORTANTE: El error "evaluation failed" suele ocurrir por importScripts fallidos
 * o por intentar acceder a propiedades de workbox antes de que se cargue el módulo.
 */

try {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

  if (typeof workbox !== 'undefined') {
    // Configuración inicial
    workbox.setConfig({ debug: false });
    
    // Alias para mayor legibilidad sin usar desestructuración que rompa la evaluación
    const routing = workbox.routing;
    const strategies = workbox.strategies;
    const cacheable = workbox.cacheableResponse;
    const expiration = workbox.expiration;
    const precaching = workbox.precaching;

    // ── Versión del cache
    const CACHE_VERSION = 'savit-v6'; // Incrementar versión para forzar limpieza

    // ── Limpiar cachés obsoletos
    precaching.cleanupOutdatedCaches();

    // ── 1. PRECACHE: App Shell estático
    precaching.precacheAndRoute([
      { url: '/', revision: CACHE_VERSION },
      { url: '/index.html', revision: CACHE_VERSION },
      { url: '/manifest.json', revision: CACHE_VERSION },
      { url: '/logo.png', revision: CACHE_VERSION },
      { url: '/logo-pwa.png', revision: CACHE_VERSION },
      { url: '/favicon.svg', revision: CACHE_VERSION },
      { url: '/icons.svg', revision: CACHE_VERSION },
    ]);

    // ── 2. NAVEGACIÓN SPA: Network First
    routing.registerRoute(
      ({ request }) => request.mode === 'navigate',
      new strategies.NetworkFirst({
        cacheName: `${CACHE_VERSION}-pages`,
        networkTimeoutSeconds: 3,
        plugins: [
          new cacheable.CacheableResponsePlugin({ statuses: [200] }),
        ],
      })
    );

    // ── 3. ASSETS JS/CSS: Network First
    routing.registerRoute(
      ({ request }) =>
        request.destination === 'script' ||
        request.destination === 'style',
      new strategies.NetworkFirst({
        cacheName: `${CACHE_VERSION}-assets`,
        networkTimeoutSeconds: 3,
        plugins: [
          new cacheable.CacheableResponsePlugin({ statuses: [0, 200] }),
          new expiration.ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
      })
    );

    // ── 4. IMÁGENES LOCALES: Cache First
    routing.registerRoute(
      ({ request, url }) =>
        request.destination === 'image' &&
        url.origin === self.location.origin,
      new strategies.CacheFirst({
        cacheName: `${CACHE_VERSION}-images-local`,
        plugins: [
          new cacheable.CacheableResponsePlugin({ statuses: [0, 200] }),
          new expiration.ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      })
    );

    // ── 5. IMÁGENES FIREBASE STORAGE
    routing.registerRoute(
      ({ url }) =>
        url.hostname.includes('firebasestorage.googleapis.com') ||
        url.hostname.includes('storage.googleapis.com'),
      new strategies.StaleWhileRevalidate({
        cacheName: `${CACHE_VERSION}-images-firebase`,
        plugins: [
          new cacheable.CacheableResponsePlugin({ statuses: [0, 200] }),
          new expiration.ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      })
    );

    // ── 6. FUENTES GOOGLE
    routing.registerRoute(
      ({ url }) =>
        url.origin === 'https://fonts.googleapis.com' ||
        url.origin === 'https://fonts.gstatic.com',
      new strategies.CacheFirst({
        cacheName: `${CACHE_VERSION}-fonts`,
        plugins: [
          new cacheable.CacheableResponsePlugin({ statuses: [0, 200] }),
          new expiration.ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        ],
      })
    );

    // ── Fallback offline
    routing.setCatchHandler(async ({ request }) => {
      if (request.mode === 'navigate') {
        const cache = await caches.open(`${CACHE_VERSION}-pages`);
        const cachedIndex = await cache.match('/index.html');
        return cachedIndex || Response.error();
      }
      return Response.error();
    });

  } else {
    console.error('PWA: Workbox no pudo cargarse desde el CDN.');
  }

} catch (error) {
  console.error('PWA: Error crítico durante la evaluación del Service Worker:', error);
}

// ── Eventos básicos del ciclo de vida
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
