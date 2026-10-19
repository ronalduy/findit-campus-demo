const CACHE_NAME = 'findit-static-v2-live';
const STATIC_ASSETS = [
  './assets/styles.css?v=20261020-live-2',
  './assets/app.js?v=20261020-live-2',
  './assets/pwa.js?v=20261020-live-2',
  './assets/brand/ave-maria-college-logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Always go to PHP for navigation and dynamic pages so login state and SQL records stay fresh.
  if (request.mode === 'navigate' || /\.php(?:$|\?)/i.test(url.pathname + url.search)) {
    event.respondWith(fetch(request, {cache:'no-store'}));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === 'basic') { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)); }
    return response;
  })));
});
