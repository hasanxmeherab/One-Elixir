const CACHE = 'oneelixir-v2';
const STATIC = ['/', '/index.html', '/collection', '/cart', '/wishlist'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // never cache API calls

  e.respondWith((async () => {
    const isNavigation = e.request.mode === 'navigate';

    try {
      const networkResponse = await fetch(e.request);

      if (isNavigation && networkResponse.status >= 500) {
        const appShell = await caches.match('/index.html');
        if (appShell) return appShell;

        const rootShell = await caches.match('/');
        if (rootShell) return rootShell;
      }

      return networkResponse;
    } catch (err) {
      const cachedAsset = await caches.match(e.request);
      if (cachedAsset) return cachedAsset;

      // For SPA routes (like /admin-login), fall back to the app shell.
      if (isNavigation) {
        const appShell = await caches.match('/index.html');
        if (appShell) return appShell;

        const rootShell = await caches.match('/');
        if (rootShell) return rootShell;
      }

      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});