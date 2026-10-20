/* FindIT Campus — interactive browser edition. Shared server storage can be added later. */
(() => {
  'use strict';
  const STORE_KEY = 'finditCampusFunctional_v6';
  const LEGACY_STORE_KEYS = ['finditCampusFunctional_v5', 'finditCampusFunctional_v4', 'finditCampusFunctional_v3', 'finditCampusDemoFinal_v1'];
  const SESSION_KEY = 'finditCampusDemoSession_v1';
  const DAY = 86400000;
  const appRoot = document.getElementById('appRoot');
  const modalRoot = document.getElementById('modalRoot');
  const toastRoot = document.getElementById('toastRoot');
  const installBtn = document.getElementById('installBtn');
  const profileButton = document.getElementById('profileButton');
  let state = null;
  let currentUser = null;
  let authMode = 'login-student';
  let studentTab = 'lost';
  let adminTab = 'overview';
  let trashTab = 'items';
  let pendingInstallPrompt = null;
  let dropdownOpen = false;
  let registrationDraft = { idPhoto: '', selfie: '', ocrText: '', schoolMatch: false, schoolReview: true };
  let correctionApplicationId = '';
  let authNotice = '';
  let cameraState = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const nowISO = () => new Date().toISOString();
  const dateOnly = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const dateTime = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const h = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (name) => String(name || 'FindIT').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || 'FI';
  const randomId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const formatStatus = (s) => ({ pending: 'Pending review', approved: 'Approved', rejected: 'Rejected', correction: 'Correction requested', lost: 'Lost', found: 'Available for claim', available: 'Available for claim', returned: 'Returned', active: 'Active', deleted: 'In recycle bin' }[s] || s || '—');
  const statusClass = (s) => ({ pending: 'pill-amber', approved: 'pill-green', rejected: 'pill-red', correction: 'pill-amber', lost: 'pill-red', found: 'pill-green', available: 'pill-green', returned: 'pill-gray', active: 'pill-green', deleted: 'pill-gray' }[s] || 'pill-gray');

  async function hashPassword(value) {
    const text = String(value);
    if (window.crypto && crypto.subtle && window.isSecureContext) {
      const bytes = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Local-preview fallback only. Production password hashing must happen on the PHP server.
    return `local-${btoa(unescape(encodeURIComponent(text)))}`;
  }
  function loadState() {
    // Try the current schema first, then migrate data from earlier site builds.
    for (const key of [STORE_KEY, ...LEGACY_STORE_KEYS]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.items)) {
          if (key !== STORE_KEY) {
            // Copy the newest available state first, then remove the legacy copy so
            // rejected application data from an older storage key is not retained.
            try { localStorage.setItem(STORE_KEY, JSON.stringify(parsed)); localStorage.removeItem(key); } catch (_) {}
          }
          return parsed;
        }
      } catch (_) {}
    }
    return null;
  }
  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      toast('Browser storage is full. Download a backup, then remove older photos or records.', 'error', 6500);
      return false;
    }
  }
  function demoItem(ref, type, name, category, location, date, description, emoji) {
    return { id: randomId('item'), ref, type, name, category, location, date, description, emoji, photo: '', status: type === 'lost' ? 'lost' : 'available', createdAt: nowISO(), updatedAt: nowISO(), createdBy: 'admin', returnedAt: '', claimantName: '', claimantId: '' };
  }
  async function seedState() {
    const adminHash = await hashPassword('1234');
    const studentHash = await hashPassword('student123');
    return {
      version: 1,
      users: [
        { id: randomId('user'), username: 'admin', name: 'School Administrator', studentId: '', program: 'Administration', role: 'admin', passwordHash: adminHash, status: 'active', createdAt: nowISO(), approvedAt: nowISO() },
        { id: randomId('user'), username: '2026-0001', name: 'Alex Santos', studentId: '2026-0001', program: 'BS Information Technology', yearLevel: '2nd Year', role: 'student', passwordHash: studentHash, status: 'active', createdAt: nowISO(), approvedAt: nowISO() }
      ],
      applications: [],
      items: [
        demoItem('LS-2026-0001', 'lost', 'Black Laptop Bag', 'Electronics', 'Library · 2nd Floor', '2026-10-16', 'Black laptop bag with a small blue keychain near the handle.', '🎒'),
        demoItem('LS-2026-0002', 'lost', 'Student ID Lace', 'IDs and Cards', 'College of Information Technology', '2026-10-15', 'Blue ID lace with a small silver clip. If found, bring it to the school office.', '🪪'),
        demoItem('FD-2026-0001', 'found', 'Blue Water Bottle', 'Bottles and Tumblers', 'Room 204 · Science Building', '2026-10-16', 'Blue reusable bottle turned over to the school office.', '🧴'),
        demoItem('FD-2026-0002', 'found', 'Black Umbrella', 'Personal Items', 'Canteen entrance', '2026-10-15', 'Compact black umbrella currently kept by the Admin/Teacher.', '☂️'),
        demoItem('FD-2026-0003', 'found', 'Notebook with Green Cover', 'Books and School Supplies', 'Library reading area', '2026-10-14', 'Green-covered notebook. Please verify the name written inside with staff.', '📗')
      ],
      claims: [], trash: [], logs: [
        { id: randomId('log'), at: nowISO(), actor: 'System', role: 'system', action: 'System initialized', details: 'Initial campus records loaded.' }
      ],
      failedLogins: {}, settings: { retentionDays: 30 }
    };
  }
  function logAction(action, details, actor = currentUser?.name || 'System', role = currentUser?.role || 'system', keepPersonal = true) {
    state.logs.unshift({ id: randomId('log'), at: nowISO(), actor: keepPersonal ? actor : 'System', role, action, details: keepPersonal ? details : 'Application data removed; student ID released for re-registration.' });
    if (state.logs.length > 1500) state.logs = state.logs.slice(0, 1500);
  }
  function purgeExpiredTrash() {
    const cutoff = Date.now() - 30 * DAY;
    const before = state.trash.length;
    state.trash = state.trash.filter(entry => new Date(entry.deletedAt).getTime() > cutoff);
    const removed = before - state.trash.length;
    if (removed) logAction('Recycle bin auto-purged', `${removed} record(s) older than 30 days were permanently deleted.`, 'System', 'system', false);
  }
  function getActiveStudents() { return state.users.filter(u => u.role === 'student' && u.status === 'active'); }
  function idInUse(id, exceptApplication = '') {
    const normalized = String(id || '').trim().toUpperCase();
    return state.users.some(u => u.role === 'student' && u.studentId.toUpperCase() === normalized) || state.applications.some(a => a.studentId.toUpperCase() === normalized && a.id !== exceptApplication);
  }
  function toast(message, type = 'success', duration = 4200) {
    const el = document.createElement('div'); el.className = `toast ${type === 'error' ? 'error' : type === 'warn' ? 'warn' : ''}`; el.textContent = message; toastRoot.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }
  function modal(title, body, footer = '', opts = {}) {
    const wide = opts.wide ? ' modal-wide' : '';
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal-card${wide}" role="dialog" aria-modal="true" aria-label="${h(title)}"><header class="modal-head"><div><div class="eyebrow">FINDIT CAMPUS</div><h3>${h(title)}</h3></div><button class="close-x" type="button" data-action="close-modal" aria-label="Close">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
  }
  function closeModal() { stopCamera(); modalRoot.innerHTML = ''; }
  function modalButtons(buttons) { return buttons.map(b => `<button class="btn ${b.class || 'btn-outline'}" type="button" data-action="${h(b.action)}" ${b.disabled ? 'disabled' : ''}>${h(b.label)}</button>`).join(''); }
  function showUserMenu() {
    if (!currentUser) return;
    dropdownOpen = !dropdownOpen;
    const old = $('#globalUserMenu'); if (old) old.remove();
    if (!dropdownOpen) return;
    const m = document.createElement('div'); m.className = 'dropdown-menu'; m.id = 'globalUserMenu';
    m.innerHTML = currentUser.role === 'admin'
      ? `<button data-action="open-admin-username">👤 Change admin username</button><button data-action="open-password">🔐 Change admin password</button><button data-action="open-admin-settings">⚙️ Settings & backup</button><button data-action="logout">↗ Sign out</button>`
      : `<button data-action="open-password">🔐 Change password</button><button data-action="open-student-delete">🗑 Delete my account</button><button data-action="logout">↗ Sign out</button>`;
    profileButton.parentElement.style.position = 'relative'; profileButton.parentElement.appendChild(m);
  }
  function escapeAttr(str) { return h(str).replace(/`/g, '&#96;'); }
  function userBadge(user) { return `<div class="user-cell"><span class="initial-badge">${h(initials(user.name))}</span><span><strong>${h(user.name)}</strong><small>${h(user.studentId || user.username || 'Admin')}</small></span></div>`; }
  function pill(text, status) { return `<span class="pill ${statusClass(status)}">${h(text || formatStatus(status))}</span>`; }
  function render() {
    if (!currentUser) {
      profileButton.hidden = true;
      renderAuth();
    } else {
      profileButton.hidden = false;
      $('#avatarInitials').textContent = initials(currentUser.name);
      if (currentUser.role === 'admin') renderAdmin(); else renderStudent();
    }
    refreshInstallButton();
  }
  function renderAuth() {
    const isCorrection = authMode === 'correction';
    const isRegister = authMode === 'register' || isCorrection;
    const isAdmin = authMode === 'login-admin';
    const authTitle = isCorrection ? 'Correct your student application' : isRegister ? 'Create your student account' : isAdmin ? 'Admin sign in' : 'Welcome back';
    appRoot.innerHTML = `
      <section class="welcome-grid">
        <div class="welcome-hero">
          <div class="crest-row"><img src="assets/brand/ave-maria-college-logo.png" alt=""><span>AVE MARIA COLLEGE · FINDIT CAMPUS</span></div>
          <div class="eyebrow" style="margin-top:36px">A safer campus community</div>
          <h1>Lost something?<span>Find your way back.</span></h1>
          <p>A trusted place for students and school staff to report lost belongings, browse found items, and return property through the school office.</p>
          <div class="feature-pills"><span>⌕ Search campus items</span><span>✓ School-approved accounts</span><span>♧ In-person item handover</span></div>
          <div class="welcome-note"><b>✦</b> Helping lost belongings find their owners.</div>
        </div>
        <section class="panel auth-panel">
          <img class="crest-big" src="assets/brand/ave-maria-college-logo.png" alt="Ave Maria College seal">
          <div class="eyebrow">${isCorrection ? 'Application correction' : isRegister ? 'Student registration' : isAdmin ? 'Authorized staff' : 'Welcome to FindIT'}</div>
          <h2>${h(authTitle)}</h2>
          <p class="muted" style="line-height:1.7;font-size:12px">${isCorrection ? 'The Admin/Teacher requested changes. Review the note, correct the details, and resubmit using the same Student ID and password.' : isRegister ? 'Capture your school ID and live selfie, review the details, then wait for Admin/Teacher approval.' : isAdmin ? 'Sign in to review student applications and manage school lost-and-found records.' : 'Sign in to browse the campus lost and found items.'}</p>
          ${!isRegister && authNotice ? `<div class="callout ${authNotice.toLowerCase().includes('correction') ? 'warning' : 'success'}" style="margin:12px 0">${h(authNotice)}</div>` : ''}
          ${!isRegister ? `<div class="auth-tabs"><button class="auth-tab ${!isAdmin ? 'active' : ''}" type="button" data-action="auth-student">Student</button><button class="auth-tab ${isAdmin ? 'active' : ''}" type="button" data-action="auth-admin">Admin / Teacher</button></div>` : ''}
          ${isRegister ? registrationFormHTML(isCorrection) : loginFormHTML(isAdmin)}
          ${!isAdmin && !isRegister ? `<div class="form-actions"><button class="btn btn-outline" type="button" style="width:100%" data-action="go-register">＋ Create a student account</button></div>` : ''}
          ${isCorrection ? `<div class="auth-footer">Need to return to sign in? <button class="help-link" type="button" data-action="auth-student">Back to sign in</button></div>` : isRegister ? `<div class="auth-footer">Already applied or already have an account? <button class="help-link" type="button" data-action="auth-student">Sign in</button></div>` : ''}
        </section>
      </section>`;
    if (isRegister) wireRegistrationForm();
  }
  function loginFormHTML(isAdmin) {
    return `<form id="loginForm" class="field-grid" novalidate>
      <div class="field full"><label>${isAdmin ? 'Admin username' : 'Student ID number'} <span class="required">*</span></label><input class="input" name="loginId" required autocomplete="username" placeholder="${isAdmin ? 'admin' : 'e.g. 2026-0001'}" ${isAdmin ? 'value=""' : ''}></div>
      <div class="field full"><label>Password <span class="required">*</span></label><input class="input" name="password" type="password" required autocomplete="current-password" placeholder="Enter your password"></div>
      <div class="field full"><button class="btn btn-primary" type="submit" style="width:100%">Sign in <span aria-hidden="true">→</span></button></div>
      ${!isAdmin ? `<div class="field full"><div class="callout warning"><b>Forgot your password?</b> Visit the school Admin/Teacher in person and bring your school ID. The Admin can verify you and remove your old account so you can register again with the same student ID. Password reset is handled in person by the school Admin/Teacher.</div></div>` : ''}
    </form>`;
  }
  function registrationFormHTML(isCorrection = false) {
    const studentId = registrationDraft.studentId || '';
    const selectedYear = registrationDraft.yearLevel || '';
    const correctionApp = isCorrection ? state.applications.find(a => a.id === correctionApplicationId) : null;
    const correctionNote = correctionApp?.correctionNote || 'Please review and correct the details requested by the Admin/Teacher.';
    const yearOptions = ['SHS', '1st Year', '2nd Year', '3rd Year', '4th Year'];
    return `<form id="registrationForm" novalidate data-correction="${isCorrection ? '1' : '0'}">
      ${isCorrection ? `<div class="callout warning" style="margin-bottom:16px"><b>Correction requested by Admin/Teacher</b><p style="margin:7px 0 0">${h(correctionNote)}</p><small>Your application has NOT been deleted. Your Student ID, password, and captured photos are retained for this correction request. Correct the information and resubmit.</small></div>` : ''}
      <div class="eyebrow" style="margin:4px 0 10px">01 · Verification photos</div>
      <div class="split-grid" style="margin-bottom:16px">
        <div class="setting-tile"><div class="section-title"><h4>School ID</h4>${registrationDraft.idPhoto ? '<span class="pill pill-green">Captured</span>' : '<span class="pill pill-amber">Required</span>'}</div><div class="photo-pair"><div class="photo-box"><img id="regIdPreview" src="${registrationDraft.idPhoto || ''}" alt="School ID preview" style="display:${registrationDraft.idPhoto ? 'block' : 'none'}"><div id="regIdPlaceholder" class="empty-state" style="padding:17px;${registrationDraft.idPhoto ? 'display:none' : ''}"><div class="empty-icon">🪪</div><p>Capture your school ID using the live camera.</p></div></div></div><div class="form-actions"><button class="btn btn-secondary btn-small" type="button" data-action="capture-id">▣ ${registrationDraft.idPhoto ? 'Retake school ID' : 'Capture school ID'}</button><button class="btn btn-outline btn-small" type="button" data-action="retake-id" ${registrationDraft.idPhoto ? '' : 'disabled'}>↻ Retake</button></div><div id="ocrMessage" class="${registrationDraft.schoolMatch ? 'school-match' : 'school-match needs-review'}" style="margin-top:10px">${registrationDraft.idPhoto ? h(registrationDraft.ocrText || 'ID captured. Text recognition pending or unavailable; Admin must review it.') : 'The camera will look for Ave Maria College text. Admin will verify the ID before approval.'}</div></div>
        <div class="setting-tile"><div class="section-title"><h4>Live selfie</h4>${registrationDraft.selfie ? '<span class="pill pill-green">Captured</span>' : '<span class="pill pill-amber">Required</span>'}</div><div class="photo-box"><img id="regSelfiePreview" src="${registrationDraft.selfie || ''}" alt="Selfie preview" style="display:${registrationDraft.selfie ? 'block' : 'none'}"><div id="regSelfiePlaceholder" class="empty-state" style="padding:17px;${registrationDraft.selfie ? 'display:none' : ''}"><div class="empty-icon">🙂</div><p>Capture a fresh selfie with the front camera.</p></div></div><div class="form-actions"><button class="btn btn-secondary btn-small" type="button" data-action="capture-selfie">◎ ${registrationDraft.selfie ? 'Retake live selfie' : 'Capture live selfie'}</button><button class="btn btn-outline btn-small" type="button" data-action="retake-selfie" ${registrationDraft.selfie ? '' : 'disabled'}>↻ Retake</button></div><div class="field-help" style="margin-top:9px">No gallery upload. The Admin will compare the photo manually with the school record.</div></div>
      </div>
      <div class="eyebrow" style="margin:18px 0 10px">02 · Student details</div>
      <div class="field-grid">
        <div class="field"><label>Student ID number <span class="required">*</span></label><input class="input" name="studentId" id="regStudentId" value="${h(studentId)}" required placeholder="e.g. 2024-002" autocomplete="off" ${isCorrection ? 'readonly aria-readonly="true"' : ''}><small class="field-help">${isCorrection ? 'Your Student ID is kept the same during correction.' : 'This becomes your account ID and cannot be changed after approval.'}</small></div>
        <div class="field"><label>Complete name <span class="required">*</span></label><input class="input" name="name" id="regName" value="${h(registrationDraft.name || '')}" required placeholder="Name as shown on school ID"></div>
        <div class="field"><label>Program / Course <span class="required">*</span></label><input class="input" name="program" id="regProgram" value="${h(registrationDraft.program || '')}" required placeholder="e.g. BS Information Technology"></div>
        <div class="field"><label>School level <span class="required">*</span></label><select class="select" name="yearLevel" id="regYear" required><option value="">Select school level</option>${yearOptions.map(v => `<option value="${h(v)}" ${selectedYear === v ? 'selected' : ''}>${h(v)}</option>`).join('')}</select></div>
        ${isCorrection ? `<div class="field full"><div class="callout success">Your existing password stays the same. After you resubmit, the application returns to Pending review. You can sign in with the same Student ID and password to check its status.</div></div>` : `<div class="field"><label>Create password <span class="required">*</span></label><input class="input" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div><div class="field"><label>Confirm password <span class="required">*</span></label><input class="input" name="confirmPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Type password again"></div><div class="field full"><label class="check-row"><input type="checkbox" name="consent" required> <span>I understand that the school Admin/Teacher will review these details for verification and that my verification photos will be handled according to school procedures.</span></label></div>`}
        <div class="field full"><div class="callout warning"><b>Important:</b> The OCR text check is only a suggestion and may be wrong. Even if Ave Maria College is not detected, the Admin must verify the physical school ID before approval.</div></div>
        <div class="field full"><button class="btn btn-primary" type="submit" style="width:100%">${isCorrection ? 'Resubmit corrected application →' : 'Submit for Admin approval →'}</button>${isCorrection ? '' : '<button class="btn btn-outline" type="button" style="width:100%;margin-top:8px" data-action="reset-registration">Clear form</button>'}</div>
      </div>
    </form>`;
  }
  function wireRegistrationForm() {
    const form = $('#registrationForm'); if (!form) return;
    ['studentId','name','program','yearLevel'].forEach(key => {
      const input = form.elements[key]; input?.addEventListener('input', () => { registrationDraft[key] = input.value; });
      input?.addEventListener('change', () => { registrationDraft[key] = input.value; });
    });
  }

  function renderStudent() {
    const visibleItems = state.items.filter(i => i.status !== 'returned' && i.status !== 'deleted' && i.type === studentTab);
    const lostCount = state.items.filter(i => i.type === 'lost' && i.status !== 'returned' && i.status !== 'deleted').length;
    const foundCount = state.items.filter(i => i.type === 'found' && i.status !== 'returned' && i.status !== 'deleted').length;
    const search = window.finditStudentSearchValue || '';
    const category = window.finditStudentCategoryValue || 'all';
    const filtered = visibleItems.filter(item => {
      const hay = `${item.name} ${item.description} ${item.location} ${item.category} ${item.ref}`.toLowerCase();
      return (!search || hay.includes(search.toLowerCase())) && (category === 'all' || item.category === category);
    });
    appRoot.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Student portal</div><h1 style="margin:8px 0 7px;font-size:clamp(26px,3vw,36px)">Good day, ${h(currentUser.name.split(' ')[0])} <span style="color:var(--gold)">✦</span></h1><p>Browse campus reports and reconnect with your belongings.</p></div><div class="panel" style="padding:9px 12px;display:flex;align-items:center;gap:10px"><span class="initial-badge">${h(initials(currentUser.name))}</span><div><strong style="font-size:11px">${h(currentUser.name)}</strong><div class="tiny muted">${h(currentUser.program)} · <span class="mono">${h(currentUser.studentId)}</span></div></div></div></div>
      <div class="student-banner"><div class="banner-symbol">✦</div><div><strong>Your campus, a little easier.</strong><span>Browse reports and visit the Admin/Teacher if you recognize an item.</span></div></div>
      <nav class="portal-nav" aria-label="Student item navigation"><button type="button" data-action="student-tab" data-tab="lost" class="${studentTab === 'lost' ? 'active' : ''}">⌕ Lost Items <span class="nav-count">${lostCount}</span></button><button type="button" data-action="student-tab" data-tab="found" class="${studentTab === 'found' ? 'active' : ''}">◇ Found Items <span class="nav-count">${foundCount}</span></button></nav>
      ${studentTab === 'lost' ? `<div class="callout warning" style="margin-bottom:17px"><b>If you see an item listed here:</b> if you find it on campus, take it directly to the school Admin/Teacher. Do not hand it to another person. Staff will update its status after receiving it.</div>` : `<div class="callout success" style="margin-bottom:17px"><b>Recognize an item?</b> Note its reference number and visit the Admin/Teacher at the school office. Staff will verify ownership and record the handover in person. There is no online claim or release.</div>`}
      <div class="section-title"><div><h2>${studentTab === 'lost' ? 'Lost Items' : 'Found Items'}</h2><p class="muted small">${studentTab === 'lost' ? 'Items reported missing by students and school staff.' : 'Items turned in to the school and kept by authorized staff.'}</p></div><div class="toolbar"><input class="input" id="studentSearch" value="${h(search)}" placeholder="⌕ Search items…" aria-label="Search items"><select class="select" id="studentCategory" aria-label="Filter by category"><option value="all">All categories</option>${Array.from(new Set(visibleItems.map(i => i.category))).sort().map(c => `<option value="${h(c)}" ${category === c ? 'selected' : ''}>${h(c)}</option>`).join('')}</select></div></div>
      ${filtered.length ? `<div class="items-grid">${filtered.map(itemCardHTML).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">${studentTab === 'lost' ? '🔎' : '📦'}</div><h3>No matching items found</h3><p>Try another search or category. If you need help, visit the school Admin/Teacher.</p></div>`}
      <div class="panel panel-pad" style="margin-top:24px;display:flex;align-items:center;gap:12px"><div class="banner-symbol" style="background:#e8fbf3;color:#12916d">✓</div><div><strong style="font-size:12px">Your student ID cannot be changed</strong><p class="muted small" style="margin:4px 0 0">Only your password can be updated in Account settings. For a forgotten password, bring your school ID to the Admin/Teacher.</p></div></div>`;
  }
  function itemCardHTML(item) {
    const found = item.type === 'found';
    const visual = item.photo ? `<img src="${item.photo}" alt="Photo of ${h(item.name)}">` : `<span class="item-emoji">${h(item.emoji || (found ? '📦' : '🔎'))}</span>`;
    return `<article class="item-card"><div class="item-visual" data-type="${found ? 'found' : 'lost'}" data-emoji="${h(item.emoji || '')}">${visual}<span class="item-type-tag ${found ? 'found' : ''}">${found ? 'FOUND ITEM' : 'LOST ITEM'}</span><span class="item-ref">${h(item.ref)}</span></div><div class="item-body"><div class="item-category">${h(item.category)}</div><h3>${h(item.name)}</h3><p class="item-description">${h(item.description)}</p><div class="item-meta"><span>⌖ ${h(item.location)}</span><span>◷ ${h(dateOnly(item.date))}</span></div>${found ? `<div class="item-note">If this belongs to you, bring reference <b>${h(item.ref)}</b> to the Admin/Teacher. They will verify ownership in person.</div>` : `<div class="item-note">If you find this item on campus, please turn it over to the Admin/Teacher immediately so the owner can be notified.</div>`}</div></article>`;
  }

  function adminNavItems() { return [
    ['overview','▦','Dashboard'], ['applications','♙','Student Applications'], ['items','▧','Published Item Reports'], ['handover','✓','Claim & Handover'], ['users','♧','Student Accounts'], ['reports','▤','Activity Logs & Reports'], ['trash','♲','Recycle Bin'], ['settings','⚙','Settings & Backup']
  ]; }
  function renderAdmin() {
    const nav = adminNavItems();
    appRoot.innerHTML = `<div class="dashboard-layout"><aside class="admin-sidebar"><div class="sidebar-label">Admin workspace</div>${nav.map(([id,ico,label]) => `<button class="side-link ${adminTab===id?'active':''}" type="button" data-action="admin-tab" data-tab="${id}"><span class="side-ico">${ico}</span>${label}${id==='applications' && state.applications.length ? `<span class="nav-count" style="margin-left:auto;background:#fff;color:#9b6e0b">${state.applications.length}</span>` : ''}</button>`).join('')}<div class="sidebar-bottom"><b>Ave Maria College</b><br>School Lost &amp; Found<br>Admin workspace</div></aside><div class="admin-content"><div class="mobile-admin-nav">${nav.map(([id,ico,label]) => `<button type="button" data-action="admin-tab" data-tab="${id}" class="${adminTab===id?'active':''}">${ico} ${label}</button>`).join('')}</div>${renderAdminPage()}</div></div>`;
  }
  function renderAdminPage() {
    switch (adminTab) {
      case 'applications': return adminApplicationsHTML();
      case 'items': return adminItemsHTML();
      case 'handover': return adminHandoverHTML();
      case 'users': return adminUsersHTML();
      case 'reports': return adminReportsHTML();
      case 'trash': return adminTrashHTML();
      case 'settings': return adminSettingsHTML();
      default: return adminOverviewHTML();
    }
  }
  function adminOverviewHTML() {
    const pending = state.applications.length; const found = state.items.filter(i => i.type === 'found' && i.status !== 'returned' && i.status !== 'deleted').length; const lost = state.items.filter(i => i.type === 'lost' && i.status !== 'returned' && i.status !== 'deleted').length; const returned = state.items.filter(i => i.status === 'returned').length;
    const recent = state.logs.slice(0, 6);
    return `<div class="page-head"><div><div class="eyebrow">Admin workspace</div><h1>Good day, Administrator</h1><p>Review student access and help return belongings safely.</p></div><div class="head-actions"><button class="btn btn-primary" type="button" data-action="new-item">＋ Publish item</button></div></div>
      <div class="stat-grid"><div class="stat-card stat-blue"><div class="stat-icon">♙</div><div class="stat-num">${pending}</div><div class="stat-label">Pending applications</div><div class="stat-foot">Need Admin review</div></div><div class="stat-card stat-red"><div class="stat-icon">⌕</div><div class="stat-num">${lost}</div><div class="stat-label">Lost reports</div><div class="stat-foot">Awaiting recovery</div></div><div class="stat-card stat-green"><div class="stat-icon">◇</div><div class="stat-num">${found}</div><div class="stat-label">Found items</div><div class="stat-foot">Kept at school</div></div><div class="stat-card stat-gold"><div class="stat-icon">✓</div><div class="stat-num">${returned}</div><div class="stat-label">Items returned</div><div class="stat-foot">Handover recorded</div></div></div>
      <div class="split-grid"><section class="panel panel-pad"><div class="section-title"><div><h3>Needs your attention</h3><p class="muted small">Quick access to key tasks.</p></div></div><div class="info-list"><div class="info-row"><span>Student applications</span><strong>${pending} pending</strong></div><div class="info-row"><span>Items waiting to be claimed</span><strong>${found}</strong></div><div class="info-row"><span>Recycle bin</span><strong>${state.trash.length} records</strong></div></div><div class="form-actions"><button class="btn btn-secondary btn-small" data-action="admin-tab" data-tab="applications">Review applications</button><button class="btn btn-outline btn-small" data-action="admin-tab" data-tab="items">Manage published items</button></div></section><section class="panel panel-pad"><div class="section-title"><div><h3>Recent activity</h3><p class="muted small">Latest actions in this browser.</p></div><button class="btn btn-outline btn-small" data-action="admin-tab" data-tab="reports">View all</button></div>${recent.length ? recent.map(logRowHTML).join('') : `<p class="muted small">No activity yet.</p>`}</section></div>
      `;
  }
  function logRowHTML(log) { return `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #eef1f6"><span class="initial-badge" style="width:28px;height:28px;font-size:10px">${log.role==='admin'?'A':log.role==='student'?'S':'✓'}</span><div style="flex:1;min-width:0"><strong style="font-size:11px">${h(log.action)}</strong><div class="muted tiny" style="margin-top:3px;line-height:1.5">${h(log.details)}</div><div class="subtle tiny" style="margin-top:4px">${h(dateTime(log.at))}</div></div></div>`; }
  function adminApplicationsHTML() {
    const apps = [...state.applications].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    const needsReview = apps.filter(a => a.status === 'pending').length;
    const needsCorrection = apps.filter(a => a.status === 'correction').length;
    return `<div class="page-head"><div><div class="eyebrow">Access control</div><h1>Student Applications</h1><p>Check ID details and images before activating a student account.</p></div><div style="display:flex;gap:7px;flex-wrap:wrap">${pill(`${needsReview} pending`, 'pending')}${pill(`${needsCorrection} correction`, 'correction')}</div></div><div class="callout warning" style="margin-bottom:16px">Approval is manual. OCR is not identity proof. Confirm the Ave Maria College school ID and student details against school records. <b>Request Correction keeps the application and frees no Student ID.</b> Reject removes the pending application and releases the Student ID for a new application.</div>${apps.length ? `<div class="panel panel-pad"><div class="section-title"><div><h3>Application review queue</h3><p class="muted small">Correction requests keep the application, password, form details, and photos so the student can sign in with the same ID to correct and resubmit.</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Applicant</th><th>School ID</th><th>Program</th><th>Status</th><th>School text check</th><th>Submitted</th><th>Review</th></tr></thead><tbody>${apps.map(a => `<tr><td>${userBadge({name:a.name,studentId:a.studentId})}<div class="tiny muted" style="margin:6px 0 0 42px">${h(a.yearLevel || '')}</div></td><td class="mono">${h(a.studentId)}</td><td>${h(a.program)}</td><td>${pill(formatStatus(a.status),a.status)}${a.status==='correction'?`<div class="tiny muted" style="margin-top:5px">${h(a.correctionNote||'Changes requested')}</div>`:''}</td><td>${a.schoolMatch ? '<span class="pill pill-green">Ave Maria text seen</span>' : '<span class="pill pill-amber">Manual check</span>'}</td><td>${h(dateTime(a.resubmittedAt||a.createdAt))}</td><td><div class="table-actions"><button class="btn btn-primary" data-action="review-application" data-id="${h(a.id)}">${a.status==='correction'?'Review correction':'Review'}</button></div></td></tr>`).join('')}</tbody></table></div></div>` : `<div class="empty-state"><div class="empty-icon">✓</div><h3>No pending applications</h3><p>New student registrations will appear here when submitted in this browser.</p></div>`}`;
  }
  function adminItemsHTML() {
    const items = [...state.items].sort((a,b) => new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
    return `<div class="page-head"><div><div class="eyebrow">Campus records</div><h1>Published Item Reports</h1><p>Post and update lost or found items. Record every handover before releasing an item.</p></div><div class="head-actions"><button class="btn btn-primary" data-action="new-item">＋ Publish item</button></div></div><div class="toolbar" style="margin-bottom:15px"><input class="input" id="adminItemSearch" placeholder="Search reference, item, location…" value="${h(window.finditAdminItemSearchValue||'')}"><select class="select" id="adminItemFilter"><option value="all">All reports</option><option value="lost" ${(window.finditAdminItemFilterValue||'all')==='lost'?'selected':''}>Lost</option><option value="found" ${(window.finditAdminItemFilterValue||'all')==='found'?'selected':''}>Found</option><option value="returned" ${(window.finditAdminItemFilterValue||'all')==='returned'?'selected':''}>Returned</option></select></div><div id="adminItemList">${adminItemTableHTML(items)}</div>`;
  }
  function adminItemTableHTML(items) {
    const search = window.finditAdminItemSearchValue || ''; const filter = window.finditAdminItemFilterValue || 'all';
    const arr = items.filter(i => {
      const txt = `${i.ref} ${i.name} ${i.category} ${i.location} ${i.description}`.toLowerCase();
      return (!search || txt.includes(search.toLowerCase())) && (filter==='all' || (filter==='returned' ? i.status==='returned' : i.type===filter && i.status!=='returned'));
    });
    if (!arr.length) return `<div class="empty-state"><div class="empty-icon">📦</div><h3>No reports match</h3><p>Publish a new item or change the search filter.</p></div>`;
    return `<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Item / Reference</th><th>Type</th><th>Location</th><th>Status</th><th>Last update</th><th>Actions</th></tr></thead><tbody>${arr.map(i => {
      const returned = i.status === 'returned';
      const isFound = i.type === 'found' && !returned;
      const visual = i.photo ? `<img src="${i.photo}" class="photo-thumb" alt="">` : `<span class="initial-badge">${h(i.emoji||'📦')}</span>`;
      const typeBadge = i.type==='lost' ? '<span class="pill pill-red">Lost</span>' : '<span class="pill pill-green">Found</span>';
      const claimTitle = returned ? 'This item has already been returned.' : isFound ? 'Open the handover form for this Found item.' : 'This item is still Lost. Mark it as Found before recording a claim.';
      const claimLabel = returned ? 'Returned' : 'Claim';
      return `<tr data-item-row="${h(i.id)}"><td><div class="user-cell">${visual}<span><strong>${h(i.name)}</strong><small class="mono">${h(i.ref)}</small></span></div></td><td>${typeBadge}</td><td>${h(i.location)}</td><td>${pill(formatStatus(i.status),i.status)}</td><td>${h(dateTime(i.updatedAt||i.createdAt))}</td><td><div class="item-admin-actions">
        <button type="button" class="btn btn-soft-green" data-action="mark-found" data-id="${h(i.id)}" ${returned?'disabled':''} aria-label="Mark ${h(i.name)} as found" title="${isFound?'Already Found — click to confirm the available status.':'Move this report to Found Items and make it available for claim.'}">${isFound?'Mark as Found ✓':'Mark as Found'}</button>
        <button type="button" class="btn btn-amber" data-action="mark-lost" data-id="${h(i.id)}" ${returned?'disabled':''} aria-label="Mark ${h(i.name)} as lost" title="${i.type==='lost'&&!returned?'Already Lost — click to confirm the lost status.':'Move this report to Lost Items. Claims will be blocked until it is Found.'}">${i.type==='lost'&&!returned?'Mark as Lost ✓':'Mark as Lost'}</button>
        <button type="button" class="btn btn-primary" data-action="claim-item" data-id="${h(i.id)}" ${returned?'disabled':''} title="${h(claimTitle)}">${claimLabel}</button>
        <button type="button" class="btn btn-outline" data-action="edit-item" data-id="${h(i.id)}" ${returned?'disabled':''}>Edit</button>
        <button type="button" class="btn btn-danger" data-action="delete-item" data-id="${h(i.id)}" title="Move this report to the Recycle Bin for 30 days">Delete</button>
      </div></td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  }
  function adminHandoverHTML() {
    return `<div class="page-head"><div><div class="eyebrow">Safe return process</div><h1>Claim & Handover Records</h1><p>The reference number is prefilled by the system. Staff only enter and verify the claimant details.</p></div><button class="btn btn-outline" data-action="admin-tab" data-tab="items">Go to item reports</button></div><div class="callout warning" style="margin-bottom:16px"><b>Before releasing an item:</b> check the claimant's physical school ID and verify ownership. The form records staff confirmation; it does not verify identity automatically.</div><div class="panel panel-pad"><div class="section-title"><div><h3>Recorded handovers</h3><p class="muted small">Items disappear from student Lost/Found pages as soon as a handover is recorded.</p></div><span class="pill pill-blue">${state.claims.length} total</span></div>${state.claims.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item reference</th><th>Item</th><th>Claimant</th><th>Student ID</th><th>Released by</th><th>Handover date</th><th>Notes</th></tr></thead><tbody>${state.claims.slice().sort((a,b)=>new Date(b.handedOverAt)-new Date(a.handedOverAt)).map(c=>`<tr><td class="mono"><strong>${h(c.itemRef)}</strong></td><td>${h(c.itemName)}</td><td>${h(c.claimantName)}</td><td class="mono">${h(c.claimantId)}</td><td>${h(c.releasedBy)}</td><td>${h(dateTime(c.handedOverAt))}</td><td>${h(c.notes||'—')}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">🤝</div><h3>No handovers yet</h3><p>Use the Claim button in Published Item Reports to record a verified in-person handover.</p></div>`}</div>`;
  }
  function adminUsersHTML() {
    const students = state.users.filter(u => u.role==='student');
    return `<div class="page-head"><div><div class="eyebrow">Account management</div><h1>Student Accounts</h1><p>Student IDs are read-only. Remove outdated accounts after checking the school ID in person.</p></div><span class="pill pill-blue">${getActiveStudents().length} active students</span></div><div class="callout warning" style="margin-bottom:16px"><b>Forgot password?</b> Ask the student to visit the Admin/Teacher with their school ID. After verification, delete the old account; the ID can be used for a new application. Admin-deleted accounts are kept in the recycle bin for up to 30 days in this browser.</div><div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Student ID (read-only)</th><th>Program</th><th>Created</th><th>Account status</th><th>Action</th></tr></thead><tbody>${students.length ? students.map(u=>`<tr><td>${userBadge(u)}</td><td class="mono">${h(u.studentId)}</td><td>${h(u.program)}</td><td>${h(dateOnly(u.createdAt))}</td><td>${pill(u.status==='active'?'Active':'Disabled',u.status)}</td><td><div class="table-actions"><button class="btn btn-danger" data-action="delete-user" data-id="${h(u.id)}">Delete account</button></div></td></tr>`).join('') : `<tr><td colspan="6" class="table-empty">No student accounts.</td></tr>`}</tbody></table></div></div>`;
  }
  function adminReportsHTML() {
    return `<div class="page-head"><div><div class="eyebrow">Reports & audit</div><h1>Activity Logs & Reports</h1><p>Export a Word-compatible report or CSV to review system actions.</p></div></div><div class="report-cards"><div class="report-card"><div class="r-ico">▤</div><h4>Activity log report</h4><p>Recent admin/student actions with time, actor, role, action, and notes.</p><button class="btn btn-primary btn-small" data-action="export-activity-doc">Download Word report</button></div><div class="report-card"><div class="r-ico">📦</div><h4>Published item report</h4><p>All current, returned, and archived item reference numbers and statuses.</p><button class="btn btn-primary btn-small" data-action="export-items-doc">Download Word report</button></div><div class="report-card"><div class="r-ico">↧</div><h4>CSV activity log</h4><p>Open the exported comma-separated report in Excel or another spreadsheet app.</p><button class="btn btn-outline btn-small" data-action="export-activity-csv">Download CSV</button></div><div class="report-card"><div class="r-ico">🧾</div><h4>Handover report</h4><p>Reference, item, claimant name and ID, releasing staff, and date.</p><button class="btn btn-outline btn-small" data-action="export-claims-doc">Download Word report</button></div><div class="report-card"><div class="r-ico">💾</div><h4>Data backup</h4><p>Download a JSON copy of the current records.</p><button class="btn btn-outline btn-small" data-action="export-backup">Download backup</button></div><div class="report-card"><div class="r-ico">↥</div><h4>Restore backup</h4><p>Restore a previously downloaded JSON backup.</p><button class="btn btn-outline btn-small" data-action="import-backup">Choose backup file</button></div></div><div class="panel panel-pad" style="margin-top:17px"><div class="section-title"><div><h3>Recent activity</h3><p class="muted small">${state.logs.length} recorded action(s).</p></div><input id="logSearch" class="input" style="max-width:260px" placeholder="Search logs…" value="${h(window.finditLogSearchValue||'')}"></div><div id="logTable">${logTableHTML()}</div></div>`;
  }
  function logTableHTML() {
    const q = (window.finditLogSearchValue||'').toLowerCase(); const rows = state.logs.filter(l => `${l.actor} ${l.role} ${l.action} ${l.details}`.toLowerCase().includes(q)).slice(0,300);
    if (!rows.length) return `<div class="empty-state"><div class="empty-icon">▤</div><h3>No logs found</h3><p>Try a different search term.</p></div>`;
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Details</th></tr></thead><tbody>${rows.map(l=>`<tr><td>${h(dateTime(l.at))}</td><td>${h(l.actor)}</td><td>${h(l.role)}</td><td><strong>${h(l.action)}</strong></td><td>${h(l.details)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function adminTrashHTML() {
    const all = state.trash.slice().sort((a,b)=>new Date(b.deletedAt)-new Date(a.deletedAt));
    const trash = all.filter(t => trashTab === 'accounts' ? t.kind === 'user' : t.kind === 'item');
    const itemCount = all.filter(t=>t.kind==='item').length;
    const accountCount = all.filter(t=>t.kind==='user').length;
    const tabs = `<div class="trash-tabs" role="tablist" aria-label="Recycle Bin type"><button type="button" class="trash-tab ${trashTab==='items'?'active':''}" data-action="trash-tab" data-tab="items">Deleted Items <span>${itemCount}</span></button><button type="button" class="trash-tab ${trashTab==='accounts'?'active':''}" data-action="trash-tab" data-tab="accounts">Deleted Accounts <span>${accountCount}</span></button></div>`;
    return `<div class="page-head"><div><div class="eyebrow">Data recovery</div><h1>Recycle Bin</h1><p>Restore deleted records before their 30-day retention period ends.</p></div><span class="pill pill-amber">${all.length} total records</span></div>${tabs}<div class="panel">${trash.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${trashTab==='accounts'?'Deleted account':'Deleted item'}</th><th>Reference / Student ID</th><th>Deleted at</th><th>Days left</th><th>Actions</th></tr></thead><tbody>${trash.map(t=>{const rec=t.record||{};const label=t.kind==='item'?(rec.name||rec.ref||'Item'):(rec.name||rec.studentId||'Student account');const identity=t.kind==='item'?(rec.ref||''):(rec.studentId||'');const left=Math.max(0,30-Math.floor((Date.now()-new Date(t.deletedAt).getTime())/DAY));return `<tr><td><div class="trash-record"><span class="trash-symbol">${t.kind==='item'?'📦':'♙'}</span><span><strong>${h(label)}</strong><small class="muted" style="display:block;margin-top:4px">${t.kind==='item'?'Item report':'Student account'}</small></span></div></td><td class="mono">${h(identity)}</td><td>${h(dateTime(t.deletedAt))}</td><td>${left}</td><td><div class="table-actions"><button class="btn btn-secondary" data-action="restore-trash" data-id="${h(t.id)}">Restore</button><button class="btn btn-danger" data-action="purge-trash" data-id="${h(t.id)}">Delete forever</button></div></td></tr>`}).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">♲</div><h3>${trashTab==='accounts'?'No deleted accounts':'No deleted items'}</h3><p>${trashTab==='accounts'?'Student accounts removed by Admin or their owner will appear here.':'Deleted item reports will appear here.'}</p></div>`}</div>`;
  }
  function adminSettingsHTML() {
    return `<div class="page-head"><div><div class="eyebrow">Configuration</div><h1>Settings & Backup</h1><p>Manage the Admin username, password, records, and backup.</p></div></div><div class="user-settings-grid"><div class="setting-tile"><div class="stat-icon" style="background:#eef2ff;color:var(--blue)">👤</div><h4>Admin username</h4><p>Change the username used to sign in. Existing sessions remain active.</p><button class="btn btn-primary btn-small" data-action="open-admin-username">Change username</button></div><div class="setting-tile"><div class="stat-icon" style="background:#eef2ff;color:var(--blue)">🔐</div><h4>Admin password</h4><p>Change the Admin password. Use at least 8 characters.</p><button class="btn btn-primary btn-small" data-action="open-password">Change password</button></div><div class="setting-tile"><div class="stat-icon" style="background:#e5faf2;color:#128363">💾</div><h4>Backup / restore</h4><p>Download a local data copy or restore a previously saved backup.</p><div class="form-actions"><button class="btn btn-secondary btn-small" data-action="export-backup">Download JSON</button><button class="btn btn-outline btn-small" data-action="import-backup">Restore backup</button></div></div><div class="setting-tile"><div class="stat-icon" style="background:#fff3db;color:#977017">♲</div><h4>Recycle bin retention</h4><p>Deleted items and accounts stay available for up to 30 days.</p><div class="pill pill-blue">30 days</div><div class="form-actions"><button class="btn btn-outline btn-small" data-action="admin-tab" data-tab="trash">Open Recycle Bin</button></div></div><div class="setting-tile"><div class="stat-icon" style="background:#fff0f3;color:#bd3f56">⚠</div><h4>Reset data</h4><p>Restore the default starting records. This removes current records on this device.</p><button class="btn btn-danger btn-small" data-action="reset-demo">Reset records</button></div></div>`;
  }

  async function handleAppClick(e) {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const action = el.dataset.action;
    if (action === 'auth-student') { authMode='login-student'; correctionApplicationId=''; authNotice=''; registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true}; render(); }
    else if (action === 'auth-admin') { authMode='login-admin'; authNotice=''; render(); }
    else if (action === 'go-register') { authMode='register'; authNotice=''; correctionApplicationId=''; registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true}; render(); }
    else if (action === 'reset-registration') { registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true}; authMode='register'; authNotice=''; render(); }
    else if (action === 'capture-id' || action === 'retake-id') { openCamera('id', async photo => { registrationDraft.idPhoto=photo; registrationDraft.ocrText='Photo captured. Checking school name and ID text…'; registrationDraft.schoolMatch=false; registrationDraft.schoolReview=true; updateRegistrationPhoto('id', photo); setOCRMessage(registrationDraft.ocrText, false); const result=await readIDText(photo); registrationDraft.ocrText=result.message; registrationDraft.schoolMatch=result.schoolMatch; registrationDraft.schoolReview=!result.schoolMatch; if(result.studentId) setRegistrationValue('studentId',result.studentId); if(result.name) setRegistrationValue('name',result.name); if(result.program) setRegistrationValue('program',result.program); setOCRMessage(result.message, result.schoolMatch); }); }
    else if (action === 'capture-selfie' || action === 'retake-selfie') { openCamera('selfie', photo => { registrationDraft.selfie=photo; updateRegistrationPhoto('selfie', photo); }); }
    else if (action === 'student-tab') { studentTab=el.dataset.tab; window.finditStudentSearchValue=''; window.finditStudentCategoryValue='all'; renderStudent(); }
    else if (action === 'admin-tab') { adminTab=el.dataset.tab; dropdownOpen=false; renderAdmin(); }
    else if (action === 'logout') { logout(); }
    else if (action === 'open-password') { dropdownOpen=false; $('#globalUserMenu')?.remove(); openPasswordModal(); }
    else if (action === 'open-admin-username') { dropdownOpen=false; $('#globalUserMenu')?.remove(); openAdminUsernameModal(); }
    else if (action === 'trash-tab') { trashTab=el.dataset.tab==='accounts'?'accounts':'items'; renderAdmin(); }
    else if (action === 'open-student-delete') { dropdownOpen=false; $('#globalUserMenu')?.remove(); openStudentDeleteModal(); }
    else if (action === 'open-admin-settings') { adminTab='settings'; renderAdmin(); dropdownOpen=false; $('#globalUserMenu')?.remove(); }
    else if (action === 'new-item') { openItemModal(); }
    else if (action === 'review-application') { openApplicationReview(el.dataset.id); }
    else if (action === 'approve-application') { approveApplication(el.dataset.id); }
    else if (action === 'reject-application') { purgeApplication(el.dataset.id, 'Rejected'); }
    else if (action === 'correction-application') { openCorrectionRequest(el.dataset.id); }
    else if (action === 'mark-found') { markItemType(el.dataset.id,'found'); }
    else if (action === 'mark-lost') { markItemType(el.dataset.id,'lost'); }
    else if (action === 'claim-item') { openHandoverModal(el.dataset.id); }
    else if (action === 'edit-item') { openItemModal(el.dataset.id); }
    else if (action === 'delete-item') { confirmDeleteItem(el.dataset.id); }
    else if (action === 'delete-user') { confirmDeleteUser(el.dataset.id); }
    else if (action === 'export-activity-doc') { downloadWordReport('FindIT Campus Activity Log', ['Time','Actor','Role','Action','Details'], state.logs.map(l=>[dateTime(l.at),l.actor,l.role,l.action,l.details]),'FindIT-Activity-Log.doc'); }
    else if (action === 'export-items-doc') { downloadWordReport('FindIT Campus Published Item Report', ['Reference','Item','Type','Category','Location','Status','Updated'], state.items.map(i=>[i.ref,i.name,i.type,i.category,i.location,formatStatus(i.status),dateTime(i.updatedAt||i.createdAt)]),'FindIT-Item-Report.doc'); }
    else if (action === 'export-claims-doc') { downloadWordReport('FindIT Campus Claim and Handover Report', ['Reference','Item','Claimant','Student ID','Released by','Date','Notes'],state.claims.map(c=>[c.itemRef,c.itemName,c.claimantName,c.claimantId,c.releasedBy,dateTime(c.handedOverAt),c.notes||'']),'FindIT-Handover-Report.doc'); }
    else if (action === 'export-activity-csv') { downloadCSV('FindIT-Activity-Log.csv',['Time','Actor','Role','Action','Details'],state.logs.map(l=>[dateTime(l.at),l.actor,l.role,l.action,l.details])); }
    else if (action === 'export-backup') { downloadFile('FindIT-Campus-Backup.json',JSON.stringify(state,null,2),'application/json'); toast('Backup downloaded. Keep it private.'); }
    else if (action === 'import-backup') { const input=document.createElement('input'); input.type='file'; input.accept='.json,application/json'; input.onchange=()=>importBackup(input.files?.[0]); input.click(); }
    else if (action === 'restore-trash') { restoreTrash(el.dataset.id); }
    else if (action === 'purge-trash') { confirmPurgeTrash(el.dataset.id); }
    else if (action === 'reset-demo') { confirmResetDemo(); }
    else if (action === 'close-modal') { closeModal(); }
    else if (action === 'modal-backdrop' && e.target.classList.contains('modal-backdrop')) { closeModal(); }
    else if (action === 'cancel-modal') { closeModal(); }
    else if (action === 'confirm-purge-application') { purgeApplication(el.dataset.id,el.dataset.reason); }
    else if (action === 'correction-application-confirm') { openCorrectionRequest(el.dataset.id||$('#modalRoot').dataset.applicationId); }
    else if (action === 'submit-correction-request') { saveCorrectionRequest(); }
    else if (action === 'camera-capture') { captureCameraFrame(); }
    else if (action === 'camera-cancel') { closeModal(); }
    else if (action === 'camera-retake') { retakeCamera(); }
    else if (action === 'camera-use') { useCapturedPhoto(); }
  }
  function updateRegistrationPhoto(kind, photo) {
    const image = $(`#reg${kind==='id'?'Id':'Selfie'}Preview`); const placeholder = $(`#reg${kind==='id'?'Id':'Selfie'}Placeholder`);
    if (image) { image.src=photo; image.style.display='block'; }
    if (placeholder) placeholder.style.display='none';
    const btn = $(`[data-action="retake-${kind}"]`); if (btn) btn.disabled=false;
    const section = image?.closest('.setting-tile'); if (section) { const pill=$('.section-title .pill',section); if(pill){pill.textContent='Captured';pill.className='pill pill-green';} }
  }
  function setRegistrationValue(key, value) {
    if (!value) return;
    if (key === 'studentId' && authMode === 'correction') return;
    registrationDraft[key]=value;
    const input = $(`#reg${key==='studentId'?'StudentId':key==='yearLevel'?'Year':key[0].toUpperCase()+key.slice(1)}`);
    if (input && !String(input.value||'').trim()) input.value=value;
    else if (input && key === 'studentId' && !input.dataset.manuallyEdited) input.value=value;
  }
  function setOCRMessage(message, matched) {
    const el=$('#ocrMessage'); if (!el) return; el.textContent=message; el.className=`${matched?'school-match':'school-match needs-review'}`;
  }
  async function ensureTesseract() {
    if (window.Tesseract) return window.Tesseract;
    if (window._finditTessPromise) return window._finditTessPromise;
    window._finditTessPromise = new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('OCR library failed to load')); s.onerror=()=>reject(new Error('Could not load OCR. Check internet.')); document.head.appendChild(s);
    });
    return window._finditTessPromise;
  }
  async function readIDText(photo) {
    try {
      const Tess=await ensureTesseract(); const result=await Tess.recognize(photo,'eng',{logger:m=>{ if(m.status==='recognizing text') setOCRMessage(`Reading ID text… ${Math.round((m.progress||0)*100)}%`,false); }});
      const text=(result.data?.text||'').replace(/\r/g,'\n'); const normalized=text.toUpperCase().replace(/[^A-Z0-9\n -]/g,' '); const schoolMatch=/AVE\s+MARIA|AVE\s+M[AR1]R?IA|MARIA\s+COLLEGE|AVE\s+MARIA\s+COLLEGE/i.test(normalized);
      const idMatch=normalized.match(/\b(20\d{2}[\s-]*\d{3,6})\b/) || normalized.match(/\b([A-Z]{0,2}\d{4,8})\b/);
      let studentId=idMatch?.[1]?.replace(/\s+/g,'').replace(/(20\d{2})-?([0-9]{3,6})/,'$1-$2')||'';
      let lines=normalized.split('\n').map(s=>s.trim()).filter(Boolean); let name='';
      const nameIndex=lines.findIndex(line=>/^NAME\b/.test(line)||/\bNAME\s*[:\-]/.test(line));
      if(nameIndex>=0){name=lines[nameIndex].replace(/^.*?\bNAME\b\s*[:\-]?\s*/,'').trim(); if(name.length<5&&lines[nameIndex+1]) name=lines[nameIndex+1];}
      if(!name){const candidates=lines.filter(line=>/^[A-Z][A-Z .'-]{5,35}$/.test(line)&&!/(AVE|MARIA|COLLEGE|PROGRAM|BACHELOR|SCIENCE|TECHNOLOGY|INFORMATION|ID NUMBER|COURSE|YEAR|ADDRESS|PHILIPPINES)/.test(line)); name=candidates.find(line=>line.split(/\s+/).length>=2)||'';}
      name=name.replace(/^(NAME\s*[:\-]?\s*)/,'').replace(/[^A-Z .'-]/g,' ').replace(/\s{2,}/g,' ').trim();
      let program='';
      if(/BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY|INFORMATION TECHNOLOGY|\bBSIT\b/.test(normalized)) program='BS Information Technology';
      else if(/HOSPITALITY MANAGEMENT|\bBSHM\b/.test(normalized)) program='BS Hospitality Management';
      else if(/BUSINESS ADMINISTRATION|\bBSBA\b/.test(normalized)) program='BS Business Administration';
      else if(/CRIMINOLOGY|\bBSCRIM\b/.test(normalized)) program='BS Criminology';
      const message=schoolMatch?`Ave Maria College text detected. OCR suggested ${[studentId,name,program].filter(Boolean).length} of 3 details. Check each field; Admin still verifies the ID.`:`School name not clearly detected. OCR suggested ${[studentId,name,program].filter(Boolean).length} of 3 details. Manual Admin review is required.`;
      return {text,message,schoolMatch,studentId,name,program};
    } catch (err) {
      return {text:'',message:'Automatic OCR is unavailable or could not read this photo. Enter the 3 details manually; Admin must verify the school ID.',schoolMatch:false,studentId:'',name:'',program:''};
    }
  }

  async function handleAppSubmit(e) {
    e.preventDefault();
    const form=e.target;
    if(form.id==='loginForm') return loginSubmit(form);
    if(form.id==='registrationForm') return registerSubmit(form);
  }
  async function loginSubmit(form) {
    const fd=new FormData(form); const loginId=String(fd.get('loginId')||'').trim(); const password=String(fd.get('password')||'');
    if(!loginId||!password){toast('Enter your account ID and password.','error');return;}
    const role=authMode==='login-admin'?'admin':'student';
    const key=`${role}:${loginId.toUpperCase()}`; const failure=state.failedLogins[key];
    if(failure?.lockedUntil && Date.now()<failure.lockedUntil){const seconds=Math.ceil((failure.lockedUntil-Date.now())/1000);toast(`Too many failed attempts. Try again in ${seconds} seconds.`, 'error');return;}
    const hash=await hashPassword(password);
    if(role==='student'){
      const application=state.applications.find(a=>a.studentId.toUpperCase()===loginId.toUpperCase() && ['pending','correction'].includes(a.status));
      if(application && application.passwordHash===hash){
        delete state.failedLogins[key]; saveState(); authNotice='';
        if(application.status==='correction'){
          correctionApplicationId=application.id;
          registrationDraft={studentId:application.studentId,name:application.name,program:application.program,yearLevel:application.yearLevel,idPhoto:application.idPhoto||'',selfie:application.selfie||'',ocrText:application.ocrText||'',schoolMatch:!!application.schoolMatch,schoolReview:!application.schoolMatch};
          authMode='correction'; render(); toast('The Admin/Teacher requested a correction. Your saved application is still here. Correct the details and resubmit.', 'warn', 6500); return;
        }
        authMode='login-student'; authNotice=`Your application for Student ID ${application.studentId} is still Pending review. You cannot open the student portal until the Admin/Teacher approves it.`;
        render(); toast('Your application is still pending Admin/Teacher review.', 'warn', 6000); return;
      }
    }
    const user=state.users.find(u=>u.role===role && (role==='admin'?u.username.toLowerCase()===loginId.toLowerCase():u.studentId.toUpperCase()===loginId.toUpperCase()) && u.status==='active');
    if(!user||user.passwordHash!==hash){
      const f=state.failedLogins[key]||{count:0,lockedUntil:0}; f.count=(f.count||0)+1;
      if(f.count>=3){f.count=0;f.lockedUntil=Date.now()+60000;state.failedLogins[key]=f;saveState();toast('Three incorrect attempts. Login is locked for 1 minute.','error',5500);}
      else{state.failedLogins[key]=f;saveState();toast(`Incorrect account ID or password. ${3-f.count} attempt(s) remaining before a 1-minute lock.`, 'error',5000);}
      logAction('Login failed','Invalid credentials were entered.','Unknown',role);saveState();return;
    }
    delete state.failedLogins[key]; authNotice=''; currentUser=user; sessionStorage.setItem(SESSION_KEY,user.id); dropdownOpen=false;
    logAction('Login successful',`${user.role==='admin'?'Admin':'Student'} signed in.`,user.name,user.role); saveState();
    if(user.role==='admin')adminTab='overview';else studentTab='lost';render();toast(`Welcome, ${user.name.split(' ')[0]}!`);
  }
  async function registerSubmit(form) {
    if(authMode==='correction') return submitCorrectedApplication(form);
    const fd=new FormData(form); const studentId=String(fd.get('studentId')||'').trim().toUpperCase(); const name=String(fd.get('name')||'').trim(); const program=String(fd.get('program')||'').trim(); const yearLevel=String(fd.get('yearLevel')||'').trim(); const password=String(fd.get('password')||''); const confirm=String(fd.get('confirmPassword')||'');
    if(!registrationDraft.idPhoto||!registrationDraft.selfie){toast('Capture both the school ID and live selfie before submitting.','error');return;}
    if(!studentId||!name||!program||!yearLevel){toast('Complete Student ID, name, program, and school level.','error');return;}
    if(!['SHS','1st Year','2nd Year','3rd Year','4th Year'].includes(yearLevel)){toast('Choose SHS or college Year 1–4.','error');return;}
    if(!/^[A-Z0-9-]{4,20}$/.test(studentId)){toast('Use a valid Student ID number with letters, numbers, and dashes only.','error');return;}
    if(idInUse(studentId)){toast('This Student ID already has an active account or application. Use the existing application login or ask Admin.','error',5500);return;}
    if(password.length<8){toast('Use a password with at least 8 characters.','error');return;}
    if(password!==confirm){toast('Passwords do not match.','error');return;}
    if(!fd.get('consent')){toast('Please check the system privacy acknowledgment.','error');return;}
    const button=$('button[type="submit"]',form); if(button){button.disabled=true;button.textContent='Submitting application…';}
    const passHash=await hashPassword(password);
    const app={id:randomId('application'),studentId,name,program,yearLevel,passwordHash:passHash,idPhoto:registrationDraft.idPhoto,selfie:registrationDraft.selfie,ocrText:registrationDraft.ocrText||'',schoolMatch:!!registrationDraft.schoolMatch,schoolReview:!registrationDraft.schoolMatch,status:'pending',correctionNote:'',createdAt:nowISO()};
    state.applications.push(app); logAction('Student application submitted',`Pending application submitted for Student ID ${studentId}.`,name,'student');saveState();registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true};
    authMode='login-student'; authNotice=`Application submitted for Student ID ${studentId}. Keep your Student ID and password. If Admin requests a correction, sign in with the same credentials to update it.`;render(); toast('Application submitted. Wait for Admin/Teacher approval before opening the student portal.');
  }
  async function submitCorrectedApplication(form) {
    const app=state.applications.find(a=>a.id===correctionApplicationId && a.status==='correction');
    if(!app){toast('The correction request could not be found. Sign in again or contact the Admin/Teacher.','error');authMode='login-student';render();return;}
    const fd=new FormData(form); const name=String(fd.get('name')||'').trim(); const program=String(fd.get('program')||'').trim(); const yearLevel=String(fd.get('yearLevel')||'').trim();
    if(!registrationDraft.idPhoto||!registrationDraft.selfie){toast('Keep or recapture both the school ID and selfie before resubmitting.','error');return;}
    if(!name||!program||!yearLevel){toast('Complete name, program, and school level.','error');return;}
    if(!['SHS','1st Year','2nd Year','3rd Year','4th Year'].includes(yearLevel)){toast('Choose SHS or college Year 1–4.','error');return;}
    // The Student ID and password remain the same during a correction. Only editable profile details/photos are updated.
    app.name=name; app.program=program; app.yearLevel=yearLevel; app.idPhoto=registrationDraft.idPhoto; app.selfie=registrationDraft.selfie; app.ocrText=registrationDraft.ocrText||app.ocrText||''; app.schoolMatch=!!registrationDraft.schoolMatch; app.schoolReview=!app.schoolMatch; app.status='pending'; app.resubmittedAt=nowISO(); app.lastCorrectionNote=app.correctionNote||''; app.correctionNote='';
    logAction('Student corrected application resubmitted',`Student ID ${app.studentId} corrected and returned to Pending review.`,app.name,'student'); saveState();
    const id=app.studentId; correctionApplicationId=''; registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true}; authMode='login-student'; authNotice=`Your corrected application for Student ID ${id} has been resubmitted. It is Pending review. Your application information has been kept, and you can sign in with the same Student ID and password to check its status.`;
    render(); toast('Corrections saved. Your application is back in the Admin/Teacher review queue.','success',6500);
  }
  function logout() { if(currentUser) logAction('Logged out',`${currentUser.role==='admin'?'Admin':'Student'} signed out.`,currentUser.name,currentUser.role);saveState();currentUser=null;sessionStorage.removeItem(SESSION_KEY);dropdownOpen=false;const m=$('#globalUserMenu');if(m)m.remove();authMode='login-student';render();toast('You have signed out.'); }
  function openApplicationReview(id) {
    const a=state.applications.find(x=>x.id===id); if(!a)return;
    const stateNotice=a.status==='correction'?`<div class="callout warning" style="margin-bottom:14px"><b>Correction requested.</b> ${h(a.correctionNote||'Waiting for the student to update the application.')}</div>`:'';
    const body=`${stateNotice}<div class="callout warning" style="margin-bottom:14px"><b>Manual verification required.</b> OCR result: ${h(a.schoolMatch?'School name text was detected.':'School name was not detected reliably.')}. Check the photo and compare the details against an official school record. Do not rely on OCR alone.</div><div class="split-grid"><div class="field"><label>School ID photo</label><img class="review-preview" style="width:100%;max-height:240px" src="${a.idPhoto}" alt="Captured school ID"><div class="field-help">OCR text: ${h(a.ocrText||'No OCR text')}</div></div><div class="field"><label>Live selfie</label><img class="review-preview" style="width:100%;max-height:240px" src="${a.selfie}" alt="Captured selfie"><div class="field-help">Compare with the school record where allowed by school policy.</div></div></div><div class="divider"></div><div class="info-list"><div class="info-row"><span>Student ID (fixed after approval)</span><strong class="mono">${h(a.studentId)}</strong></div><div class="info-row"><span>Complete name</span><strong>${h(a.name)}</strong></div><div class="info-row"><span>Program</span><strong>${h(a.program)}</strong></div><div class="info-row"><span>School level</span><strong>${h(a.yearLevel)}</strong></div><div class="info-row"><span>Status</span><strong>${h(formatStatus(a.status))}</strong></div><div class="info-row"><span>Submitted / updated</span><strong>${h(dateTime(a.resubmittedAt||a.createdAt))}</strong></div></div><label class="check-row" style="margin-top:14px"><input type="checkbox" id="verifiedSchoolId"><span>I verified the school ID and student details with an authorized school record. The OCR result alone is not proof of identity.</span></label>`;
    modal(`Review ${a.studentId}`,body,`${modalButtons([{label:'Request correction',action:'correction-application-confirm',class:'btn-amber'},{label:'Reject and release ID',action:'reject-application-confirm',class:'btn-danger'},{label:'Approve student',action:'approve-application-modal',class:'btn-primary'}])}`);
    $('#modalRoot').dataset.applicationId=id;
    $$('[data-action="correction-application-confirm"],[data-action="reject-application-confirm"],[data-action="approve-application-modal"]',modalRoot).forEach(b=>{b.dataset.id=id;});
  }
  function approveApplication(id) {
    const a=state.applications.find(x=>x.id===id); if(!a)return;
    const checkbox=$('#verifiedSchoolId'); if(checkbox && !checkbox.checked){toast('Check the verification box after confirming the school ID.','error');return;}
    if(idInUse(a.studentId,a.id)){toast('That Student ID is already active. Review the existing account first.','error');return;}
    state.users.push({id:randomId('user'),username:a.studentId,studentId:a.studentId,name:a.name,program:a.program,yearLevel:a.yearLevel,role:'student',passwordHash:a.passwordHash,status:'active',createdAt:a.createdAt,approvedAt:nowISO(),schoolVerified:true});
    state.applications=state.applications.filter(x=>x.id!==id); logAction('Student approved',`Student ID ${a.studentId} approved. Verification photos removed from the system after review.`,currentUser.name,'admin'); saveState(); closeModal();renderAdmin();toast('Student approved. Verification photos have been removed from the application record.');
  }
  function openCorrectionRequest(id) {
    const a=state.applications.find(x=>x.id===id);if(!a)return;
    const body=`<form id="correctionNoteForm" novalidate><div class="callout warning" style="margin-bottom:13px">The application, Student ID, password, details, and photos will be kept. The student can sign in with the same Student ID and password to correct and resubmit.</div><div class="field"><label>What must the student correct? <span class="required">*</span></label><textarea class="textarea" name="correctionNote" required minlength="3" placeholder="Example: Please correct your complete name to match the school ID and retake the blurry selfie.">${h(a.correctionNote||'')}</textarea></div></form>`;
    modal(`Request correction · ${a.studentId}`,body,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Send correction request',action:'submit-correction-request',class:'btn-primary'}]));
    $('#modalRoot').dataset.applicationId=id;
  }
  function saveCorrectionRequest() {
    const form=$('#correctionNoteForm');if(!form)return;
    const note=String(new FormData(form).get('correctionNote')||'').trim();const id=$('#modalRoot').dataset.applicationId;const a=state.applications.find(x=>x.id===id);
    if(!a)return;
    if(note.length<3){toast('Please enter a clear correction note for the student.','error');return;}
    a.status='correction';a.correctionNote=note;a.correctionRequestedAt=nowISO();
    logAction('Correction requested for student application',`Student ID ${a.studentId} was asked to correct the application. Existing application data was preserved.`,currentUser.name,'admin');saveState();closeModal();renderAdmin();toast('Correction requested. The application and Student ID are kept; the student can sign in to correct and resubmit.','success',6500);
  }
  function purgeApplication(id, reason) {
    const a=state.applications.find(x=>x.id===id); if(!a)return;
    // Rejection removes this pending application in the system so the same Student ID may be used to apply again.
    state.applications=state.applications.filter(x=>x.id!==id);logAction(`Application ${reason.toLowerCase()}`,`Rejected application details removed. Student ID released for a new application.`,currentUser?.name||'Admin','admin',false);saveState();closeModal();renderAdmin();toast(`${reason}: application removed. The student can apply again using the same ID.`, 'success',6000);
  }
  function markItemType(id,type) {
    if(currentUser?.role!=='admin'){toast('Only the Admin/Teacher can update item status.','error');return;}
    const item=state.items.find(i=>i.id===id);
    if(!item){toast('This item report could not be found. Refresh the list and try again.','error');return;}
    if(item.status==='returned'){toast('This item has already been returned and its record is locked. Review it in Claim & Handover.','warn',5500);return;}
    if(!['lost','found'].includes(type)){toast('Unknown item status.','error');return;}
    const priorType=item.type; const priorStatus=item.status; const expectedStatus=type==='lost'?'lost':'available';
    const alreadyCorrect=priorType===type && priorStatus===expectedStatus;
    item.type=type;
    item.status=expectedStatus;
    item.updatedAt=nowISO();
    window.finditAdminItemFilterValue='all';
    if(alreadyCorrect){
      logAction('Item status confirmed',`${item.ref} · ${item.name} remains ${type==='found'?'Found / Available for claim':'Lost'}.`,currentUser.name,'admin');
      saveState(); renderAdmin();
      toast(type==='found'?'Status checked: this item is Found and available for claim.':'Status checked: this item is Lost. Claiming is blocked until it is marked Found.','success',5000);
      return;
    }
    logAction(type==='found'?'Item marked as found':'Item marked as lost',`${item.ref} · ${item.name} moved from ${priorType} (${priorStatus}) to ${type} (${expectedStatus}).`,currentUser.name,'admin');
    if(!saveState()){
      item.type=priorType; item.status=priorStatus;
      renderAdmin();
      toast('The change could not be saved to this browser. Export a backup or remove large old photos, then try again.','error',6500);
      return;
    }
    renderAdmin();
    toast(type==='found'?'Updated: this report is now in Found Items and can be claimed.':'Updated: this report is now in Lost Items. A claim will be blocked until it is marked Found.','success',5000);
  }
  function openItemModal(id='') {
    const item=id?state.items.find(i=>i.id===id):null;
    if(id&&!item)return;
    const body=`<form id="itemForm" novalidate><input type="hidden" name="itemId" value="${h(item?.id||'')}"><div class="field-grid"><div class="field"><label>Record type <span class="required">*</span></label><select class="select" name="type" required><option value="lost" ${!item||item.type==='lost'?'selected':''}>Lost item report</option><option value="found" ${item?.type==='found'?'selected':''}>Found item (kept at school)</option></select></div><div class="field"><label>Category <span class="required">*</span></label><select class="select" name="category" required>${['IDs and Cards','Electronics','Bottles and Tumblers','Bags','Books and School Supplies','Clothing','Personal Items','Other'].map(v=>`<option ${item?.category===v?'selected':''}>${h(v)}</option>`).join('')}</select></div><div class="field full"><label>Item name <span class="required">*</span></label><input class="input" name="name" required value="${h(item?.name||'')}" placeholder="e.g. Blue water bottle"></div><div class="field"><label>Location <span class="required">*</span></label><input class="input" name="location" required value="${h(item?.location||'')}" placeholder="Building, room, or area"></div><div class="field"><label>Date reported <span class="required">*</span></label><input class="input" type="date" name="date" required value="${h(item?.date||new Date().toISOString().slice(0,10))}"></div><div class="field full"><label>Description <span class="required">*</span></label><textarea class="textarea" name="description" required placeholder="Visible details to help identify the item">${h(item?.description||'')}</textarea></div><div class="field"><label>Item photo (optional)</label><input class="input" type="file" name="photo" accept="image/jpeg,image/png,image/webp"><small class="field-help">Images are resized for this browser. Do not include personal ID details in item photos.</small></div><div class="field"><label>Reference number</label><input class="input" value="${h(item?.ref||'Generated automatically on save')}" readonly></div><div class="field full"><div class="callout warning">For a lost report, tell students to bring any recovered item directly to the Admin/Teacher. For found items, only mark them available after staff have physically received them.</div></div></div></form>`;
    modal(item?'Edit item report':'Publish an item report',body,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:item?'Save changes':'Publish report',action:'submit-item-form',class:'btn-primary'}]));
  }
  async function handleModalSubmit(e) {
    e.preventDefault(); const form=e.target;
    if(form.id==='itemForm') return submitItemForm(form);
    if(form.id==='handoverForm') return submitHandover(form);
    if(form.id==='passwordForm') return submitPasswordChange(form);
    if(form.id==='adminUsernameForm') return submitAdminUsername(form);
    if(form.id==='selfDeleteForm') return submitSelfDelete(form);
    if(form.id==='correctionNoteForm') { e.preventDefault(); return saveCorrectionRequest(); }
  }
  async function fileToDataURL(file,max=600) {
    if(!file)return '';
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){throw new Error('Choose a JPG, PNG, or WebP image.');}
    if(file.size>8*1024*1024)throw new Error('Image must be smaller than 8 MB.');
    const url=URL.createObjectURL(file);
    try {
      const img=new Image(); img.src=url; await img.decode(); const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.74);
    } finally { URL.revokeObjectURL(url); }
  }
  async function submitItemForm(form) {
    const fd=new FormData(form);const id=String(fd.get('itemId')||'');const name=String(fd.get('name')||'').trim();const type=String(fd.get('type')||'lost');const category=String(fd.get('category')||'Other');const location=String(fd.get('location')||'').trim();const date=String(fd.get('date')||'');const description=String(fd.get('description')||'').trim();
    if(!name||!location||!date||!description){toast('Complete all required item fields.','error');return;}
    let photo=''; try{if(fd.get('photo')?.size)photo=await fileToDataURL(fd.get('photo'),640);}catch(err){toast(err.message,'error');return;}
    if(id){const item=state.items.find(x=>x.id===id);if(!item)return;Object.assign(item,{name,type,category,location,date,description,status:item.status==='returned'?'returned':type==='lost'?'lost':'available',updatedAt:nowISO()});if(photo)item.photo=photo;window.finditAdminItemFilterValue='all';logAction('Item report updated',`${item.ref} · ${item.name} · ${type}.`,currentUser.name,'admin');toast('Item report updated.');}
    else {const prefix=type==='lost'?'LS':'FD';const ref=nextReference(prefix);const emoji=({ 'IDs and Cards':'🪪','Electronics':'💻','Bottles and Tumblers':'🧴','Bags':'🎒','Books and School Supplies':'📗','Clothing':'🧥','Personal Items':'📦' })[category]||'📦';state.items.push({id:randomId('item'),ref,type,name,category,location,date,description,emoji,photo,status:type==='lost'?'lost':'available',createdAt:nowISO(),updatedAt:nowISO(),createdBy:currentUser.name,returnedAt:'',claimantName:'',claimantId:''});logAction('Item report published',`${ref} · ${name} · ${type}.`,currentUser.name,'admin');toast('Item report published.');}
    saveState();closeModal();renderAdmin();
  }
  function nextReference(prefix) {
    const year=new Date().getFullYear();const max=state.items.reduce((n,i)=>{const m=String(i.ref).match(new RegExp(`^${prefix}-${year}-(\\d+)$`));return m?Math.max(n,Number(m[1])):n;},0);return `${prefix}-${year}-${String(max+1).padStart(4,'0')}`;
  }
  function openHandoverModal(id) {
    if(currentUser?.role!=='admin'){toast('Only the Admin/Teacher can record an item handover.','error');return;}
    const item=state.items.find(i=>i.id===id);
    if(!item){toast('This item report could not be found. Refresh Published Item Reports and try again.','error');return;}
    if(item.status==='returned'){toast('This item has already been returned. Review its existing record in Claim & Handover.','warn',5000);return;}
    if(item.type!=='found'){
      toast(`Cannot claim ${item.ref}: this report is still marked LOST. First click “Mark as Found” after the school receives the physical item.`, 'warn', 6500);
      return;
    }
    // Treat the record type as the source of truth for old demo records whose status field drifted.
    if(!['available','found'].includes(item.status)){
      const oldStatus=item.status; item.status='available'; item.updatedAt=nowISO();
      logAction('Found item status repaired',`${item.ref} was Found but had an inconsistent status (${oldStatus}); status restored to Available for claim.`,currentUser.name,'admin');
      saveState();
    }
    const body=`<div class="callout warning" style="margin-bottom:14px"><b>Before releasing the item:</b> check the claimant's physical school ID and verify ownership. The reference number is fixed by the system, so staff do not need to type it.</div><form id="handoverForm" novalidate><input type="hidden" name="itemId" value="${h(item.id)}"><div class="field-grid"><div class="field full"><label>Item reference number (fixed)</label><input class="input mono" name="itemRef" value="${h(item.ref)}" readonly></div><div class="field full"><label>Item name</label><input class="input" value="${h(item.name)}" readonly></div><div class="field"><label>Claimant full name <span class="required">*</span></label><input class="input" name="claimantName" required placeholder="Enter claimant's name"></div><div class="field"><label>Student ID number <span class="required">*</span></label><input class="input mono" name="claimantId" required placeholder="e.g. 2024-002"></div><div class="field"><label>Released by (Admin/Teacher)</label><input class="input" name="releasedBy" value="${h(currentUser.name)}" readonly></div><div class="field"><label>Handover date/time</label><input class="input" type="datetime-local" name="handedOverAt" value="${new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}" readonly></div><div class="field full"><label>Handover notes (optional)</label><textarea class="textarea" name="notes" placeholder="Describe ownership verification and item condition"></textarea></div><div class="field full"><label class="check-row"><input type="checkbox" name="verified" required><span>I checked the claimant's physical school ID and confirmed ownership before handover.</span></label></div></div></form>`;
    modal('Claim & Record Handover',body,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Confirm handover & mark returned',action:'submit-handover-form',class:'btn-primary'}]));
  }
  function submitHandover(form) {
    if(currentUser?.role!=='admin'){toast('Only the Admin/Teacher can record handover.','error');return;}
    const fd=new FormData(form);
    if(!fd.get('verified')){toast('Confirm that you checked the physical school ID and ownership.','error');return;}
    const item=state.items.find(i=>i.id===fd.get('itemId'));
    if(!item||item.status==='returned'){toast('This item is no longer available for handover. Check the current item status.','error');closeModal();renderAdmin();return;}
    if(item.type!=='found'){
      toast(`Handover blocked: ${item.ref} is still marked LOST. Mark it as Found only after staff physically receive the item.`, 'error', 6500);return;
    }
    if(!['available','found'].includes(item.status)){item.status='available';}
    const claimantName=String(fd.get('claimantName')||'').trim();
    const claimantId=String(fd.get('claimantId')||'').trim().toUpperCase();
    if(!claimantName||!claimantId){toast('Enter the claimant name and Student ID.','error');return;}
    const claim={id:randomId('handover'),itemId:item.id,itemRef:item.ref,itemName:item.name,claimantName,claimantId,releasedBy:currentUser.name,handedOverAt:new Date(fd.get('handedOverAt')||nowISO()).toISOString(),notes:String(fd.get('notes')||'').trim()};
    const oldItem={...item};
    state.claims.push(claim);item.status='returned';item.returnedAt=claim.handedOverAt;item.claimantName=claimantName;item.claimantId=claimantId;item.updatedAt=nowISO();
    logAction('Item returned and handover recorded',`${item.ref} · ${item.name} handed to ${claimantName} (${claimantId}); released by ${currentUser.name}.`,currentUser.name,'admin');
    if(!saveState()){
      state.claims=state.claims.filter(c=>c.id!==claim.id);Object.assign(item,oldItem);closeModal();renderAdmin();toast('Handover could not be saved. Export a backup or free browser storage, then try again.','error',6500);return;
    }
    closeModal();adminTab='handover';renderAdmin();toast('Handover saved. The item is now Returned and hidden from student Lost/Found pages.');
  }
  function confirmDeleteItem(id) {
    const item=state.items.find(i=>i.id===id);if(!item)return;
    modal('Move item to Recycle Bin',`<div class="callout warning">The item report <b>${h(item.ref)} · ${h(item.name)}</b> will be removed from student pages and moved to the Recycle Bin for 30 days. You can restore it before the retention period ends.</div>`,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Move to Recycle Bin',action:'confirm-delete-item',class:'btn-danger'}]));$('#modalRoot').dataset.itemId=id;const confirmButton=$('[data-action="confirm-delete-item"]',modalRoot);if(confirmButton)confirmButton.dataset.id=id;
  }
  function confirmDeleteUser(id) {
    const user=state.users.find(u=>u.id===id && u.role==='student');if(!user)return;
    modal('Remove student account',`<div class="callout warning">This removes <b>${h(user.name)} (${h(user.studentId)})</b> from active accounts and moves the account to the Recycle Bin for up to 30 days. The Student ID becomes available for a new registration. Ask the student to show their school ID in person before you remove an account.</div>`,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Delete account',action:'confirm-delete-user',class:'btn-danger'}]));$('#modalRoot').dataset.userId=id;const confirmButton=$('[data-action="confirm-delete-user"]',modalRoot);if(confirmButton)confirmButton.dataset.id=id;
  }
  function deleteItemToTrash(id) {const index=state.items.findIndex(i=>i.id===id);if(index<0)return;const record=state.items.splice(index,1)[0];state.trash.push({id:randomId('trash'),kind:'item',record,deletedAt:nowISO(),deletedBy:currentUser.name});logAction('Item moved to Recycle Bin',`${record.ref} · ${record.name}. Retain for up to 30 days.`,currentUser.name,'admin');saveState();closeModal();renderAdmin();toast('Item moved to the Recycle Bin.');}
  function deleteUserToTrash(id) {const index=state.users.findIndex(u=>u.id===id&&u.role==='student');if(index<0)return;const record=state.users.splice(index,1)[0];state.trash.push({id:randomId('trash'),kind:'user',record,deletedAt:nowISO(),deletedBy:currentUser.name});logAction('Student account moved to Recycle Bin',`An Admin-removed student account was archived for up to 30 days.`,currentUser.name,'admin',false);saveState();closeModal();renderAdmin();toast('Student account deleted from active accounts. Student ID can be used for a new registration.');}
  function restoreTrash(id) {const index=state.trash.findIndex(t=>t.id===id);if(index<0)return;const entry=state.trash[index];if(entry.kind==='item'){state.items.push(entry.record);}else{const dup=state.users.some(u=>u.role==='student'&&u.studentId===entry.record.studentId);if(dup){toast('Cannot restore: another active account already uses this Student ID.','error');return;}state.users.push(entry.record);}state.trash.splice(index,1);logAction('Recycle Bin record restored',`${entry.kind==='item'?'Item':'Student account'} restored by Admin.`,currentUser.name,'admin',false);saveState();renderAdmin();toast('Record restored.');}
  function confirmPurgeTrash(id) {const entry=state.trash.find(t=>t.id===id);if(!entry)return;modal('Delete permanently',`<div class="callout danger">This will permanently delete this ${entry.kind==='item'?'item report':'student account'} from this browser. This cannot be undone.</div>`,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Delete forever',action:'confirm-purge-trash',class:'btn-danger'}]));$('#modalRoot').dataset.trashId=id;const confirmButton=$('[data-action="confirm-purge-trash"]',modalRoot);if(confirmButton)confirmButton.dataset.id=id;}
  function purgeTrash(id) {state.trash=state.trash.filter(t=>t.id!==id);logAction('Recycle Bin record permanently deleted','Record permanently removed by Admin.','Admin','admin',false);saveState();closeModal();renderAdmin();toast('Record permanently deleted.');}
  function openAdminUsernameModal() {
    if(currentUser?.role!=='admin'){toast('Only the Admin can change the Admin username.','error');return;}
    const body=`<form id="adminUsernameForm" novalidate><div class="field-grid"><div class="field full"><label>New Admin username <span class="required">*</span></label><input class="input" name="username" required minlength="3" maxlength="24" autocomplete="username" value="${h(currentUser.username||'admin')}" placeholder="3–24 letters, numbers, dot, dash, underscore"><small class="field-help">Use letters, numbers, dots, dashes, or underscores. Your Student ID rules are unchanged.</small></div><div class="field full"><label>Current password <span class="required">*</span></label><input class="input" name="currentPassword" type="password" required autocomplete="current-password"></div></div></form>`;
    modal('Change Admin username',body,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Save username',action:'submit-admin-username',class:'btn-primary'}]));
  }
  async function submitAdminUsername(form) {
    if(currentUser?.role!=='admin'){toast('Only the Admin can change the Admin username.','error');return;}
    const fd=new FormData(form),username=String(fd.get('username')||'').trim(),password=String(fd.get('currentPassword')||'');
    if(!/^[A-Za-z0-9._-]{3,24}$/.test(username)){toast('Username must be 3–24 characters and use only letters, numbers, dots, dashes, or underscores.','error');return;}
    if(await hashPassword(password)!==currentUser.passwordHash){toast('Current password is incorrect.','error');return;}
    const exists=state.users.some(u=>u.role==='admin'&&u.id!==currentUser.id&&String(u.username||'').toLowerCase()===username.toLowerCase());
    if(exists){toast('Another Admin account already uses that username.','error');return;}
    const previous=currentUser.username;currentUser.username=username;
    logAction('Admin username changed',`Admin username changed from ${previous} to ${username}.`,currentUser.name,'admin');saveState();closeModal();render();toast('Admin username updated. Use the new username at your next sign-in.');
  }

  function openPasswordModal() {
    const note=currentUser.role==='student'?'Your Student ID cannot be changed here. If you forget your password, bring your school ID to the Admin/Teacher for in-person verification.':'Change the Admin username from Settings if needed. Keep your sign-in credentials private.'; const body=`<form id="passwordForm" novalidate><div class="field-grid"><div class="field full"><label>Current password <span class="required">*</span></label><input class="input" name="currentPassword" type="password" required autocomplete="current-password"></div><div class="field"><label>New password <span class="required">*</span></label><input class="input" name="newPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div><div class="field"><label>Confirm new password <span class="required">*</span></label><input class="input" name="confirmPassword" type="password" required minlength="8" autocomplete="new-password"></div><div class="field full"><div class="callout warning">${h(note)}</div></div></div></form>`;
    modal('Change password',body,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Save new password',action:'submit-password-form',class:'btn-primary'}]));
  }
  async function submitPasswordChange(form) {
    const fd=new FormData(form);const current=String(fd.get('currentPassword')||''),next=String(fd.get('newPassword')||''),confirm=String(fd.get('confirmPassword')||'');
    if(next.length<8){toast('New password must have at least 8 characters.','error');return;}if(next!==confirm){toast('New passwords do not match.','error');return;}
    if(await hashPassword(current)!==currentUser.passwordHash){toast('Current password is incorrect.','error');return;}
    currentUser.passwordHash=await hashPassword(next);logAction('Password changed','Account password was changed. No password value is stored in the activity log.',currentUser.name,currentUser.role);saveState();closeModal();render();toast('Password updated successfully.');
  }
  function openStudentDeleteModal() {
    const body=`<form id="selfDeleteForm" novalidate><div class="callout danger" style="margin-bottom:15px"><b>Delete your account?</b> Your account will be removed from active accounts and placed in the Deleted Accounts recycle bin for 30 days. Your Student ID can then be used for a new registration.</div><div class="field"><label>Confirm your current password <span class="required">*</span></label><input class="input" type="password" name="password" required autocomplete="current-password"></div></form>`;
    modal('Delete my student account',body,modalButtons([{label:'Keep account',action:'close-modal',class:'btn-outline'},{label:'Delete account',action:'submit-self-delete',class:'btn-danger'}]));
  }
  async function submitSelfDelete(form) {
    const password=String(new FormData(form).get('password')||'');
    if(await hashPassword(password)!==currentUser.passwordHash){toast('Password is incorrect.','error');return;}
    if(!confirm('Move your account to Deleted Accounts for 30 days? Your Student ID can be used for a new application.'))return;
    const record=state.users.find(u=>u.id===currentUser.id);
    if(record){
      state.users=state.users.filter(u=>u.id!==record.id);
      state.trash.push({id:randomId('trash'),kind:'user',record,deletedAt:nowISO(),deletedBy:'Account owner'});
    }
    logAction('Student self-deleted account','Account owner moved their account to Deleted Accounts. Personal details are omitted from this log.','Student','student',false);
    saveState();closeModal();currentUser=null;sessionStorage.removeItem(SESSION_KEY);authMode='login-student';render();toast('Your account was removed from active accounts. It is in Deleted Accounts for up to 30 days, and the Student ID is available for a new application.');
  }
  function confirmResetDemo() {modal('Reset all data',`<div class="callout danger">This removes all accounts, applications, item reports, handovers, activity logs, and recycle-bin entries in this browser, then restores the starting records. This cannot be undone.</div>`,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Reset records',action:'confirm-reset-demo',class:'btn-danger'}]));}
  async function resetDemo() {localStorage.removeItem(STORE_KEY);sessionStorage.removeItem(SESSION_KEY);state=await seedState();saveState();currentUser=null;authMode='login-student';closeModal();render();toast('The starting records have been restored.');}
  async function importBackup(file) {
    if(!file)return;try{const raw=await file.text();const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.users)||!Array.isArray(parsed.items)||!Array.isArray(parsed.applications))throw new Error('This is not a valid FindIT backup.');if(!confirm('Replace all current browser data with this backup?'))return;state=parsed;purgeExpiredTrash();saveState();logAction('Backup restored','A JSON backup was imported.','Admin','admin');saveState();render();toast('Backup restored.');}catch(err){toast(err.message||'Could not restore backup.','error');}
  }
  function downloadFile(filename, content, mime) {const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}
  function downloadWordReport(title, headers, rows, filename) {
    const esc=v=>h(v).replace(/\n/g,'<br>');const table=`<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:Arial;font-size:10pt"><thead><tr style="background:#eaf0ff">${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:Arial;color:#192747"><h1>${esc(title)}</h1><p>Ave Maria College · FindIT Campus</p><p>Generated: ${esc(dateTime(nowISO()))}</p>${table}<p style="font-size:9pt;color:#666">Generated report. Verify records according to school procedures before official use.</p></body></html>`;
    downloadFile(filename,html,'application/msword;charset=utf-8');toast('Word-compatible report downloaded. Open the .doc file in Microsoft Word.');
  }
  function downloadCSV(filename,headers,rows) {const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');downloadFile(filename,'\ufeff'+csv,'text/csv;charset=utf-8');toast('CSV report downloaded.');}

  function stopCamera() {
    if(cameraState){
      if(cameraState.stream)cameraState.stream.getTracks().forEach(t=>t.stop());
      cameraState=null;
    }
  }
  function openCamera(kind, callback, preferredFacing = '') {
    if(!navigator.mediaDevices?.getUserMedia){toast('Camera access needs a supported browser over HTTPS or localhost.','error',6500);return;}
    stopCamera();
    const fixedFacing=kind==='id'?'environment':'user';
    cameraState={kind,callback,stream:null,facing:preferredFacing||fixedFacing,captured:null,video:null,canvas:null,flashOn:false};
    const isId=kind==='id';
    modalRoot.innerHTML=`<div class="camera-modal" data-action="camera-backdrop"><section class="camera-dialog ${isId?'capture-id-dialog':'capture-selfie-dialog'}" role="dialog" aria-modal="true" aria-label="${isId?'School ID camera':'Selfie camera'}"><div class="camera-stage ${isId?'id':'selfie'}" id="cameraStage"><video id="cameraVideo" class="camera-video ${isId?'':'mirrored'}" playsinline autoplay muted></video><div class="camera-dim" aria-hidden="true"></div><div class="viewfinder ${isId?'id-frame':'selfie'}" id="cameraViewfinder">${['tl','tr','bl','br'].map(c=>`<span class="corner ${c}"></span>`).join('')}</div></div><header class="camera-head"><div><div class="eyebrow">LIVE CAMERA · ${isId?'SCHOOL ID':'SELFIE'}</div><h3>${isId?'Capture your school ID':'Capture your live selfie'}</h3><p>${isId?'Fit the full horizontal ID inside the frame. Keep all four corners visible and avoid glare.':'Keep the phone upright. Center your face inside the portrait oval and look toward the front camera.'}</p></div><button class="close-x" data-action="camera-cancel" type="button" aria-label="Close camera">×</button></header><div class="camera-status" id="cameraStatus"><span class="status-dot"></span><span id="cameraStatusText">Connecting to camera…</span></div><div class="camera-bottom"><div class="camera-guidance" id="cameraGuidance">${isId?'Align the ID inside the frame':'Center your face inside the oval'}</div><div class="camera-controls"><button class="btn btn-outline camera-aux" type="button" data-action="camera-flash" id="cameraFlashBtn">⚡ Flash</button><button class="btn btn-outline" type="button" data-action="camera-cancel">Cancel</button><button class="btn btn-primary" type="button" data-action="camera-capture" id="cameraCaptureBtn">● Capture photo</button></div></div></section></div>`;
    startCameraStream();
  }
  async function startCameraStream() {
    if(!cameraState)return;
    const cam=cameraState;const video=$('#cameraVideo',modalRoot);if(!video)return;cam.video=video;
    const isId=cam.kind==='id';
    const status=$('#cameraStatusText',modalRoot);const captureButton=$('#cameraCaptureBtn',modalRoot);
    if(captureButton)captureButton.disabled=true;
    if(!window.isSecureContext && location.hostname!=='localhost' && location.hostname!=='127.0.0.1'){
      if(status)status.textContent='Camera needs HTTPS. Open the secure website in Chrome or Safari.';
      toast('Camera access requires HTTPS or localhost. Open the secure FindIT Campus link in Chrome or Safari.','error',7000);return;
    }
    const primary={audio:false,video:{facingMode:{ideal:cam.facing},width:{ideal:isId?1920:1080},height:{ideal:isId?1080:1920},frameRate:{ideal:30,max:30}}};
    try{
      try{cam.stream=await navigator.mediaDevices.getUserMedia(primary);}
      catch(firstErr){
        // Some mobile cameras reject preferred resolution hints. Retry using the camera preference only.
        cam.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:cam.facing}}});
      }
      if(cameraState!==cam){cam.stream?.getTracks().forEach(t=>t.stop());return;}
      video.srcObject=cam.stream;video.autoplay=true;video.playsInline=true;video.muted=true;
      video.style.objectFit='cover';video.style.objectPosition='50% 50%';
      video.style.transform=(cam.kind==='selfie'&&cam.facing==='user')?'scaleX(-1)':'none';
      await video.play();
      if(!video.videoWidth||!video.videoHeight){await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Camera did not provide a video frame in time.')),8000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);resolve();},{once:true});video.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('Camera video could not load.'));},{once:true});});}
      if(cameraState!==cam)return;
      const track=cam.stream.getVideoTracks()[0];const caps=track?.getCapabilities?.()||{};const flashButton=$('#cameraFlashBtn',modalRoot);
      if(flashButton&&!caps.torch)flashButton.hidden=true;
      if(status)status.textContent=isId?`Rear camera live · ${video.videoWidth}×${video.videoHeight} · align the full ID inside the frame.`:`Front camera live · ${video.videoWidth}×${video.videoHeight} · center your face inside the oval.`;
      if(captureButton)captureButton.disabled=false;
    }catch(err){
      if(status)status.textContent='Camera could not open. Allow camera access, close other apps using it, and try again.';
      if(captureButton)captureButton.disabled=true;
      toast(`Camera could not start (${err.name||'camera error'}). Use Chrome/Safari over HTTPS, allow camera permission, and close other camera apps.`, 'error',8000);
    }
  }
  function cropVisibleFrameToDataURL(cam) {
    const video=cam?.video, frame=$('#cameraViewfinder',modalRoot);
    if(!video||!frame||video.readyState<2||!video.videoWidth||!video.videoHeight)throw new Error('The camera is not ready yet. Wait until the preview says Camera live and try again.');
    const vw=video.videoWidth,vh=video.videoHeight;
    const videoRect=video.getBoundingClientRect(),frameRect=frame.getBoundingClientRect();
    if(!videoRect.width||!videoRect.height||!frameRect.width||!frameRect.height)throw new Error('The capture frame is not ready. Close and reopen the camera, then try again.');
    // Match CSS object-fit: cover. The source crop is computed from the actual DOM rectangles,
    // not guessed offsets, so the saved image corresponds to the visible viewfinder.
    const fit=getComputedStyle(video).objectFit||'cover';
    const objectPosition=getComputedStyle(video).objectPosition||'50% 50%';
    let scale,renderedWidth,renderedHeight;
    if(fit==='contain')scale=Math.min(videoRect.width/vw,videoRect.height/vh);else scale=Math.max(videoRect.width/vw,videoRect.height/vh);
    renderedWidth=vw*scale;renderedHeight=vh*scale;
    // This camera UI intentionally uses centered object-position. Calculate the offsets from the actual
    // rendered size so the crop maps from CSS pixels into raw video pixels without stretching.
    const posParts=objectPosition.split(/\s+/);
    const posFraction=(value)=>{if(!value||value==='center')return 0.5;if(value==='left'||value==='top')return 0;if(value==='right'||value==='bottom')return 1;const n=parseFloat(value);return Number.isFinite(n)?Math.max(0,Math.min(1,n/100)):0.5;};
    const overflowX=Math.max(0,renderedWidth-videoRect.width)*posFraction(posParts[0]);
    const overflowY=Math.max(0,renderedHeight-videoRect.height)*posFraction(posParts[1]||'50%');
    const left=frameRect.left-videoRect.left,top=frameRect.top-videoRect.top;
    const displayedSX=(left+overflowX)/scale,displayedSY=(top+overflowY)/scale;
    const sw=frameRect.width/scale,sh=frameRect.height/scale;
    const mirrored=cam.kind==='selfie'&&cam.facing==='user';
    let sx=mirrored ? vw-(displayedSX+sw) : displayedSX;
    let sy=displayedSY;
    // Clamp crop to real pixels, adjusting width/height if a mobile browser rounds layout values.
    sx=Math.max(0,Math.min(vw-1,sx));sy=Math.max(0,Math.min(vh-1,sy));
    const cropW=Math.max(1,Math.min(vw-sx,sw)),cropH=Math.max(1,Math.min(vh-sy,sh));
    const output=document.createElement('canvas');
    const outputWidth=cam.kind==='id'?1580:1200;
    // Preserve the exact viewfinder ratio; never force a standard ratio that differs from the on-screen frame.
    const frameAspect=frameRect.width/frameRect.height;
    const outputHeight=Math.max(1,Math.round(outputWidth/frameAspect));
    output.width=outputWidth;output.height=outputHeight;
    const ctx=output.getContext('2d',{alpha:false});if(!ctx)throw new Error('Could not prepare the photo. Please retake it.');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(mirrored){ctx.save();ctx.translate(outputWidth,0);ctx.scale(-1,1);ctx.drawImage(video,sx,sy,cropW,cropH,0,0,outputWidth,outputHeight);ctx.restore();}
    else ctx.drawImage(video,sx,sy,cropW,cropH,0,0,outputWidth,outputHeight);
    return output.toDataURL('image/jpeg',cam.kind==='id'?.94:.92);
  }
  async function toggleCameraFlash() {
    const cam=cameraState;if(!cam?.stream)return;
    const track=cam.stream.getVideoTracks()[0];const caps=track?.getCapabilities?.()||{};
    if(!caps.torch){toast('Flash is not supported by this camera or browser.','warn');return;}
    try{cam.flashOn=!cam.flashOn;await track.applyConstraints({advanced:[{torch:cam.flashOn}]});const btn=$('#cameraFlashBtn',modalRoot);if(btn){btn.classList.toggle('active',cam.flashOn);btn.textContent=cam.flashOn?'⚡ Flash On':'⚡ Flash';} }
    catch(err){cam.flashOn=false;toast('The camera flash could not be changed on this device.','warn');}
  }
  function captureCameraFrame() {
    const cam=cameraState;if(!cam)return;
    try { cam.captured=cropVisibleFrameToDataURL(cam); }
    catch(err){toast(err.message||'Could not capture the frame. Try again.','error');return;}
    cam.stream?.getTracks().forEach(t=>t.stop());cam.stream=null;
    const review=document.createElement('div');review.className=`camera-review ${cam.kind==='id'?'id-review':'selfie-review'}`;
    review.innerHTML=`<div class="review-capture-badge">PHOTO CAPTURED</div><h3>${cam.kind==='id'?'Review your school ID':'Review your selfie'}</h3><p class="review-help">This is the exact crop from inside the ${cam.kind==='id'?'landscape ID frame':'portrait face guide'}.</p><img class="review-preview ${cam.kind==='id'?'id-preview':'selfie-preview'}" src="${cam.captured}" alt="Captured ${cam.kind==='id'?'school ID':'selfie'}"><div class="camera-controls review-controls"><button class="btn btn-outline" type="button" data-action="camera-retake">↻ Retake</button><button class="btn btn-primary" type="button" data-action="camera-use">✓ Use Photo</button></div>`;
    const dialog=$('.camera-dialog',modalRoot);const stage=$('.camera-stage',dialog);stage?.remove();$('.camera-head',dialog)?.remove();$('.camera-status',dialog)?.remove();$('.camera-bottom',dialog)?.remove();dialog?.appendChild(review);
  }
  async function retakeCamera() {
    if(!cameraState)return;const kind=cameraState.kind,callback=cameraState.callback,facing=kind==='id'?'environment':'user';stopCamera();modalRoot.innerHTML='';openCamera(kind,callback,facing);
  }
  function useCapturedPhoto() {if(!cameraState?.captured)return;const cam=cameraState,photo=cam.captured,callback=cam.callback;stopCamera();modalRoot.innerHTML='';callback?.(photo);}
  function setupEvents() {
    appRoot.addEventListener('click', handleAppClick);
    appRoot.addEventListener('submit', handleAppSubmit);
    modalRoot.addEventListener('submit', handleModalSubmit);
    modalRoot.addEventListener('click', async e => {
      const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;
      if(a==='close-modal'||a==='cancel-modal'||(a==='modal-backdrop'&&e.target.classList.contains('modal-backdrop'))||a==='camera-cancel'){closeModal();return;}
      if(a==='approve-application-modal'){approveApplication(el.dataset.id||$('#modalRoot').dataset.applicationId);return;}
      if(a==='reject-application-confirm'){purgeApplication(el.dataset.id||$('#modalRoot').dataset.applicationId,'Rejected');return;}
      if(a==='correction-application-confirm'){openCorrectionRequest(el.dataset.id||$('#modalRoot').dataset.applicationId);return;}
      if(a==='submit-correction-request'){saveCorrectionRequest();return;}
      if(a==='confirm-delete-item'){deleteItemToTrash(el.dataset.id||$('#modalRoot').dataset.itemId);return;}
      if(a==='confirm-delete-user'){deleteUserToTrash(el.dataset.id||$('#modalRoot').dataset.userId);return;}
      if(a==='confirm-purge-trash'){purgeTrash(el.dataset.id||$('#modalRoot').dataset.trashId);return;}
      if(a==='confirm-reset-demo'){await resetDemo();return;}
      if(a==='submit-item-form'){const f=$('#itemForm');if(f)submitItemForm(f);return;}
      if(a==='submit-handover-form'){const f=$('#handoverForm');if(f)submitHandover(f);return;}
      if(a==='submit-password-form'){const f=$('#passwordForm');if(f)submitPasswordChange(f);return;}
      if(a==='submit-admin-username'){const f=$('#adminUsernameForm');if(f)submitAdminUsername(f);return;}
      if(a==='submit-self-delete'){const f=$('#selfDeleteForm');if(f)submitSelfDelete(f);return;}
      if(a==='camera-capture'){captureCameraFrame();return;}
      if(a==='camera-flash'){toggleCameraFlash();return;}
      if(a==='camera-retake'){retakeCamera();return;}
      if(a==='camera-use'){useCapturedPhoto();return;}
    });
    appRoot.addEventListener('input',e=>{
      if(e.target.id==='studentSearch'){window.finditStudentSearchValue=e.target.value;const pos=e.target.selectionStart;renderStudent();const s=$('#studentSearch');if(s){s.focus();s.setSelectionRange(pos,pos);} }
      if(e.target.id==='adminItemSearch'){window.finditAdminItemSearchValue=e.target.value;const box=$('#adminItemList');if(box)box.innerHTML=adminItemTableHTML([...state.items]);}
      if(e.target.id==='logSearch'){window.finditLogSearchValue=e.target.value;const box=$('#logTable');if(box)box.innerHTML=logTableHTML();}
      if(e.target.name==='studentId'&&e.target.closest('#registrationForm')){registrationDraft.studentId=e.target.value;e.target.dataset.manuallyEdited='1';}
      if(e.target.name==='name'&&e.target.closest('#registrationForm'))registrationDraft.name=e.target.value;
      if(e.target.name==='program'&&e.target.closest('#registrationForm'))registrationDraft.program=e.target.value;
    });
    appRoot.addEventListener('change',e=>{
      if(e.target.id==='studentCategory'){window.finditStudentCategoryValue=e.target.value;renderStudent();}
      if(e.target.id==='adminItemFilter'){window.finditAdminItemFilterValue=e.target.value;const box=$('#adminItemList');if(box)box.innerHTML=adminItemTableHTML([...state.items]);}
    });
    profileButton.addEventListener('click',showUserMenu);
    profileButton.parentElement.addEventListener('click', handleAppClick);
    document.addEventListener('click',e=>{if(dropdownOpen&&!e.target.closest('#globalUserMenu')&&!e.target.closest('#profileButton')){dropdownOpen=false;$('#globalUserMenu')?.remove();}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(cameraState)closeModal();else if(modalRoot.innerHTML)closeModal();}});
    installBtn.addEventListener('click',async()=>{
      if(pendingInstallPrompt){pendingInstallPrompt.prompt();const choice=await pendingInstallPrompt.userChoice;pendingInstallPrompt=null;if(choice?.outcome==='accepted'){localStorage.setItem('finditInstalledFlag','1');installBtn.hidden=true;toast('FindIT Campus installation accepted.');}return;}
      showInstallInstructions();
    });
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pendingInstallPrompt=e;refreshInstallButton();});
    window.addEventListener('appinstalled',()=>{pendingInstallPrompt=null;localStorage.setItem('finditInstalledFlag','1');installBtn.hidden=true;toast('FindIT Campus is installed.');});
    if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){navigator.serviceWorker.register('sw.js').catch(()=>{});}
  }
  function showInstallInstructions(){modal('Install FindIT Campus',`<div class="callout success">Install FindIT Campus on your phone for an app-like window and a home-screen icon.</div><div class="info-list" style="margin-top:12px"><div class="info-row"><span>Android (Chrome)</span><strong>Menu ⋮ → Install app / Add to Home screen</strong></div><div class="info-row"><span>iPhone (Safari)</span><strong>Share → Add to Home Screen</strong></div></div><p class="muted small" style="margin:12px 0 0">If the install prompt is not available, use the browser menu. OCR needs an internet connection. Data sharing requires a connected server.</p>`,modalButtons([{label:'Got it',action:'close-modal',class:'btn-primary'}]));}
  function refreshInstallButton(){const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;if(standalone||localStorage.getItem('finditInstalledFlag')==='1'){installBtn.hidden=true;}else{installBtn.hidden=false;}}
  function doInstallPromptAccepted(){localStorage.setItem('finditInstalledFlag','1');installBtn.hidden=true;}

  async function init() {
    state=loadState();
    if(!state||!Array.isArray(state.users)||!Array.isArray(state.items)) {state=await seedState();saveState();}
    if(!Array.isArray(state.applications))state.applications=[];
    if(!Array.isArray(state.trash))state.trash=[];
    if(!Array.isArray(state.claims))state.claims=[];
    if(!Array.isArray(state.logs))state.logs=[];
    if(!state.failedLogins)state.failedLogins={};
    if(!state.settings)state.settings={retentionDays:30};
    // Reconcile legacy records so Claim can only operate on found items that are available.
    state.items.forEach(item=>{if(item.status!=='returned'){item.status=item.type==='found'?'available':'lost';}});
    state.users.forEach(user=>{if(user.role==='admin'&&!user.username)user.username='admin';if(user.role==='student'&&!user.studentId)user.studentId=user.username||'';});
    purgeExpiredTrash();saveState();
    const sessionId=sessionStorage.getItem(SESSION_KEY);if(sessionId){currentUser=state.users.find(u=>u.id===sessionId&&u.status==='active')||null;if(!currentUser)sessionStorage.removeItem(SESSION_KEY);}
    if(currentUser?.role==='admin')adminTab='overview';
    $('#yearNow').textContent=new Date().getFullYear();setupEvents();render();
  }
  init().catch(err=>{console.error(err);appRoot.innerHTML='<div class="panel panel-pad"><h2>FindIT Campus could not start</h2><p>Please reload the page. If browser storage is disabled, allow local storage for this site.</p></div>';});
})();
