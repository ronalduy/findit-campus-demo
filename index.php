<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$user = current_user($pdo);
if ($user) redirect($user['role'] === 'admin' ? 'admin-dashboard.php' : 'lost-items.php');
render_header('Sign in');
?>
<section class="auth-layout">
  <div class="auth-story">
    <div class="eyebrow"><span class="pulse-dot"></span> YOUR SCHOOL, YOUR COMMUNITY</div>
    <h1>Lost something?<br><span>Let's find it.</span></h1>
    <p class="lead">A safer, simpler way for students and school staff to reconnect lost belongings with their owners.</p>
    <div class="auth-highlights">
      <div><span class="highlight-icon">⌕</span><span><strong>Browse with ease</strong><small>Search Lost Items and Found Items.</small></span></div>
      <div><span class="highlight-icon">✓</span><span><strong>Verified student accounts</strong><small>School staff review new registrations.</small></span></div>
      <div><span class="highlight-icon">♡</span><span><strong>Claim safely in person</strong><small>Items are released by authorized staff.</small></span></div>
    </div>
    <div class="auth-quote"><span class="quote-mark">“</span><span>Every lost item deserves a way home.<small>FindIT Campus · School Lost &amp; Found</small></span></div>
  </div>
  <div class="auth-panel-wrap">
    <div class="auth-panel">
      <div class="panel-heading"><span class="mini-brand">F</span><div><h2>Welcome back</h2><p>Sign in to your school account.</p></div></div>
      <form method="post" action="login_action.php" class="form-stack">
        <?= csrf_field() ?>
        <label class="field-label" for="identifier">Student ID Number or Admin Username</label>
        <div class="input-wrap"><span class="input-icon">▤</span><input id="identifier" name="identifier" autocomplete="username" placeholder="Enter your student ID" required maxlength="80"></div>
        <div class="label-row"><label class="field-label" for="password">Password</label><span class="small-muted">Keep your password private</span></div>
        <div class="input-wrap"><span class="input-icon">⌑</span><input type="password" id="password" name="password" autocomplete="current-password" placeholder="Enter your password" required><button type="button" class="password-toggle" data-toggle-password="password" aria-label="Show password">Show</button></div>
        <button type="submit" class="btn btn-primary btn-block">Sign in <span>→</span></button>
      </form>
      <div class="auth-divider"><span>NEW TO FINDIT CAMPUS?</span></div>
      <a class="btn btn-outline btn-block" href="register.php">Create a student account <span>↗</span></a>
      <a class="application-status-link" href="application-status.php">Already registered? Check status or update requested details →</a>
      <div class="notice notice-blue"><span class="notice-icon">i</span><p><strong>New student?</strong> Your account must be reviewed by the school Admin/Teacher before you can sign in.</p></div>
      <details class="demo-details"><summary>Local demo administrator access</summary><p>Username: <code>admin</code><br>Password: <code>1234</code></p><p class="small-muted">For classroom demonstration only. Change the password before any real or public use.</p></details>
    </div>
    <p class="privacy-note">By continuing, you agree to follow your school's lost-and-found and privacy rules.</p>
  </div>
</section>
<?php render_footer(); ?>
