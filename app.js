/* FindIT Campus — enhanced browser-only demo. No server/database is used. */
(() => {
  'use strict';
  const STORE_KEY = 'finditCampusDemoFinal_v1';
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
  let pendingInstallPrompt = null;
  let dropdownOpen = false;
  let registrationDraft = { idPhoto: '', selfie: '', ocrText: '', schoolMatch: false, schoolReview: true };
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
    // Demo fallback only. Production password hashing must happen on the PHP server.
    return `demo-${btoa(unescape(encodeURIComponent(text)))}`;
  }
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }
    catch { return null; }
  }
  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      toast('Browser storage is full. Remove old demo photos or reset the demo data.', 'error', 6500);
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
        { id: randomId('log'), at: nowISO(), actor: 'System', role: 'system', action: 'Demo initialized', details: 'Sample data created for demonstration.' }
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
      ? `<button data-action="open-password">🔐 Change admin password</button><button data-action="open-admin-settings">⚙️ Settings & backup</button><button data-action="logout">↗ Sign out</button>`
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
    const isRegister = authMode === 'register';
    const isAdmin = authMode === 'login-admin';
    const authTitle = isRegister ? 'Create your student account' : isAdmin ? 'Admin sign in' : 'Welcome back';
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
          <div class="eyebrow">${isRegister ? 'Student registration' : isAdmin ? 'Authorized staff' : 'Welcome to FindIT'}</div>
          <h2>${h(authTitle)}</h2>
          <p class="muted" style="line-height:1.7;font-size:12px">${isRegister ? 'Capture your school ID and live selfie, review the details, then wait for Admin/Teacher approval.' : isAdmin ? 'Sign in to review student applications and manage school lost-and-found records.' : 'Sign in to browse the campus lost and found items.'}</p>
          ${!isRegister ? `<div class="auth-tabs"><button class="auth-tab ${!isAdmin ? 'active' : ''}" type="button" data-action="auth-student">Student</button><button class="auth-tab ${isAdmin ? 'active' : ''}" type="button" data-action="auth-admin">Admin / Teacher</button></div>` : ''}
          ${isRegister ? registrationFormHTML() : loginFormHTML(isAdmin)}
          ${!isAdmin && !isRegister ? `<div class="form-actions"><button class="btn btn-outline" type="button" style="width:100%" data-action="go-register">＋ Create a student account</button></div>` : ''}
          ${isRegister ? `<div class="auth-footer">Already applied or already have an account? <button class="help-link" type="button" data-action="auth-student">Sign in</button></div>` : ''}
          <div class="demo-creds"><b>Demo accounts</b><br>Admin: <span class="mono">admin</span> / <span class="mono">1234</span><br>Student: <span class="mono">2026-0001</span> / <span class="mono">student123</span><div class="tiny" style="margin-top:5px">Demo only. Do not use real student IDs or passwords in public testing.</div></div>
        </section>
      </section>`;
    if (isRegister) wireRegistrationForm();
  }
  function loginFormHTML(isAdmin) {
    return `<form id="loginForm" class="field-grid" novalidate>
      <div class="field full"><label>${isAdmin ? 'Admin username' : 'Student ID number'} <span class="required">*</span></label><input class="input" name="loginId" required autocomplete="username" placeholder="${isAdmin ? 'admin' : 'e.g. 2026-0001'}" ${isAdmin ? 'value=""' : ''}></div>
      <div class="field full"><label>Password <span class="required">*</span></label><input class="input" name="password" type="password" required autocomplete="current-password" placeholder="Enter your password"></div>
      <div class="field full"><button class="btn btn-primary" type="submit" style="width:100%">Sign in <span aria-hidden="true">→</span></button></div>
      ${!isAdmin ? `<div class="field full"><div class="callout warning"><b>Forgot your password?</b> Visit the school Admin/Teacher in person and bring your school ID. The Admin can verify you and remove your old account so you can register again with the same student ID. This demo does not send email resets.</div></div>` : ''}
    </form>`;
  }
  function registrationFormHTML() {
    return `<form id="registrationForm" novalidate>
      <div class="eyebrow" style="margin:4px 0 10px">01 · Verification photos</div>
      <div class="split-grid" style="margin-bottom:16px">
        <div class="setting-tile"><div class="section-title"><h4>School ID</h4>${registrationDraft.idPhoto ? '<span class="pill pill-green">Captured</span>' : '<span class="pill pill-amber">Required</span>'}</div><div class="photo-pair"><div class="photo-box"><img id="regIdPreview" src="${registrationDraft.idPhoto || ''}" alt="School ID preview" style="display:${registrationDraft.idPhoto ? 'block' : 'none'}"><div id="regIdPlaceholder" class="empty-state" style="padding:17px;${registrationDraft.idPhoto ? 'display:none' : ''}"><div class="empty-icon">🪪</div><p>Capture your school ID using the live camera.</p></div></div></div><div class="form-actions"><button class="btn btn-secondary btn-small" type="button" data-action="capture-id">▣ Capture school ID</button><button class="btn btn-outline btn-small" type="button" data-action="retake-id" ${registrationDraft.idPhoto ? '' : 'disabled'}>↻ Retake</button></div><div id="ocrMessage" class="${registrationDraft.schoolMatch ? 'school-match' : 'school-match needs-review'}" style="margin-top:10px">${registrationDraft.idPhoto ? h(registrationDraft.ocrText || 'ID captured. Text recognition pending or unavailable; Admin must review it.') : 'The camera will look for Ave Maria College text. Admin will verify the ID before approval.'}</div></div>
        <div class="setting-tile"><div class="section-title"><h4>Live selfie</h4>${registrationDraft.selfie ? '<span class="pill pill-green">Captured</span>' : '<span class="pill pill-amber">Required</span>'}</div><div class="photo-box"><img id="regSelfiePreview" src="${registrationDraft.selfie || ''}" alt="Selfie preview" style="display:${registrationDraft.selfie ? 'block' : 'none'}"><div id="regSelfiePlaceholder" class="empty-state" style="padding:17px;${registrationDraft.selfie ? 'display:none' : ''}"><div class="empty-icon">🙂</div><p>Capture a fresh selfie with the front camera.</p></div></div><div class="form-actions"><button class="btn btn-secondary btn-small" type="button" data-action="capture-selfie">◎ Capture live selfie</button><button class="btn btn-outline btn-small" type="button" data-action="retake-selfie" ${registrationDraft.selfie ? '' : 'disabled'}>↻ Retake</button></div><div class="field-help" style="margin-top:9px">No gallery upload. The Admin will compare the photo manually with the school record.</div></div>
      </div>
      <div class="eyebrow" style="margin:18px 0 10px">02 · Student details</div>
      <div class="field-grid">
        <div class="field"><label>Student ID number <span class="required">*</span></label><input class="input" name="studentId" id="regStudentId" value="${h(registrationDraft.studentId || '')}" required placeholder="e.g. 2024-002" autocomplete="off"><small class="field-help">This becomes your account ID and cannot be changed after approval.</small></div>
        <div class="field"><label>Complete name <span class="required">*</span></label><input class="input" name="name" id="regName" value="${h(registrationDraft.name || '')}" required placeholder="Name as shown on school ID"></div>
        <div class="field"><label>Program / Course <span class="required">*</span></label><input class="input" name="program" id="regProgram" value="${h(registrationDraft.program || '')}" required placeholder="e.g. BS Information Technology"></div>
        <div class="field"><label>Year level <span class="required">*</span></label><select class="select" name="yearLevel" id="regYear" required><option value="">Select year level</option>${['1st Year','2nd Year','3rd Year','4th Year','5th Year'].map(v => `<option ${registrationDraft.yearLevel === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Create password <span class="required">*</span></label><input class="input" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div>
        <div class="field"><label>Confirm password <span class="required">*</span></label><input class="input" name="confirmPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Type password again"></div>
        <div class="field full"><label class="check-row"><input type="checkbox" name="consent" required> <span>I understand this is a demo application. I agree that the Admin/Teacher may review these details for school verification. I will use sample details for this public demo.</span></label></div>
        <div class="field full"><div class="callout warning"><b>Important:</b> The OCR text check is only a suggestion and may be wrong. Even if Ave Maria College is not detected, you can submit for manual review; the Admin must verify the school ID. Real photos should not be used in this public browser-only demo.</div></div>
        <div class="field full"><button class="btn btn-primary" type="submit" style="width:100%">Submit for Admin approval →</button><button class="btn btn-outline" type="button" style="width:100%;margin-top:8px" data-action="reset-registration">Clear form</button></div>
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
    const search = window.studentSearch || '';
    const category = window.studentCategory || 'all';
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
    appRoot.innerHTML = `<div class="dashboard-layout"><aside class="admin-sidebar"><div class="sidebar-label">Admin workspace</div>${nav.map(([id,ico,label]) => `<button class="side-link ${adminTab===id?'active':''}" type="button" data-action="admin-tab" data-tab="${id}"><span class="side-ico">${ico}</span>${label}${id==='applications' && state.applications.length ? `<span class="nav-count" style="margin-left:auto;background:#fff;color:#9b6e0b">${state.applications.length}</span>` : ''}</button>`).join('')}<div class="sidebar-bottom"><b>Demo environment</b><br>Records are saved only in this browser. They do not sync to the student phone or other computers.</div></aside><div class="admin-content"><div class="mobile-admin-nav">${nav.map(([id,ico,label]) => `<button type="button" data-action="admin-tab" data-tab="${id}" class="${adminTab===id?'active':''}">${ico} ${label}</button>`).join('')}</div>${renderAdminPage()}</div></div>`;
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
      <div class="split-grid"><section class="panel panel-pad"><div class="section-title"><div><h3>Needs your attention</h3><p class="muted small">Quick access to key tasks.</p></div></div><div class="info-list"><div class="info-row"><span>Student applications</span><strong>${pending} pending</strong></div><div class="info-row"><span>Items waiting to be claimed</span><strong>${found}</strong></div><div class="info-row"><span>Recycle bin</span><strong>${state.trash.length} records</strong></div></div><div class="form-actions"><button class="btn btn-secondary btn-small" data-action="admin-tab" data-tab="applications">Review applications</button><button class="btn btn-outline btn-small" data-action="admin-tab" data-tab="items">Manage published items</button></div></section><section class="panel panel-pad"><div class="section-title"><div><h3>Recent activity</h3><p class="muted small">Latest actions in this browser demo.</p></div><button class="btn btn-outline btn-small" data-action="admin-tab" data-tab="reports">View all</button></div>${recent.length ? recent.map(logRowHTML).join('') : `<p class="muted small">No activity yet.</p>`}</section></div>
      <div class="callout warning" style="margin-top:18px"><b>Demo limitation:</b> this page stores records in browser localStorage only. A student account created on another device will not appear here until the project is connected to a shared PHP/MySQL server.</div>`;
  }
  function logRowHTML(log) { return `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #eef1f6"><span class="initial-badge" style="width:28px;height:28px;font-size:10px">${log.role==='admin'?'A':log.role==='student'?'S':'✓'}</span><div style="flex:1;min-width:0"><strong style="font-size:11px">${h(log.action)}</strong><div class="muted tiny" style="margin-top:3px;line-height:1.5">${h(log.details)}</div><div class="subtle tiny" style="margin-top:4px">${h(dateTime(log.at))}</div></div></div>`; }
  function adminApplicationsHTML() {
    const apps = [...state.applications].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    return `<div class="page-head"><div><div class="eyebrow">Access control</div><h1>Student Applications</h1><p>Check ID details and images before activating a student account.</p></div><span class="pill pill-amber">${apps.length} pending</span></div><div class="callout warning" style="margin-bottom:16px">Approval is manual. OCR is not identity proof. Confirm the Ave Maria College school ID and student details against school records. Reject and Request Correction both remove the full pending application and release the student ID for a new registration in this demo.</div>${apps.length ? `<div class="panel panel-pad"><div class="section-title"><div><h3>Pending verification queue</h3><p class="muted small">ID and selfie photos are deleted when an application is approved, rejected, or removed for correction.</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Applicant</th><th>School ID</th><th>Program</th><th>School text check</th><th>Submitted</th><th>Review</th></tr></thead><tbody>${apps.map(a => `<tr><td>${userBadge({name:a.name,studentId:a.studentId})}<div class="tiny muted" style="margin:6px 0 0 42px">${h(a.yearLevel || '')}</div></td><td class="mono">${h(a.studentId)}</td><td>${h(a.program)}</td><td>${a.schoolMatch ? '<span class="pill pill-green">Ave Maria text seen</span>' : '<span class="pill pill-amber">Manual check</span>'}</td><td>${h(dateTime(a.createdAt))}</td><td><div class="table-actions"><button class="btn btn-primary" data-action="review-application" data-id="${h(a.id)}">Review</button></div></td></tr>`).join('')}</tbody></table></div></div>` : `<div class="empty-state"><div class="empty-icon">✓</div><h3>No pending applications</h3><p>New student registrations will appear here when submitted in this browser.</p></div>`}`;
  }
  function adminItemsHTML() {
    const items = [...state.items].sort((a,b) => new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
    return `<div class="page-head"><div><div class="eyebrow">Campus records</div><h1>Published Item Reports</h1><p>Post and update lost or found items. Record every handover before releasing an item.</p></div><div class="head-actions"><button class="btn btn-primary" data-action="new-item">＋ Publish item</button></div></div><div class="toolbar" style="margin-bottom:15px"><input class="input" id="adminItemSearch" placeholder="Search reference, item, location…" value="${h(window.adminItemSearch||'')}"><select class="select" id="adminItemFilter"><option value="all">All reports</option><option value="lost" ${(window.adminItemFilter||'all')==='lost'?'selected':''}>Lost</option><option value="found" ${(window.adminItemFilter||'all')==='found'?'selected':''}>Found</option><option value="returned" ${(window.adminItemFilter||'all')==='returned'?'selected':''}>Returned</option></select></div><div id="adminItemList">${adminItemTableHTML(items)}</div>`;
  }
  function adminItemTableHTML(items) {
    const search = window.adminItemSearch || ''; const filter = window.adminItemFilter || 'all';
    const arr = items.filter(i => {
      const txt = `${i.ref} ${i.name} ${i.category} ${i.location} ${i.description}`.toLowerCase();
      return (!search || txt.includes(search.toLowerCase())) && (filter==='all' || (filter==='returned' ? i.status==='returned' : i.type===filter && i.status!=='returned'));
    });
    if (!arr.length) return `<div class="empty-state"><div class="empty-icon">📦</div><h3>No reports match</h3><p>Publish a new item or change the search filter.</p></div>`;
    return `<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Item / Reference</th><th>Type</th><th>Location</th><th>Status</th><th>Last update</th><th>Actions</th></tr></thead><tbody>${arr.map(i => `<tr><td><div class="user-cell">${i.photo ? `<img src="${i.photo}" class="photo-thumb" alt="">` : `<span class="initial-badge">${h(i.emoji||'📦')}</span>`}<span><strong>${h(i.name)}</strong><small class="mono">${h(i.ref)}</small></span></div></td><td>${i.type==='lost'?'<span class="pill pill-red">Lost</span>':'<span class="pill pill-green">Found</span>'}</td><td>${h(i.location)}</td><td>${pill(formatStatus(i.status),i.status)}</td><td>${h(dateTime(i.updatedAt||i.createdAt))}</td><td><div class="item-admin-actions"><button class="btn btn-soft-green" data-action="mark-found" data-id="${h(i.id)}" ${i.type==='found'||i.status==='returned'?'disabled':''}>Mark as Found</button><button class="btn btn-amber" data-action="mark-lost" data-id="${h(i.id)}" ${i.type==='lost'||i.status==='returned'?'disabled':''}>Mark as Lost</button><button class="btn btn-primary" data-action="claim-item" data-id="${h(i.id)}" ${i.status==='returned'?'disabled':''}>Claim</button><button class="btn btn-outline" data-action="edit-item" data-id="${h(i.id)}" ${i.status==='returned'?'disabled':''}>Edit</button><button class="btn btn-danger" data-action="delete-item" data-id="${h(i.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function adminHandoverHTML() {
    return `<div class="page-head"><div><div class="eyebrow">Safe return process</div><h1>Claim & Handover Records</h1><p>The reference number is prefilled by the system. Staff only enter and verify the claimant details.</p></div><button class="btn btn-outline" data-action="admin-tab" data-tab="items">Go to item reports</button></div><div class="callout warning" style="margin-bottom:16px"><b>Before releasing an item:</b> check the claimant's physical school ID and verify ownership. The demo form records that staff completed the check; it does not verify real identity automatically.</div><div class="panel panel-pad"><div class="section-title"><div><h3>Recorded handovers</h3><p class="muted small">Items disappear from student Lost/Found pages as soon as a handover is recorded.</p></div><span class="pill pill-blue">${state.claims.length} total</span></div>${state.claims.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item reference</th><th>Item</th><th>Claimant</th><th>Student ID</th><th>Released by</th><th>Handover date</th><th>Notes</th></tr></thead><tbody>${state.claims.slice().sort((a,b)=>new Date(b.handedOverAt)-new Date(a.handedOverAt)).map(c=>`<tr><td class="mono"><strong>${h(c.itemRef)}</strong></td><td>${h(c.itemName)}</td><td>${h(c.claimantName)}</td><td class="mono">${h(c.claimantId)}</td><td>${h(c.releasedBy)}</td><td>${h(dateTime(c.handedOverAt))}</td><td>${h(c.notes||'—')}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">🤝</div><h3>No handovers yet</h3><p>Use the Claim button in Published Item Reports to record a verified in-person handover.</p></div>`}</div>`;
  }
  function adminUsersHTML() {
    const students = state.users.filter(u => u.role==='student');
    return `<div class="page-head"><div><div class="eyebrow">Account management</div><h1>Student Accounts</h1><p>Student IDs are read-only. Remove outdated accounts after checking the school ID in person.</p></div><span class="pill pill-blue">${getActiveStudents().length} active students</span></div><div class="callout warning" style="margin-bottom:16px"><b>Forgot password?</b> Ask the student to visit the Admin/Teacher with their school ID. After verification, delete the old account; the ID can be used for a new application. Admin-deleted accounts are kept in the recycle bin for up to 30 days in this browser demo.</div><div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Student ID (read-only)</th><th>Program</th><th>Created</th><th>Account status</th><th>Action</th></tr></thead><tbody>${students.length ? students.map(u=>`<tr><td>${userBadge(u)}</td><td class="mono">${h(u.studentId)}</td><td>${h(u.program)}</td><td>${h(dateOnly(u.createdAt))}</td><td>${pill(u.status==='active'?'Active':'Disabled',u.status)}</td><td><div class="table-actions"><button class="btn btn-danger" data-action="delete-user" data-id="${h(u.id)}">Delete account</button></div></td></tr>`).join('') : `<tr><td colspan="6" class="table-empty">No student accounts.</td></tr>`}</tbody></table></div></div>`;
  }
  function adminReportsHTML() {
    return `<div class="page-head"><div><div class="eyebrow">Reports & audit</div><h1>Activity Logs & Reports</h1><p>Export a Word-compatible report or CSV to review system actions.</p></div></div><div class="report-cards"><div class="report-card"><div class="r-ico">▤</div><h4>Activity log report</h4><p>Recent admin/student actions with time, actor, role, action, and notes.</p><button class="btn btn-primary btn-small" data-action="export-activity-doc">Download Word report</button></div><div class="report-card"><div class="r-ico">📦</div><h4>Published item report</h4><p>All current, returned, and archived item reference numbers and statuses.</p><button class="btn btn-primary btn-small" data-action="export-items-doc">Download Word report</button></div><div class="report-card"><div class="r-ico">↧</div><h4>CSV activity log</h4><p>Open the exported comma-separated report in Excel or another spreadsheet app.</p><button class="btn btn-outline btn-small" data-action="export-activity-csv">Download CSV</button></div><div class="report-card"><div class="r-ico">🧾</div><h4>Handover report</h4><p>Reference, item, claimant name and ID, releasing staff, and date.</p><button class="btn btn-outline btn-small" data-action="export-claims-doc">Download Word report</button></div><div class="report-card"><div class="r-ico">💾</div><h4>Demo JSON backup</h4><p>Download a local JSON copy of this browser's demo data for testing.</p><button class="btn btn-outline btn-small" data-action="export-backup">Download backup</button></div><div class="report-card"><div class="r-ico">↥</div><h4>Restore demo backup</h4><p>Restore a JSON backup created from this demo in this browser.</p><button class="btn btn-outline btn-small" data-action="import-backup">Choose backup file</button></div></div><div class="panel panel-pad" style="margin-top:17px"><div class="section-title"><div><h3>Recent activity</h3><p class="muted small">${state.logs.length} recorded demo action(s).</p></div><input id="logSearch" class="input" style="max-width:260px" placeholder="Search logs…" value="${h(window.logSearch||'')}"></div><div id="logTable">${logTableHTML()}</div></div>`;
  }
  function logTableHTML() {
    const q = (window.logSearch||'').toLowerCase(); const rows = state.logs.filter(l => `${l.actor} ${l.role} ${l.action} ${l.details}`.toLowerCase().includes(q)).slice(0,300);
    if (!rows.length) return `<div class="empty-state"><div class="empty-icon">▤</div><h3>No logs found</h3><p>Try a different search term.</p></div>`;
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Details</th></tr></thead><tbody>${rows.map(l=>`<tr><td>${h(dateTime(l.at))}</td><td>${h(l.actor)}</td><td>${h(l.role)}</td><td><strong>${h(l.action)}</strong></td><td>${h(l.details)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function adminTrashHTML() {
    const trash = state.trash.slice().sort((a,b)=>new Date(b.deletedAt)-new Date(a.deletedAt));
    return `<div class="page-head"><div><div class="eyebrow">Data retention</div><h1>Recycle Bin</h1><p>Deleted item reports and Admin-removed student accounts are kept for 30 days, then permanently removed when the demo is opened.</p></div><span class="pill pill-amber">${trash.length} records</span></div><div class="callout warning" style="margin-bottom:16px">This recycle bin is local to this browser. Keep only fictional demo information here. Expired records are permanently purged on application startup and navigation.</div><div class="panel">${trash.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Deleted record</th><th>Type</th><th>Deleted at</th><th>Days left</th><th>Actions</th></tr></thead><tbody>${trash.map(t=>{const rec=t.record||{};const label=t.kind==='item'?(rec.name||rec.ref||'Item'):(rec.name||rec.studentId||'Student account');const left=Math.max(0,30-Math.floor((Date.now()-new Date(t.deletedAt).getTime())/DAY));return `<tr><td><div class="trash-record"><span class="trash-symbol">${t.kind==='item'?'📦':'♙'}</span><span><strong>${h(label)}</strong><small class="muted" style="display:block;margin-top:4px">${h(t.kind==='item' ? rec.ref : (rec.studentId||''))}</small></span></div></td><td>${t.kind==='item'?'Item report':'Student account'}</td><td>${h(dateTime(t.deletedAt))}</td><td>${left}</td><td><div class="table-actions"><button class="btn btn-secondary" data-action="restore-trash" data-id="${h(t.id)}">Restore</button><button class="btn btn-danger" data-action="purge-trash" data-id="${h(t.id)}">Delete forever</button></div></td></tr>`}).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">♲</div><h3>Recycle bin is empty</h3><p>Deleted items and admin-removed accounts will appear here for up to 30 days.</p></div>`}</div>`;
  }
  function adminSettingsHTML() {
    return `<div class="page-head"><div><div class="eyebrow">Configuration</div><h1>Settings & Backup</h1><p>Manage the Admin password, backup, and demo data.</p></div></div><div class="user-settings-grid"><div class="setting-tile"><div class="stat-icon" style="background:#eef2ff;color:var(--blue)">🔐</div><h4>Admin password</h4><p>Change the Admin password for this browser demo. Use at least 8 characters in the new version.</p><button class="btn btn-primary btn-small" data-action="open-password">Change password</button></div><div class="setting-tile"><div class="stat-icon" style="background:#e5faf2;color:#128363">💾</div><h4>Backup / restore</h4><p>Download or restore the demo JSON file. This is not a substitute for a secure server backup.</p><div class="form-actions"><button class="btn btn-secondary btn-small" data-action="export-backup">Download JSON</button><button class="btn btn-outline btn-small" data-action="import-backup">Restore backup</button></div></div><div class="setting-tile"><div class="stat-icon" style="background:#fff3db;color:#977017">♲</div><h4>Recycle bin retention</h4><p>Deleted items and Admin-removed student accounts are kept up to 30 days, then purged on next app open.</p><div class="pill pill-blue">30 days</div></div><div class="setting-tile"><div class="stat-icon" style="background:#fff0f3;color:#bd3f56">⚠</div><h4>Reset this browser demo</h4><p>Restore seeded sample users, items, and empty activity. This erases all current local demo data.</p><button class="btn btn-danger btn-small" data-action="reset-demo">Reset demo data</button></div></div><div class="callout warning" style="margin-top:17px"><b>Demo only:</b> Password hashing in the browser is for demonstration. Production accounts, secure ID/photo storage, true rate limiting, and shared live updates must be enforced by the PHP/MySQL server.</div>`;
  }

  async function handleAppClick(e) {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const action = el.dataset.action;
    if (action === 'auth-student') { authMode='login-student'; registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true}; render(); }
    else if (action === 'auth-admin') { authMode='login-admin'; render(); }
    else if (action === 'go-register') { authMode='register'; registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true}; render(); }
    else if (action === 'reset-registration') { registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true}; authMode='register'; render(); }
    else if (action === 'capture-id' || action === 'retake-id') { openCamera('id', async photo => { registrationDraft.idPhoto=photo; registrationDraft.ocrText='Photo captured. Checking school name and ID text…'; registrationDraft.schoolMatch=false; registrationDraft.schoolReview=true; updateRegistrationPhoto('id', photo); setOCRMessage(registrationDraft.ocrText, false); const result=await readIDText(photo); registrationDraft.ocrText=result.message; registrationDraft.schoolMatch=result.schoolMatch; registrationDraft.schoolReview=!result.schoolMatch; if(result.studentId) setRegistrationValue('studentId',result.studentId); if(result.name) setRegistrationValue('name',result.name); if(result.program) setRegistrationValue('program',result.program); setOCRMessage(result.message, result.schoolMatch); }); }
    else if (action === 'capture-selfie' || action === 'retake-selfie') { openCamera('selfie', photo => { registrationDraft.selfie=photo; updateRegistrationPhoto('selfie', photo); }); }
    else if (action === 'student-tab') { studentTab=el.dataset.tab; window.studentSearch=''; window.studentCategory='all'; renderStudent(); }
    else if (action === 'admin-tab') { adminTab=el.dataset.tab; dropdownOpen=false; renderAdmin(); }
    else if (action === 'logout') { logout(); }
    else if (action === 'open-password') { dropdownOpen=false; $('#globalUserMenu')?.remove(); openPasswordModal(); }
    else if (action === 'open-student-delete') { dropdownOpen=false; $('#globalUserMenu')?.remove(); openStudentDeleteModal(); }
    else if (action === 'open-admin-settings') { adminTab='settings'; renderAdmin(); dropdownOpen=false; $('#globalUserMenu')?.remove(); }
    else if (action === 'new-item') { openItemModal(); }
    else if (action === 'review-application') { openApplicationReview(el.dataset.id); }
    else if (action === 'approve-application') { approveApplication(el.dataset.id); }
    else if (action === 'reject-application' || action === 'correction-application') { purgeApplication(el.dataset.id, action==='reject-application'?'Rejected':'Correction requested'); }
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
    else if (action === 'export-backup') { downloadFile('FindIT-Campus-Demo-Backup.json',JSON.stringify(state,null,2),'application/json'); toast('Demo backup downloaded. Keep it private.'); }
    else if (action === 'import-backup') { const input=document.createElement('input'); input.type='file'; input.accept='.json,application/json'; input.onchange=()=>importBackup(input.files?.[0]); input.click(); }
    else if (action === 'restore-trash') { restoreTrash(el.dataset.id); }
    else if (action === 'purge-trash') { confirmPurgeTrash(el.dataset.id); }
    else if (action === 'reset-demo') { confirmResetDemo(); }
    else if (action === 'close-modal') { closeModal(); }
    else if (action === 'modal-backdrop' && e.target.classList.contains('modal-backdrop')) { closeModal(); }
    else if (action === 'cancel-modal') { closeModal(); }
    else if (action === 'confirm-purge-application') { purgeApplication(el.dataset.id,el.dataset.reason); }
    else if (action === 'camera-capture') { captureCameraFrame(); }
    else if (action === 'camera-cancel') { closeModal(); }
    else if (action === 'camera-switch') { switchCamera(); }
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
    const key=`${authMode==='login-admin'?'admin':'student'}:${loginId.toUpperCase()}`; const failure=state.failedLogins[key];
    if(failure?.lockedUntil && Date.now()<failure.lockedUntil){const seconds=Math.ceil((failure.lockedUntil-Date.now())/1000);toast(`Too many failed attempts. Try again in ${seconds} seconds.`, 'error');return;}
    const role=authMode==='login-admin'?'admin':'student';
    const user=state.users.find(u=>u.role===role && (role==='admin'?u.username.toLowerCase()===loginId.toLowerCase():u.studentId.toUpperCase()===loginId.toUpperCase()) && u.status==='active');
    const hash=await hashPassword(password);
    if(!user||user.passwordHash!==hash){
      const f=state.failedLogins[key]||{count:0,lockedUntil:0}; f.count=(f.count||0)+1;
      if(f.count>=3){f.count=0;f.lockedUntil=Date.now()+60000;state.failedLogins[key]=f;saveState();toast('Three incorrect attempts. Login is locked for 1 minute.','error',5500);}
      else{state.failedLogins[key]=f;saveState();toast(`Incorrect account ID or password. ${3-f.count} attempt(s) remaining before a 1-minute lock.`, 'error',5000);}
      logAction('Login failed','Invalid credentials were entered.','Unknown',role);saveState();return;
    }
    delete state.failedLogins[key]; currentUser=user; sessionStorage.setItem(SESSION_KEY,user.id); dropdownOpen=false;
    logAction('Login successful',`${user.role==='admin'?'Admin':'Student'} signed in.`,user.name,user.role); saveState();
    if(user.role==='admin')adminTab='overview';else studentTab='lost';render();toast(`Welcome, ${user.name.split(' ')[0]}!`);
  }
  async function registerSubmit(form) {
    const fd=new FormData(form); const studentId=String(fd.get('studentId')||'').trim().toUpperCase(); const name=String(fd.get('name')||'').trim(); const program=String(fd.get('program')||'').trim(); const yearLevel=String(fd.get('yearLevel')||'').trim(); const password=String(fd.get('password')||''); const confirm=String(fd.get('confirmPassword')||'');
    if(!registrationDraft.idPhoto||!registrationDraft.selfie){toast('Capture both the school ID and live selfie before submitting.','error');return;}
    if(!studentId||!name||!program||!yearLevel){toast('Complete Student ID, name, program, and year level.','error');return;}
    if(!/^[A-Z0-9-]{4,20}$/.test(studentId)){toast('Use a valid Student ID number with letters, numbers, and dashes only.','error');return;}
    if(idInUse(studentId)){toast('This Student ID already has an active account or pending application. Check the ID or ask Admin.','error',5500);return;}
    if(password.length<8){toast('Use a password with at least 8 characters.','error');return;}
    if(password!==confirm){toast('Passwords do not match.','error');return;}
    if(!fd.get('consent')){toast('Please check the demo privacy acknowledgment.','error');return;}
    const button=$('button[type="submit"]',form); if(button){button.disabled=true;button.textContent='Submitting application…';}
    const passHash=await hashPassword(password);
    const app={id:randomId('application'),studentId,name,program,yearLevel,passwordHash:passHash,idPhoto:registrationDraft.idPhoto,selfie:registrationDraft.selfie,ocrText:registrationDraft.ocrText||'',schoolMatch:!!registrationDraft.schoolMatch,schoolReview:!registrationDraft.schoolMatch,status:'pending',createdAt:nowISO()};
    state.applications.push(app); logAction('Student application submitted',`Pending application submitted for Student ID ${studentId}.`,name,'student');saveState();registrationDraft={idPhoto:'',selfie:'',ocrText:'',schoolMatch:false,schoolReview:true};
    authMode='login-student'; render(); toast('Application submitted. Wait for Admin/Teacher approval before signing in.');
  }
  function logout() { if(currentUser) logAction('Logged out',`${currentUser.role==='admin'?'Admin':'Student'} signed out.`,currentUser.name,currentUser.role);saveState();currentUser=null;sessionStorage.removeItem(SESSION_KEY);dropdownOpen=false;const m=$('#globalUserMenu');if(m)m.remove();authMode='login-student';render();toast('You have signed out.'); }
  function openApplicationReview(id) {
    const a=state.applications.find(x=>x.id===id); if(!a)return;
    const body=`<div class="callout warning" style="margin-bottom:14px"><b>Manual verification required.</b> OCR result: ${h(a.schoolMatch?'School name text was detected.':'School name was not detected reliably.')}. Check the photo and compare the details against an official school record. Do not rely on OCR alone.</div><div class="split-grid"><div class="field"><label>School ID photo</label><img class="review-preview" style="width:100%;max-height:240px" src="${a.idPhoto}" alt="Captured school ID"><div class="field-help">OCR text: ${h(a.ocrText||'No OCR text')}</div></div><div class="field"><label>Live selfie</label><img class="review-preview" style="width:100%;max-height:240px" src="${a.selfie}" alt="Captured selfie"><div class="field-help">Compare with the school record where allowed by school policy.</div></div></div><div class="divider"></div><div class="info-list"><div class="info-row"><span>Student ID (fixed after approval)</span><strong class="mono">${h(a.studentId)}</strong></div><div class="info-row"><span>Complete name</span><strong>${h(a.name)}</strong></div><div class="info-row"><span>Program</span><strong>${h(a.program)}</strong></div><div class="info-row"><span>Year level</span><strong>${h(a.yearLevel)}</strong></div><div class="info-row"><span>Submitted</span><strong>${h(dateTime(a.createdAt))}</strong></div></div><label class="check-row" style="margin-top:14px"><input type="checkbox" id="verifiedSchoolId"><span>I verified the school ID and student details with an authorized school record. I understand this is a demo and the OCR result alone is not proof.</span></label>`;
    modal(`Review ${a.studentId}`,body,`${modalButtons([{label:'Request correction · delete application',action:'correction-application-confirm',class:'btn-amber'},{label:'Reject · delete application',action:'reject-application-confirm',class:'btn-danger'},{label:'Approve student',action:'approve-application-modal',class:'btn-primary'}])}`);
    $('#modalRoot').dataset.applicationId=id;
    $$('[data-action="correction-application-confirm"],[data-action="reject-application-confirm"],[data-action="approve-application-modal"]',modalRoot).forEach(b=>{b.dataset.id=id;});
  }
  function approveApplication(id) {
    const a=state.applications.find(x=>x.id===id); if(!a)return;
    const checkbox=$('#verifiedSchoolId'); if(checkbox && !checkbox.checked){toast('Check the verification box after confirming the school ID.','error');return;}
    if(idInUse(a.studentId,a.id)){toast('That Student ID is already active. Review the existing account first.','error');return;}
    state.users.push({id:randomId('user'),username:a.studentId,studentId:a.studentId,name:a.name,program:a.program,yearLevel:a.yearLevel,role:'student',passwordHash:a.passwordHash,status:'active',createdAt:a.createdAt,approvedAt:nowISO(),schoolVerified:true});
    state.applications=state.applications.filter(x=>x.id!==id); logAction('Student approved',`Student ID ${a.studentId} approved. Verification photos removed from the demo after review.`,currentUser.name,'admin'); saveState(); closeModal();renderAdmin();toast('Student approved. Verification photos have been removed from the application record.');
  }
  function purgeApplication(id, reason) {
    const a=state.applications.find(x=>x.id===id); if(!a)return;
    // Explicit user requirement: rejection/correction removes personal application data and releases the ID.
    state.applications=state.applications.filter(x=>x.id!==id);logAction(`Application ${reason.toLowerCase()}`,`Application data and photos purged. Student ID released for re-registration.`,currentUser?.name||'Admin','admin',false);saveState();closeModal();renderAdmin();toast(`${reason}: application data removed. Student can register again using the same ID.`, 'success',6000);
  }
  function markItemType(id,type) {
    const item=state.items.find(i=>i.id===id); if(!item)return;
    if(item.status==='returned'){toast('Returned item is in the handover history and cannot be reclassified.','warn');return;}
    item.type=type; item.status=type==='lost'?'lost':'available';item.updatedAt=nowISO();logAction(type==='found'?'Item marked as found':'Item marked as lost',`${item.ref} · ${item.name} status set to ${formatStatus(item.status)}.`,currentUser.name,'admin');saveState();renderAdmin();toast(type==='found'?'Item is now in Found Items and marked available for claim.':'Item moved to Lost Items.');
  }
  function openItemModal(id='') {
    const item=id?state.items.find(i=>i.id===id):null;
    if(id&&!item)return;
    const body=`<form id="itemForm" novalidate><input type="hidden" name="itemId" value="${h(item?.id||'')}"><div class="field-grid"><div class="field"><label>Record type <span class="required">*</span></label><select class="select" name="type" required><option value="lost" ${!item||item.type==='lost'?'selected':''}>Lost item report</option><option value="found" ${item?.type==='found'?'selected':''}>Found item (kept at school)</option></select></div><div class="field"><label>Category <span class="required">*</span></label><select class="select" name="category" required>${['IDs and Cards','Electronics','Bottles and Tumblers','Bags','Books and School Supplies','Clothing','Personal Items','Other'].map(v=>`<option ${item?.category===v?'selected':''}>${h(v)}</option>`).join('')}</select></div><div class="field full"><label>Item name <span class="required">*</span></label><input class="input" name="name" required value="${h(item?.name||'')}" placeholder="e.g. Blue water bottle"></div><div class="field"><label>Location <span class="required">*</span></label><input class="input" name="location" required value="${h(item?.location||'')}" placeholder="Building, room, or area"></div><div class="field"><label>Date reported <span class="required">*</span></label><input class="input" type="date" name="date" required value="${h(item?.date||new Date().toISOString().slice(0,10))}"></div><div class="field full"><label>Description <span class="required">*</span></label><textarea class="textarea" name="description" required placeholder="Visible details to help identify the item">${h(item?.description||'')}</textarea></div><div class="field"><label>Item photo (optional)</label><input class="input" type="file" name="photo" accept="image/jpeg,image/png,image/webp"><small class="field-help">Images are resized for this browser demo. Do not include personal ID details in item photos.</small></div><div class="field"><label>Reference number</label><input class="input" value="${h(item?.ref||'Generated automatically on save')}" readonly></div><div class="field full"><div class="callout warning">For a lost report, tell students to bring any recovered item directly to the Admin/Teacher. For found items, only mark them available after staff have physically received them.</div></div></div></form>`;
    modal(item?'Edit item report':'Publish an item report',body,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:item?'Save changes':'Publish report',action:'submit-item-form',class:'btn-primary'}]));
  }
  async function handleModalSubmit(e) {
    e.preventDefault(); const form=e.target;
    if(form.id==='itemForm') return submitItemForm(form);
    if(form.id==='handoverForm') return submitHandover(form);
    if(form.id==='passwordForm') return submitPasswordChange(form);
    if(form.id==='selfDeleteForm') return submitSelfDelete(form);
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
    if(id){const item=state.items.find(x=>x.id===id);if(!item)return;Object.assign(item,{name,type,category,location,date,description,status:item.status==='returned'?'returned':type==='lost'?'lost':'available',updatedAt:nowISO()});if(photo)item.photo=photo;logAction('Item report updated',`${item.ref} · ${item.name} · ${type}.`,currentUser.name,'admin');toast('Item report updated.');}
    else {const prefix=type==='lost'?'LS':'FD';const ref=nextReference(prefix);const emoji=({ 'IDs and Cards':'🪪','Electronics':'💻','Bottles and Tumblers':'🧴','Bags':'🎒','Books and School Supplies':'📗','Clothing':'🧥','Personal Items':'📦' })[category]||'📦';state.items.push({id:randomId('item'),ref,type,name,category,location,date,description,emoji,photo,status:type==='lost'?'lost':'available',createdAt:nowISO(),updatedAt:nowISO(),createdBy:currentUser.name,returnedAt:'',claimantName:'',claimantId:''});logAction('Item report published',`${ref} · ${name} · ${type}.`,currentUser.name,'admin');toast('Item report published.');}
    saveState();closeModal();renderAdmin();
  }
  function nextReference(prefix) {
    const year=new Date().getFullYear();const max=state.items.reduce((n,i)=>{const m=String(i.ref).match(new RegExp(`^${prefix}-${year}-(\\d+)$`));return m?Math.max(n,Number(m[1])):n;},0);return `${prefix}-${year}-${String(max+1).padStart(4,'0')}`;
  }
  function openHandoverModal(id) {
    const item=state.items.find(i=>i.id===id);if(!item)return;
    if(item.status==='returned'){toast('This item has already been returned.','warn');return;}
    if(item.type!=='found'){toast('This item is still marked Lost. First receive the physical item at the school office and click Mark as Found.','warn',5500);return;}
    const body=`<div class="callout warning" style="margin-bottom:14px">Check the claimant's physical school ID and verify the item before releasing it. The reference number is fixed by the system so staff do not have to type it.</div><form id="handoverForm" novalidate><input type="hidden" name="itemId" value="${h(item.id)}"><div class="field-grid"><div class="field full"><label>Item reference number (fixed)</label><input class="input mono" name="itemRef" value="${h(item.ref)}" readonly></div><div class="field full"><label>Item name</label><input class="input" value="${h(item.name)}" readonly></div><div class="field"><label>Claimant full name <span class="required">*</span></label><input class="input" name="claimantName" required placeholder="Enter claimant's name"></div><div class="field"><label>Student ID number <span class="required">*</span></label><input class="input mono" name="claimantId" required placeholder="e.g. 2024-002"></div><div class="field"><label>Released by (Admin/Teacher)</label><input class="input" name="releasedBy" value="${h(currentUser.name)}" readonly></div><div class="field"><label>Handover date/time</label><input class="input" type="datetime-local" name="handedOverAt" value="${new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}" readonly></div><div class="field full"><label>Handover notes (optional)</label><textarea class="textarea" name="notes" placeholder="Describe the verification and item condition"></textarea></div><div class="field full"><label class="check-row"><input type="checkbox" name="verified" required><span>I confirmed the claimant's physical school ID and ownership before handover.</span></label></div></div></form>`;
    modal('Claim & Record Handover',body,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Confirm handover & mark returned',action:'submit-handover-form',class:'btn-primary'}]));
  }
  function submitHandover(form) {
    const fd=new FormData(form);if(!fd.get('verified')){toast('Confirm the physical ID and ownership check.','error');return;}
    const item=state.items.find(i=>i.id===fd.get('itemId'));if(!item||item.type!=='found'||item.status==='returned'){toast('This item is no longer available for handover.','error');closeModal();renderAdmin();return;}
    const claimantName=String(fd.get('claimantName')||'').trim();const claimantId=String(fd.get('claimantId')||'').trim().toUpperCase();if(!claimantName||!claimantId){toast('Enter the claimant name and Student ID.','error');return;}
    const claim={id:randomId('handover'),itemId:item.id,itemRef:item.ref,itemName:item.name,claimantName,claimantId,releasedBy:currentUser.name,handedOverAt:new Date(fd.get('handedOverAt')||nowISO()).toISOString(),notes:String(fd.get('notes')||'').trim()};
    state.claims.push(claim);item.status='returned';item.returnedAt=claim.handedOverAt;item.claimantName=claimantName;item.claimantId=claimantId;item.updatedAt=nowISO();
    logAction('Item returned and handover recorded',`${item.ref} · ${item.name} handed to ${claimantName} (${claimantId}); released by ${currentUser.name}.`,currentUser.name,'admin');saveState();closeModal();renderAdmin();toast('Handover saved. This item is now hidden from student Lost/Found pages.');
  }
  function confirmDeleteItem(id) {
    const item=state.items.find(i=>i.id===id);if(!item)return;
    modal('Move item to Recycle Bin',`<div class="callout warning">The item report <b>${h(item.ref)} · ${h(item.name)}</b> will be removed from student pages and moved to the Recycle Bin for 30 days. You can restore it before the retention period ends.</div>`,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Move to Recycle Bin',action:'confirm-delete-item',class:'btn-danger'}]));$('#modalRoot').dataset.itemId=id;
  }
  function confirmDeleteUser(id) {
    const user=state.users.find(u=>u.id===id && u.role==='student');if(!user)return;
    modal('Remove student account',`<div class="callout warning">This removes <b>${h(user.name)} (${h(user.studentId)})</b> from active accounts and moves the account to the Recycle Bin for up to 30 days. The Student ID becomes available for a new active registration in this demo. Ask the student to show their school ID in person before you remove an account.</div>`,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Delete account',action:'confirm-delete-user',class:'btn-danger'}]));$('#modalRoot').dataset.userId=id;
  }
  function deleteItemToTrash(id) {const index=state.items.findIndex(i=>i.id===id);if(index<0)return;const record=state.items.splice(index,1)[0];state.trash.push({id:randomId('trash'),kind:'item',record,deletedAt:nowISO(),deletedBy:currentUser.name});logAction('Item moved to Recycle Bin',`${record.ref} · ${record.name}. Retain for up to 30 days.`,currentUser.name,'admin');saveState();closeModal();renderAdmin();toast('Item moved to the Recycle Bin.');}
  function deleteUserToTrash(id) {const index=state.users.findIndex(u=>u.id===id&&u.role==='student');if(index<0)return;const record=state.users.splice(index,1)[0];state.trash.push({id:randomId('trash'),kind:'user',record,deletedAt:nowISO(),deletedBy:currentUser.name});logAction('Student account moved to Recycle Bin',`An Admin-removed student account was archived for up to 30 days.`,currentUser.name,'admin',false);saveState();closeModal();renderAdmin();toast('Student account deleted from active accounts. Student ID can be used for a new registration.');}
  function restoreTrash(id) {const index=state.trash.findIndex(t=>t.id===id);if(index<0)return;const entry=state.trash[index];if(entry.kind==='item'){state.items.push(entry.record);}else{const dup=state.users.some(u=>u.role==='student'&&u.studentId===entry.record.studentId);if(dup){toast('Cannot restore: another active account already uses this Student ID.','error');return;}state.users.push(entry.record);}state.trash.splice(index,1);logAction('Recycle Bin record restored',`${entry.kind==='item'?'Item':'Student account'} restored by Admin.`,currentUser.name,'admin',false);saveState();renderAdmin();toast('Record restored.');}
  function confirmPurgeTrash(id) {const entry=state.trash.find(t=>t.id===id);if(!entry)return;modal('Delete permanently',`<div class="callout danger">This will permanently delete this ${entry.kind==='item'?'item report':'student account'} from this browser demo. This cannot be undone.</div>`,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Delete forever',action:'confirm-purge-trash',class:'btn-danger'}]));$('#modalRoot').dataset.trashId=id;}
  function purgeTrash(id) {state.trash=state.trash.filter(t=>t.id!==id);logAction('Recycle Bin record permanently deleted','Record permanently removed by Admin.','Admin','admin',false);saveState();closeModal();renderAdmin();toast('Record permanently deleted.');}
  function openPasswordModal() {
    const body=`<form id="passwordForm" novalidate><div class="field-grid"><div class="field full"><label>Current password <span class="required">*</span></label><input class="input" name="currentPassword" type="password" required autocomplete="current-password"></div><div class="field"><label>New password <span class="required">*</span></label><input class="input" name="newPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div><div class="field"><label>Confirm new password <span class="required">*</span></label><input class="input" name="confirmPassword" type="password" required minlength="8" autocomplete="new-password"></div><div class="field full"><div class="callout warning">Your Student ID cannot be changed here. If you forgot the current password, visit the Admin/Teacher and bring your school ID. They can verify you and delete the old account so you can register again.</div></div></div></form>`;
    modal('Change password',body,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Save new password',action:'submit-password-form',class:'btn-primary'}]));
  }
  async function submitPasswordChange(form) {
    const fd=new FormData(form);const current=String(fd.get('currentPassword')||''),next=String(fd.get('newPassword')||''),confirm=String(fd.get('confirmPassword')||'');
    if(next.length<8){toast('New password must have at least 8 characters.','error');return;}if(next!==confirm){toast('New passwords do not match.','error');return;}
    if(await hashPassword(current)!==currentUser.passwordHash){toast('Current password is incorrect.','error');return;}
    currentUser.passwordHash=await hashPassword(next);logAction('Password changed','Account password was changed. No password value is stored in the activity log.',currentUser.name,currentUser.role);saveState();closeModal();render();toast('Password updated successfully.');
  }
  function openStudentDeleteModal() {
    const body=`<form id="selfDeleteForm" novalidate><div class="callout danger" style="margin-bottom:15px"><b>Delete your account?</b> This demo will permanently remove your active account and sign you out. Your Student ID will be available for re-registration. Item handover history is kept for the demo record.</div><div class="field"><label>Confirm your current password <span class="required">*</span></label><input class="input" type="password" name="password" required autocomplete="current-password"></div></form>`;
    modal('Delete my student account',body,modalButtons([{label:'Keep account',action:'close-modal',class:'btn-outline'},{label:'Delete account',action:'submit-self-delete',class:'btn-danger'}]));
  }
  async function submitSelfDelete(form) {
    const password=String(new FormData(form).get('password')||'');if(await hashPassword(password)!==currentUser.passwordHash){toast('Password is incorrect.','error');return;}
    const id=currentUser.id;state.users=state.users.filter(u=>u.id!==id);logAction('Student self-deleted account','Student account was deleted by the account owner. Personal details omitted from this log.', 'Student','student',false);saveState();closeModal();currentUser=null;sessionStorage.removeItem(SESSION_KEY);authMode='login-student';render();toast('Your account has been deleted. You can register again with the same Student ID.');
  }
  function confirmResetDemo() {modal('Reset all demo data',`<div class="callout danger">This removes every browser-only account, application, item, handover, log, and trash record. Demo seed accounts/items will be recreated. This cannot be undone.</div>`,modalButtons([{label:'Cancel',action:'close-modal',class:'btn-outline'},{label:'Reset demo',action:'confirm-reset-demo',class:'btn-danger'}]));}
  async function resetDemo() {localStorage.removeItem(STORE_KEY);sessionStorage.removeItem(SESSION_KEY);state=await seedState();saveState();currentUser=null;authMode='login-student';closeModal();render();toast('Demo data reset to the original sample records.');}
  async function importBackup(file) {
    if(!file)return;try{const raw=await file.text();const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.users)||!Array.isArray(parsed.items)||!Array.isArray(parsed.applications))throw new Error('This is not a FindIT demo backup.');if(!confirm('Replace all current browser demo data with this backup?'))return;state=parsed;purgeExpiredTrash();saveState();logAction('Demo backup restored','A JSON backup was imported.','Admin','admin');saveState();render();toast('Demo backup restored.');}catch(err){toast(err.message||'Could not restore backup.','error');}
  }
  function downloadFile(filename, content, mime) {const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}
  function downloadWordReport(title, headers, rows, filename) {
    const esc=v=>h(v).replace(/\n/g,'<br>');const table=`<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:Arial;font-size:10pt"><thead><tr style="background:#eaf0ff">${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:Arial;color:#192747"><h1>${esc(title)}</h1><p>Ave Maria College · FindIT Campus Demo</p><p>Generated: ${esc(dateTime(nowISO()))}</p>${table}<p style="font-size:9pt;color:#666">Demo report only. Verify all records against the official system before using for school administration.</p></body></html>`;
    downloadFile(filename,html,'application/msword;charset=utf-8');toast('Word-compatible report downloaded. Open the .doc file in Microsoft Word.');
  }
  function downloadCSV(filename,headers,rows) {const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');downloadFile(filename,'\ufeff'+csv,'text/csv;charset=utf-8');toast('CSV report downloaded.');}

  function stopCamera() {
    if(cameraState){if(cameraState.raf)cancelAnimationFrame(cameraState.raf);cameraState.stream?.getTracks().forEach(t=>t.stop());cameraState=null;}
  }
  function openCamera(kind, callback, preferredFacing = '') {
    if(!navigator.mediaDevices?.getUserMedia){toast('Camera access needs a supported browser on HTTPS or localhost.','error',6000);return;}
    stopCamera();cameraState={kind,callback,stream:null,raf:0,facing:preferredFacing || (kind==='id'?'environment':'user'),captured:null,video:null,canvas:null,offscreen:null,offCtx:null,flipSelfie:kind==='selfie'};
    const isId=kind==='id';
    modalRoot.innerHTML=`<div class="camera-modal" data-action="camera-backdrop"><section class="camera-dialog" role="dialog" aria-modal="true"><header class="camera-head"><div><div class="eyebrow">LIVE CAPTURE · ${isId?'SCHOOL ID':'SELFIE'}</div><h3>${isId?'Capture your school ID':'Take your live selfie'}</h3><p class="muted small" style="margin:0">${isId?'Hold the card horizontally inside the guide. The page stays portrait.':'Look straight at the camera and keep your whole face inside the oval.'}</p></div><button class="close-x" data-action="camera-cancel" type="button">×</button></header><div class="camera-stage ${isId?'id':'selfie'}" id="cameraStage"><video id="cameraVideo" playsinline autoplay muted style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"></video><canvas id="cameraCanvas" width="${isId?1264:656}" height="${isId?800:840}"></canvas><div class="viewfinder ${isId?'':'selfie'}">${['tl','tr','bl','br'].map(c=>`<span class="corner ${c}"></span>`).join('')}${isId?'':'<span class="face-line"></span>'}</div></div><div class="camera-status" id="cameraStatus">Starting camera…</div><div id="cameraReviewHint" class="callout" style="display:none;margin-bottom:12px">Review the captured photo. Select Retake if the subject is not centered, or Use Photo to continue.</div><div class="camera-controls" style="margin-top:12px"><button class="btn btn-outline" type="button" data-action="camera-switch">⇄ Switch camera</button><button class="btn btn-outline" type="button" data-action="camera-cancel">Cancel</button><button class="btn btn-primary" type="button" data-action="camera-capture" id="cameraCaptureBtn">● Capture photo</button></div></section></div>`;
    startCameraStream();
  }
  async function startCameraStream() {
    if(!cameraState)return;const cam=cameraState;const video=$('#cameraVideo',modalRoot);const canvas=$('#cameraCanvas',modalRoot);if(!video||!canvas)return;
    cam.video=video;cam.canvas=canvas;
    try {
      cam.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:cam.facing},width:{ideal:1920},height:{ideal:1080}}});
      video.srcObject=cam.stream;await video.play();
      if(!cameraState||cameraState!==cam)return;
      cam.offscreen=document.createElement('canvas');cam.offCtx=cam.offscreen.getContext('2d',{willReadFrequently:false});
      $('#cameraStatus',modalRoot).textContent='Camera live · Center the subject inside the guide.';
      renderCameraLoop();
    } catch(err) {$('#cameraStatus',modalRoot).textContent='Camera could not open. Allow camera permission and use HTTPS in Chrome.';toast(`Camera error: ${err.name||'permission denied'}. Use Chrome and allow camera access.`, 'error',6500);}
  }
  function drawAlignedFrame(video, output, offscreen, kind) {
    const vw=video.videoWidth, vh=video.videoHeight; if(!vw||!vh)return;
    const targetW=output.width,targetH=output.height,targetRatio=targetW/targetH,sourceRatio=vw/vh;
    // Convert raw camera orientation to the guide's intended orientation; never rotate the website/screen.
    const rotate=(targetRatio>1 && sourceRatio<1)||(targetRatio<1 && sourceRatio>1);
    const ow=rotate?vh:vw,oh=rotate?vw:vh;
    if(offscreen.width!==ow||offscreen.height!==oh){offscreen.width=ow;offscreen.height=oh;}
    const oc=offscreen.getContext('2d');oc.clearRect(0,0,ow,oh);
    oc.save();
    if(rotate){oc.translate(ow/2,oh/2);oc.rotate(Math.PI/2);oc.drawImage(video,-vw/2,-vh/2,vw,vh);}else{oc.drawImage(video,0,0,ow,oh);}
    oc.restore();
    // Use the same centered object-fit:cover crop for the visible preview AND the captured output canvas.
    const scale=Math.max(targetW/ow,targetH/oh);const cropW=targetW/scale;const cropH=targetH/scale;const sx=(ow-cropW)/2;const sy=(oh-cropH)/2;
    const ctx=output.getContext('2d');ctx.clearRect(0,0,targetW,targetH);
    const mirror=(kind==='selfie' && cameraState?.facing==='user');
    if(mirror){ctx.save();ctx.translate(targetW,0);ctx.scale(-1,1);ctx.drawImage(offscreen,sx,sy,cropW,cropH,0,0,targetW,targetH);ctx.restore();}
    else{ctx.drawImage(offscreen,sx,sy,cropW,cropH,0,0,targetW,targetH);}
  }
  function renderCameraLoop() {
    const cam=cameraState;if(!cam)return;
    if(cam.video?.readyState>=2 && cam.video.videoWidth) drawAlignedFrame(cam.video,cam.canvas,cam.offscreen,cam.kind);
    cam.raf=requestAnimationFrame(renderCameraLoop);
  }
  function captureCameraFrame() {
    if(!cameraState?.canvas)return;const cam=cameraState;
    if(!cam.video||cam.video.readyState<2||!cam.video.videoWidth){toast('Wait until the camera preview is ready.','warn');return;}
    cam.captured=cam.canvas.toDataURL('image/jpeg',.84);if(cam.raf)cancelAnimationFrame(cam.raf);cam.stream?.getTracks().forEach(t=>t.stop());cam.stream=null;
    const review=document.createElement('div');review.className='camera-review';review.innerHTML=`<div class="eyebrow">REVIEW CAPTURE</div><h3 style="margin:6px 0 12px">${cam.kind==='id'?'Review your school ID':'Review your selfie'}</h3><img class="review-preview" src="${cam.captured}" alt="Captured photo"><p class="muted small" style="text-align:center;margin:12px 0">This is the exact image that will be saved for this demo.</p><div class="camera-controls"><button class="btn btn-outline" type="button" data-action="camera-retake">↻ Retake</button><button class="btn btn-primary" type="button" data-action="camera-use">✓ Use Photo</button></div>`;
    const dialog=$('.camera-dialog',modalRoot);const prior=$('.camera-stage',dialog);prior.replaceWith(review);const status=$('#cameraStatus',dialog);if(status)status.style.display='none';const hints=$('#cameraReviewHint',dialog);if(hints)hints.style.display='none';$('.camera-dialog > .camera-controls',modalRoot)?.remove();$$('.camera-head .close-x',dialog).forEach(b=>b.dataset.action='camera-cancel');
  }
  async function retakeCamera() {if(!cameraState)return;const kind=cameraState.kind;const callback=cameraState.callback;const facing=cameraState.facing;stopCamera();modalRoot.innerHTML='';openCamera(kind,callback,facing);}
  function useCapturedPhoto() {if(!cameraState?.captured)return;const cam=cameraState;const photo=cam.captured;const callback=cam.callback;stopCamera();modalRoot.innerHTML='';callback?.(photo);}
  async function switchCamera() {
    if(!cameraState)return;
    const kind=cameraState.kind,callback=cameraState.callback,next=cameraState.facing==='user'?'environment':'user';
    stopCamera();modalRoot.innerHTML='';openCamera(kind,callback,next);
  }

  function setupEvents() {
    appRoot.addEventListener('click', handleAppClick);
    appRoot.addEventListener('submit', handleAppSubmit);
    modalRoot.addEventListener('submit', handleModalSubmit);
    modalRoot.addEventListener('click', async e => {
      const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;
      if(a==='close-modal'||a==='cancel-modal'||(a==='modal-backdrop'&&e.target.classList.contains('modal-backdrop'))||a==='camera-cancel'){closeModal();return;}
      if(a==='approve-application-modal'){approveApplication(el.dataset.id||$('#modalRoot').dataset.applicationId);return;}
      if(a==='reject-application-confirm'){purgeApplication(el.dataset.id||$('#modalRoot').dataset.applicationId,'Rejected');return;}
      if(a==='correction-application-confirm'){purgeApplication(el.dataset.id||$('#modalRoot').dataset.applicationId,'Correction requested');return;}
      if(a==='confirm-delete-item'){deleteItemToTrash($('#modalRoot').dataset.itemId);return;}
      if(a==='confirm-delete-user'){deleteUserToTrash($('#modalRoot').dataset.userId);return;}
      if(a==='confirm-purge-trash'){purgeTrash($('#modalRoot').dataset.trashId);return;}
      if(a==='confirm-reset-demo'){await resetDemo();return;}
      if(a==='submit-item-form'){const f=$('#itemForm');if(f)submitItemForm(f);return;}
      if(a==='submit-handover-form'){const f=$('#handoverForm');if(f)submitHandover(f);return;}
      if(a==='submit-password-form'){const f=$('#passwordForm');if(f)submitPasswordChange(f);return;}
      if(a==='submit-self-delete'){const f=$('#selfDeleteForm');if(f)submitSelfDelete(f);return;}
      if(a==='camera-capture'){captureCameraFrame();return;}
      if(a==='camera-switch'){switchCamera();return;}
      if(a==='camera-retake'){retakeCamera();return;}
      if(a==='camera-use'){useCapturedPhoto();return;}
    });
    appRoot.addEventListener('input',e=>{
      if(e.target.id==='studentSearch'){window.studentSearch=e.target.value;const pos=e.target.selectionStart;renderStudent();const s=$('#studentSearch');if(s){s.focus();s.setSelectionRange(pos,pos);} }
      if(e.target.id==='adminItemSearch'){window.adminItemSearch=e.target.value;const box=$('#adminItemList');if(box)box.innerHTML=adminItemTableHTML([...state.items]);}
      if(e.target.id==='logSearch'){window.logSearch=e.target.value;const box=$('#logTable');if(box)box.innerHTML=logTableHTML();}
      if(e.target.name==='studentId'&&e.target.closest('#registrationForm')){registrationDraft.studentId=e.target.value;e.target.dataset.manuallyEdited='1';}
      if(e.target.name==='name'&&e.target.closest('#registrationForm'))registrationDraft.name=e.target.value;
      if(e.target.name==='program'&&e.target.closest('#registrationForm'))registrationDraft.program=e.target.value;
    });
    appRoot.addEventListener('change',e=>{
      if(e.target.id==='studentCategory'){window.studentCategory=e.target.value;renderStudent();}
      if(e.target.id==='adminItemFilter'){window.adminItemFilter=e.target.value;const box=$('#adminItemList');if(box)box.innerHTML=adminItemTableHTML([...state.items]);}
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
  function showInstallInstructions(){modal('Install FindIT Campus',`<div class="callout success">Install FindIT Campus on your phone for an app-like window and a home-screen icon.</div><div class="info-list" style="margin-top:12px"><div class="info-row"><span>Android (Chrome)</span><strong>Menu ⋮ → Install app / Add to Home screen</strong></div><div class="info-row"><span>iPhone (Safari)</span><strong>Share → Add to Home Screen</strong></div></div><p class="muted small" style="margin:12px 0 0">If the install prompt is not available, use the browser menu. The demo still needs the internet for OCR and does not sync data between devices.</p>`,modalButtons([{label:'Got it',action:'close-modal',class:'btn-primary'}]));}
  function refreshInstallButton(){const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;if(standalone||localStorage.getItem('finditInstalledFlag')==='1'){installBtn.hidden=true;}else{installBtn.hidden=false;}}
  function doInstallPromptAccepted(){localStorage.setItem('finditInstalledFlag','1');installBtn.hidden=true;}

  async function init() {
    state=loadState();
    if(!state||!Array.isArray(state.users)||!Array.isArray(state.items)) {state=await seedState();saveState();}
    purgeExpiredTrash();saveState();
    const sessionId=sessionStorage.getItem(SESSION_KEY);if(sessionId){currentUser=state.users.find(u=>u.id===sessionId&&u.status==='active')||null;if(!currentUser)sessionStorage.removeItem(SESSION_KEY);}
    if(currentUser?.role==='admin')adminTab='overview';
    $('#yearNow').textContent=new Date().getFullYear();setupEvents();render();
  }
  init().catch(err=>{console.error(err);appRoot.innerHTML='<div class="panel panel-pad"><h2>FindIT Campus could not start</h2><p>Please reload the page. If browser storage is disabled, allow local storage for this site.</p></div>';});
})();
