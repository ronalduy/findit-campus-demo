FINDIT CAMPUS — GITHUB PAGES BRANDING + INSTALL BUTTON FIX

THIS PACKAGE IS FOR YOUR EXISTING GITHUB PAGES STATIC DEMO.
It contains root-level website files. Upload the CONTENTS of this folder directly to the root of your repository (not this enclosing folder).

WHAT IS FIXED
- Replaces the blue F placeholder mark with the Ave Maria College seal in the system header, camera header, in-page mockup, and PWA app icons.
- Adds a visible blue “Install App” button in the top bar, including on phone-sized screens.
- Clicking Install App opens the native install prompt when the browser supplies one.
- If the page is open inside Messenger or another in-app browser, it explains how to open Chrome/Safari to install.
- Includes a PWA manifest and a fresh service-worker cache version.
- Keeps the existing FindIT Campus camera-registration demo and item demo.

HOW TO UPLOAD TO GITHUB PAGES
1. Extract this ZIP.
2. Open your repository: ronalduy/findit-campus-demo.
3. Select Add file > Upload files.
4. Open the extracted folder and upload these files directly into repository root: index.html, styles.css, app.js, manifest.json, pwa-install.js, sw.js, README.txt, plus the assets/ and icons/ folders.
5. Commit changes to main.
6. Wait for the green github-pages deployment in the repository. Open the Pages site in Chrome on Android or Safari on iPhone.

IMPORTANT PWA INSTALL NOTES
- This is a Progressive Web App install, not an APK download.
- On Android Chrome, clicking Install App should open the native install prompt when available; otherwise follow the browser-menu instructions shown by the button.
- On iPhone/iPad, open the site in Safari, tap Share > Add to Home Screen.
- Messenger’s in-app browser commonly blocks installation; open the site externally in Chrome/Safari.
- A PWA install button cannot force installation if the browser does not allow it. This package keeps the button visible and explains the fallback steps.

LIMITS
- GitHub Pages hosts static HTML/CSS/JavaScript only. It does not run PHP or MySQL.
- Registration, admin approval, and items in this GitHub Pages version remain browser-local demo data, not shared server records.
- Do not publish actual student ID or selfie images in this public repository.
- OCR uses Tesseract.js from a CDN and requires internet access.
