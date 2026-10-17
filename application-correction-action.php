<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirect('application-status.php');
verify_csrf();
$userId = (int)($_SESSION['correction_user_id'] ?? 0);
if (!$userId) { set_flash('danger','Check your application status first.'); redirect('application-status.php'); }
$stmt = $pdo->prepare("SELECT * FROM users WHERE id=? AND role='student' AND status='correction_required' LIMIT 1"); $stmt->execute([$userId]); $user = $stmt->fetch();
if (!$user) { unset($_SESSION['correction_user_id']); set_flash('danger','This application is no longer waiting for correction.'); redirect('application-status.php'); }
$studentId = trim((string)($_POST['student_id'] ?? '')); $fullName = trim((string)($_POST['full_name'] ?? '')); $program = trim((string)($_POST['program'] ?? '')); $consent = isset($_POST['consent_privacy']) ? 1 : 0;
if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9 .\/-]{2,79}$/', $studentId) || strlen($fullName)<3 || strlen($program)<2 || !$consent) { set_flash('danger','Check the Student ID, full name, program, and privacy confirmation.'); redirect('application-status.php'); }
$dupe = $pdo->prepare('SELECT id FROM users WHERE student_id=? AND id<>? LIMIT 1'); $dupe->execute([$studentId,$userId]);
if ($dupe->fetch()) { set_flash('danger','That Student ID is already assigned to another account. Contact the school office.'); redirect('application-status.php'); }
$newIdPath = null; $newSelfiePath = null;
try {
    $idData = (string)($_POST['id_photo_data'] ?? ''); $selfieData = (string)($_POST['selfie_photo_data'] ?? '');
    if ($idData !== '') $newIdPath = save_image_data_url($idData,'registrations','school_id');
    if ($selfieData !== '') $newSelfiePath = save_image_data_url($selfieData,'registrations','selfie');
    $pdo->beginTransaction();
    $update = $pdo->prepare("UPDATE users SET student_id=?, full_name=?, program=?, status='pending', review_note=NULL, reviewed_by=NULL, reviewed_at=NULL, consent_privacy=?, id_photo_path=COALESCE(?,id_photo_path), selfie_photo_path=COALESCE(?,selfie_photo_path) WHERE id=?");
    $update->execute([$studentId,$fullName,$program,$consent,$newIdPath,$newSelfiePath,$userId]);
    audit($pdo,$userId,'student_application_resubmitted','user',$userId,'Application corrected and resubmitted for review');
    $pdo->commit();
    if ($newIdPath && $user['id_photo_path'] && is_file(__DIR__.'/storage/private/'.$user['id_photo_path'])) @unlink(__DIR__.'/storage/private/'.$user['id_photo_path']);
    if ($newSelfiePath && $user['selfie_photo_path'] && is_file(__DIR__.'/storage/private/'.$user['selfie_photo_path'])) @unlink(__DIR__.'/storage/private/'.$user['selfie_photo_path']);
    unset($_SESSION['correction_user_id']); $_SESSION['application_lookup_user_id'] = $userId;
    set_flash('success','Your corrected application was resubmitted. It is Pending until the Admin/Teacher reviews it again.');
    redirect('application-status.php');
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($newIdPath && is_file(__DIR__.'/storage/private/'.$newIdPath)) @unlink(__DIR__.'/storage/private/'.$newIdPath);
    if ($newSelfiePath && is_file(__DIR__.'/storage/private/'.$newSelfiePath)) @unlink(__DIR__.'/storage/private/'.$newSelfiePath);
    set_flash('danger','The correction could not be saved. Please try again or contact the school office.'); redirect('application-status.php');
}
