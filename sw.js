const CACHE_NAME = 'findit-campus-demo-final-1';
const APP_SHELL = ['./', './index.html', './styles.css?v=final-demo-1', './app.js?v=final-demo-1', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './assets/brand/ave-maria-college-logo.png'];
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
  event.respondWith(fetch(req).then(response => {
    if (response && response.ok && (req.destination === 'style' || req.destination === 'script' || req.destination === 'image' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json'))) {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
    }
    return response;
  }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html'))));
});
