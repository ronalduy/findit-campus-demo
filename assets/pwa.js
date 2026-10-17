(() => {
  'use strict';
  const installButtons = [...document.querySelectorAll('.pwa-install-trigger')];
  const helpCard = document.getElementById('pwa-install-card');
  const helpTitle = document.getElementById('pwa-install-title');
  const helpDescription = document.getElementById('pwa-install-description');
  const dismissButton = document.getElementById('pwa-install-dismiss');
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInAppBrowser = /(FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|Snapchat)/i.test(ua);
  let deferredPrompt = null;

  function setHelp(title, message) {
    if (helpTitle) helpTitle.textContent = title;
    if (helpDescription) helpDescription.textContent = message;
    if (helpCard) helpCard.hidden = false;
  }

  function hideInstallButtons() {
    installButtons.forEach(button => { button.hidden = true; });
    if (helpCard) helpCard.hidden = true;
  }

  if (isStandalone()) hideInstallButtons();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js', { scope: './' })
        .then(registration => registration.update().catch(() => {}))
        .catch(error => console.warn('FindIT Campus service worker registration failed:', error));
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    // Keep the visible Install App button. Clicking it opens the trusted browser prompt.
    installButtons.forEach(button => { button.disabled = false; });
  });

  async function installOrExplain() {
    if (isStandalone()) {
      setHelp('FindIT Campus is installed', 'You are already using the installed app. You can close this message and continue.');
      return;
    }
    if (deferredPrompt) {
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setHelp('Installation started', 'Follow the confirmation from your browser. FindIT Campus will appear on your phone home screen or app list.');
        } else {
          setHelp('Install later', 'You can try again with the Install App button or use the browser menu to choose Install app.');
        }
      } catch (error) {
        setHelp('Use your browser install option', 'Open your browser menu and choose Install app or Add to Home screen.');
      }
      return;
    }
    if (isIOS) {
      setHelp('Install on iPhone', 'Open this site in Safari, tap Share, choose Add to Home Screen, turn on Open as Web App if shown, then tap Add.');
      return;
    }
    if (isInAppBrowser) {
      setHelp('Open in Chrome to install', 'This in-app browser may block installation. Open the three-dot menu, choose Open in browser or Open in Chrome, then use Install app / Add to Home screen.');
      return;
    }
    setHelp('Install FindIT Campus', 'Open your browser menu (⋮) and choose Install app or Add to Home screen. If that option is missing, confirm the site uses HTTPS and has finished loading, then try Chrome.');
  }

  installButtons.forEach(button => button.addEventListener('click', installOrExplain));
  if (dismissButton) dismissButton.addEventListener('click', () => { if (helpCard) helpCard.hidden = true; });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButtons();
  });
})();
