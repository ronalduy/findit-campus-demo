(() => {
  'use strict';

  // Show/hide password buttons on login forms.
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Hide' : 'Show';
    });
  });

  const registrationForm = document.getElementById('registration-form');
  const cameraModal = document.getElementById('camera-modal');
  if (!registrationForm || !cameraModal) return;

  const $ = (id) => document.getElementById(id);
  const video = $('camera-video');
  const stage = $('camera-stage');
  const idFrame = $('viewfinder-id');
  const selfieFrame = $('viewfinder-selfie');
  const reviewBox = $('camera-review');
  const reviewImage = $('review-image');
  const captureCanvas = $('capture-canvas');
  const liveControls = $('camera-controls-live');
  const reviewControls = $('camera-controls-review');
  const title = $('camera-title');
  const instruction = $('camera-instruction');
  const stepLabel = $('camera-step-label');
  const errorBox = $('camera-error');
  const ocrBox = $('ocr-status');
  const ocrText = $('ocr-status-text');

  let stream = null;
  let captureKind = 'id';
  let facing = 'environment';
  let capturedData = '';
  let ocrRunning = false;
  let tesseractWorkerPromise = null;

  const modalOpen = () => {
    cameraModal.hidden = false;
    cameraModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('camera-modal-open');
  };
  const modalClose = () => {
    stopCamera();
    cameraModal.hidden = true;
    cameraModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('camera-modal-open');
    resetCameraUI();
  };
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
  };
  const resetCameraUI = () => {
    if (stage) stage.hidden = false;
    if (reviewBox) reviewBox.hidden = true;
    if (liveControls) liveControls.hidden = false;
    if (reviewControls) reviewControls.hidden = true;
    if (errorBox) errorBox.hidden = true;
    if (ocrBox) ocrBox.hidden = true;
    if (stage) stage.classList.remove('selfie-mode');
  };
  const showCameraError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  async function startCamera() {
    stopCamera();
    resetCameraUI();
    errorBox.hidden = true;
    stage.classList.toggle('selfie-mode', captureKind === 'selfie' && facing === 'user');
    idFrame.hidden = captureKind !== 'id';
    selfieFrame.hidden = captureKind !== 'selfie';
    title.textContent = captureKind === 'id' ? 'Align your school ID' : 'Center your face';
    instruction.textContent = captureKind === 'id'
      ? 'Keep the entire card inside the landscape guide. The page stays portrait; only the guide is wide.'
      : 'Look at the camera and keep your whole face inside the oval.';
    stepLabel.textContent = captureKind === 'id' ? 'STEP 1 · SCHOOL ID' : 'STEP 2 · LIVE SELFIE';
    $('camera-bottom-title').textContent = captureKind === 'id' ? 'Keep the ID steady' : 'Look straight ahead';
    $('camera-bottom-copy').textContent = captureKind === 'id' ? 'Avoid glare and keep all four corners inside the guide.' : 'Use even lighting; remove hats or anything covering your face.';
    $('camera-switch').hidden = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraError('This browser cannot open the camera. Open the website in Chrome or Safari over HTTPS, or use localhost in development.');
      return;
    }
    try {
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await new Promise((resolve) => {
        if (video.readyState >= 1 && video.videoWidth) return resolve();
        video.onloadedmetadata = () => resolve();
      });
      await video.play();
      requestAnimationFrame(() => stage.classList.add('camera-ready'));
    } catch (err) {
      const message = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        ? 'Camera permission was blocked. Allow camera access in your browser settings and try again.'
        : 'The camera could not start. Close other apps using the camera, then try again.';
      showCameraError(message);
    }
  }

  document.querySelectorAll('[data-open-camera]').forEach((button) => {
    button.addEventListener('click', async () => {
      captureKind = button.dataset.openCamera === 'selfie' ? 'selfie' : 'id';
      facing = captureKind === 'id' ? 'environment' : 'user';
      capturedData = '';
      modalOpen();
      await startCamera();
    });
  });

  $('camera-close').addEventListener('click', modalClose);
  cameraModal.addEventListener('click', (event) => {
    if (event.target === cameraModal) modalClose();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !cameraModal.hidden) modalClose();
  });

  $('camera-switch').addEventListener('click', async () => {
    facing = facing === 'environment' ? 'user' : 'environment';
    await startCamera();
  });

  // object-fit: cover maps the raw source into the full stage, cropping its overflow.
  // We use the exact rendered scale and offsets to map the viewfinder back to source pixels.
  function getCropRect() {
    const stageRect = stage.getBoundingClientRect();
    const frame = captureKind === 'id' ? idFrame : selfieFrame;
    const frameRect = frame.getBoundingClientRect();
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight || !stageRect.width || !stageRect.height) throw new Error('The camera is not ready yet. Please wait and try again.');

    const scale = Math.max(stageRect.width / sourceWidth, stageRect.height / sourceHeight);
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;
    const offsetX = (renderedWidth - stageRect.width) / 2;
    const offsetY = (renderedHeight - stageRect.height) / 2;

    const frameX = frameRect.left - stageRect.left;
    const frameY = frameRect.top - stageRect.top;
    let sx = (frameX + offsetX) / scale;
    let sy = (frameY + offsetY) / scale;
    let sw = frameRect.width / scale;
    let sh = frameRect.height / scale;

    sx = Math.max(0, Math.min(sourceWidth - 1, sx));
    sy = Math.max(0, Math.min(sourceHeight - 1, sy));
    sw = Math.min(sw, sourceWidth - sx);
    sh = Math.min(sh, sourceHeight - sy);
    if (sw < 20 || sh < 20) throw new Error('The camera guide is not aligned. Close the camera and open it again.');
    return { sx, sy, sw, sh };
  }

  function captureViewfinder() {
    const crop = getCropRect();
    // Preserve the viewfinder's aspect ratio and produce enough pixels for OCR.
    const outWidth = captureKind === 'id' ? 1580 : 960;
    const outHeight = Math.round(outWidth * (crop.sh / crop.sw));
    captureCanvas.width = outWidth;
    captureCanvas.height = Math.min(2200, Math.max(400, outHeight));
    const ctx = captureCanvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (captureKind === 'selfie' && facing === 'user') {
      // Match the horizontally mirrored front-camera preview.
      ctx.translate(captureCanvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, captureCanvas.width, captureCanvas.height);
    return captureCanvas.toDataURL('image/jpeg', 0.92);
  }

  $('capture-button').addEventListener('click', async () => {
    if (!stream || !video.videoWidth) {
      showCameraError('Wait for the camera preview, then try again.');
      return;
    }
    try {
      capturedData = captureViewfinder();
      reviewImage.src = capturedData;
      reviewImage.className = captureKind === 'selfie' ? 'review-selfie-image' : 'review-id-image';
      stage.hidden = true;
      reviewBox.hidden = false;
      liveControls.hidden = true;
      reviewControls.hidden = false;
      errorBox.hidden = true;
      ocrBox.hidden = captureKind !== 'id';
      if (captureKind === 'id') {
        ocrText.textContent = 'Reading ID text automatically…';
        stopCamera();
        runIdOcr(capturedData);
      } else {
        $('review-caption').textContent = 'Check that your whole face is centered and clearly visible.';
        stopCamera();
      }
    } catch (err) {
      showCameraError(err.message || 'Could not capture the photo. Please try again.');
    }
  });

  $('retake-button').addEventListener('click', startCamera);
  $('use-photo-button').addEventListener('click', () => {
    if (!capturedData) return;
    const hiddenId = captureKind === 'id' ? $('id_photo_data') : $('selfie_photo_data');
    const image = captureKind === 'id' ? $('id-preview-image') : $('selfie-preview-image');
    const placeholder = image.parentElement.querySelector('.capture-placeholder');
    hiddenId.value = capturedData;
    image.src = capturedData;
    image.hidden = false;
    if (placeholder) placeholder.hidden = true;
    const status = $(captureKind === 'id' ? 'id-capture-status' : 'selfie-capture-status');
    status.classList.add('complete');
    status.textContent = captureKind === 'id' ? '✓ ID photo captured · review the fields below' : '✓ Selfie captured';
    modalClose();
  });

  async function runIdOcr(dataUrl) {
    if (ocrRunning) return;
    ocrRunning = true;
    try {
      if (!window.Tesseract || typeof window.Tesseract.recognize !== 'function') {
        ocrText.textContent = 'Text reader is not available. You can type the details manually.';
        return;
      }
      // First pass uses the same aligned image seen in the review screen.
      const result = await window.Tesseract.recognize(dataUrl, 'eng', {
        logger: (m) => {
          if (m && m.status === 'recognizing text' && typeof m.progress === 'number') {
            ocrText.textContent = `Reading ID text… ${Math.round(m.progress * 100)}%`;
          }
        },
      });
      const text = String(result?.data?.text || '');
      const parsed = parseIdText(text);
      fillIfConfident('student_id', parsed.studentId, 'ocr-id-help', 'Student ID read from the ID photo. Check it carefully.');
      fillIfConfident('full_name', parsed.fullName, 'ocr-name-help', 'Name suggested by the text reader. Check spelling and order.');
      fillIfConfident('program', parsed.program, 'ocr-program-help', 'Program suggested by the text reader. Check it carefully.');
      const found = [parsed.studentId, parsed.fullName, parsed.program].filter(Boolean).length;
      ocrText.textContent = found === 3
        ? 'Text reading finished. Check all three fields; OCR can still make mistakes.'
        : `Text reading finished; ${found} of 3 fields could be suggested. Fill or correct the others manually.`;
    } catch (error) {
      ocrText.textContent = 'Text reading failed. You can still use the photo and fill the fields manually.';
    } finally {
      ocrRunning = false;
    }
  }

  function fillIfConfident(fieldId, value, helpId, helpText) {
    if (!value) return;
    const field = $(fieldId);
    // Never overwrite anything the student has already typed.
    if (field && field.value.trim() === '') field.value = value;
    const help = $(helpId);
    if (help) help.textContent = helpText;
  }

  function parseIdText(rawText) {
    const lines = String(rawText || '').split(/\r?\n/).map((line) => line.replace(/[|]/g, 'I').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const all = lines.join('\n');
    const normalized = all.toUpperCase();
    let studentId = '';
    let fullName = '';
    let program = '';

    const idLabels = /(?:STUDENT\s*)?(?:ID\s*(?:NO\.?|NUMBER|NUM|#)?|STUDENT\s*NO\.?|REGISTRATION\s*NO\.?|IDNO)\s*[:#\-]?\s*(.*)$/i;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(idLabels);
      if (match) {
        const inline = (match[1] || '').match(/[A-Z0-9][A-Z0-9-]{3,24}/i);
        const next = inline ? inline[0] : (lines[i + 1] || '').match(/\b[A-Z0-9][A-Z0-9-]{3,24}\b/i)?.[0];
        if (next && /\d/.test(next) && !/^(?:SCHOOL|STUDENT|COLLEGE|UNIVERSITY|COURSE|PROGRAM|NUMBER|ID)$/i.test(next)) {
          studentId = next.replace(/\s+/g, '').toUpperCase();
          break;
        }
      }
    }
    if (!studentId) {
      const patterns = [...all.matchAll(/\b(?:[A-Z]{0,3}\d{2,4}[- ]\d{3,8}|\d{4}[- ]\d{3,8}|\d{7,12})\b/gi)];
      if (patterns.length === 1) studentId = patterns[0][0].replace(/\s+/g, '-').toUpperCase();
    }

    const nameLabel = /^(?:STUDENT\s*)?(?:FULL\s*)?NAME\s*[:\-]?\s*(.*)$/i;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(nameLabel);
      if (match) {
        let candidate = (match[1] || '').trim();
        if (!candidate && lines[i + 1]) candidate = lines[i + 1].trim();
        candidate = cleanName(candidate);
        if (candidate) { fullName = candidate; break; }
      }
    }

    const programPatterns = [
      ['BSIT', /\b(?:BSIT|B\.?S\.?\s*IT|BS\s*INFORMATION\s*TECHNOLOGY|BACHELOR\s+OF\s+SCIENCE\s+IN\s+INFORMATION\s+TECHNOLOGY)\b/i, 'BS Information Technology'],
      ['BSCS', /\b(?:BSCS|BS\s*COMPUTER\s*SCIENCE|BACHELOR\s+OF\s+SCIENCE\s+IN\s+COMPUTER\s+SCIENCE)\b/i, 'BS Computer Science'],
      ['BSBA', /\b(?:BSBA|BS\s*BUSINESS\s*ADMINISTRATION)\b/i, 'BS Business Administration'],
      ['BSED', /\b(?:BSED|BACHELOR\s+OF\s+SECONDARY\s+EDUCATION)\b/i, 'Bachelor of Secondary Education'],
      ['BEED', /\b(?:BEED|BACHELOR\s+OF\s+ELEMENTARY\s+EDUCATION)\b/i, 'Bachelor of Elementary Education'],
      ['BSHM', /\b(?:BSHM|BS\s*HOSPITALITY\s*MANAGEMENT)\b/i, 'BS Hospitality Management'],
      ['BSTM', /\b(?:BSTM|BS\s*TOURISM\s*MANAGEMENT)\b/i, 'BS Tourism Management'],
      ['BSCrim', /\b(?:BSCRIM|BS\s*CRIMINOLOGY)\b/i, 'BS Criminology'],
      ['BSPsych', /\b(?:BSPSYCH|BS\s*PSYCHOLOGY)\b/i, 'BS Psychology'],
    ];
    for (const [, pattern, label] of programPatterns) {
      if (pattern.test(normalized)) { program = label; break; }
    }
    if (!program) {
      const programLine = lines.find((line) => /\b(?:PROGRAM|COURSE|DEGREE)\b/i.test(line));
      if (programLine) {
        const value = programLine.replace(/.*?\b(?:PROGRAM|COURSE|DEGREE)\b\s*[:\-]?\s*/i, '').trim();
        if (value.length >= 3 && value.length <= 100 && /[A-Z]/i.test(value)) program = value;
      }
    }
    return { studentId, fullName, program };
  }

  function cleanName(input) {
    let value = String(input || '').replace(/^(?:NAME|STUDENT NAME)\s*[:\-]?/i, '').replace(/[^\p{L}\p{M} .,'-]/gu, ' ').replace(/\s+/g, ' ').trim();
    value = value.replace(/\b(?:SCHOOL|COLLEGE|UNIVERSITY|STUDENT ID|ID NUMBER|PROGRAM|COURSE|ADDRESS)\b.*$/i, '').trim();
    const words = value.split(' ').filter(Boolean);
    if (words.length < 2 || words.length > 6 || value.length < 5 || value.length > 100) return '';
    if (words.some((word) => word.length === 1 && !/^[A-Z]$/i.test(word))) return '';
    if (/(INFORMATION|TECHNOLOGY|EDUCATION|BUSINESS|CRIMINOLOGY)/i.test(value)) return '';
    return value;
  }

  registrationForm.addEventListener('submit', (event) => {
    const requirePhotos = registrationForm.dataset.requirePhotos !== 'false';
    const idPhoto = $('id_photo_data');
    const selfiePhoto = $('selfie_photo_data');
    if (requirePhotos && (!idPhoto || !idPhoto.value || !selfiePhoto || !selfiePhoto.value)) {
      event.preventDefault();
      alert('Please capture both your school ID and your live selfie before submitting.');
      return;
    }
    const password = $('password');
    const confirmPassword = $('confirm_password');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      event.preventDefault();
      alert('Your passwords do not match.');
      confirmPassword.focus();
    }
  });
})();
