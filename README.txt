FINDIT CAMPUS — CAMERA CANVAS ALIGNMENT UPDATE

Purpose
- Keep the page in portrait; no screen orientation lock is requested.
- ID camera frame stays landscape while the page stays portrait.
- Selfie frame stays portrait with the oval face guide.
- The camera preview is now drawn into a canvas using a centered crop that matches the frame's aspect ratio.
- The exact preview canvas is what is saved as the ID/selfie image. This removes the separate CSS-video-versus-canvas crop mismatch that caused saved images to shift.
- The front-camera selfie preview and saved selfie are mirrored consistently.

Upload to GitHub Pages
1. Extract this folder.
2. In the repository's main/root folder, upload and replace index.html, styles.css, app.js, sw.js, and manifest.json if included.
3. Keep the existing icons folder.
4. Commit changes to main and wait for Pages deployment.
5. On the phone, open the website in Chrome/Safari directly (not Messenger's in-app browser), close old tabs, and reload.

Important
- This is still an HTML/JavaScript demo with browser-local storage, not the final PHP/MySQL system.
- OCR may still misread unclear or small text; keep fields editable and verify manually.
- Do not use real student ID/selfie data in a public test site.
