FINDIT CAMPUS — FINTECH-STYLE CAMERA FLOW DEMO

WHAT IS INCLUDED
- Existing FindIT Campus student/admin demo and registration workflow.
- Dark fintech-inspired full-viewport camera flow.
- Landscape school-ID viewfinder with pulsing corner guides.
- Portrait oval selfie guide.
- Rear/front camera switch.
- Flash/torch toggle when the browser and device support it.
- Capture review screen with Retake and Use Photo.
- Accurate crop mapping from the viewfinder CSS rectangle back to raw camera pixels, including the centering offsets created by object-fit: cover.
- The saved photo is cropped to the same viewfinder area shown live. Selfie preview/save mirroring is handled consistently.

HOW TO TEST
1. Open this folder in VS Code and run it through Live Server, or upload the files to GitHub Pages.
2. On phones, open the HTTPS website directly in Chrome or Safari, not in an embedded Messenger browser.
3. Allow camera permission. Capture an ID, inspect the review image, then choose Retake or Use Photo. Repeat for the selfie.
4. On Use Photo, the ID is saved to the registration form and OCR starts automatically.
5. Use sample IDs for testing. This is a browser-storage demo, not production identity verification.

IMPORTANT LIMITS
- Browser camera capture requires HTTPS or localhost.
- Flash control only works if the camera track exposes the torch capability.
- Flash/camera controls vary by phone and browser.
- OCR needs an internet connection to load the Tesseract library.
- This demo stores records in the current browser; it does not synchronize with other devices.
- Capturing a selfie is not liveness detection, face matching, or proof of identity. Admin/Teacher must verify student details manually.
- Do not submit real school ID images or student records on a public demo.
