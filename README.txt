FINDIT CAMPUS — SCHOOL ID VERIFICATION DEMO
===========================================

WHAT THIS DEMO DOES
- Student registration with LIVE camera capture for school ID and selfie only.
- No gallery/file upload is provided for the student ID or selfie fields.
- The school ID camera uses a horizontal landscape guide matching the usual bank-card shape, with adjustable on-screen zoom. Capture is cropped to the guide before OCR.
- OCR tries to read a student number, name, and program from the captured ID.
- OCR fields remain editable because text recognition can be wrong.
- Student submits an application in Pending status.
- Admin/Teacher reviews the captured ID photo, live selfie, and form details.
- Admin can approve, reject, or request correction.
- An approved student can then sign in with the registered email and password.
- Student dashboard contains only Lost Items and Found Items navigation.
- Admin can post lost/found reports, add an optional item photo, mark found items as returned after in-person handover, and export item reports to CSV.
- Example items are included for demonstration.

HOW TO RUN
1. Extract the ZIP folder.
2. Open the folder in Visual Studio Code.
3. If needed, install the VS Code extension named "Live Server".
4. Right-click index.html and choose "Open with Live Server".
5. Allow camera access when the browser asks. Camera access normally requires localhost or HTTPS; opening the file as file:// may block the camera.
6. Choose Admin / Teacher at login. Demo username: admin. Demo password: 1234.
7. In another session/tab in the same browser, register a student using camera capture, then sign in as admin and approve the application. After approval, the student can sign in.
8. For ID text reading (OCR), the browser needs internet access to load Tesseract.js. Move the card close enough to fill the horizontal guide, adjust the zoom slider, keep all four card corners visible, and avoid glare. The captured image is cropped to the guide before OCR. If OCR is unavailable or inaccurate, enter/correct the fields manually.

IMPORTANT LIMITS — DEMO ONLY
- This is a front-end HTML/CSS/JavaScript prototype. It does NOT connect to PHP, MySQL, or XAMPP yet.
- Data and captured photos are saved in this browser's localStorage. They do not synchronize across devices, users, or different browsers.
- ID photos and selfies are sensitive personal information. For a class demo, use a test/mock ID where possible. Avoid using real student ID photos on a shared/public computer. If you do test with real details, understand that the data stays in this browser until reset or cleared.
- The demo admin credential admin / 1234 is intentionally simple and is NOT secure for a real system.
- This prototype computes a client-side password digest where available, but browser storage is not a secure account database.
- Camera capture means the image is taken from the camera; it does NOT prove liveness or verify that the selfie matches the person on the ID.
- OCR is best-effort text reading, not official verification. Admin/Teacher must compare the information with the school's official records before approval.
- For the real system, use PHP + MySQL through XAMPP, server-side password_hash/password_verify, prepared statements, authorization checks on every protected route, CSRF protection, upload validation, private image storage, a privacy notice, a retention/deletion policy, and school approval before collecting student ID/selfie data.

FILES
- index.html  Main screens and form markup.
- styles.css  Responsive visual design.
- app.js      Demo workflow, browser camera capture, OCR, local storage, admin review, and student item pages.

SAMPLE ADMIN LOGIN
Username: admin
Password: 1234

Use the same browser for registration and admin approval because the demo uses localStorage on this browser only.
