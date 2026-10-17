FINDIT CAMPUS - SCHOOL LOST AND FOUND MANAGEMENT SYSTEM
======================================================
Version: Academic prototype v1.0
Stack: PHP + MySQL/MariaDB + HTML/CSS/JavaScript + XAMPP
Editor: Visual Studio Code

IMPORTANT
---------
This is a real PHP/MySQL project starter, not a static GitHub Pages site. PHP pages must run through Apache and MySQL in XAMPP. GitHub Pages cannot run PHP or connect to a MySQL database.

The system contains:
- Student registration with live school ID capture and live selfie capture
- Browser OCR attempt to suggest Student ID Number, Name, and Program
- Editable student information fields
- Student applications stay Pending until Admin/Teacher review
- Admin can Approve, Reject, or Request Correction
- Students can check application status and resubmit corrections
- Student pages have two main navigation links: Lost Items and Found Items
- Admin can post and edit lost reports and found items with photos
- Found-item claiming is in person at the school office
- Admin can record handovers; the found item becomes Returned
- Admin dashboard summaries, CSV reports, and activity logs
- Password hashing, role checks, CSRF tokens, login lockout, session idle timeout
- Private storage for ID images and selfies

REQUIREMENTS
------------
1. XAMPP with Apache, MySQL/MariaDB, and PHP 8.1 or newer recommended.
2. A modern browser (Chrome or Edge recommended).
3. Internet access for the optional Tesseract.js OCR library. If the library cannot load, the student can type/correct the fields manually.
4. Camera permission. The camera works on localhost, or on an HTTPS site. Ordinary HTTP from another device on a LAN may block camera access.

INSTALL ON WINDOWS / XAMPP
--------------------------
1. Extract the FindIT_Campus_XAMPP_System folder.
2. Copy the whole folder to: C:\xampp\htdocs\FindIT_Campus_XAMPP_System
3. Open XAMPP Control Panel and start Apache and MySQL.
4. Open http://localhost/phpmyadmin in your browser.
5. Click Import. Select this file:
      C:\xampp\htdocs\FindIT_Campus_XAMPP_System\database\findit_campus.sql
   Click Import/Go and wait until phpMyAdmin says the import succeeded.
6. Open config.php in VS Code. The default local settings are:
      DB_HOST = 127.0.0.1
      DB_NAME = findit_campus
      DB_USER = root
      DB_PASS = '' (blank)
   Change DB_PASS if your local MySQL root account has a password.
7. Open the system:
      http://localhost/FindIT_Campus_XAMPP_System/
8. Admin demo login:
      Username: admin
      Password: 1234
9. Immediately sign in as admin, open Password in the top bar and change the demo password before using real data.
10. Register a fictional/sample student using a sample ID. The student cannot sign in until approved by Admin/Teacher.

WARNING ABOUT SQL IMPORT
------------------------
The supplied SQL file drops/recreates the FindIT Campus tables so that it can make a clean first install. Re-importing it later will delete all FindIT Campus accounts, items, handover records, and logs. Export a backup first if you already have data. Do not run it against any other database.

REGISTRATION FLOW
-----------------
1. Student captures a school ID using the browser camera. No gallery file input is present on the registration capture form.
2. The browser makes a landscape crop from the visible ID viewfinder and tries OCR using Tesseract.js.
3. Student ID Number, Name, and Program may be suggested. OCR is not guaranteed to be accurate; the student must review and correct the fields.
4. Student captures a live selfie with the portrait oval guide.
5. Student enters a password and acknowledges the school's privacy notice.
6. The application is stored with status Pending.
7. Admin/Teacher checks the ID photo, selfie, and the official school record, then Approves, Rejects, or Requests Correction.
8. If correction is requested, the student uses the “Check application / update requested details” link on the sign-in page, verifies the Student ID and password, edits details/photos as needed, and resubmits.
9. Approved students sign in with Student ID Number and password.

ITEM WORKFLOW
-------------
- Admin/Teacher posts both Lost reports and Found items.
- Only staff should post found items after confirming the physical item is held safely by the school.
- Students can browse the Lost Items and Found Items pages and search records.
- A student who recognizes a found item visits the school Admin/Teacher in person with the reference code.
- Staff verify ownership. They then record the handover on Handover Records.
- A handover updates the Found item to Returned. If a related Lost report is selected, that report becomes Closed.
- Students cannot mark items Returned themselves or claim items online.

