<?php
declare(strict_types=1);

function e(mixed $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function redirect(string $path): never
{
    header('Location: ' . $path);
    exit;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

function verify_csrf(): void
{
    $provided = (string)($_POST['csrf_token'] ?? '');
    if ($provided === '' || !hash_equals(csrf_token(), $provided)) {
        http_response_code(419);
        exit('This form expired or is invalid. Go back, refresh the page, and try again.');
    }
}

function set_flash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function take_flash(): ?array
{
    if (empty($_SESSION['flash'])) return null;
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

function current_user(PDO $pdo): ?array
{
    if (empty($_SESSION['user_id'])) return null;

    if (!empty($_SESSION['last_activity']) && (time() - (int)$_SESSION['last_activity']) > SESSION_IDLE_SECONDS) {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
        return null;
    }
    $_SESSION['last_activity'] = time();

    $stmt = $pdo->prepare('SELECT id, username, student_id, full_name, program, year_level, role, status FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user || ($user['role'] === 'student' && $user['status'] !== 'approved')) {
        $_SESSION = [];
        return null;
    }
    return $user;
}

function require_login(PDO $pdo): array
{
    $user = current_user($pdo);
    if (!$user) {
        set_flash('info', 'Please sign in to continue.');
        redirect('index.php');
    }
    return $user;
}

function require_admin(PDO $pdo): array
{
    $user = require_login($pdo);
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        exit('Access denied. This page is for the school Admin/Teacher only.');
    }
    return $user;
}

function audit(PDO $pdo, ?int $actorId, string $action, string $targetType = '', ?int $targetId = null, string $details = ''): void
{
    try {
        $stmt = $pdo->prepare('INSERT INTO activity_logs (actor_user_id, action_name, target_type, target_id, details, ip_address, activity_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$actorId, $action, $targetType, $targetId, substr($details, 0, 500), substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45)]);
    } catch (Throwable $exception) {
        // Logging must not break the main action. The app will still show errors from the main operation.
    }
}

function status_label(string $status): string
{
    return match ($status) {
        'pending' => 'Pending review',
        'approved' => 'Approved',
        'rejected' => 'Rejected',
        'correction_required' => 'Correction required',
        'open' => 'Open',
        'matched' => 'Matched',
        'closed' => 'Closed',
        'available_for_claim' => 'Available for claim',
        'claim_under_review' => 'Claim under review',
        'returned' => 'Returned',
        default => ucwords(str_replace('_', ' ', $status)),
    };
}

function status_class(string $status): string
{
    return match ($status) {
        'approved', 'returned', 'closed' => 'success',
        'pending', 'claim_under_review', 'matched', 'correction_required' => 'warning',
        'rejected' => 'danger',
        'open', 'available_for_claim' => 'info',
        default => 'neutral',
    };
}

function private_image_url(string $type, int $id): string
{
    return 'private_media.php?type=' . rawurlencode($type) . '&id=' . $id;
}

function save_image_data_url(string $dataUrl, string $folder, string $prefix): ?string
{
    if ($dataUrl === '') return null;
    if (!preg_match('#^data:image/(jpeg|jpg|png|webp);base64,#i', $dataUrl, $match)) {
        throw new RuntimeException('Please capture an image using the camera. Only JPEG, PNG, or WebP images are allowed.');
    }
    $base64 = substr($dataUrl, strpos($dataUrl, ',') + 1);
    $binary = base64_decode($base64, true);
    if ($binary === false || strlen($binary) < 1000) {
        throw new RuntimeException('The captured photo is invalid. Please retake the photo.');
    }
    if (strlen($binary) > MAX_IMAGE_BYTES) {
        throw new RuntimeException('The photo is too large. Please retake it with a smaller image size.');
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->buffer($binary);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) {
        throw new RuntimeException('The photo type could not be verified. Please capture the image again.');
    }

    $relativeFolder = trim($folder, '/\\');
    $absoluteFolder = __DIR__ . '/storage/private/' . $relativeFolder;
    if (!is_dir($absoluteFolder) && !mkdir($absoluteFolder, 0750, true) && !is_dir($absoluteFolder)) {
        throw new RuntimeException('The private photo folder could not be created. Check your folder permissions.');
    }
    $filename = $prefix . '_' . bin2hex(random_bytes(12)) . '.' . $extensions[$mime];
    $absolutePath = $absoluteFolder . DIRECTORY_SEPARATOR . $filename;
    if (file_put_contents($absolutePath, $binary, LOCK_EX) === false) {
        throw new RuntimeException('The photo could not be saved. Check your folder permissions.');
    }
    return $relativeFolder . '/' . $filename;
}


function save_uploaded_image(array $file, string $folder, string $prefix): ?string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) throw new RuntimeException('The image upload failed. Please try again.');
    if ((int)($file['size'] ?? 0) > MAX_IMAGE_BYTES) throw new RuntimeException('Image must be 5 MB or smaller.');
    $tmp = (string)($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) throw new RuntimeException('The uploaded image could not be verified.');
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) throw new RuntimeException('Only JPEG, PNG, or WebP photos are accepted.');
    $relativeFolder = trim($folder, '/\\');
    $absoluteFolder = __DIR__ . '/storage/private/' . $relativeFolder;
    if (!is_dir($absoluteFolder) && !mkdir($absoluteFolder, 0750, true) && !is_dir($absoluteFolder)) throw new RuntimeException('The photo folder could not be created.');
    $filename = $prefix . '_' . bin2hex(random_bytes(12)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($tmp, $absoluteFolder . DIRECTORY_SEPARATOR . $filename)) throw new RuntimeException('The photo could not be saved. Check folder permissions.');
    return $relativeFolder . '/' . $filename;
}


