(() => {
  'use strict';
  const installButton = document.getElementById('installAppButton');
  const buttons = Array.from(document.querySelectorAll('.pwa-install-trigger'));
  const modal = document.getElementById('installHelp');
  const title = document.getElementById('installHelpTitle');
  const text = document.getElementById('installHelpText');
  const steps = document.getElementById('installHelpSteps');
  const STORAGE_KEY = 'finditCampusPwaInstalled';
  let deferredPrompt = null;

  const mediaStandalone = window.matchMedia('(display-mode: standalone)');
  const mediaFullscreen = window.matchMedia('(display-mode: fullscreen)');
  const mediaMinimalUi = window.matchMedia('(display-mode: minimal-ui)');
  const isStandaloneContext = () => mediaStandalone.matches || mediaFullscreen.matches || mediaMinimalUi.matches || navigator.standalone === true;
  const wasMarkedInstalled = () => {
    try { return localStorage.getItem(STORAGE_KEY) === 'yes'; } catch (_) { return false; }
  };
  const isInstalled = () => isStandaloneContext() || wasMarkedInstalled();
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInApp = /(FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|Snapchat)/i.test(ua);
  const isAndroid = /android/i.test(ua);

  function setInstalledState(persist = false) {
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, 'yes'); } catch (_) { /* storage may be disabled */ }
    }
    document.documentElement.classList.add('pwa-installed');
    buttons.forEach(button => {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
      button.setAttribute('tabindex', '-1');
    });
    deferredPrompt = null;
  }
  function syncInstallButton() {
    if (isInstalled()) {
      setInstalledState(false);
      return;
    }
    document.documentElement.classList.remove('pwa-installed');
    buttons.forEach(button => {
      button.hidden = false;
      button.removeAttribute('aria-hidden');
      button.removeAttribute('tabindex');
    });
  }
  function showGuide(titleText, bodyText, instructionList) {
    if (!modal || !title || !text || !steps) return;
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
    if (isInstalled()) {
      setInstalledState(false);
      return;
    }
    deferredPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    setInstalledState(true);
    closeGuide();
  });

  async function handleInstall() {
    if (isInstalled()) {
      setInstalledState(false);
      return;
    }
    if (isInApp) {
      showGuide('Open in your browser first', 'You are viewing FindIT Campus inside an app browser such as Messenger. These browsers may block app installation and camera behavior.', [
        'Tap the three-dot menu at the top of the page.',
        'Choose “Open in browser” or “Open in Chrome”.',
        'In Chrome, tap Install App again or use the browser menu → Install app / Add to Home screen.'
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
          // Hide immediately after acceptance; appinstalled also persists the state.
          setInstalledState(true);
          showGuide('FindIT Campus installation accepted', 'FindIT Campus should now appear on your home screen or app list. Open it from its new icon.', ['You can close this message and continue.']);
        } else {
          showGuide('Installation not completed', 'You can install FindIT Campus later from your browser menu.', [isAndroid ? 'In Chrome, tap ⋮ → Install app or Add to Home screen.' : 'Use your browser’s Add to Home Screen option.']);
        }
      } catch (_) { showBrowserInstructions(); }
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
        'Choose “Install app” or “Add to Home screen”, then confirm. Open FindIT Campus from the installed icon afterward.'
      ]);
    } else {
      showGuide('Install FindIT Campus', 'Use a browser that supports Progressive Web App installation.', [
        'Open this website directly in the browser.',
        'Open the browser menu and choose “Install app” or “Add to Home screen”.'
      ]);
    }
  }
  buttons.forEach(button => button.addEventListener('click', handleInstall));
  [mediaStandalone, mediaFullscreen, mediaMinimalUi].forEach(media => {
    if (media.addEventListener) media.addEventListener('change', syncInstallButton);
    else if (media.addListener) media.addListener(syncInstallButton);
  });

  // Initial state hides the header install button in the installed app window.
  syncInstallButton();

  // Register a new versioned service worker so old copies update after deployment.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=amc-install-clean-20261017-r5', { scope: './' })
        .then(reg => reg.update().catch(() => {}))
        .catch(err => console.warn('FindIT Campus service worker registration failed', err));
    });
  }
})();