PHOTO AND PRIVACY NOTES
-----------------------
- Registration ID and selfie photos are stored under storage/private and served by private_media.php only after access checks.
- The storage folder includes Apache .htaccess restrictions. Keep Apache configured to honor .htaccess. Do not move sensitive photos into a public web folder.
- Item photos are also stored privately and are served to signed-in users.
- This package includes a DRAFT privacy notice. School management / the Data Protection Officer must replace the bracketed retention/contact placeholders and approve the final text before real student use.
- The web camera capture and OCR do not perform biometric face matching or liveness detection. Admin/Teacher must verify the details against an official school record. Do not use the demo to make identity decisions automatically.
- Use sample/fake ID information while testing. Do not place real student images or information in a public GitHub repository.

SECURITY AND PRODUCTION LIMITS
------------------------------
This is an academic prototype for local development. Before school-wide deployment, the school must:
- Change the default admin password.
- Configure HTTPS and secure hosting.
- Review file permissions, backups, retention, deletion, and access policies.
- Have its privacy notice and consent process reviewed by the school.
- Test camera behavior on target devices and test the complete account workflow.
- Add a formal account recovery process and any school-required identity checks.
- Ensure uploaded pictures are backed up together with the database and that restoration has been tested.

FILE GUIDE
----------
index.php                         Login page
register.php                      Student registration / ID camera / selfie camera
register_action.php               Validates and creates pending registration
application-status.php             Student checks status / corrects requested details
application-correction-action.php  Saves application correction
admin-dashboard.php               Admin dashboard
admin-applications.php            Verify applications
application_action.php             Approve/reject/request correction
admin-items.php                    Create/edit records and update status
lost-items.php                    Student Lost Items navigation
found-items.php                   Student Found Items navigation
item.php                          Item details and in-person claim instructions
handovers.php                     Record physical item handover
reports.php                       Item reports and activity logs
export_reports.php                CSV export
private_media.php                 Access-controlled private image delivery
change-password.php               Change current password
privacy.php                       Draft privacy notice
config.php                        Database and session settings
functions.php                     Shared helpers and page layout
assets/styles.css                UI styling
assets/app.js                    Camera crop, OCR, and UI interactions
database/findit_campus.sql        Database schema and demo admin/sample items
storage/private/                  Private photo storage; keep this protected

KNOWN LIMITATIONS
-----------------
- OCR varies by ID design, camera quality, lighting, glare, and text size. The user must check all extracted fields.
- Capturing a photo with the camera does not prove that the person is live or matches the ID.
- Login protection in this local prototype has basic lockout behavior, but it should receive a security review before public hosting.
- There is no automated scheduled deletion of registration photos in this version. School retention and secure-deletion procedures must be defined and followed.
- Demo item records in the SQL file are fictional examples.


PHONE USE AND INSTALL AS AN APP (PWA)
-------------------------------------
The interface uses responsive CSS and is designed to adapt to phone screens. This package now also includes PWA files so supported browsers can add FindIT Campus to the phone home screen.

Included PWA files:
- manifest.webmanifest: app name, icons, start page, and standalone display settings.
- service-worker.js: caches the static CSS/JS/icons only. It deliberately does NOT cache PHP pages, logged-in content, or private student photos.
- assets/pwa.js: registers the service worker and shows supported install guidance.
- assets/icons/: install icons for Android and iOS.

Important hosting requirements:
1. The PHP + MySQL application must be hosted on a server that supports PHP and MySQL. GitHub Pages cannot run this application.
2. For actual installation as a PWA and camera access, use HTTPS hosting. Browsers block service workers and camera access on most non-secure network URLs.
3. XAMPP running on your PC can be viewed from a phone on the same Wi-Fi by using the PC's LAN IP address, but camera access and PWA installation may not work over ordinary HTTP. For full phone testing, use HTTPS hosting or a properly configured HTTPS test tunnel.
4. Android Chrome: open the HTTPS site, then choose Install app/Add to Home screen (or use the in-page Install button if the browser displays it).
5. iPhone Safari: open the HTTPS site, tap Share, then Add to Home Screen.
6. Installing the PWA creates an app-like shortcut to the hosted PHP website. The PHP server and MySQL database still need to be online; this does not turn the system into a fully offline native app.
7. Use fictional student details for tests. Confirm the school has approved the privacy notice and retention rules before collecting real ID and selfie photos.
