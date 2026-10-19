<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$admin = require_admin($pdo);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirect('admin-applications.php');
verify_csrf();
$userId = (int)($_POST['user_id'] ?? 0);
$decision = (string)($_POST['decision'] ?? '');
$note = trim((string)($_POST['review_note'] ?? ''));
if (!in_array($decision, ['approve','reject','correction_required'], true)) { set_flash('danger','Invalid review action.'); redirect('admin-applications.php'); }
if ($decision !== 'approve' && $note === '') { set_flash('danger','Add a short reason when requesting a correction or rejecting an application.'); redirect('admin-applications.php#application-' . $userId); }
$status = match($decision) { 'approve' => 'approved', 'reject' => 'rejected', default => 'correction_required' };
$stmt = $pdo->prepare("SELECT * FROM users WHERE id=? LIMIT 1"); $stmt->execute([$userId]); $app = $stmt->fetch();
if (!$app || $app['role'] !== 'student' || !in_array($app['status'], ['pending','correction_required'], true)) { set_flash('danger','This application is no longer waiting for review.'); redirect('admin-applications.php'); }
if ($decision === 'reject') {
    $pdo->beginTransaction();
    try {
        $snapshot = $app; $snapshot['status'] = 'rejected'; $snapshot['reviewed_by'] = (int)$admin['id']; $snapshot['reviewed_at'] = date('Y-m-d H:i:s'); $snapshot['review_note'] = $note;
        archive_to_recycle($pdo, 'account', (int)$app['id'], $snapshot, (int)$admin['id']);
        $delete = $pdo->prepare("DELETE FROM users WHERE id=? AND role='student'"); $delete->execute([$userId]);
        audit($pdo, (int)$admin['id'], 'student_application_rejected_archived', 'user', $userId, 'Student ID ' . $app['student_id'] . '; rejected and moved to recycle bin for 30 days. ' . $note);
        $pdo->commit();
        set_flash('success','Application rejected and archived for 30 days. The Student ID is now available for a new application.');
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        set_flash('danger','The rejected application could not be archived. Please try again.');
    }
    redirect('admin-applications.php');
}
$update = $pdo->prepare('UPDATE users SET status=?, reviewed_by=?, reviewed_at=NOW(), review_note=? WHERE id=?');
$update->execute([$status, (int)$admin['id'], $note ?: null, $userId]);
audit($pdo, (int)$admin['id'], 'student_application_' . $status, 'user', $userId, 'Student ID ' . $app['student_id'] . '; ' . $note);
set_flash('success', $status === 'approved' ? 'Student account approved. The student can now sign in with their student ID and password.' : 'Correction requested. The application, password, photos, and Student ID are kept so the student can sign in and correct the same application.');
redirect('admin-applications.php');
