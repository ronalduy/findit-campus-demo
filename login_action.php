<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirect('index.php');
verify_csrf();
$identifier = trim((string)($_POST['identifier'] ?? ''));
$password = (string)($_POST['password'] ?? '');
if ($identifier === '' || $password === '') {
    set_flash('danger', 'Enter your student ID or admin username and password.');
    redirect('index.php');
}
$key = strtolower($identifier);
$stmt = $pdo->prepare('SELECT failed_attempts, locked_until FROM login_attempts WHERE login_key = ?');
$stmt->execute([$key]);
$attempt = $stmt->fetch();
if ($attempt && $attempt['locked_until'] && strtotime($attempt['locked_until']) > time()) {
    $remaining = max(1, strtotime($attempt['locked_until']) - time());
    set_flash('danger', 'Too many unsuccessful sign-in attempts. Please wait ' . $remaining . ' second(s) and try again.');
    redirect('index.php');
}
$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? OR student_id = ? LIMIT 1');
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();
if (!$user || !password_verify($password, $user['password_hash'])) {
    $previousFailures = (int)($attempt['failed_attempts'] ?? 0);
    if ($attempt && !empty($attempt['locked_until']) && strtotime($attempt['locked_until']) <= time()) $previousFailures = 0;
    $failures = $previousFailures + 1;
    $lockedUntil = $failures >= 3 ? date('Y-m-d H:i:s', time() + 60) : null;
    $upsert = $pdo->prepare('INSERT INTO login_attempts (login_key, failed_attempts, locked_until, last_attempt_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE failed_attempts = VALUES(failed_attempts), locked_until = VALUES(locked_until), last_attempt_at = NOW()');
    $upsert->execute([$key, $failures, $lockedUntil]);
    audit($pdo, $user ? (int)$user['id'] : null, 'login_failed', 'user', $user ? (int)$user['id'] : null, 'Failed sign-in attempt');
    set_flash('danger', $failures >= 3 ? 'Three failed sign-in attempts. Please wait 1 minute before trying again.' : 'Incorrect login details. Check your ID/username and password.');
    redirect('index.php');
}
if ($user['role'] === 'student' && $user['status'] !== 'approved') {
    if ($user['status'] === 'correction_required') {
        $_SESSION['correction_user_id'] = (int)$user['id'];
        set_flash('warning', 'The Admin/Teacher requested a correction. Review the note and resubmit the same application. Your account and Student ID were kept.');
        redirect('application-status.php');
    }
    $messages = ['pending' => 'Your application is waiting for Admin/Teacher approval.', 'rejected' => 'This application was rejected. Submit a new application or contact the school office.'];
    set_flash('warning', $messages[$user['status']] ?? 'Your account is not approved yet.');
    redirect('index.php');
}
$pdo->prepare('DELETE FROM login_attempts WHERE login_key = ?')->execute([$key]);
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['last_activity'] = time();
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
audit($pdo, (int)$user['id'], 'login_success', 'user', (int)$user['id'], 'Successful sign-in');
redirect($user['role'] === 'admin' ? 'admin-dashboard.php' : 'lost-items.php');
