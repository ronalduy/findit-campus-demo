<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
if (current_user($pdo)) redirect('dashboard.php');
render_header('Student registration');
?>
<section class="registration-page">
  <div class="page-intro">
    <div><div class="eyebrow"><span class="pulse-dot"></span> STUDENT ACCOUNT VERIFICATION</div><h1>Create your <span>student account</span></h1><p>Capture your school ID and a live selfie, check the details, and send your application to the school Admin/Teacher for review.</p></div>
    <a class="back-link" href="index.php">← Back to sign in</a>
  </div>
  <div class="registration-grid">
    <section class="card registration-main">
      <div class="section-heading"><div><span class="step-kicker">STEP 1 OF 3</span><h2>Capture your photos</h2><p>Use the camera. Gallery uploads are not available in this form.</p></div><span class="heading-icon">▣</span></div>
      <div class="capture-grid">
        <div class="capture-card">
          <div class="capture-card-head"><span class="capture-icon">ID</span><div><h3>School ID</h3><p>Landscape · front of ID</p></div></div>
          <div class="capture-preview id-preview" id="id-preview-box"><div class="capture-placeholder"><span class="placeholder-icon">▱</span><strong>No ID photo yet</strong><small>Place the whole school ID inside the frame.</small></div><img id="id-preview-image" alt="Captured school ID preview" hidden></div>
          <button type="button" class="btn btn-primary btn-block" data-open-camera="id"><span>▣</span> Open ID camera</button>
          <div class="capture-status" id="id-capture-status">Required · automatic text reading</div>
          <input type="hidden" name="id_photo_data" id="id_photo_data" form="registration-form">
        </div>
        <div class="capture-card">
          <div class="capture-card-head"><span class="capture-icon capture-icon-face">☺</span><div><h3>Live selfie</h3><p>Portrait · face in oval</p></div></div>
          <div class="capture-preview selfie-preview" id="selfie-preview-box"><div class="capture-placeholder"><span class="placeholder-icon">◎</span><strong>No selfie yet</strong><small>Look straight at the camera.</small></div><img id="selfie-preview-image" alt="Captured selfie preview" hidden></div>
          <button type="button" class="btn btn-outline btn-block" data-open-camera="selfie"><span>◎</span> Open selfie camera</button>
          <div class="capture-status" id="selfie-capture-status">Required · use the front camera</div>
          <input type="hidden" name="selfie_photo_data" id="selfie_photo_data" form="registration-form">
        </div>
      </div>
      <div class="notice notice-blue"><span class="notice-icon">i</span><p><strong>Tip:</strong> Keep the ID flat, well lit, and fully inside the landscape guide. The system will try to read the ID number, name, and program. Check every field before submitting.</p></div>
      <form method="post" action="register_action.php" id="registration-form" data-require-photos="true" class="form-stack registration-form" autocomplete="off">
        <?= csrf_field() ?>
        <div class="section-heading form-section-heading"><div><span class="step-kicker">STEP 2 OF 3</span><h2>Check your student details</h2><p>These fields can be corrected if the text reader makes a mistake.</p></div></div>
        <div class="field-grid">
          <div class="field full-field"><label for="student_id">Student ID Number <span class="required">*</span></label><input id="student_id" name="student_id" required maxlength="80" placeholder="Example: 2026-00123" autocomplete="off"><small class="field-help" id="ocr-id-help">Will be filled after the ID photo is captured.</small></div>
          <div class="field full-field"><label for="full_name">Full Name <span class="required">*</span></label><input id="full_name" name="full_name" required maxlength="160" placeholder="Your name as shown on the school ID" autocomplete="name"><small class="field-help" id="ocr-name-help">Check spelling and name order.</small></div>
          <div class="field full-field"><label for="program">Program / Course <span class="required">*</span></label><input id="program" name="program" required maxlength="120" placeholder="Example: BS Information Technology"><small class="field-help" id="ocr-program-help">Will be filled if the program can be read clearly.</small></div>
          <div class="field full-field"><label for="year_level">Year Level <span class="required">*</span></label><select id="year_level" name="year_level" required><option value="">Select year level</option><option value="SHS">SHS</option><option value="1st Year">1st Year</option><option value="2nd Year">2nd Year</option><option value="3rd Year">3rd Year</option><option value="4th Year">4th Year</option></select></div>
        </div>
        <div class="section-heading form-section-heading"><div><span class="step-kicker">STEP 3 OF 3</span><h2>Secure your account</h2><p>Use a strong password that only you know.</p></div></div>
        <div class="field-grid two-col-fields">
          <div class="field"><label for="password">Create Password <span class="required">*</span></label><input type="password" id="password" name="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"><small class="field-help">Use at least 8 characters.</small></div>
          <div class="field"><label for="confirm_password">Confirm Password <span class="required">*</span></label><input type="password" id="confirm_password" name="confirm_password" required minlength="8" autocomplete="new-password" placeholder="Enter it again"></div>
        </div>
        <label class="check-row"><input type="checkbox" name="consent_privacy" value="1" required><span>I understand that the school will use my submitted ID and selfie to review my student account, and that only authorized staff should access these verification photos. I have read the <a href="privacy.php" target="_blank" rel="noopener">school privacy notice</a>. <span class="required">*</span></span></label>
        <button class="btn btn-primary btn-block btn-large" type="submit" id="submit-registration"><span>Submit for Admin review</span><span>→</span></button>
        <p class="form-bottom-note">Your account will stay pending until the school Admin/Teacher reviews it. You cannot sign in before approval.</p>
      </form>
    </section>
    <aside class="registration-side">
      <div class="side-card side-card-dark"><span class="side-badge">HOW IT WORKS</span><h3>Verification before access</h3><div class="mini-steps"><div><span>1</span><div><strong>Capture ID + selfie</strong><small>Take new photos in the camera.</small></div></div><div><span>2</span><div><strong>Check the details</strong><small>Correct any OCR mistakes.</small></div></div><div><span>3</span><div><strong>Wait for approval</strong><small>Staff reviews your application.</small></div></div><div><span>4</span><div><strong>Sign in and browse</strong><small>See Lost Items and Found Items.</small></div></div></div></div>
      <div class="side-card"><div class="side-icon">⌑</div><h3>Your photos are private</h3><p>ID and selfie images are stored as private files and are shown only to authorized school staff for review. Do not submit someone else's ID.</p></div>
      <div class="side-card"><div class="side-icon">✓</div><h3>Manual review matters</h3><p>Automatic text reading may make mistakes. A successful camera capture or OCR result does not automatically prove identity.</p></div>
    </aside>
  </div>
