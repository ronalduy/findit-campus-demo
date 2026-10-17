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
$stmt = $pdo->prepare("SELECT id, role, status, student_id FROM users WHERE id=? LIMIT 1"); $stmt->execute([$userId]); $app = $stmt->fetch();
if (!$app || $app['role'] !== 'student' || !in_array($app['status'], ['pending','correction_required'], true)) { set_flash('danger','This application is no longer waiting for review.'); redirect('admin-applications.php'); }
$update = $pdo->prepare('UPDATE users SET status=?, reviewed_by=?, reviewed_at=NOW(), review_note=? WHERE id=?');
$update->execute([$status, (int)$admin['id'], $note ?: null, $userId]);
audit($pdo, (int)$admin['id'], 'student_application_' . $status, 'user', $userId, 'Student ID ' . $app['student_id'] . '; ' . $note);
set_flash('success', $status === 'approved' ? 'Student account approved. The student can now sign in with their student ID and password.' : ($status === 'rejected' ? 'Student application rejected.' : 'Correction requested. The student cannot sign in until the account is approved.'));
redirect('admin-applications.php');
