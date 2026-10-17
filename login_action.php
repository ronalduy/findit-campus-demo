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
    set_flash('danger', 'Too many unsuccessful sign-in attempts. Please wait 15 minutes and try again.');
    redirect('index.php');
}
$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? OR student_id = ? LIMIT 1');
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();
if (!$user || !password_verify($password, $user['password_hash'])) {
    $failures = (int)($attempt['failed_attempts'] ?? 0) + 1;
    $lockedUntil = $failures >= 5 ? date('Y-m-d H:i:s', time() + 900) : null;
    $upsert = $pdo->prepare('INSERT INTO login_attempts (login_key, failed_attempts, locked_until, last_attempt_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE failed_attempts = VALUES(failed_attempts), locked_until = VALUES(locked_until), last_attempt_at = NOW()');
    $upsert->execute([$key, $failures, $lockedUntil]);
    audit($pdo, $user ? (int)$user['id'] : null, 'login_failed', 'user', $user ? (int)$user['id'] : null, 'Failed sign-in attempt');
    set_flash('danger', 'Incorrect login details. Check your ID/username and password.');
    redirect('index.php');
}
if ($user['role'] === 'student' && $user['status'] !== 'approved') {
    $messages = [
        'pending' => 'Your application is waiting for Admin/Teacher approval.',
        'rejected' => 'Your application was rejected. Contact the school office for help.',
        'correction_required' => 'The school requested a correction. Use the Check application / correction link on the sign-in page, or contact the school office.',
    ];
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
