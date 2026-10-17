<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$user = require_login($pdo);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf(); $current = (string)($_POST['current_password'] ?? ''); $new = (string)($_POST['new_password'] ?? ''); $confirm = (string)($_POST['confirm_password'] ?? '');
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id=?'); $stmt->execute([(int)$user['id']]); $hash = (string)$stmt->fetchColumn();
    if (!password_verify($current, $hash)) set_flash('danger','Your current password is incorrect.');
    elseif (strlen($new) < 8) set_flash('danger','New password must be at least 8 characters.');
    elseif (!hash_equals($new,$confirm)) set_flash('danger','New passwords do not match.');
    else { $pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($new,PASSWORD_DEFAULT),(int)$user['id']]); audit($pdo,(int)$user['id'],'password_changed','user',(int)$user['id'],'Account password changed'); set_flash('success','Password changed successfully.'); redirect('change-password.php'); }
}
render_header('Change password');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> ACCOUNT SECURITY</div><h1>Change password</h1><p>Use a strong password and do not share it with anyone.</p></div></div>
<div class="panel narrow-panel"><div class="panel-heading-row"><div><h2>Update your password</h2><p>Your new password must have at least 8 characters.</p></div><span class="heading-icon">⌑</span></div><div class="panel-body"><form method="post" class="form-stack"><?= csrf_field() ?><div class="field"><label for="current_password">Current password</label><input type="password" id="current_password" name="current_password" autocomplete="current-password" required></div><div class="field"><label for="new_password">New password</label><input type="password" id="new_password" name="new_password" minlength="8" autocomplete="new-password" required></div><div class="field"><label for="confirm_password">Confirm new password</label><input type="password" id="confirm_password" name="confirm_password" minlength="8" autocomplete="new-password" required></div><button class="btn btn-primary" type="submit">Save new password</button></form></div></div>
<?php render_footer(); ?>
