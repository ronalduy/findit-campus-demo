/* FindIT Campus PWA service worker.
   Caches static UI assets only. PHP pages, logged-in pages, and private images are NEVER cached. */
'use strict';
const CACHE_PREFIX = 'findit-campus-static-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const STATIC_FILES = [
  './manifest.webmanifest',
  './assets/styles.css?v=20261017-1',
  './assets/app.js?v=20261017-1',
  './assets/pwa.js?v=20261017-pwa1',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache server-rendered PHP pages, form posts, sessions, or private media.
  if (url.pathname.endsWith('.php') || url.pathname.includes('/storage/private/') || url.pathname.endsWith('/private_media.php')) return;
  const isStatic = /\/assets\/(styles\.css|app\.js|pwa\.js|icons\/[^/]+\.png)$/.test(url.pathname) || url.pathname.endsWith('/manifest.webmanifest');
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
