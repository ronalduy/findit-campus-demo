/* FindIT Campus ID Verification Demo
   Front-end prototype only. Uses browser localStorage and is not suitable for real student-ID records. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const keys = { items: 'findit_iddemo_items_v1', applications: 'findit_iddemo_apps_v2' };
  const year = new Date().getFullYear();
  const todayISO = new Date().toISOString().slice(0, 10);
  let currentRole = 'student';
  let currentUser = null;
  let studentItemTab = 'lost';
  let cameraStream = null;
  let cameraType = null;
  let photoIdData = null;
  let photoSelfieData = null;
  let lastOcrAutofill = { studentNumber: '', fullName: '', program: '' };
  let ocrSequence = 0;
  let ocrWorkerPromise = null;
  let activeOcrLogger = null;
  let itemPhotoDraft = null;
  let activeApplicationId = null;
  let items = loadList(keys.items, null);
  let applications = loadList(keys.applications, []);
  if (!Array.isArray(items) || !items.length) {
    items = seedItems(); saveList(keys.items, items);
  }
  if (!Array.isArray(applications)) { applications = []; saveList(keys.applications, applications); }
  $('itemDate').value = todayISO;

  function seedItems() {
    return [
      { ref: 'FD-2026-0001', type: 'found', title: 'Blue water bottle', category: 'Personal belongings', location: 'Library, 2nd floor', date: '2026-10-15', description: 'Light blue bottle with a black lid. Found beside the study tables.', symbol: '◒', status: 'available', photo: null, createdAt: Date.now() - 30000 },
      { ref: 'FD-2026-0002', type: 'found', title: 'Black wallet', category: 'Personal belongings', location: 'Canteen entrance', date: '2026-10-14', description: 'Small black wallet. The school office is keeping the item safely.', symbol: '▰', status: 'available', photo: null, createdAt: Date.now() - 20000 },
      { ref: 'LS-2026-0001', type: 'lost', title: 'Student ID lace', category: 'IDs and cards', location: 'Main building, Room 204', date: '2026-10-16', description: 'Blue school ID lace with a small silver clip. No personal details shown.', symbol: '◇', status: 'open', photo: null, createdAt: Date.now() - 10000 },
      { ref: 'FD-2026-0003', type: 'found', title: 'Gray pencil case', category: 'School supplies', location: 'Computer laboratory', date: '2026-10-13', description: 'Gray zip pencil case found after the morning class.', symbol: '✎', status: 'available', photo: null, createdAt: Date.now() - 5000 },
      { ref: 'LS-2026-0002', type: 'lost', title: 'Black laptop bag', category: 'Electronics', location: 'Near the school library', date: '2026-10-16', description: 'Black laptop bag with a small blue keychain on the handle.', symbol: '▰', status: 'open', photo: null, createdAt: Date.now() }
    ];
  }
  function loadList(key, fallback) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch (e) { console.warn('Local demo data could not be read', e); return fallback; }
  }
  function saveList(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error(e); showToast('Browser storage is full. Export or reset demo data before adding more photos.', 'error'); return false; }
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function showView(name) {
    ['authView','registerView','dashboardView'].forEach(id => $(id).classList.toggle('hidden', id !== name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showAlert(id, message, type = 'error') {
    const el = $(id); el.textContent = message; el.className = `alert alert-${type}`;
    el.classList.remove('hidden');
  }
  function hideAlert(id) { $(id).classList.add('hidden'); }
  function showToast(message, type = 'success') {
    const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message;
    $('toastHost').appendChild(toast); setTimeout(() => toast.remove(), 4300);
  }
  function prettyDate(value) {
    if (!value) return 'Date not set';
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function getStatus(app) { return app.status || 'pending'; }
  function makeRef(type) {
    const prefix = type === 'lost' ? 'LS' : 'FD';
    const used = items.filter(item => item.type === type).map(item => Number((item.ref.match(/-(\d+)$/) || [])[1]) || 0);
    return `${prefix}-${year}-${String(Math.max(0, ...used) + 1).padStart(4, '0')}`;
  }
  async function sha256(text) {
    if (window.crypto && crypto.subtle && window.isSecureContext) {
      const bytes = new TextEncoder().encode(text);
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Not a secure password hash: fallback exists only to keep the prototype runnable in basic local preview.
    return `demo-only:${btoa(unescape(encodeURIComponent(text)))}`;
  }
  function compressDataUrl(dataUrl, maxDim = 850, quality = .62) {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      }; img.onerror = reject; img.src = dataUrl;
    });
  }
  function resizeUploadedFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = async () => {
        try { resolve(await compressDataUrl(reader.result, 900, .68)); } catch (e) { reject(e); }
      }; reader.onerror = reject; reader.readAsDataURL(file);
    });
  }
  function lettersInitial(name) { return String(name || 'S').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'S'; }

  // Login role selector
  document.querySelectorAll('[data-role]').forEach(button => button.addEventListener('click', () => {
    currentRole = button.dataset.role;
    document.querySelectorAll('[data-role]').forEach(btn => btn.classList.toggle('active', btn === button));
    const isAdmin = currentRole === 'admin';
    $('loginIdentifierWrap').querySelector('label').textContent = isAdmin ? 'Admin username' : 'Student ID number';
    $('loginIdentifier').type = 'text';
    $('loginIdentifier').placeholder = isAdmin ? 'admin' : 'Enter your student ID number';
    $('loginIdentifier').value = '';
    $('loginPassword').value = '';
    $('studentRegisterPrompt').classList.toggle('hidden', isAdmin);
    $('adminDemoHint').classList.toggle('hidden', !isAdmin);
    hideAlert('loginAlert');
  }));
  $('brandHome').addEventListener('click', e => { e.preventDefault(); if (currentUser) showDashboard(); else showView('authView'); });
  $('openRegister').addEventListener('click', () => { resetRegistration(); showView('registerView'); });
  $('backToLogin').addEventListener('click', () => { stopCamera(); showView('authView'); });
  document.querySelectorAll('.show-pass').forEach(button => button.addEventListener('click', () => {
    const field = $(button.dataset.target); const show = field.type === 'password'; field.type = show ? 'text' : 'password'; button.textContent = show ? 'Hide' : 'Show';
  }));
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault(); hideAlert('loginAlert');
    const identifier = $('loginIdentifier').value.trim(); const password = $('loginPassword').value;
    if (currentRole === 'admin') {
      if (identifier.toLowerCase() === 'admin' && password === '1234') {
        currentUser = { role: 'admin', name: 'School Admin / Teacher', email: 'admin@findit.demo' }; showDashboard(); showToast('Signed in to demo admin mode.');
      } else showAlert('loginAlert', 'Incorrect demo administrator username or password. Use admin / 1234.');
      return;
    }
    const studentNumber = identifier.trim().toLowerCase();
    const applicant = applications.find(app => String(app.studentNumber).trim().toLowerCase() === studentNumber);
    if (!applicant) { showAlert('loginAlert', 'No student account was found for this ID number. Please register first or contact the Admin/Teacher.'); return; }
    const accountStatus = getStatus(applicant);
    if (accountStatus !== 'approved') {
      if (accountStatus === 'pending') showAlert('loginAlert', 'Your account is Pending. The Admin/Teacher must approve it before you can sign in.', 'info');
      else if (accountStatus === 'rejected') showAlert('loginAlert', `This application was not approved.${applicant.rejectionReason ? ` Reason: ${applicant.rejectionReason}` : ''} Please contact the school Admin/Teacher.`);
      else if (accountStatus === 'correction') showAlert('loginAlert', `The Admin/Teacher requested a correction: ${applicant.staffNote || 'Please contact the school office.'}`, 'info');
      else showAlert('loginAlert', 'Your account is not approved yet. Please contact the school Admin/Teacher.', 'info');
      return;
    }
    const hash = await sha256(password);
    if (hash !== applicant.passwordHash) { showAlert('loginAlert', 'The password is incorrect. Please try again.'); return; }
    currentUser = { role: 'student', appId: applicant.id, name: applicant.fullName, studentNumber: applicant.studentNumber, program: applicant.program };
    showDashboard(); showToast(`Welcome, ${applicant.fullName.split(' ')[0]}!`);
  });

  // Registration reset and camera capture
  function resetRegistration() {
    ocrSequence += 1; lastOcrAutofill = { studentNumber: '', fullName: '', program: '' };
    $('registerForm').reset(); photoIdData = null; photoSelfieData = null; setPhotoStage('id', null); setPhotoStage('selfie', null); $('retakeIdBtn').disabled = true; $('retakeSelfieBtn').disabled = true; hideAlert('registerAlert'); $('ocrStatus').classList.add('hidden'); $('ocrStatus').textContent = ''; $('ocrStatus').style.background = ''; $('ocrStatus').style.color = '';
  }
  function setPhotoStage(type, dataUrl) {
    const stage = $(type === 'id' ? 'idPhotoStage' : 'selfiePhotoStage');
    if (type === 'id') photoIdData = dataUrl; else photoSelfieData = dataUrl;
    if (dataUrl) {
      stage.classList.add('has-photo'); stage.innerHTML = `<img alt="Captured ${type === 'id' ? 'school ID' : 'selfie'} preview" src="${dataUrl}">`;
      if (type === 'id') $('retakeIdBtn').disabled = false; else $('retakeSelfieBtn').disabled = false;
    } else {
      stage.classList.remove('has-photo');
      stage.innerHTML = `<div class="capture-placeholder"><div class="capture-illustration ${type === 'id' ? 'id-illustration' : 'selfie-illustration'}"><span>${type === 'id' ? '▤' : '◉'}</span><i>✦</i></div><strong>No ${type === 'id' ? 'ID photo' : 'selfie'} yet</strong><small>${type === 'id' ? 'Place the whole ID inside the frame.' : 'Keep your face centered in the frame.'}</small></div>`;
      if (type === 'id') $('retakeIdBtn').disabled = true; else $('retakeSelfieBtn').disabled = true;
    }
  }
  async function startCamera(type) {
    closeCamera(); cameraType = type;
    $('cameraTitle').textContent = type === 'id' ? 'Capture your school ID' : 'Take your live selfie';
    $('cameraInstruction').textContent = type === 'id'
      ? 'Use the back camera. Hold the ID horizontally, centered inside the guide, with all four corners visible. Keep the phone steady and avoid glare.'
      : 'Center your face inside the oval guide. Keep your eyes visible and use even lighting.';
    const frame = $('cameraFrame');
    frame.classList.toggle('id-capture-mode', type === 'id');
    frame.classList.toggle('selfie-capture-mode', type === 'selfie');
    $('cameraFrameOverlay').classList.toggle('id-capture-overlay', type === 'id');
    $('cameraModal').querySelector('.camera-modal-card').classList.toggle('face-camera-card', type === 'selfie');
    $('cameraVideo').style.transform = 'none';
    $('cameraError').classList.add('hidden'); $('cameraLoading').classList.remove('hidden'); $('takePhotoBtn').disabled = true; $('cameraModal').classList.remove('hidden');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $('cameraLoading').classList.add('hidden'); $('cameraError').textContent = 'This browser cannot access a camera here. Open the project through VS Code Live Server (http://localhost) or a secure HTTPS page.'; $('cameraError').classList.remove('hidden'); return;
    }
    try {
      // Request a sharper rear-camera stream; the browser may choose a supported size instead.
      const constraints = { audio: false, video: { facingMode: { ideal: type === 'id' ? 'environment' : 'user' }, width: { ideal: 1920 }, height: { ideal: 1080 } } };
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = $('cameraVideo'); video.srcObject = cameraStream; await video.play();
      $('cameraLoading').classList.add('hidden'); $('takePhotoBtn').disabled = false;
    } catch (err) {
      $('cameraLoading').classList.add('hidden'); $('cameraError').textContent = err.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access in the browser address bar, then try again.' : 'Camera could not open. Close other apps using the camera and try again.'; $('cameraError').classList.remove('hidden');
    }
  }
  function stopCamera() { if (cameraStream) cameraStream.getTracks().forEach(track => track.stop()); cameraStream = null; $('cameraVideo').srcObject = null; }
  function closeCamera() { stopCamera(); $('cameraModal').classList.add('hidden'); cameraType = null; $('cameraVideo').style.transform = 'none'; }
  document.querySelectorAll('[data-camera]').forEach(button => button.addEventListener('click', () => startCamera(button.dataset.camera)));
  document.querySelectorAll('[data-close-camera]').forEach(button => button.addEventListener('click', closeCamera));
  $('retakeIdBtn').addEventListener('click', () => startCamera('id'));
  $('retakeSelfieBtn').addEventListener('click', () => startCamera('selfie'));
  // Capture the complete camera frame for the saved school-ID photo so a browser-specific
  // video crop can never cut the card off. Separately, calculate a crop matching the visible
  // guide for OCR; the full frame is also sent to OCR as a fallback.
  function captureVisibleGuideCrop(video) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const videoRect = video.getBoundingClientRect();
    const guideRect = $('cameraFrameOverlay').getBoundingClientRect();
    if (!vw || !vh || !videoRect.width || !videoRect.height || !guideRect.width || !guideRect.height) return null;

    // Reproduce CSS object-fit: cover. This maps the guide's displayed position back to
    // the exact source-pixel region visible through the video element.
    const scale = Math.max(videoRect.width / vw, videoRect.height / vh);
    const renderedWidth = vw * scale;
    const renderedHeight = vh * scale;
    const renderedLeft = videoRect.left + (videoRect.width - renderedWidth) / 2;
    const renderedTop = videoRect.top + (videoRect.height - renderedHeight) / 2;
    let sx = (guideRect.left - renderedLeft) / scale;
    let sy = (guideRect.top - renderedTop) / scale;
    let ex = (guideRect.right - renderedLeft) / scale;
    let ey = (guideRect.bottom - renderedTop) / scale;

    sx = Math.max(0, Math.min(vw, sx));
    sy = Math.max(0, Math.min(vh, sy));
    ex = Math.max(0, Math.min(vw, ex));
    ey = Math.max(0, Math.min(vh, ey));
    const sw = ex - sx;
    const sh = ey - sy;
    // Reject implausible crops; the uncropped photo will still be saved and OCRed.
    if (sw < vw * 0.22 || sh < vh * 0.22 || sw <= 0 || sh <= 0) return null;

    const cropCanvas = document.createElement('canvas');
    const outputWidth = 2200;
    cropCanvas.width = outputWidth;
    cropCanvas.height = Math.max(1, Math.round(outputWidth * sh / sw));
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';
    cropCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height);
    return cropCanvas.toDataURL('image/jpeg', 0.96);
  }

  $('takePhotoBtn').addEventListener('click', async () => {
    const video = $('cameraVideo'); if (!video.videoWidth || !cameraType) return;
    const type = cameraType;
    const canvas = $('captureCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let ocrSources = [];

    if (type === 'id') {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      // Keep the full source frame for the saved review photo. Do not crop the photo based
      // on assumptions about a phone browser's video orientation or display aspect ratio.
      const maxDimension = 2400;
      const scale = Math.min(1, maxDimension / Math.max(vw, vh));
      canvas.width = Math.max(1, Math.round(vw * scale));
      canvas.height = Math.max(1, Math.round(vh * scale));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const fullFrameData = canvas.toDataURL('image/jpeg', 0.94);

      // Use an exact guide-aligned crop for OCR first, then the uncropped full frame as a
      // fallback. If a browser reports unusual camera dimensions, the full frame is safe.
      try {
        const guideCropData = captureVisibleGuideCrop(video);
        if (guideCropData) ocrSources.push(guideCropData);
      } catch (err) {
        console.warn('Guide crop was unavailable; OCR will use the full photo.', err);
      }
      ocrSources.push(fullFrameData);
      // The stored/admin-review image is intentionally the complete frame: it must not lose
      // the school ID due to crop-coordinate differences between browsers.
      let dataUrl = fullFrameData;
      try { dataUrl = await compressDataUrl(fullFrameData, 1800, 0.88); } catch (_) {}
      closeCamera();
      setPhotoStage(type, dataUrl);
      showToast('Full camera photo saved. Reading the guide area and checking the full photo for ID text…', 'success');
      runIdOcr(ocrSources);
      return;
    }

    // Selfies are saved from the full frame; the oval is only a visual positioning guide.
    const max = 1000;
    const selfieScale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * selfieScale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * selfieScale));
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    let selfieData = canvas.toDataURL('image/jpeg', 0.70);
    try { selfieData = await compressDataUrl(selfieData, 1000, 0.64); } catch (_) {}
    closeCamera();
    setPhotoStage(type, selfieData);
    showToast('Live selfie captured. It will be shown to the Admin/Teacher for manual review.');
  });
  document.querySelectorAll('[data-close-application]').forEach(button => button.addEventListener('click', closeApplicationModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCamera(); closeApplicationModal(); } });

  // OCR runs automatically immediately after the school ID photo is captured.
  // Several image variants are compared. Uncertain text is left blank instead of guessed.
  async function runIdOcr(imageDataSources) {
    const myRun = ++ocrSequence;
    const sources = (Array.isArray(imageDataSources) ? imageDataSources : [imageDataSources])
      .filter((value, index, arr) => typeof value === 'string' && value.startsWith('data:image/') && arr.indexOf(value) === index);
    const status = $('ocrStatus');
    clearPreviousOcrSuggestions();
    status.classList.remove('hidden');
    status.style.background = '#f1f5ff'; status.style.color = '#5f6ed1';
    status.textContent = 'Preparing the school ID for text reading…';
    if (!sources.length) {
      status.textContent = 'The photo was saved, but the text reader could not prepare the image. Please enter the three details manually.';
      status.style.background = '#fff7e8'; status.style.color = '#956b21';
      return;
    }
    try {
      if (!window.Tesseract || typeof Tesseract.createWorker !== 'function') {
        throw new Error('The ID-reading tool did not load. Check your internet connection, retake a clearer photo, or type the details manually.');
      }
      const updateProgress = msg => {
        if (myRun !== ocrSequence) return;
        if (msg.status === 'recognizing text') status.textContent = `Reading ID text… ${Math.round((msg.progress || 0) * 100)}%`;
        else if (msg.status === 'loading language traineddata') status.textContent = 'Loading the text reader…';
        else if (msg.status === 'loading tesseract core') status.textContent = 'Starting the text reader…';
      };
      const worker = await getOcrWorker(updateProgress);
      const variants = [
        { label: 'color', mode: 'color' },
        { label: 'contrast', mode: 'contrast' },
        { label: 'threshold', mode: 'threshold' }
      ];
      const results = [];
      let parsed = { studentNumber: '', fullName: '', program: '' };

      for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
        if (myRun !== ocrSequence) return;
        // First process the guide-matched region. Always check the full frame at least once,
        // even if the guide crop seems readable, so a browser offset cannot silently win.
        const passes = sourceIndex === 0 ? variants : (countParsedFields(parsed) === 3 ? [variants[0]] : variants);
        for (let passIndex = 0; passIndex < passes.length; passIndex++) {
          if (myRun !== ocrSequence) return;
          if (sourceIndex === 1) status.textContent = passIndex === 0
            ? 'Checking the complete saved photo for any missed ID text…'
            : `Checking the complete photo (${passIndex + 1} of 3)…`;
          else status.textContent = passIndex === 0 ? 'Reading text inside the ID guide…' : `Improving ID text reading (${passIndex + 1} of 3)…`;
          const prepared = await prepareIdForOcr(sources[sourceIndex], passes[passIndex].mode);
          const result = await worker.recognize(prepared);
          const text = (result && result.data && result.data.text) || '';
          results.push(parseIdText(text));
          parsed = selectConsensusFields(results);
          if (countParsedFields(parsed) === 3 && passIndex >= 0) break;
        }
      }
      if (myRun !== ocrSequence) return;
      applyOcrValues(parsed);
      const count = countParsedFields(parsed);
      if (count === 3) {
        status.textContent = 'Three details were suggested from the ID photo. Compare each one with the original ID before submitting.';
        status.style.background = '#eafaf4'; status.style.color = '#188769';
        showToast('ID details suggested. Please verify them before submitting.', 'success');
      } else if (count > 0) {
        const missing = [
          !parsed.studentNumber ? 'student ID number' : '',
          !parsed.fullName ? 'name' : '',
          !parsed.program ? 'program/course' : ''
        ].filter(Boolean).join(', ');
        status.textContent = `The reader found ${count} of 3 details. ${missing ? `Please enter or correct: ${missing}. ` : ''}The complete photo was saved so you can review it.`;
        status.style.background = '#fff7e8'; status.style.color = '#956b21';
      } else {
        status.textContent = 'The complete photo was saved, but the text was not clear enough to fill safely. Check the photo and type the three details manually if needed.';
        status.style.background = '#fff7e8'; status.style.color = '#956b21';
      }
    } catch (err) {
      if (myRun !== ocrSequence) return;
      status.textContent = `${err.message || 'Automatic ID reading failed.'} The full photo is saved; please enter or correct the three details manually.`;
      status.style.background = '#fff2f3'; status.style.color = '#c64e5b';
    } finally {
      activeOcrLogger = null;
    }
  }

  async function getOcrWorker(logger) {
    activeOcrLogger = logger;
    if (!ocrWorkerPromise) {
      ocrWorkerPromise = Tesseract.createWorker('eng', 1, {
        logger: message => {
          if (typeof activeOcrLogger === 'function') activeOcrLogger(message);
        }
      }).catch(error => {
        ocrWorkerPromise = null;
        throw error;
      });
    }
    const worker = await ocrWorkerPromise;
    activeOcrLogger = logger;
    return worker;
  }

  window.addEventListener('pagehide', () => {
    if (ocrWorkerPromise) ocrWorkerPromise.then(worker => worker.terminate()).catch(() => {});
  });

  function clearPreviousOcrSuggestions() {
    const fields = { studentNumber: 'studentNumber', fullName: 'fullName', program: 'program' };
    Object.entries(fields).forEach(([key, id]) => {
      const input = $(id);
      if (lastOcrAutofill[key] && input.value.trim() === lastOcrAutofill[key]) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      lastOcrAutofill[key] = '';
    });
  }

  function prepareIdForOcr(dataUrl, mode = 'contrast') {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Keep OCR images near 2,200 px on the long edge. Large upscales slow phones
          // down without restoring detail that the camera did not capture.
          const scale = Math.min(1.35, Math.max(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight)));
          canvas.width = Math.round(image.naturalWidth * scale);
          canvas.height = Math.round(image.naturalHeight * scale);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          if (mode === 'color') {
            resolve(canvas.toDataURL('image/png'));
            return;
          }
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const px = frame.data;
          const histogram = new Array(256).fill(0);
          for (let i = 0; i < px.length; i += 4) {
            const gray = Math.max(0, Math.min(255, Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2])));
            histogram[gray]++;
            px[i] = px[i + 1] = px[i + 2] = gray;
          }
          // Otsu threshold gives a more suitable black/white split than one fixed value.
          let threshold = 150;
          if (mode === 'threshold') {
            const total = px.length / 4;
            let sum = 0; for (let t = 0; t < 256; t++) sum += t * histogram[t];
            let sumBackground = 0, weightBackground = 0, bestVariance = -1;
            for (let t = 0; t < 256; t++) {
              weightBackground += histogram[t];
              if (!weightBackground) continue;
              const weightForeground = total - weightBackground;
              if (!weightForeground) break;
              sumBackground += t * histogram[t];
              const meanBackground = sumBackground / weightBackground;
              const meanForeground = (sum - sumBackground) / weightForeground;
              const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
              if (variance > bestVariance) { bestVariance = variance; threshold = t; }
            }
          }
          for (let i = 0; i < px.length; i += 4) {
            const gray = px[i];
            const value = mode === 'threshold'
              ? (gray > threshold ? 255 : 0)
              : Math.max(0, Math.min(255, (gray - 128) * 1.8 + 128));
            px[i] = px[i + 1] = px[i + 2] = value;
          }
          ctx.putImageData(frame, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error('The captured ID photo could not be prepared. Please retake it.'));
      image.src = dataUrl;
    });
  }

  function countParsedFields(parsed) {
    return ['studentNumber', 'fullName', 'program'].filter(key => Boolean(String(parsed[key] || '').trim())).length;
  }

  function selectConsensusFields(results) {
    const output = { studentNumber: '', fullName: '', program: '' };
    ['studentNumber', 'fullName', 'program'].forEach(key => {
      const candidates = results.map(result => ({ value: String(result[key] || '').trim(), strong: Boolean(result._strong && result._strong[key]) }))
        .filter(candidate => candidate.value);
      if (!candidates.length) return;
      const groups = [];
      candidates.forEach(candidate => {
        const candidateKey = comparisonKey(key, candidate.value);
        let group = groups.find(g => valuesEquivalent(key, candidateKey, g.key));
        if (!group) { group = { key: candidateKey, values: [], strongCount: 0 }; groups.push(group); }
        group.values.push(candidate.value);
        if (candidate.strong) group.strongCount++;
      });
      groups.sort((a, b) => b.values.length - a.values.length || b.strongCount - a.strongCount || candidateQuality(key, b.values[0]) - candidateQuality(key, a.values[0]));
      const best = groups[0];
      // Standard program codes/titles and clearly labeled fields can be accepted from one pass.
      // Unlabeled name/ID guesses must agree across at least two different OCR passes.
      if (best.values.length >= 2 || best.strongCount >= 1) {
        output[key] = best.values.sort((a, b) => candidateQuality(key, b) - candidateQuality(key, a))[0];
      }
    });
    return output;
  }

  function comparisonKey(key, value) {
    if (key === 'studentNumber') return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (key === 'fullName') return value.toUpperCase().replace(/[^A-Z]/g, '');
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function valuesEquivalent(key, a, b) {
    if (a === b) return true;
    if (key !== 'fullName' || !a || !b) return false;
    const longest = Math.max(a.length, b.length);
    return longest > 0 && (1 - editDistance(a, b) / longest) >= 0.84;
  }
  function editDistance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let previous = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = old;
      }
    }
    return row[b.length];
  }
  function candidateQuality(key, value) {
    if (key === 'studentNumber') return (/\d/.test(value) ? 3 : 0) + (value.length >= 6 ? 2 : 0) + (/[A-Z].*\d|\d.*-/.test(value.toUpperCase()) ? 1 : 0);
    if (key === 'fullName') return value.trim().split(/\s+/).length * 2 - (value.length > 55 ? 5 : 0);
    return value.length + (/Bachelor|Science|Technology|Information|BSIT/i.test(value) ? 10 : 0);
  }

  function applyOcrValues(parsed) {
    const fields = { studentNumber: 'studentNumber', fullName: 'fullName', program: 'program' };
    Object.entries(fields).forEach(([key, id]) => {
      const value = String(parsed[key] || '').trim();
      if (!value) return;
      const input = $(id);
      // Do not overwrite text that the student has manually corrected.
      if (!input.value.trim() || input.value.trim() === lastOcrAutofill[key]) input.value = value;
      lastOcrAutofill[key] = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  const PROGRAMS = [
    { code: 'BSIT', title: 'Bachelor of Science in Information Technology' },
    { code: 'BSCS', title: 'Bachelor of Science in Computer Science' },
    { code: 'BSIS', title: 'Bachelor of Science in Information Systems' },
    { code: 'BSCpE', title: 'Bachelor of Science in Computer Engineering' },
    { code: 'BSBA', title: 'Bachelor of Science in Business Administration' },
    { code: 'BSHM', title: 'Bachelor of Science in Hospitality Management' },
    { code: 'BSTM', title: 'Bachelor of Science in Tourism Management' },
    { code: 'BSCRIM', title: 'Bachelor of Science in Criminology' },
    { code: 'BSED', title: 'Bachelor of Secondary Education' },
    { code: 'BEED', title: 'Bachelor of Elementary Education' },
    { code: 'BSN', title: 'Bachelor of Science in Nursing' },
    { code: 'BSA', title: 'Bachelor of Science in Accountancy' }
  ];

  function parseIdText(text) {
    const lines = String(text || '').split(/\r?\n/)
      .map(line => line.replace(/[|]/g, 'I').replace(/[•·]/g, ' ').replace(/[^\S\r\n]+/g, ' ').trim())
      .filter(Boolean);
    const all = lines.join('\n');
    const allCompact = all.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const strong = { studentNumber: false, fullName: false, program: false };

    // Student ID: prefer a number on a line labeled Student ID / ID No. Do not confuse dates or phone numbers.
    let studentNumber = '';
    const idLabel = /(?:student\s*(?:id\s*(?:no\.?|number|#)?|no\.?|number|#)|id\s*(?:no\.?|number|#))/i;
    const idPattern = /\b(?:[A-Z]{1,4}[- ]?\d{3,12}|20\d{2}[- ]?\d{2,8}|\d{6,12})\b/i;
    const broadLabeledPattern = /\b[A-Z0-9-]{5,20}\b/i;
    for (let i = 0; i < lines.length; i++) {
      if (!idLabel.test(lines[i])) continue;
      const after = lines[i].replace(/.*?(?:student\s*(?:id\s*(?:no\.?|number|#)?|no\.?|number|#)|id\s*(?:no\.?|number|#))\s*[:#\-]?\s*/i, '').trim();
      const candidate = after.match(idPattern) || after.match(broadLabeledPattern);
      if (candidate && /\d/.test(candidate[0])) { studentNumber = cleanToken(candidate[0]); strong.studentNumber = studentNumber.length >= 5; break; }
      const next = lines.slice(i + 1, i + 3).join(' ');
      const nextMatch = next.match(idPattern);
      if (nextMatch) { studentNumber = cleanToken(nextMatch[0]); strong.studentNumber = true; break; }
    }
    if (!studentNumber) {
      const excluded = /phone|mobile|contact|telephone|birth|date|issued|expiry|expires|valid|year|batch|postal|zip|amount|price/i;
      for (const line of lines) {
        if (excluded.test(line)) continue;
        const match = line.match(idPattern);
        if (!match) continue;
        studentNumber = cleanToken(match[0]);
        // A long numeric value is more likely to be an ID; short alphanumeric values need repeat OCR agreement.
        strong.studentNumber = /^\d{7,12}$/.test(studentNumber) || /^20\d{2}[- ]?\d{4,8}$/.test(studentNumber);
        break;
      }
    }

    // Program: prefer known program codes or a complete degree title. Reject fragments like "INFORM g".
    let program = '';
    const codeCandidates = PROGRAMS.slice().sort((a, b) => b.code.length - a.code.length);
    for (const item of codeCandidates) {
      const escaped = item.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(allCompact.replace(/\s+/g, ' '))) {
        program = `${item.title} (${item.code})`; strong.program = true; break;
      }
    }
    if (!program) {
      const flat = allCompact;
      if (/BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY/.test(flat) || (/BACHELOR OF SCIENCE/.test(flat) && /INFORMATION/.test(flat) && /TECHNOLOGY|TECHNOL|TECHNO/.test(flat))) {
        program = 'Bachelor of Science in Information Technology (BSIT)'; strong.program = true;
      } else if (/BACHELOR OF SCIENCE IN INFORMATION SYSTEMS/.test(flat)) {
        program = 'Bachelor of Science in Information Systems (BSIS)'; strong.program = true;
      } else {
        const programLineIndex = lines.findIndex(line => /\b(?:program|course|degree)\b/i.test(line));
        if (programLineIndex >= 0) {
          const line = lines[programLineIndex];
          const tail = line.replace(/^.*?\b(?:program|course|degree)\b\s*[:\-]?\s*/i, '').trim();
          const candidateText = [tail, ...lines.slice(programLineIndex + 1, programLineIndex + 3)].filter(Boolean).join(' ');
          const candidate = cleanProgram(candidateText);
          if (isLikelyProgram(candidate)) { program = titleCaseProgram(candidate); strong.program = /\b(?:bachelor|associate|master|BSIT|BSCS|BSIS|BSBA|BSHM|BSTM|BSN|BSA|BSED|BEED)\b/i.test(candidate); }
        }
      }
    }

    // Name: accept a clearly labeled name, otherwise only a clean 2–5 word line with no school/location/degree words.
    let fullName = '';
    for (let i = 0; i < lines.length; i++) {
      if (!/\b(?:student\s*)?name\b/i.test(lines[i])) continue;
      let candidateText = lines[i].replace(/^.*?\b(?:student\s*)?name\b\s*[:\-]?\s*/i, '').trim();
      if (!candidateText || candidateText.length < 3) candidateText = lines.slice(i + 1, i + 3).join(' ');
      const candidate = cleanName(candidateText);
      if (isLikelyName(candidate) && !isNonNameLine(candidate)) { fullName = titleCaseName(candidate); strong.fullName = true; break; }
    }
    if (!fullName) {
      const candidates = lines.map(line => cleanName(line))
        .filter(line => isLikelyName(line) && !isNonNameLine(line))
        .sort((a, b) => nameScore(b) - nameScore(a));
      if (candidates.length) fullName = titleCaseName(candidates[0]);
    }
    return { studentNumber, fullName, program, _strong: strong };
  }

  function cleanToken(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30); }
  function cleanName(value) { return String(value || '').replace(/[^A-Za-z ,.'-]/g, '').replace(/\s+/g, ' ').replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').trim().slice(0, 90); }
  function cleanProgram(value) { return String(value || '').replace(/[|]/g, 'I').replace(/[^A-Za-z0-9 &/().-]/g, '').replace(/\s+/g, ' ').replace(/^(program|course|degree)\s*[:\-]?\s*/i, '').trim().slice(0, 90); }
  function isLikelyName(value) {
    const text = String(value || '').trim();
    const parts = text.split(/\s+/).filter(Boolean);
    const letters = text.replace(/[^A-Za-z]/g, '');
    if (parts.length < 2 || parts.length > 5 || letters.length < 6 || letters.length > 60) return false;
    if (!parts.some(part => part.replace(/[^A-Za-z]/g, '').length >= 3)) return false;
    // Unlabeled OCR often returns a school slogan or address as a "name". Allow one conventional middle initial only.
    const singleLetterParts = parts.filter(part => /^[A-Za-z]$/.test(part));
    if (singleLetterParts.length > 1) return false;
    if (singleLetterParts.length === 1 && !new RegExp(`\\b${singleLetterParts[0]}\\.(?:\\s|$)`).test(text)) return false;
    return !/[0-9]/.test(text);
  }
  function isNonNameLine(value) {
    return /\b(?:zamboanga|norte|mindanao|philippines|region|province|municipality|barangay|city|school|college|university|republic|student|identification|identity|valid|year|course|program|address|birth|date|number|signature|department|registrar|government|office|official|card|issued|expiry|expires|campus|bachelor|science|technology|information|degree|course|program|computer|engineering|management|education|crim(inology)?|hospitality|tourism|accountancy|nursing)\b/i.test(value);
  }
  function isLikelyProgram(value) {
    const text = String(value || '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    if (text.length < 8 || text.length > 90 || words.length < 3 || /^[A-Z]$/i.test(text)) return false;
    if (/\b[A-Z]\s*$/i.test(text) || /\b(?:inform|technol|bachel|scienc)\s+[A-Z]$/i.test(text)) return false;
    return /\b(?:bachelor|associate|master|science|technology|information|education|nursing|business|engineering|criminology|hospitality|tourism|accountancy|computer)\b/i.test(text) && !/\b(?:unknown|n\/a|none)\b/i.test(text);
  }
  function titleCaseName(value) {
    return String(value).toLowerCase().replace(/(^|[\s'-])([a-z])/g, (match, before, letter) => before + letter.toUpperCase());
  }
  function titleCaseProgram(value) {
    const keepLower = new Set(['of', 'in', 'and', 'for', 'the']);
    return String(value).toLowerCase().replace(/\b[a-z][a-z0-9]*\b/g, word => keepLower.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1));
  }
  function nameScore(value) {
    const words = value.split(/\s+/);
    return words.filter(word => word.length >= 3).length * 6 + Math.min(words.length, 4) * 2 + (/[A-Z]/.test(value) ? 1 : 0) - (/[0-9]/.test(value) ? 5 : 0);
  }

  $('registerForm').addEventListener('submit', async e => {
    e.preventDefault(); hideAlert('registerAlert');
    if (!photoIdData || !photoSelfieData) { showAlert('registerAlert', 'Please capture both your school ID and live selfie using the camera buttons. Gallery upload is not available for these two photos.'); return; }
    const studentNumber = $('studentNumber').value.trim(); const fullName = $('fullName').value.trim(); const program = $('program').value.trim(); const password = $('newPassword').value; const confirm = $('confirmPassword').value;
    if (password.length < 8) { showAlert('registerAlert', 'Your password must have at least 8 characters.'); return; }
    if (password !== confirm) { showAlert('registerAlert', 'The two passwords do not match. Please check them.'); return; }
    if (applications.some(app => String(app.studentNumber).trim().toLowerCase() === studentNumber.trim().toLowerCase())) { showAlert('registerAlert', 'An application already uses this student ID number. Check the details or contact the Admin/Teacher.'); return; }
    if (!$('privacyConsent').checked) { showAlert('registerAlert', 'Please review the demo privacy notice and confirm before submitting.'); return; }
    const submit = $('registerForm').querySelector('button[type=submit]'); const oldLabel = submit.innerHTML; submit.disabled = true; submit.textContent = 'Submitting application…';
    try {
      const passwordHash = await sha256(password);
      const application = { id: `APP-${year}-${Date.now().toString().slice(-7)}`, studentNumber, fullName, program, passwordHash, idPhoto: photoIdData, selfiePhoto: photoSelfieData, status: 'pending', createdAt: Date.now(), updatedAt: Date.now(), rejectionReason: '', staffNote: '', source: 'live-camera-demo' };
      applications.unshift(application);
      if (!saveList(keys.applications, applications)) { applications.shift(); return; }
      resetRegistration(); currentRole = 'student'; document.querySelector('[data-role="student"]').click(); showView('authView');
      $('loginIdentifier').value = studentNumber;
      showAlert('loginAlert', 'Application submitted! Your status is Pending. The Admin/Teacher must review and approve your account before you can sign in.', 'success');
      showToast('Student application sent for admin approval.', 'success');
    } catch (err) { showAlert('registerAlert', 'Could not save the application in this browser. Try smaller, clearer photos or clear old demo data.'); }
    finally { submit.disabled = false; submit.innerHTML = oldLabel; }
  });

  // Dashboard and role-specific screens
  function showDashboard() {
    if (!currentUser) { showView('authView'); return; }
    showView('dashboardView');
    const admin = currentUser.role === 'admin';
    $('adminPanel').classList.toggle('hidden', !admin); $('studentPanel').classList.toggle('hidden', admin);
    $('dashboardEyebrow').textContent = admin ? 'SCHOOL ADMINISTRATION' : 'STUDENT PORTAL';
    $('dashboardTitle').innerHTML = admin ? 'Admin control center <span>✦</span>' : `Good day, ${escapeHtml((currentUser.name || 'student').split(' ')[0])} <span>✦</span>`;
    $('dashboardSubtitle').textContent = admin ? 'Review student applications and manage campus lost and found records.' : 'Browse campus reports and reconnect with your belongings.';
    $('userAvatar').textContent = lettersInitial(currentUser.name); $('userDisplayName').textContent = currentUser.name; $('userDisplayRole').textContent = admin ? 'Admin / Teacher' : `${currentUser.program || 'Student'} · ${currentUser.studentNumber || ''}`;
    renderAdmin(); renderStudentItems();
  }
  $('logoutBtn').addEventListener('click', () => { currentUser = null; currentRole = 'student'; document.querySelector('[data-role="student"]').click(); showView('authView'); $('loginPassword').value = ''; showToast('You have signed out.'); });
  function renderAdmin() {
    $('pendingCount').textContent = applications.filter(a => getStatus(a) === 'pending').length;
    $('lostCount').textContent = items.filter(i => i.type === 'lost' && i.status !== 'returned').length;
    $('foundCount').textContent = items.filter(i => i.type === 'found' && i.status !== 'returned').length;
    $('returnedCount').textContent = items.filter(i => i.status === 'returned').length;
    $('queuePill').textContent = `${applications.filter(a => getStatus(a) === 'pending').length} pending`;
    const pending = applications.filter(a => getStatus(a) === 'pending');
    $('applicationList').innerHTML = pending.length ? pending.map(app => `
      <div class="application-row"><div class="applicant-avatar">${escapeHtml(lettersInitial(app.fullName))}</div><div class="applicant-main"><strong>${escapeHtml(app.fullName)}</strong><small>${escapeHtml(app.studentNumber)} · ${escapeHtml(app.program)}<br>Submitted ${escapeHtml(new Date(app.createdAt).toLocaleDateString())}</small><div class="application-actions"><button class="btn btn-secondary" data-review-app="${escapeHtml(app.id)}">Review ID &amp; selfie</button><button class="btn btn-primary" data-approve-app="${escapeHtml(app.id)}">✓ Approve</button><button class="btn btn-danger-outline" data-reject-app="${escapeHtml(app.id)}">Reject</button></div></div></div>`).join('') : '<div class="empty-state"><div class="empty-symbol">✓</div><strong>No pending applications</strong><p>New student applications will appear here for review.</p></div>';
    $('adminItemList').innerHTML = items.length ? items.slice().sort((a,b) => b.createdAt - a.createdAt).map(item => `
      <div class="admin-item-row"><div class="admin-item-thumb">${item.photo ? `<img src="${item.photo}" alt="">` : escapeHtml(item.symbol || (item.type === 'lost' ? '⌕' : '◈'))}</div><div class="admin-item-info"><strong>${escapeHtml(item.title)} <span style="color:#94a1b4;font-weight:500">${escapeHtml(item.ref)}</span></strong><small>${escapeHtml(item.location)} · ${escapeHtml(prettyDate(item.date))} · ${item.status === 'returned' ? 'Returned' : (item.type === 'found' ? 'Available for claim' : 'Open report')}</small></div><span class="type-badge ${item.type}">${item.type === 'lost' ? 'LOST' : 'FOUND'}</span><div class="item-row-action">${item.status !== 'returned' && item.type === 'found' ? `<button class="btn btn-secondary" data-return-item="${escapeHtml(item.ref)}">Mark returned</button>` : ''}<button class="btn btn-danger-outline" data-delete-item="${escapeHtml(item.ref)}">Delete</button></div></div>`).join('') : '<div class="empty-state"><strong>No items posted</strong><p>Use the form above to publish the first report.</p></div>';
    document.querySelectorAll('[data-review-app]').forEach(btn => btn.addEventListener('click', () => openApplicationDetails(btn.dataset.reviewApp)));
    document.querySelectorAll('[data-approve-app]').forEach(btn => btn.addEventListener('click', () => approveApplication(btn.dataset.approveApp)));
    document.querySelectorAll('[data-reject-app]').forEach(btn => btn.addEventListener('click', () => rejectApplication(btn.dataset.rejectApp)));
    document.querySelectorAll('[data-return-item]').forEach(btn => btn.addEventListener('click', () => markReturned(btn.dataset.returnItem)));
    document.querySelectorAll('[data-delete-item]').forEach(btn => btn.addEventListener('click', () => deleteItem(btn.dataset.deleteItem)));
  }
  function openApplicationDetails(id) {
    const app = applications.find(a => a.id === id); if (!app) return;
    activeApplicationId = id;
    $('applicationModalBody').innerHTML = `<div class="application-detail-header"><div class="applicant-avatar">${escapeHtml(lettersInitial(app.fullName))}</div><div><h2 id="applicationModalTitle">${escapeHtml(app.fullName)}</h2><p>${escapeHtml(app.studentNumber)} · Submitted ${escapeHtml(new Date(app.createdAt).toLocaleString())}</p></div></div>
      <div class="verification-photos"><div class="verification-photo-card"><img src="${app.idPhoto}" alt="Captured school ID"><div class="photo-label">School ID photo</div><small>Review the printed details and whether the photo is readable.</small></div><div class="verification-photo-card"><img src="${app.selfiePhoto}" alt="Captured live selfie"><div class="photo-label">Live selfie</div><small>Compare manually with the ID and school record.</small></div></div>
      <div class="detail-grid"><div class="detail-pair"><small>Student ID number</small><strong>${escapeHtml(app.studentNumber)}</strong></div><div class="detail-pair"><small>Complete name</small><strong>${escapeHtml(app.fullName)}</strong></div><div class="detail-pair"><small>Program / Course</small><strong>${escapeHtml(app.program)}</strong></div><div class="detail-pair"><small>Application status</small><strong>${escapeHtml(getStatus(app).toUpperCase())}</strong></div></div>
      <div class="app-state-banner">The OCR result and photos are not automatic proof of identity. Check the official school record before approval. Do not display or download verification photos for public use.</div>
      <div class="field" style="margin-top:13px"><label for="staffReviewNote">Admin review note (optional)</label><textarea id="staffReviewNote" rows="2" maxlength="300" placeholder="e.g. ID matches current school record"></textarea></div>
      <div class="modal-action-row"><button class="btn btn-primary" id="modalApproveBtn">✓ Approve account</button><button class="btn btn-secondary" id="modalCorrectionBtn">Request correction</button><button class="btn btn-danger-outline" id="modalRejectBtn">Reject</button></div>`;
    $('applicationModal').classList.remove('hidden');
    $('modalApproveBtn').addEventListener('click', () => approveApplication(id, $('staffReviewNote').value));
    $('modalRejectBtn').addEventListener('click', () => rejectApplication(id, $('staffReviewNote').value));
    $('modalCorrectionBtn').addEventListener('click', () => requestCorrection(id, $('staffReviewNote').value));
  }
  function closeApplicationModal() { $('applicationModal').classList.add('hidden'); activeApplicationId = null; }
  function approveApplication(id, note = '') {
    const app = applications.find(a => a.id === id); if (!app) return;
    if (!confirm(`Approve ${app.fullName}'s student account? Check their ID against the school's official record first.`)) return;
    app.status = 'approved'; app.staffNote = note || ''; app.reviewedAt = Date.now(); app.reviewedBy = currentUser?.name || 'Demo Admin'; app.rejectionReason = '';
    saveList(keys.applications, applications); closeApplicationModal(); renderAdmin(); showToast(`${app.fullName} is approved and can now sign in.`, 'success');
  }
  function rejectApplication(id, note = '') {
    const app = applications.find(a => a.id === id); if (!app) return;
    const reason = note || prompt('Enter a short reason for rejecting this application (optional):', 'Please contact the school office to verify your details.');
    if (reason === null) return;
    app.status = 'rejected'; app.rejectionReason = reason.trim(); app.staffNote = reason.trim(); app.reviewedAt = Date.now(); app.reviewedBy = currentUser?.name || 'Demo Admin';
    saveList(keys.applications, applications); closeApplicationModal(); renderAdmin(); showToast('Application marked as rejected.', 'warning');
  }
  function requestCorrection(id, note = '') {
    const app = applications.find(a => a.id === id); if (!app) return;
    const message = note || prompt('What should the student correct?', 'Please retake a clearer school ID photo or correct the student details.');
    if (message === null) return;
    app.status = 'correction'; app.staffNote = message.trim(); app.updatedAt = Date.now();
    saveList(keys.applications, applications); closeApplicationModal(); renderAdmin(); showToast('Correction note saved. For this demo the student must contact the school; automatic email is not configured.', 'warning');
  }
  function markReturned(ref) {
    const item = items.find(i => i.ref === ref); if (!item) return;
    const claimant = prompt('Record the name of the person who received the item (after checking their claim in person):');
    if (!claimant || !claimant.trim()) return;
    const note = prompt('Optional handover note (do not write unnecessary sensitive information):', 'Ownership checked in person by Admin/Teacher.');
    item.status = 'returned'; item.returnedAt = Date.now(); item.returnedTo = claimant.trim(); item.handoverNote = note || ''; item.handedOverBy = currentUser?.name || 'Demo Admin';
    saveList(keys.items, items); renderAdmin(); renderStudentItems(); showToast(`${item.ref} marked as returned to ${claimant.trim()}.`);
  }
  function deleteItem(ref) {
    const item = items.find(i => i.ref === ref); if (!item) return;
    if (!confirm(`Delete ${item.ref} — ${item.title}? This cannot be undone in the browser demo.`)) return;
    items = items.filter(i => i.ref !== ref); saveList(keys.items, items); renderAdmin(); renderStudentItems(); showToast('Item report deleted.', 'warning');
  }
  $('itemForm').addEventListener('submit', async e => {
    e.preventDefault(); hideAlert('itemAlert');
    if (!currentUser || currentUser.role !== 'admin') return;
    const type = $('itemType').value; const title = $('itemTitle').value.trim(); const category = $('itemCategory').value; const location = $('itemLocation').value.trim(); const date = $('itemDate').value; const description = $('itemDescription').value.trim();
    if (!title || !location || !date || !description) { showAlert('itemAlert', 'Please complete the required item details.'); return; }
    const item = { ref: makeRef(type), type, title, category, location, date, description, symbol: type === 'lost' ? '⌕' : '◈', status: type === 'lost' ? 'open' : 'available', photo: itemPhotoDraft, createdAt: Date.now(), createdBy: currentUser.name };
    items.unshift(item); if (!saveList(keys.items, items)) { items.shift(); return; }
    $('itemForm').reset(); $('itemDate').value = todayISO; itemPhotoDraft = null; $('itemPhoto').value = ''; renderAdmin(); renderStudentItems(); showToast(`Report published with reference ${item.ref}.`, 'success');
  });
  $('itemPhoto').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0]; itemPhotoDraft = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showAlert('itemAlert', 'Use a JPG, PNG, or WEBP item photo.'); e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { showAlert('itemAlert', 'Choose a photo smaller than 5 MB.'); e.target.value = ''; return; }
    try { itemPhotoDraft = await resizeUploadedFile(file); hideAlert('itemAlert'); showToast('Item photo ready to publish.'); }
    catch { showAlert('itemAlert', 'The photo could not be read. Try another image.'); }
  });

  // Student items: only the two tabs in the student portal.
  document.querySelectorAll('[data-item-tab]').forEach(button => button.addEventListener('click', () => {
    studentItemTab = button.dataset.itemTab; document.querySelectorAll('[data-item-tab]').forEach(btn => btn.classList.toggle('active', btn === button)); renderStudentItems();
  }));
  $('itemSearch').addEventListener('input', renderStudentItems); $('categoryFilter').addEventListener('change', renderStudentItems);
  function renderStudentItems() {
    const lost = items.filter(i => i.type === 'lost' && i.status !== 'returned'); const found = items.filter(i => i.type === 'found' && i.status !== 'returned');
    $('lostTabCount').textContent = lost.length; $('foundTabCount').textContent = found.length;
    if (!currentUser || currentUser.role !== 'student') return;
    const list = studentItemTab === 'lost' ? lost : found;
    $('itemSectionTitle').textContent = studentItemTab === 'lost' ? 'Lost Items' : 'Found Items';
    $('itemSectionDesc').textContent = studentItemTab === 'lost' ? 'Items reported missing by students and school staff.' : 'Items found on campus and kept by the school office.';
    const query = $('itemSearch').value.trim().toLowerCase(); const category = $('categoryFilter').value;
    const shown = list.filter(item => (category === 'all' || item.category === category) && (!query || [item.title,item.ref,item.location,item.description,item.category].some(val => String(val || '').toLowerCase().includes(query))));
    $('studentItemsGrid').innerHTML = shown.length ? shown.map(item => `<article class="item-card"><div class="item-card-media">${item.photo ? `<img src="${item.photo}" alt="Photo of ${escapeHtml(item.title)}">` : `<span class="item-art-symbol">${escapeHtml(item.symbol || (item.type === 'lost' ? '⌕' : '◈'))}</span>`}<span class="type-badge item-card-type ${item.type}">${item.type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}</span><span class="item-ref">${escapeHtml(item.ref)}</span></div><div class="item-card-body"><span class="item-card-category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><div class="item-meta"><span>⌖</span><span>${escapeHtml(item.location)}</span></div><div class="item-card-footer"><small>${escapeHtml(prettyDate(item.date))}</small><button type="button" data-recognize-item="${escapeHtml(item.ref)}">${item.type === 'found' ? 'I recognize this item →' : 'View report →'}</button></div></div></article>`).join('') : '<div class="no-items"><div class="empty-symbol">⌕</div><strong>No items match your search</strong><p>Try another keyword or category.</p></div>';
    document.querySelectorAll('[data-recognize-item]').forEach(btn => btn.addEventListener('click', () => openItemInfo(btn.dataset.recognizeItem)));
  }
  function openItemInfo(ref) {
    const item = items.find(i => i.ref === ref); if (!item) return;
    $('applicationModalBody').innerHTML = `<div class="application-detail-header"><div class="applicant-avatar">${item.type === 'lost' ? '⌕' : '◈'}</div><div><h2 id="applicationModalTitle">${escapeHtml(item.title)}</h2><p>${escapeHtml(item.ref)} · ${item.type === 'lost' ? 'Lost item report' : 'Found item held by school'}</p></div></div>
      ${item.photo ? `<img src="${item.photo}" alt="${escapeHtml(item.title)}" style="width:100%;max-height:240px;object-fit:contain;background:#f3f6fa;border-radius:12px;margin-bottom:15px">` : ''}
      <div class="detail-grid"><div class="detail-pair"><small>Category</small><strong>${escapeHtml(item.category)}</strong></div><div class="detail-pair"><small>Date reported</small><strong>${escapeHtml(prettyDate(item.date))}</strong></div><div class="detail-pair"><small>Location</small><strong>${escapeHtml(item.location)}</strong></div><div class="detail-pair"><small>Status</small><strong>${item.type === 'found' ? 'Kept by school · Available for review' : 'Open lost report'}</strong></div></div>
      <div class="app-state-banner">${item.type === 'found' ? `If you believe this is yours, note reference <b>${escapeHtml(item.ref)}</b> and visit the school Admin/Teacher in person. Bring your student ID and explain identifying details. Do not share private details in a public message.` : `If this is your lost item report, keep reference <b>${escapeHtml(item.ref)}</b>. Check the Found Items page and ask the school Admin/Teacher for help if you see a possible match.`}</div>
      <div class="modal-action-row"><button class="btn btn-primary" id="closeItemInfoBtn">Got it</button></div>`;
    $('applicationModal').classList.remove('hidden'); $('closeItemInfoBtn').addEventListener('click', closeApplicationModal);
  }

  // Export and demo reset
  $('exportCsvBtn').addEventListener('click', () => {
    const rows = [['Reference','Type','Title','Category','Location','Date','Description','Status','Returned To'], ...items.map(item => [item.ref,item.type,item.title,item.category,item.location,item.date,item.description,item.status,item.returnedTo || ''])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n'); downloadBlob('\ufeff' + csv, `FindIT-items-${todayISO}.csv`, 'text/csv;charset=utf-8;');
  });
  $('resetDemoBtn').addEventListener('click', () => {
    const ok = confirm('Reset this browser demo? This removes all saved student applications and items (including captured ID/selfie photos) and restores sample item records. Export anything you need first.');
    if (!ok) return;
    applications = []; items = seedItems(); saveList(keys.applications, applications); saveList(keys.items, items); renderAdmin(); renderStudentItems(); showToast('Demo data reset. Captured registration photos were removed from this browser storage.', 'warning');
  });
  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Escaped dynamic values in templates, and no photo upload control is exposed for ID or selfie.
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
  showView('authView');
})();
