FINDIT CAMPUS — FRESH GITHUB PAGES PACKAGE (AVE MARIA COLLEGE)
Build: amc-fresh-20261017-r4

WHAT THIS PACKAGE DOES
- Rebuilds every static GitHub Pages file with the Ave Maria College seal.
- Adds a visible Install App button in the top bar and a second large “Install FindIT Campus” button in the hero area.
- Uses a flat file layout: logo and icons are in the same folder as index.html so uploading does not miss nested asset paths.
- Adds new, versioned CSS/JS URLs and a new cache name to reduce the chance that an old “F” logo page stays cached.
- Includes reset-cache.html to clear old FindIT service workers and caches if necessary.
- Preserves the current browser demo flow: registration capture, OCR suggestions, selfie, pending approval, admin demo, and Lost/Found sample pages.

IMPORTANT LIMITS
- This is a static GitHub Pages demo using browser storage. It is not the PHP/MySQL shared-server system.
- Install App installs the website as a PWA where supported; it does not download an Android APK.
- ID OCR can be wrong and is not identity proof. Use fictional/demo identity data in a public repository.

HOW TO REPLACE THE OLD GITHUB PAGES FILES
1. Extract this ZIP on your computer. Files should be directly visible (index.html, styles.css, app.js, manifest.json, etc.).
2. Open repository https://github.com/ronalduy/findit-campus-demo and select the main branch.
3. Click Add file > Upload files.
4. Select EVERY item in the extracted folder (Ctrl+A while inside that folder). Upload the files themselves to the main/root folder, not a nested folder. Do not upload the ZIP as a single file.
5. Commit changes directly to main. If asked to replace files with the same names, replace them.
6. Wait for GitHub Pages deployment to finish (repository page should show a green github-pages deployment).
7. On your phone, open this URL in Chrome (not Messenger):
   https://ronalduy.github.io/findit-campus-demo/reset-cache.html
   This clears old FindIT caches and automatically redirects to the new page. It may clear this browser's demo-only local data.
8. Confirm the page shows the circular Ave Maria College seal and the blue “Install FindIT Campus” button below the hero intro. If it does not, the updated files were not uploaded to the repository root or Pages deployment has not finished.

INSTALL ON ANDROID
- Use Chrome, open the HTTPS website, and tap Install App. If the prompt does not appear, use Chrome menu (three dots) > Install app/Add to Home screen.
- Messenger's in-app browser can block camera and install prompts. Choose Open in Chrome.

INSTALL ON IPHONE
- Use Safari, open the HTTPS website, tap Share > Add to Home Screen.

ROOT FILES
index.html, styles.css, app.js, manifest.json, pwa-install.js, sw.js, ave-maria-college-logo.png, favicon-32.png, icon-180.png, icon-192.png, icon-512.png, icon-512-maskable.png, reset-cache.html, VERSION.txt, README.txt, UPLOAD_INSTRUCTIONS.txt.