</section>

<div class="camera-modal" id="camera-modal" aria-hidden="true" hidden>
  <div class="camera-shell" role="dialog" aria-modal="true" aria-labelledby="camera-title">
    <header class="camera-topbar"><a class="camera-brand"><img src="assets/brand/ave-maria-college-logo.png" alt="" class="camera-brand-logo"><span>FindIT <b>Verify</b></span></a><div class="camera-step" id="camera-step-label">STEP 1 · SCHOOL ID</div><button type="button" class="camera-close" id="camera-close" aria-label="Close camera">×</button></header>
    <div class="camera-instructions"><span class="camera-live-dot"></span><div><h2 id="camera-title">Align your school ID</h2><p id="camera-instruction">Fit the entire card inside the landscape frame. Keep all four corners visible.</p></div></div>
    <div class="camera-stage-wrap" id="camera-stage-wrap">
      <div class="camera-stage" id="camera-stage">
        <video id="camera-video" playsinline autoplay muted></video>
        <div class="camera-mask" id="camera-mask"></div>
        <div class="viewfinder viewfinder-id" id="viewfinder-id"><i class="corner c-tl"></i><i class="corner c-tr"></i><i class="corner c-bl"></i><i class="corner c-br"></i><span class="viewfinder-label">SCHOOL ID · FRONT SIDE</span></div>
        <div class="viewfinder viewfinder-selfie" id="viewfinder-selfie" hidden><i class="face-guide"></i><span class="face-eye-guide"></span><span class="face-guide-label">CENTER YOUR FACE</span></div>
        <canvas id="capture-canvas" hidden></canvas>
      </div>
      <div class="camera-review" id="camera-review" hidden><div class="review-tag"><span>✓</span> PHOTO CAPTURED</div><img id="review-image" alt="Captured photo preview"><div class="review-caption" id="review-caption">Check that the complete ID is clear and readable.</div><div class="ocr-status" id="ocr-status" hidden><span class="tiny-spinner"></span><span id="ocr-status-text">Reading ID text…</span></div></div>
    </div>
    <div class="camera-bottom" id="camera-controls-live"><div class="camera-bottom-copy"><strong id="camera-bottom-title">Keep the ID steady</strong><small id="camera-bottom-copy">Avoid glare and make sure the text is sharp.</small></div><button type="button" class="capture-button" id="capture-button" aria-label="Capture photo"><span></span></button><button type="button" class="camera-switch" id="camera-switch" title="Camera switch" hidden aria-hidden="true">⇄<small>Switch</small></button></div>
    <div class="camera-bottom camera-bottom-review" id="camera-controls-review" hidden><button type="button" class="btn btn-outline" id="retake-button">↶ Retake</button><button type="button" class="btn btn-primary" id="use-photo-button">Use photo <span>→</span></button></div>
    <div class="camera-error" id="camera-error" hidden></div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
<?php render_footer(); ?>
