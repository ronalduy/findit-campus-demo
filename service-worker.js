/* FindIT Campus PWA service worker.
   Cache static UI files only. Never cache PHP pages, authenticated content, or private photos. */
'use strict';
const CACHE_PREFIX = 'findit-campus-static-';
const CACHE_NAME = CACHE_PREFIX + 'v3-amc-logo-install';
const STATIC_FILES = [
  './manifest.webmanifest',
  './assets/styles.css?v=20261017-logo-install2',
  './assets/app.js?v=20261017-logo-install2',
  './assets/pwa.js?v=20261017-pwa2',
  './assets/brand/ave-maria-college-logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // PHP pages and private media always use the network; never put account or student images in CacheStorage.
  if (url.pathname.endsWith('.php') || url.pathname.includes('/storage/private/') || url.pathname.endsWith('/private_media.php')) return;
  const isStatic = /\/assets\/(styles\.css|app\.js|pwa\.js|brand\/[^/]+\.png|icons\/[^/]+\.png)$/.test(url.pathname) || url.pathname.endsWith('/manifest.webmanifest');
  if (!isStatic) return;
  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => {
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
    return cached || network;
  }));
});
