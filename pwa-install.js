(() => {
  'use strict';
  const buttons = Array.from(document.querySelectorAll('.pwa-install-trigger'));
  const modal = document.getElementById('installHelp');
  const title = document.getElementById('installHelpTitle');
  const text = document.getElementById('installHelpText');
  const steps = document.getElementById('installHelpSteps');
  let deferredPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInApp = /(FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|Snapchat)/i.test(ua);
  const isAndroid = /android/i.test(ua);

  function showGuide(titleText, bodyText, instructionList) {
    if (!modal) return;
    title.textContent = titleText;
    text.textContent = bodyText;
    steps.replaceChildren();
    (instructionList || []).forEach(message => {
      const li = document.createElement('li');
      li.textContent = message;
      steps.appendChild(li);
    });
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeGuide() {
    modal?.classList.add('hidden');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-close-install]').forEach(el => el.addEventListener('click', closeGuide));
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    buttons.forEach(b => { b.dataset.installReady = 'true'; });
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    buttons.forEach(b => { b.classList.add('is-installed'); b.setAttribute('aria-label','FindIT Campus is installed'); });
    showGuide('FindIT Campus is installed', 'The app has been added to your device. Look for the FindIT Campus icon on your home screen or app list.', ['You can close this message and continue using FindIT Campus.']);
  });

  async function handleInstall() {
    if (isStandalone()) {
      showGuide('FindIT Campus is already installed', 'You opened FindIT Campus in its installed app window.', ['Close this message to continue.']);
      return;
    }
    if (isInApp) {
      showGuide('Open in your browser first', 'You are viewing FindIT Campus inside an app browser such as Messenger. These browsers often block app installation and camera behavior.', [
        'Tap the three-dot menu at the top of the page.',
        'Choose “Open in browser” or “Open in Chrome”.',
        'Once the page opens in Chrome, tap Install App again or use Chrome’s menu → Install app / Add to Home screen.'
      ]);
      return;
    }
    if (deferredPrompt) {
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      try {
        await promptEvent.prompt();
        const result = await promptEvent.userChoice;
        if (result && result.outcome === 'accepted') {
          showGuide('Installation accepted', 'Follow your browser’s confirmation. FindIT Campus should appear on your home screen or app list.', ['You can now open it from the FindIT Campus icon.']);
        } else {
          showGuide('Installation not completed', 'You can install FindIT Campus later from your browser menu.', [isAndroid ? 'In Chrome, tap ⋮ → Install app or Add to Home screen.' : 'Use your browser’s Add to Home Screen option.']);
        }
      } catch (err) {
        showBrowserInstructions();
      }
      return;
    }
    showBrowserInstructions();
  }
  function showBrowserInstructions() {
    if (isIOS) {
      showGuide('Install on iPhone or iPad', 'Safari installs websites from its Share menu. This creates a home-screen web app, not an App Store download.', [
        'Open this link in Safari (not Messenger).',
        'Tap Share (the square with the up arrow).',
        'Choose “Add to Home Screen”. If shown, enable “Open as Web App”, then tap Add.'
      ]);
    } else if (isAndroid) {
      showGuide('Install on Android', 'If the automatic install prompt is unavailable, use Chrome’s built-in install option.', [
        'Open this link in Chrome (not Messenger).',
        'Tap Chrome’s three-dot menu (⋮).',
        'Choose “Install app” or “Add to Home screen”, then confirm.'
      ]);
    } else {
      showGuide('Install FindIT Campus', 'Use a browser that supports Progressive Web App installation.', [
        'Open this website directly in the browser.',
        'Open the browser menu and choose “Install app” or “Add to Home screen”.'
      ]);
    }
  }
  buttons.forEach(button => button.addEventListener('click', handleInstall));

  // register service worker from the repository-relative location (works on GitHub Pages project sites).
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(reg => reg.update().catch(() => {}))
        .catch(err => console.warn('FindIT Campus service worker registration failed', err));
    });
  }
})();
