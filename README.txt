FINDIT CAMPUS — CAMERA NO-SCANNING EFFECTS v7.3

This package keeps the camera sizing, ID landscape viewfinder, portrait selfie oval, camera crop math, capture review, and existing demo functions from v7.2. The requested change is limited to removing scanning animations and effects from both camera screens.

CHANGES
- Removed the moving scan beam from the ID and selfie viewfinders.
- Removed the dashed horizontal face scan line.
- Removed pulsing viewfinder corners and pulsing live-status dot.
- Removed scanning-specific class changes and animation keyframes.
- Changed camera headings/guidance to neutral camera wording.
- Kept static viewfinder borders/corners, dark mask, live camera status, and capture/review buttons.
- Kept the current camera crop/capture implementation and layout rules.
- Updated CSS/JS URL versions and service-worker cache name to v7.3.

TEST
1. Open index.html through HTTPS or localhost.
2. Start School ID camera: no moving line or pulsing corners should appear. The landscape frame remains visible.
3. Capture and review the ID; retake/use-photo should work as before.
4. Start Selfie camera: no moving line, dashed face line, or pulsing corners should appear. The portrait oval remains visible.
5. Capture and review selfie.

NOTE
This is still a browser-storage demo. Records do not sync between phones and laptops. Camera access requires HTTPS or localhost. OCR may make mistakes and still needs Admin/Teacher review.
