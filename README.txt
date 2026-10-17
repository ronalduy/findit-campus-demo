FINDIT CAMPUS — SCHOOL ID VERIFICATION DEMO (FULL-FRAME CAPTURE FIX)
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


CURRENT CAPTURE FIX (v7)
- The saved school ID image now matches the landscape camera view shown on screen.
- The saved preview uses a center crop based on the actual camera window ratio, matching CSS object-fit: cover.
- A wider, uncropped source frame is used only as a secondary OCR attempt; it is not used as the saved ID preview.
- After uploading updates to GitHub Pages, close the old phone tab and open the site again so the new service-worker cache can activate.
- OCR can still misread text; verify the student number, name, and program manually.


LANDSCAPE ID CAPTURE UPDATE
- The ID camera requests a landscape video ratio matching a school ID card.
- On mobile, rotate the phone sideways before capturing. If the browser cannot lock orientation, a notice is shown and capture remains paused while the screen or camera feed is portrait.
- If you are opening the page inside Messenger, use the menu to open the website in Chrome for more reliable camera/orientation behavior.
- After uploading changed files, close the old browser tab and reopen the site. The service worker cache version has been updated.
- This is a browser demo. The camera, OCR and approval flow are not proof of identity and still require manual checking.


LATEST UPDATE — FULL-SCREEN LANDSCAPE ID CAMERA (v9)
- When the ID camera opens, the demo now requests fullscreen first and then requests a landscape screen-orientation lock. This is more likely to work in Chrome on Android than locking before fullscreen.
- In fullscreen landscape, the camera modal changes to a wide layout: camera view on the left, instructions and capture controls on the right. The whole ID camera interface is landscape rather than only the guide.
- Capture remains disabled while the mobile viewport or camera feed is portrait. If rotation is blocked, enable Auto-rotate and open the HTTPS site in Chrome rather than Messenger's in-app browser.
- Some browsers (especially in-app browsers and iOS browsers) do not allow a website to force orientation. In those browsers, the user must rotate the phone manually; the site cannot override that restriction.
- Closing the camera exits fullscreen and unlocks orientation where supported. The service-worker cache name was updated to help fetch the new build.

LATEST UPDATE — EDGE-TO-EDGE LANDSCAPE CAMERA (v10)
- Fixed the ID-camera flow so it actually applies the landscape layout class and requests fullscreen when the user taps Open camera. Previous CSS referenced fullscreen layouts that were never activated by the JavaScript.
- The ID camera now tries fullscreen first, then requests a landscape orientation lock. In landscape, the camera preview fills most of the screen and capture/cancel controls sit in a side panel, instead of showing a small centered white card.
- If fullscreen is refused, a fallback fills the available webpage viewport. The Messenger in-app browser can still keep its own header visible and may refuse screen rotation; open the website directly in Chrome on Android for the best result.
- The PWA manifest now requests landscape orientation when installed as an app, where the operating system/browser supports it.
- After uploading, replace index.html, styles.css, app.js, manifest.json and sw.js in the repository root. Keep the existing icons folder. Commit changes, wait for Pages to deploy, close old tabs, then reopen the site.
- This is still a browser demo. A landscape guide is not face recognition or liveness detection, and OCR results must be checked manually.


LATEST UPDATE — PREVIEW-MATCHED ID AND SELFIE CAPTURE (v11)
- The capture pipeline now applies the same center crop as the camera frame for both ID and selfie photos.
- If the ID camera receives a portrait source while the visible guide is landscape, the video preview is rotated 90 degrees and the capture canvas applies the same rotation before cropping.
- The selfie photo is no longer saved from the uncropped sensor frame; it uses the same centered portrait view shown behind the face oval.
- The camera frame is recalculated when the phone orientation or browser viewport changes.
- Upload index.html, styles.css, app.js, and sw.js to the repository root, then close/reopen the site on the phone to refresh the service worker.
- Test first with a sample ID. Browser camera dimensions and in-app browser behavior vary, so check the saved preview and OCR result on the target phone before using any real student data.
