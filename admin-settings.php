<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$admin = require_admin($pdo);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $username = trim((string)($_POST['username'] ?? ''));
    $currentPassword = (string)($_POST['current_password'] ?? '');
    $check = $pdo->prepare('SELECT password_hash, username FROM users WHERE id=? AND role=\'admin\' LIMIT 1');
    $check->execute([(int)$admin['id']]); $account = $check->fetch();
    if (!$account || !password_verify($currentPassword, (string)$account['password_hash'])) {
        set_flash('danger', 'Current password is incorrect.');
    } elseif (!preg_match('/^[A-Za-z0-9._-]{3,60}$/', $username)) {
        set_flash('danger', 'Username must be 3–60 characters and may use letters, numbers, dots, underscores, and hyphens.');
    } else {
        $dup = $pdo->prepare('SELECT id FROM users WHERE username=? AND id<>? LIMIT 1'); $dup->execute([$username,(int)$admin['id']]);
        if ($dup->fetch()) set_flash('danger', 'That username is already in use.');
        else {
            $pdo->prepare('UPDATE users SET username=? WHERE id=? AND role=\'admin\'')->execute([$username,(int)$admin['id']]);
            audit($pdo,(int)$admin['id'],'admin_username_changed','user',(int)$admin['id'],'Admin username changed from ' . (string)$account['username'] . ' to ' . $username);
            set_flash('success','Admin username updated. Use the new username on your next sign-in.');
            redirect('admin-settings.php');
        }
    }
}
$st=$pdo->prepare('SELECT username,full_name FROM users WHERE id=?'); $st->execute([(int)$admin['id']]); $fresh=$st->fetch();
render_header('Admin settings','settings');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> ACCOUNT SETTINGS</div><h1>Admin settings</h1><p>Change the Admin username. Use the Change password link to update the password separately.</p></div></div>
<div class="panel narrow-panel"><div class="panel-heading-row"><div><h2>Admin login name</h2><p>Current display name: <?= e($fresh['full_name'] ?? 'School Administrator') ?></p></div><span class="heading-icon">⚙</span></div><div class="panel-body"><form method="post" class="form-stack"><?= csrf_field() ?><div class="field"><label for="username">Admin username</label><input id="username" name="username" value="<?= e($fresh['username'] ?? 'admin') ?>" required minlength="3" maxlength="60" pattern="[A-Za-z0-9._-]{3,60}" autocomplete="username"><small class="field-help">Use 3–60 letters, numbers, dots, underscores, or hyphens.</small></div><div class="field"><label for="current_password">Confirm current password</label><input id="current_password" name="current_password" type="password" required autocomplete="current-password"></div><button class="btn btn-primary" type="submit">Save admin username</button></form><div class="notice notice-blue" style="margin-top:18px"><span class="notice-icon">i</span><p>For security, this change takes effect immediately. Your current session stays open, but use the new username next time you sign in.</p></div><a class="btn btn-outline" href="change-password.php">Change admin password</a></div></div>
<?php render_footer(); ?>
