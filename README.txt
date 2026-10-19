FINDIT CAMPUS - SCHOOL LOST AND FOUND MANAGEMENT SYSTEM
======================================================
Version: Academic prototype v2.0 - Live XAMPP connection package
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
- Handover history can be deleted to the Recycle Bin (item remains Returned)
- Items and student accounts can be archived and restored/deleted through a two-tab Recycle Bin
- Admin can change their username and password
- Phone/laptop network test writes a one-time token to the shared database
- Admin applications page auto-refreshes every 5 seconds when the queue changes
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
11. Open Phone / Laptop Test from the Admin menu to verify your phone can reach the same PHP/MySQL server over Wi-Fi.

WARNING ABOUT SQL IMPORT
------------------------
The supplied SQL file creates the database/tables if they do not exist and does not drop existing tables. It is safe for the initial setup, but an older database may need schema updates. Export a backup before changing an existing installation. Do not run it against any other database.

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


PHONE + LAPTOP TEST ON THE SAME WI-FI
-----------------------------------
1. First make sure the system works on the laptop at http://localhost/FindIT_Campus_XAMPP_System/.
2. Sign in as Admin and open Phone / Laptop Test. Click Generate connection code and leave that page open.
3. On Windows, open Command Prompt and run: ipconfig
4. Under the Wi-Fi adapter currently in use, read the IPv4 Address (often 192.168.x.x or 10.x.x.x). Do not use the Default Gateway.
5. On the phone connected to the same Wi-Fi, open: http://YOUR-LAPTOP-IP/FindIT_Campus_XAMPP_System/connection-test.php?mode=phone
   Replace YOUR-LAPTOP-IP with the laptop's IPv4 address. Enter the code displayed on the laptop.
6. The laptop page should switch to Phone connected. This proves the phone request reached this PHP application and wrote to the same MySQL database.
7. Next, use that same base URL from the phone for registration; after submit, the Admin application page polls for new records every 5 seconds.
8. If the phone cannot open the page, confirm Apache/MySQL are running, both devices are on the same Wi-Fi, and allow Apache through Windows Defender Firewall on Private networks only. Do not use router port forwarding.

MOBILE CAMERA SECURITY CONTEXT
------------------------------
Mobile browsers generally require a secure context (HTTPS) to access the camera. Plain http://localhost works on the laptop itself, but http://YOUR-LAPTOP-IP from the phone may not allow camera access. The connection test can still verify shared database connectivity. To test the camera on a phone, use a temporary HTTPS tunnel that you control, keep the test data fictional, change the demo Admin password first, and stop the tunnel immediately after testing. A tunnel makes your laptop-hosted app reachable over the internet while active; never leave it running unnecessarily.

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
handovers.php                     Record physical item handover; delete history to recycle bin
admin-accounts.php                Search/delete student accounts
admin-settings.php                Change the Admin username
recycle-bin.php                   Restore/purge deleted items, handovers and student accounts
connection-test.php               Test phone-to-laptop shared database access
delete-account.php                Student self-delete
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
- The 30-day Recycle Bin purge runs when an Admin opens an app page after a record expires. XAMPP does not schedule this task while the application is closed; use Windows Task Scheduler/cron for a true scheduled purge if required.
- The SQL file does not seed student accounts or item reports. Only the first Admin account is created.
