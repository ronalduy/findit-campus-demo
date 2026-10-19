<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$user=require_login($pdo);
if ($user['role']!=='student') { set_flash('danger','The Admin account cannot be deleted from this page.'); redirect('admin-dashboard.php'); }
if ($_SERVER['REQUEST_METHOD']==='POST') {
    verify_csrf(); $password=(string)($_POST['password'] ?? ''); $confirm=(string)($_POST['confirm_delete'] ?? '');
    $st=$pdo->prepare('SELECT * FROM users WHERE id=? AND role=\'student\' LIMIT 1'); $st->execute([(int)$user['id']]); $student=$st->fetch();
    if (!$student || !password_verify($password,(string)$student['password_hash'])) set_flash('danger','Your password is incorrect.');
    elseif ($confirm!=='DELETE') set_flash('danger','Type DELETE exactly to confirm account deletion.');
    else {
        $pdo->beginTransaction();
        try {
            archive_to_recycle($pdo,'account',(int)$student['id'],$student,(int)$student['id']);
            audit($pdo,(int)$student['id'],'student_self_deleted','user',(int)$student['id'],'Student deleted own account; archived for 30 days.');
            $pdo->prepare('DELETE FROM users WHERE id=? AND role=\'student\'')->execute([(int)$student['id']]);
            $keys=array_filter([strtolower((string)$student['student_id']),strtolower((string)$student['username'])]);
            if ($keys) { $ph=implode(',',array_fill(0,count($keys),'?')); $pdo->prepare("DELETE FROM login_attempts WHERE login_key IN ($ph)")->execute(array_values($keys)); }
            $pdo->commit(); $_SESSION=[]; if(session_status()===PHP_SESSION_ACTIVE)session_destroy(); header('Location: index.php?account_deleted=1'); exit;
        } catch(Throwable $ex) { if($pdo->inTransaction())$pdo->rollBack(); set_flash('danger','The account could not be deleted. Please contact the school Admin/Teacher.'); }
    }
}
render_header('Delete account');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> ACCOUNT CONTROL</div><h1>Delete my account</h1><p>Your account will be removed from active use and kept in the Recycle Bin for 30 days before its stored photos and record are permanently purged.</p></div></div>
<div class="panel narrow-panel"><div class="panel-heading-row"><div><h2>Confirm account deletion</h2><p>This action signs you out and prevents further login.</p></div><span class="heading-icon">♲</span></div><div class="panel-body"><div class="notice notice-blue"><span class="notice-icon">i</span><p>If you forgot your password, do not delete your account just to reset it. Bring your school ID to the Admin/Teacher and ask for account recovery.</p></div><form method="post" class="form-stack"><?=csrf_field()?><div class="field"><label for="password">Current password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><div class="field"><label for="confirm_delete">Type DELETE to confirm</label><input id="confirm_delete" name="confirm_delete" required autocomplete="off" placeholder="DELETE"></div><button type="submit" class="btn btn-danger">Delete my account</button><a href="lost-items.php" class="btn btn-outline">Cancel</a></form></div></div>
<?php render_footer(); ?>
