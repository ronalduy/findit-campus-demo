(() => {
  'use strict';
  const installCard = document.getElementById('pwa-install-card');
  const installBtn = document.getElementById('pwa-install-btn');
  const dismissBtn = document.getElementById('pwa-install-dismiss');
  const iosHint = document.getElementById('pwa-ios-hint');
  const iosDismiss = document.getElementById('pwa-ios-dismiss');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferredPrompt = null;

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js', { scope: './' }).catch((error) => {
        console.warn('FindIT Campus service worker registration failed:', error);
      });
    });
  }

  if (!isStandalone && isIOS && iosHint) {
    iosHint.hidden = false;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installCard) installCard.hidden = false;
    if (installBtn) installBtn.hidden = false;
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } finally {
        deferredPrompt = null;
        if (installCard) installCard.hidden = true;
      }
    });
  }

  if (dismissBtn) dismissBtn.addEventListener('click', () => { if (installCard) installCard.hidden = true; });
  if (iosDismiss) iosDismiss.addEventListener('click', () => { if (iosHint) iosHint.hidden = true; });
  window.addEventListener('appinstalled', () => { if (installCard) installCard.hidden = true; });
})();
