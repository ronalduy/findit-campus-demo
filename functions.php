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

    $stmt = $pdo->prepare('SELECT id, username, student_id, full_name, program, role, status FROM users WHERE id = ? LIMIT 1');
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

function render_header(string $title, string $active = ''): void
{
    global $pdo;
    $user = current_user($pdo);
    $flash = take_flash();
    $studentNav = [
        'lost' => ['lost-items.php', 'Lost Items', '◉'],
        'found' => ['found-items.php', 'Found Items', '◇'],
    ];
    $adminNav = [
        'overview' => ['admin-dashboard.php', 'Overview', '⌂'],
        'applications' => ['admin-applications.php', 'Student Approval', '✓'],
        'items' => ['admin-items.php', 'Manage Items', '▦'],
        'handovers' => ['handovers.php', 'Handover Records', '↗'],
        'reports' => ['reports.php', 'Reports & Logs', '▤'],
    ];
    ?>
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
      <meta name="theme-color" content="#071426">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="apple-mobile-web-app-title" content="FindIT Campus">
      <link rel="manifest" href="manifest.webmanifest">
      <link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32.png">
      <link rel="icon" type="image/png" sizes="192x192" href="assets/icons/icon-192.png">
      <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
      <title><?= e($title) ?> · FindIT Campus</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="assets/styles.css?v=20261017-logo-install2">
    </head>
    <body>
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="<?= $user ? ($user['role'] === 'admin' ? 'admin-dashboard.php' : 'lost-items.php') : 'index.php' ?>">
          <span class="brand-mark brand-mark-logo"><img src="assets/brand/ave-maria-college-logo.png" alt="Ave Maria College seal"></span>
          <span class="brand-copy"><strong>FindIT<span>Campus</span></strong><small>School Lost &amp; Found</small></span>
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
            <a class="password-link" href="change-password.php" title="Change password">Password</a><a class="signout" href="logout.php" title="Sign out" aria-label="Sign out">↗</a>
          </div>
          <button class="mobile-menu-btn" type="button" aria-label="Toggle navigation" onclick="document.body.classList.toggle('nav-open')">☰</button>
        <?php else: ?>
          <div class="topbar-right"><span class="secure-label"><span class="secure-dot"></span> School community portal</span><button class="btn btn-primary btn-small pwa-install-trigger" type="button" aria-label="Install FindIT Campus">⬇ <span>Install App</span></button><a class="btn btn-outline btn-small" href="index.php">Sign in</a></div>
        <?php endif; ?>
      </header>
      <?php if ($user): ?>
        <nav class="mobile-nav" aria-label="Mobile navigation">
          <?php foreach (($user['role'] === 'admin' ? $adminNav : $studentNav) as $key => $item): ?>
            <a class="nav-link <?= $active === $key ? 'active' : '' ?>" href="<?= e($item[0]) ?>"><span class="nav-icon"><?= e($item[2]) ?></span><?= e($item[1]) ?></a>
          <?php endforeach; ?>
          <a class="nav-link" href="change-password.php"><span class="nav-icon">⌑</span>Change password</a><a class="nav-link" href="logout.php"><span class="nav-icon">↗</span>Sign out</a>
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
    <aside class="pwa-install-card" id="pwa-install-card" hidden aria-live="polite" role="status">
      <img class="pwa-install-logo" src="assets/icons/icon-192.png" alt="Ave Maria College logo">
      <div class="pwa-install-copy"><strong id="pwa-install-title">Install FindIT Campus</strong><small id="pwa-install-description">Add the school portal to your phone home screen.</small></div>
      <button class="pwa-dismiss-btn" type="button" id="pwa-install-dismiss" aria-label="Close install instructions">×</button>
    </aside>
    <script src="assets/app.js?v=20261017-logo-install2"></script>
    <script src="assets/pwa.js?v=20261017-pwa2"></script>
    </body>
    </html>
    <?php
}
