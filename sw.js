const CACHE_NAME = 'findit-campus-no-scan-v7-3';
const APP_SHELL = ['./', './index.html', './styles.css?v=camera-no-scan-v7-3', './app.js?v=camera-no-scan-v7-3', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './assets/brand/ave-maria-college-logo.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('findit-campus-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('.php') || url.pathname.includes('/api/')) return;
  // Never cache HTML, scripts, or styles before checking the server; this avoids sticky old builds on phones.
  const freshAsset = url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json');
  event.respondWith(fetch(req, { cache: 'no-store' }).then(response => {
    if (response && response.ok && !freshAsset && (req.destination === 'image' || req.destination === 'font')) {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
    }
    return response;
  }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html'))));
});
