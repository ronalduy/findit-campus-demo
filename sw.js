const CACHE_NAME = 'findit-campus-amc-r4-amc-fresh-20261017-r4';
const PRECACHE = [
  './', './index.html', './reset-cache.html',
  './styles.css?v=amc-fresh-20261017-r4', './app.js?v=amc-fresh-20261017-r4', './pwa-install.js?v=amc-fresh-20261017-r4',
  './manifest.json?v=amc-fresh-20261017-r4', './ave-maria-college-logo.png?v=amc-fresh-20261017-r4',
  './favicon-32.png?v=amc-fresh-20261017-r4', './icon-180.png?v=amc-fresh-20261017-r4', './icon-192.png?v=amc-fresh-20261017-r4',
  './icon-512.png?v=amc-fresh-20261017-r4', './icon-512-maskable.png?v=amc-fresh-20261017-r4'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).catch(err => console.warn('FindIT precache skipped:', err)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('findit-campus-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
