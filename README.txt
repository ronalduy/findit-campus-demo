FINDIT CAMPUS — PORTRAIT PAGE / LANDSCAPE ID FRAME
=================================================

This update matches the requested camera behavior:
- The website page and registration modal stay in portrait.
- The website does NOT request fullscreen and does NOT lock or rotate the phone screen.
- Only the school ID preview frame is landscape-shaped.
- Keep the phone upright and hold the physical school ID horizontally, centered inside the wide preview frame.
- The selfie preview stays portrait with the oval face guide.
- The saved ID and selfie are center-cropped according to the visible frame's aspect ratio so they match the live preview crop.
- OCR runs after the ID photo is captured. OCR can still make mistakes; review and correct the fields.

FILES TO UPDATE ON GITHUB PAGES
-------------------------------
Upload these files directly to the root of your GitHub repository and replace the old copies:
- index.html
- styles.css
- app.js
- sw.js

Keep the existing manifest.json and icons folder. Click Commit changes, wait for GitHub Pages to deploy, then open the site in a fresh tab on your phone. The service-worker cache name has been changed to v13 to help the browser fetch the new files.

CAMERA TEST
-----------
1. Use Chrome on Android or Safari on iPhone, not the Messenger in-app browser if it causes camera problems.
2. Allow camera access.
3. Keep your phone upright.
4. Hold the school ID horizontally and center it in the landscape frame.
5. Take a test image and check the captured preview before submitting.
6. For the selfie, center the face inside the oval guide; the page stays upright.

IMPORTANT LIMITS
----------------
This is a front-end demo. Records are stored in the current browser, not shared with other devices. Camera capture and OCR do not prove identity. Use mock student data and sample ID images during testing; do not upload real student IDs to a public repository.