function duplicate_private_image(?string $relativePath, string $prefix): ?string
{
    if (!$relativePath) return null;
    $base = realpath(__DIR__ . '/storage/private');
    if (!$base) throw new RuntimeException('Private image storage is not available.');
    $relative = str_replace('\\', '/', trim($relativePath));
    if ($relative === '' || str_starts_with($relative, '/') || str_contains($relative, '..')) throw new RuntimeException('The image path is invalid.');
    $source = realpath($base . DIRECTORY_SEPARATOR . $relative);
    if (!$source || !str_starts_with($source, $base . DIRECTORY_SEPARATOR) || !is_file($source)) throw new RuntimeException('The existing item photo could not be found.');
    $ext = strtolower(pathinfo($source, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp'], true)) throw new RuntimeException('The existing item photo type is not supported.');
    $folder = $base . DIRECTORY_SEPARATOR . 'items';
    if (!is_dir($folder) && !mkdir($folder, 0750, true) && !is_dir($folder)) throw new RuntimeException('Could not create the private item photo folder.');
    $filename = preg_replace('/[^a-z0-9_-]/i', '', $prefix) . '_' . bin2hex(random_bytes(10)) . '.' . $ext;
    if (!copy($source, $folder . DIRECTORY_SEPARATOR . $filename)) throw new RuntimeException('Could not copy the item photo.');
    return 'items/' . $filename;
}

function archive_to_recycle(PDO $pdo, string $entityType, ?int $originalId, array $payload, ?int $deletedBy): int
{
    if (!in_array($entityType, ['item', 'account', 'handover'], true)) {
        throw new InvalidArgumentException('Invalid recycle-bin record type.');
    }
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) throw new RuntimeException('The record could not be prepared for the recycle bin.');
    $stmt = $pdo->prepare('INSERT INTO recycle_bin (entity_type, original_id, payload_json, deleted_by, deleted_at) VALUES (?, ?, ?, ?, NOW())');
    $stmt->execute([$entityType, $originalId, $json, $deletedBy]);
    return (int)$pdo->lastInsertId();
}

function purge_payload_media(array $payload): void
{
    $base = realpath(__DIR__ . '/storage/private');
    if (!$base) return;
    foreach (['id_photo_path', 'selfie_photo_path', 'image_path'] as $key) {
        $relative = str_replace('\\', '/', trim((string)($payload[$key] ?? '')));
        if ($relative === '' || str_contains($relative, '..') || str_starts_with($relative, '/')) continue;
        $target = realpath($base . DIRECTORY_SEPARATOR . $relative);
        if ($target && str_starts_with($target, $base . DIRECTORY_SEPARATOR) && is_file($target)) @unlink($target);
    }
}

function purge_expired_recycle_bin(PDO $pdo): int
{
    $stmt = $pdo->query("SELECT id, entity_type, payload_json FROM recycle_bin WHERE deleted_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    $expired = $stmt->fetchAll();
    if (!$expired) return 0;
    $delete = $pdo->prepare('DELETE FROM recycle_bin WHERE id=?');
    foreach ($expired as $entry) {
        $payload = json_decode((string)$entry['payload_json'], true);
        if (is_array($payload)) purge_payload_media($payload);
        $delete->execute([(int)$entry['id']]);
    }
    return count($expired);
}

function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        http_response_code(405);
        header('Allow: POST');
        exit('POST required.');
    }
}

