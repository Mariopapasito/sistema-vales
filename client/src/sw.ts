/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
self.skipWaiting();
cleanupOutdatedCaches();

// Precache all build assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// ─── Cache estrategies ───────────────────────────────────────────────────────

// Static assets: cache first
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// API GETs: network first, fallback to cache (offline mode)
const API_CACHE = 'api-cache';
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    request.method === 'GET' &&
    !request.headers.has('Authorization'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// Versiones anteriores guardaban respuestas autenticadas con la misma llave para
// distintos usuarios. Borrarlas evita mostrar conteos u órdenes obsoletos.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete(API_CACHE));
});

// SPA navigation: serve index.html offline
registerRoute(
  new NavigationRoute(
    new StaleWhileRevalidate({
      cacheName: 'pages',
      plugins: [new ExpirationPlugin({ maxEntries: 10 })],
    })
  )
);

// ─── Background Sync: queue POST/PATCH when offline ─────────────────────────

const bgSync = new BackgroundSyncPlugin('offline-mutations', {
  maxRetentionTime: 24 * 60, // 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        // Notify all clients that sync happened
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.postMessage({ type: 'SYNC_COMPLETE' }));
      } catch {
        await queue.unshiftRequest(entry);
        return;
      }
    }
  },
});

// Intercept POST/PATCH to /api/orders — queue when offline
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/orders') &&
    (request.method === 'POST' || request.method === 'PATCH'),
  new NetworkFirst({
    cacheName: 'mutations',
    plugins: [bgSync],
    networkTimeoutSeconds: 8,
  }),
  'POST'
);
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/orders') &&
    (request.method === 'POST' || request.method === 'PATCH'),
  new NetworkFirst({
    cacheName: 'mutations',
    plugins: [bgSync],
    networkTimeoutSeconds: 8,
  }),
  'PATCH'
);

// ─── Push notifications (existing logic) ────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options: NotificationOptions = {
    body: data.mensaje || 'Nueva notificación',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: 'orden-' + (data.orden_id || Date.now()),
    requireInteraction: data.prioridad === 'PARO',
    data: { orden_id: data.orden_id, folio: data.folio },
  };
  if (data.prioridad === 'PARO') (options as any).vibrate = [200, 100, 200];
  event.waitUntil(
    self.registration.showNotification(data.titulo || 'Orden de Trabajo', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/dashboard');
    })
  );
});
