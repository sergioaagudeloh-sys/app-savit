// ══════════════════════════════════════════════════════════════
//  Sávit PWA — Service Worker (Workbox via CDN)
//  Estrategias:
//  • App Shell (HTML/JS/CSS) → Network First  (siempre sirve lo más nuevo, con fallback a caché)
//  • Imágenes locales        → Cache First    (rápido; se renueva en background)
//  • Imágenes Firebase       → Stale-While-Revalidate (muestra lo cacheado, actualiza en segundo plano)
//  • Fuentes Google          → Cache First    (muy estables, expiración 1 año)
//  • Firestore / Auth API    → Ignorar        (Firestore SDK maneja su propia persistencia)
// ══════════════════════════════════════════════════════════════

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

if (typeof workbox !== 'undefined') {
  const { registerRoute, setCatchHandler } = workbox.routing;
  const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = workbox.strategies;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  const { ExpirationPlugin } = workbox.expiration;
  const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;

  // ── Versión del cache (incrementar para forzar actualización)
  const CACHE_VERSION = 'savit-v5';

workbox.setConfig({ debug: false });

// ── Limpiar cachés obsoletos en cada activación
cleanupOutdatedCaches();

// ── 1. PRECACHE: App Shell estático (recursos críticos que siempre deben estar)
precacheAndRoute([
  { url: '/', revision: CACHE_VERSION },
  { url: '/index.html', revision: CACHE_VERSION },
  { url: '/manifest.json', revision: CACHE_VERSION },
  { url: '/logo.png', revision: CACHE_VERSION },
  { url: '/logo-pwa.png', revision: CACHE_VERSION },
  { url: '/favicon.svg', revision: CACHE_VERSION },
  { url: '/icons.svg', revision: CACHE_VERSION },
]);

// ── 2. NAVEGACIÓN SPA: Network First con fallback a /index.html
//    Esto garantiza que cualquier ruta (/, /home, /catalog...) funcione offline
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: `${CACHE_VERSION}-pages`,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// ── 3. ASSETS JS/CSS (bundles de Vite): Network First
//    Vite genera hashes en los nombres, Network First garantiza frescura
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style',
  new NetworkFirst({
    cacheName: `${CACHE_VERSION}-assets`,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// ── 4. IMÁGENES LOCALES (public/): Cache First — carga instantánea
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' &&
    url.origin === self.location.origin,
  new CacheFirst({
    cacheName: `${CACHE_VERSION}-images-local`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
      }),
    ],
  })
);

// ── 5. IMÁGENES FIREBASE STORAGE: Stale-While-Revalidate
//    Muestra la imagen cacheada de inmediato; actualiza en segundo plano
registerRoute(
  ({ url }) =>
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('storage.googleapis.com'),
  new StaleWhileRevalidate({
    cacheName: `${CACHE_VERSION}-images-firebase`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
      }),
    ],
  })
);

// ── 6. FUENTES GOOGLE: Cache First, 1 año
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: `${CACHE_VERSION}-fonts`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// ── 7. WORKBOX CDN (el propio script): Cache First
registerRoute(
  ({ url }) => url.hostname === 'storage.googleapis.com' && url.pathname.includes('workbox'),
  new CacheFirst({
    cacheName: `${CACHE_VERSION}-workbox`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

  // ── 9. Fallback offline para navegacion
  setCatchHandler(async ({ request }) => {
    if (request.mode === 'navigate') {
      const cache = await caches.open(`${CACHE_VERSION}-pages`);
      const cachedIndex = await cache.match('/index.html');
      return cachedIndex || Response.error();
    }
    return Response.error();
  });
} else {
  console.warn('PWA: Workbox falló al cargar. El ServiceWorker operará en modo pasivo.');
}

// ── 10. Skip waiting: activa el nuevo SW inmediatamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
