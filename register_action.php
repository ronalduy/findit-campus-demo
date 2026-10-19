<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirect('register.php');
verify_csrf();
$studentId = trim((string)($_POST['student_id'] ?? ''));
$fullName = trim((string)($_POST['full_name'] ?? ''));
$program = trim((string)($_POST['program'] ?? ''));
$yearLevel = trim((string)($_POST['year_level'] ?? ''));
$password = (string)($_POST['password'] ?? '');
$confirm = (string)($_POST['confirm_password'] ?? '');
$idData = (string)($_POST['id_photo_data'] ?? '');
$selfieData = (string)($_POST['selfie_photo_data'] ?? '');
$consent = isset($_POST['consent_privacy']) ? 1 : 0;

if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9 .\/-]{2,79}$/', $studentId)) {
    set_flash('danger', 'Check your student ID number. Use the exact ID printed on your school ID.'); redirect('register.php');
}
if (strlen($fullName) < 3 || strlen($fullName) > 160 || !preg_match('/^[\p{L}\p{M}][\p{L}\p{M} .\'-]+$/u', $fullName)) {
    set_flash('danger', 'Enter your full name. Use letters, spaces, apostrophes, periods, or hyphens.'); redirect('register.php');
}
if ($program === '' || strlen($program) > 120) { set_flash('danger', 'Enter your program or course.'); redirect('register.php'); }
if (!in_array($yearLevel, ['SHS','1st Year','2nd Year','3rd Year','4th Year'], true)) { set_flash('danger', 'Select SHS or a valid college year level.'); redirect('register.php'); }
if (strlen($password) < 8) { set_flash('danger', 'Your password must contain at least 8 characters.'); redirect('register.php'); }
if (!hash_equals($password, $confirm)) { set_flash('danger', 'The two passwords do not match.'); redirect('register.php'); }
if (!$consent) { set_flash('danger', 'Please confirm that you have read the school privacy notice.'); redirect('register.php'); }
if ($idData === '' || $selfieData === '') { set_flash('danger', 'Capture both your school ID and live selfie before submitting.'); redirect('register.php'); }

$check = $pdo->prepare('SELECT id FROM users WHERE student_id = ? LIMIT 1');
$check->execute([$studentId]);
if ($check->fetch()) { set_flash('danger', 'That student ID already has an application or account. Contact the school office if this is a mistake.'); redirect('register.php'); }

$idPath = null; $selfiePath = null;
try {
    $idPath = save_image_data_url($idData, 'registrations', 'school_id');
    $selfiePath = save_image_data_url($selfieData, 'registrations', 'selfie');
    $stmt = $pdo->prepare('INSERT INTO users (student_id, full_name, program, year_level, password_hash, role, status, id_photo_path, selfie_photo_path, consent_privacy, created_at) VALUES (?, ?, ?, ?, ?, \'student\', \'pending\', ?, ?, ?, NOW())');
    $stmt->execute([$studentId, $fullName, $program, $yearLevel, password_hash($password, PASSWORD_DEFAULT), $idPath, $selfiePath, $consent]);
    $newId = (int)$pdo->lastInsertId();
    audit($pdo, null, 'student_registration_submitted', 'user', $newId, 'Student application submitted for review');
    set_flash('success', 'Your application was submitted. The school Admin/Teacher must approve it before you can sign in.');
    redirect('index.php');
} catch (Throwable $exception) {
    if ($idPath && is_file(__DIR__ . '/storage/private/' . $idPath)) @unlink(__DIR__ . '/storage/private/' . $idPath);
    if ($selfiePath && is_file(__DIR__ . '/storage/private/' . $selfiePath)) @unlink(__DIR__ . '/storage/private/' . $selfiePath);
    if ($exception instanceof PDOException && $exception->getCode() === '23000') {
        set_flash('danger', 'That student ID already exists. Check the number or contact the school office.');
    } else {
        set_flash('danger', 'Registration could not be completed. Check the photos and try again.');
    }
    redirect('register.php');
}
