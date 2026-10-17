FINDIT CAMPUS — SCHOOL ID VERIFICATION DEMO (CAPTURE FIX)
========================================================

WHAT CHANGED IN THIS VERSION
- Removed the digital zoom slider.
- Uses a fixed landscape camera frame matching a standard school ID card ratio.
- The saved preview and OCR use the same center-cropped image. It no longer maps a CSS zoomed overlay to camera pixels, which could crop the table instead of the ID on some mobile browsers.
- Reuses the OCR worker while the page stays open and tries enhanced/threshold images only when fields remain unclear.
- Limits unnecessary OCR upscaling to reduce processing time on phones.
- Adds a new service-worker cache version so the revised app assets can replace stale cached files.

HOW TO TEST LOCALLY
1. Extract the ZIP.
2. Open the folder in Visual Studio Code.
3. Run index.html using Live Server, or use HTTPS hosting (such as GitHub Pages).
4. Use the rear camera, hold the ID horizontally, center it in the landscape guide, and keep all four corners visible.
5. After capture, check that the saved preview shows the ID itself, not the table/background. Retake if needed.
6. The OCR should auto-fill Student ID Number, Complete Name, and Program/Course when the text can be read. Review every field before submitting.

UPDATE AN EXISTING GITHUB PAGES DEMO
1. Open the repository root (the same folder containing the published index.html).
2. Use Add file > Upload files and upload the files from this ZIP directly to the repository root, replacing existing files when asked.
3. Include index.html, styles.css, app.js, manifest.json, and sw.js. Upload the icons folder too if the repository does not already contain it.
4. Commit changes and wait for GitHub Pages to publish.
5. On the phone, open the site in Chrome/Safari itself rather than inside Messenger's in-app browser where possible. Refresh the page. If it still shows old UI, close the tab and reopen; clear that site's cached data/service worker if necessary.

DEMO LIMITATIONS
- OCR cannot guarantee 100% accuracy. Use a clear, straight, glare-free photo and manually check all fields.
- Live camera capture and OCR do not prove identity. Admin/Teacher must check against official school records.
- This demo uses browser localStorage and a demo admin login; it is not a secure production account system and does not synchronize across devices.
- Use sample/fake ID data for public hosting. Do not upload real school ID photos or student personal data to a public repository.
- GitHub Pages hosts static HTML/CSS/JavaScript only; the eventual shared school system still needs a PHP/MySQL backend hosted on a server such as XAMPP for local testing.


LATEST UPDATE — SELFIE FACE GUIDE
- The selfie camera uses a tall portrait preview with a centered oval/egg-shaped face guide and eye-level alignment line.
- The school ID camera remains a separate landscape card guide.
- To update an existing GitHub Pages repository, replace index.html, styles.css, app.js, and sw.js in the repository root. Keep manifest.json, pwa-install.js, and icons if they are already present.
- If a phone still shows the old design, close the site tab, reopen the URL, and refresh. If the old layout persists, clear the site's cached data or use a new private tab to test.
- This oval is a visual positioning guide only. It does not perform automatic face recognition, face-to-ID matching, or liveness detection. Admin/Teacher must manually verify the application.
