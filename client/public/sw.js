importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
  // Precache generated assets (handled loosely here for manual Vite integration)
  // In a real prod setup we'd use injectManifest
  
  // Cache static assets (CSS, JS, Web Workers)
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );

  // Cache i18n JSON files
  workbox.routing.registerRoute(
    ({url}) => url.pathname.endsWith('.json'),
    new workbox.strategies.CacheFirst({
      cacheName: 'i18n-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // NetworkFirst for API GET requests (fallback to IndexedDB logic happens in client)
  // But we can also cache them in service worker as a secondary fallback
  workbox.routing.registerRoute(
    ({url, request}) => url.pathname.startsWith('/api/') && request.method === 'GET',
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    })
  );

  self.addEventListener('install', (event) => {
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });

} else {
  console.log('Workbox could not be loaded. No offline support.');
}
