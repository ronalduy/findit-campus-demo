<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$user = current_user($pdo);
$correctionUserId = (int)($_SESSION['correction_user_id'] ?? 0);
if (!$user && !$correctionUserId) { http_response_code(403); exit('Sign in required.'); }
$type = (string)($_GET['type'] ?? '');
$id = (int)($_GET['id'] ?? 0);
$path = null;
if (in_array($type, ['id','selfie'], true)) {
    if ((!$user || $user['role'] !== 'admin') && (!$user || (int)$user['id'] !== $id) && $correctionUserId !== $id) { http_response_code(403); exit('Only the account owner or authorized school staff can view this photo.'); }
    $column = $type === 'id' ? 'id_photo_path' : 'selfie_photo_path';
    $stmt = $pdo->prepare("SELECT {$column} AS path FROM users WHERE id=? AND role='student' LIMIT 1"); $stmt->execute([$id]);
    $row = $stmt->fetch(); $path = $row['path'] ?? null;
} elseif ($type === 'item') {
    if (!$user) { http_response_code(403); exit('Sign in required.'); }
    $stmt = $pdo->prepare('SELECT image_path AS path FROM items WHERE id=? LIMIT 1'); $stmt->execute([$id]);
    $row = $stmt->fetch(); $path = $row['path'] ?? null;
} else { http_response_code(400); exit('Invalid photo request.'); }
if (!$path) { http_response_code(404); exit('Photo not found.'); }
$base = realpath(__DIR__ . '/storage/private');
$absolute = realpath(__DIR__ . '/storage/private/' . ltrim($path, '/\\'));
if (!$base || !$absolute || !str_starts_with($absolute, $base . DIRECTORY_SEPARATOR) || !is_file($absolute)) { http_response_code(404); exit('Photo not found.'); }
$finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->file($absolute);
if (!in_array($mime, ['image/jpeg','image/png','image/webp'], true)) { http_response_code(415); exit('Unsupported photo type.'); }
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($absolute));
header('Cache-Control: private, no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
readfile($absolute);
exit;
