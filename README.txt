FINDIT CAMPUS — ENHANCED SCHOOL LOST & FOUND DEMO
Ave Maria College | Browser-only prototype

IMPORTANT
This demo intentionally has NO database and NO server backend. It saves data in localStorage in the current browser only. A student application created on a phone will NOT automatically appear in the Admin browser on a laptop. Shared live updates need the PHP + MySQL/XAMPP backend later. Do not use real school ID photos, real student details, or real passwords in the public GitHub Pages demo.

RUN LOCALLY
1. Extract the ZIP.
2. Open the folder in VS Code.
3. For camera access, use Live Server (localhost) or host over HTTPS. Opening index.html with file:// may block the camera.
4. Open index.html in Chrome/Edge.
5. Admin demo login: username admin, password 1234.
6. Student demo login: Student ID 2026-0001, password student123.

FEATURES IN THIS DEMO
- Responsive Student portal with only Lost Items and Found Items as the main item navigation.
- Admin dashboard, application review, published item reports, account management, handover recording, reports, recycle bin, and settings.
- Student registration using live school ID and selfie capture. The ID frame is landscape on the portrait page; the selfie guide is portrait/oval. The preview canvas and saved photo use the same rendering/crop pipeline.
- OCR attempts to read the school name and ID details using Tesseract.js from a CDN when online. OCR and school-name detection are best effort and are NOT identity verification. Admin must manually verify the school ID against an official school record before approving.
- Admin can approve applications. Reject or Request Correction deletes the pending application and its verification photos immediately and releases the ID for a new application.
- Student ID is not editable after account approval. Password changes are supported. Forgot-password instruction tells the student to visit Admin/Teacher with school ID for manual account deletion and re-registration.
- Admin can create/edit item reports, Mark as Found, Mark as Lost, Claim/Handover, and move deleted items to the recycle bin.
- Claim form pre-fills the item's reference number. Admin enters claimant name and student ID and confirms physical ID verification. After handover the item is hidden from Student Lost/Found pages.
- Deleted admin item reports/accounts go to the Recycle Bin for 30 days. Expired records are purged when the demo is opened. This timer does not run in the background while the browser is closed.
- Activity logs and downloadable Word-compatible .doc reports, CSV exports, JSON backup/restore.
- 3 incorrect sign-in attempts trigger a 60-second lockout in this browser demo.
- Ave Maria College logo and branded app icons; optional PWA install button appears in the header and hides in standalone/installed mode when the browser reports it.

CAMERA AND OCR
- Camera requires a secure context (HTTPS or localhost) and user permission.
- OCR loads Tesseract.js from a CDN; an internet connection is needed for the library to load the first time.
- The system only looks for Ave Maria College text as a simple OCR signal. It does not reliably recognize the school logo, detect forged IDs, compare faces, or perform liveness detection.
- Captured photos are compressed and kept in this browser's localStorage only until the pending application is approved/rejected/corrected. Approval removes ID/selfie images from the application record; reject/correction purges all application personal data to allow re-registration.

TEST ACCOUNTS
Admin: admin / 1234
Student: 2026-0001 / student123

HOW TO PUBLISH TO GITHUB PAGES
Upload ALL files and folders from this extracted folder directly to the repository root (not inside an extra nested folder). Keep index.html at repository root. In Settings > Pages choose Deploy from a branch, branch main, folder /(root). Commit changes and wait for the Pages deployment. GitHub Pages serves the static demo only; it does not run PHP or MySQL.

WORD REPORT NOTE
The .doc exports are Word-compatible HTML documents that Microsoft Word can open; they are not native .docx files.

SECURITY NOTE
This is a demo. Password hashing and login lockout are simulated in browser JavaScript and can be bypassed by a person with developer tools. Do not use this as a production school system. A production system needs server-side PHP checks, password_hash/password_verify, prepared SQL statements, secure uploads, private photo storage, CSRF protection, rate limiting, audit retention rules, and HTTPS.
