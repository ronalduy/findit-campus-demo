<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$admin = require_admin($pdo);
$counts = [];
$counts['pending'] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='student' AND status IN ('pending','correction_required')")->fetchColumn();
$counts['lost'] = (int)$pdo->query("SELECT COUNT(*) FROM items WHERE item_type='lost' AND status IN ('open','matched')")->fetchColumn();
$counts['found'] = (int)$pdo->query("SELECT COUNT(*) FROM items WHERE item_type='found' AND status='available_for_claim'")->fetchColumn();
$counts['returned'] = (int)$pdo->query("SELECT COUNT(*) FROM items WHERE item_type='found' AND status='returned'")->fetchColumn();
$recentItems = $pdo->query('SELECT id, reference_code, item_type, title, category, status, created_at FROM items ORDER BY created_at DESC LIMIT 6')->fetchAll();
$recentUsers = $pdo->query("SELECT id, student_id, full_name, program, created_at FROM users WHERE role='student' AND status IN ('pending','correction_required') ORDER BY created_at ASC LIMIT 5")->fetchAll();
render_header('Admin overview', 'overview');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> SCHOOL ADMINISTRATION</div><h1>Overview <span class="muted">/ Dashboard</span></h1><p>Welcome back, <?= e($admin['full_name']) ?>. Review student applications and keep the school's lost-and-found records up to date.</p></div><div class="header-actions"><a class="btn btn-primary" href="admin-items.php">＋ Post an item</a><a class="btn btn-outline" href="admin-applications.php">Review applications</a></div></div>
<div class="stat-grid">
  <div class="stat-card"><div class="stat-top"><span class="stat-icon amber">♙</span><span class="pill">Needs review</span></div><div class="stat-label">Pending student applications</div><div class="stat-value"><?= number_format($counts['pending']) ?></div><div class="stat-note">ID and selfie verification queue</div></div>
  <div class="stat-card"><div class="stat-top"><span class="stat-icon red">⌕</span><span class="pill">Lost reports</span></div><div class="stat-label">Open / matched lost reports</div><div class="stat-value"><?= number_format($counts['lost']) ?></div><div class="stat-note">Items reported missing</div></div>
  <div class="stat-card"><div class="stat-top"><span class="stat-icon">◇</span><span class="pill">In school custody</span></div><div class="stat-label">Found items available for claim</div><div class="stat-value"><?= number_format($counts['found']) ?></div><div class="stat-note">Claim in person at the office</div></div>
  <div class="stat-card"><div class="stat-top"><span class="stat-icon green">✓</span><span class="pill">Completed</span></div><div class="stat-label">Items already returned</div><div class="stat-value"><?= number_format($counts['returned']) ?></div><div class="stat-note">Recorded handovers</div></div>
</div>
<div class="content-grid">
  <section class="panel"><div class="panel-heading-row"><div><h2>Recent item activity</h2><p>The latest lost and found records entered by staff.</p></div><a class="small-link" href="admin-items.php">Manage all →</a></div>
    <?php if (!$recentItems): ?><div class="empty-state"><div class="empty-icon">◇</div><strong>No items posted yet</strong><p>Use Manage Items to add the first lost report or found item.</p><a class="btn btn-primary btn-small" href="admin-items.php">Post an item</a></div><?php else: ?><div class="table-wrap"><table><thead><tr><th>Item</th><th>Type</th><th>Status</th><th>Date added</th></tr></thead><tbody><?php foreach ($recentItems as $item): ?><tr><td><span class="table-main"><?= e($item['title']) ?></span><span class="table-sub"><?= e($item['reference_code']) ?> · <?= e($item['category']) ?></span></td><td><span class="pill"><?= e(ucfirst($item['item_type'])) ?></span></td><td><span class="status-badge status-<?= e(status_class($item['status'])) ?>"><?= e(status_label($item['status'])) ?></span></td><td><?= e(date('M j, Y', strtotime($item['created_at']))) ?></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?>
  </section>
  <section class="panel"><div class="panel-heading-row"><div><h2>Applications to review</h2><p>Check ID, selfie, and student details.</p></div><a class="small-link" href="admin-applications.php">Open queue →</a></div>
    <?php if (!$recentUsers): ?><div class="empty-state"><div class="empty-icon">✓</div><strong>All caught up</strong><p>There are no student applications waiting for review.</p></div><?php else: ?><div class="panel-body stack"><?php foreach ($recentUsers as $app): ?><div class="mini-application"><span class="avatar"><?= e(strtoupper(substr($app['full_name'],0,1))) ?></span><div class="mini-application-copy"><strong><?= e($app['full_name']) ?></strong><small><?= e($app['student_id']) ?> · <?= e($app['program']) ?></small></div><a class="btn btn-outline btn-small" href="admin-applications.php#application-<?= (int)$app['id'] ?>">Review</a></div><?php endforeach; ?></div><?php endif; ?>
  </section>
</div>
<div class="notice notice-blue"><span class="notice-icon">i</span><p><strong>Manual verification reminder:</strong> OCR results and camera photos are only aids. Verify the student using the school's official record before approving access.</p></div>
<?php render_footer(); ?>