function render_header(string $title, string $active = ''): void
{
    global $pdo;
    $user = current_user($pdo);
    if ($user && $user['role'] === 'admin' && function_exists('purge_expired_recycle_bin')) { try { purge_expired_recycle_bin($pdo); } catch (Throwable $ignore) {} }
    $flash = take_flash();
    $studentNav = [
        'lost' => ['lost-items.php', 'Lost Items', '◉'],
        'found' => ['found-items.php', 'Found Items', '◇'],
    ];
    $adminNav = [
        'overview' => ['admin-dashboard.php', 'Overview', '⌂'],
        'applications' => ['admin-applications.php', 'Student Approval', '✓'],
        'items' => ['admin-items.php', 'Manage Items', '▦'],
        'handovers' => ['handovers.php', 'Claim & Handover', '↗'],
        'accounts' => ['admin-accounts.php', 'Student Accounts', '♙'],
        'recycle' => ['recycle-bin.php', 'Recycle Bin', '♲'],
        'settings' => ['admin-settings.php', 'Settings', '⚙'],
        'connection' => ['connection-test.php', 'Phone / Laptop Test', '↔'],
        'reports' => ['reports.php', 'Reports & Logs', '▤'],
    ];
    ?>
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
      <meta name="theme-color" content="#071426">
      <title><?= e($title) ?> · FindIT Campus</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="assets/styles.css?v=20261020-live-2">
      <link rel="manifest" href="manifest.webmanifest">
      <link rel="apple-touch-icon" href="assets/icons/icon-192.png">
    </head>
    <body>
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="<?= $user ? ($user['role'] === 'admin' ? 'admin-dashboard.php' : 'lost-items.php') : 'index.php' ?>">
          <img class="brand-seal" src="assets/brand/ave-maria-college-logo.png" alt="Ave Maria College logo">
          <span class="brand-copy"><strong>FindIT<span>Campus</span></strong><small>AVE MARIA COLLEGE · SCHOOL LOST &amp; FOUND</small></span>
        </a>
        <?php if ($user): ?>
          <nav class="top-nav" aria-label="Main navigation">
            <?php foreach (($user['role'] === 'admin' ? $adminNav : $studentNav) as $key => $item): ?>
              <a class="nav-link <?= $active === $key ? 'active' : '' ?>" href="<?= e($item[0]) ?>"><span class="nav-icon"><?= e($item[2]) ?></span><?= e($item[1]) ?></a>
            <?php endforeach; ?>
          </nav>
          <div class="user-menu">
            <span class="avatar"><?= e(strtoupper(substr((string)$user['full_name'], 0, 1))) ?></span>
            <span class="user-copy"><strong><?= e($user['full_name']) ?></strong><small><?= $user['role'] === 'admin' ? 'Admin / Teacher' : e($user['program'] ?: 'Student') ?></small></span>
            <a class="password-link" href="change-password.php" title="Change password">Password</a><?php if ($user['role'] === 'admin'): ?><a class="password-link" href="admin-settings.php" title="Admin settings">Settings</a><?php else: ?><a class="password-link" href="delete-account.php" title="Delete account">Delete account</a><?php endif; ?><a class="signout" href="logout.php" title="Sign out" aria-label="Sign out">↗</a>
          </div>
          <button class="mobile-menu-btn" type="button" aria-label="Toggle navigation" onclick="document.body.classList.toggle('nav-open')">☰</button>
        <?php else: ?>
          <div class="topbar-right"><span class="secure-label"><span class="secure-dot"></span> School community portal</span><a class="btn btn-outline btn-small" href="index.php">Sign in</a></div>
        <?php endif; ?>
      </header>
      <?php if ($user): ?>
        <nav class="mobile-nav" aria-label="Mobile navigation">
          <?php foreach (($user['role'] === 'admin' ? $adminNav : $studentNav) as $key => $item): ?>
            <a class="nav-link <?= $active === $key ? 'active' : '' ?>" href="<?= e($item[0]) ?>"><span class="nav-icon"><?= e($item[2]) ?></span><?= e($item[1]) ?></a>
          <?php endforeach; ?>
          <a class="nav-link" href="change-password.php"><span class="nav-icon">⌑</span>Change password</a><?php if ($user['role'] === 'student'): ?><a class="nav-link" href="delete-account.php"><span class="nav-icon">♲</span>Delete account</a><?php endif; ?><a class="nav-link" href="logout.php"><span class="nav-icon">↗</span>Sign out</a>
        </nav>
      <?php endif; ?>
      <main class="page-content">
        <?php if ($flash): ?><div class="alert alert-<?= e($flash['type']) ?>"><span><?= e($flash['message']) ?></span><button type="button" aria-label="Dismiss" onclick="this.parentElement.remove()">×</button></div><?php endif; ?>
    <?php
}

function render_footer(): void
{
    ?>
      </main>
      <footer class="site-footer"><span>© <?= date('Y') ?> FindIT Campus</span><span>Lost it? Find it. Return it with care.</span></footer>
    </div>
    <script src="assets/app.js?v=20261020-live-2"></script>
    <script src="assets/pwa.js?v=20261020-live-2"></script>
    </body>
    </html>
    <?php
}
