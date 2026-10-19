(() => {
  if (!('serviceWorker' in navigator)) return;
  // Register only on localhost or a secure origin. Never cache PHP HTML pages, API responses, or private photos.
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (location.protocol === 'https:' || isLocal) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', {scope: './'}).catch(() => {});
    });
  }
})();
