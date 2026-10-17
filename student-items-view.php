<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$user = require_login($pdo);
if ($user['role'] === 'admin') redirect('admin-dashboard.php');
$type = ($pageType ?? 'lost') === 'found' ? 'found' : 'lost';
$title = $type === 'lost' ? 'Lost Items' : 'Found Items';
$active = $type;
$q = trim((string)($_GET['q'] ?? ''));
$category = trim((string)($_GET['category'] ?? ''));
$sql = 'SELECT * FROM items WHERE item_type = ?'; $params = [$type];
if ($q !== '') { $sql .= ' AND (reference_code LIKE ? OR title LIKE ? OR description LIKE ? OR location_found_or_lost LIKE ?)'; $like = '%' . $q . '%'; array_push($params,$like,$like,$like,$like); }
if ($category !== '') { $sql .= ' AND category = ?'; $params[] = $category; }
if ($type === 'lost') $sql .= " AND status <> 'closed'";
$sql .= ' ORDER BY created_at DESC LIMIT 120';
$stmt = $pdo->prepare($sql); $stmt->execute($params); $items = $stmt->fetchAll();
$categories = $pdo->prepare('SELECT DISTINCT category FROM items WHERE item_type=? ORDER BY category'); $categories->execute([$type]); $categoryList = $categories->fetchAll(PDO::FETCH_COLUMN);
render_header($title, $active);
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> FINDIT CAMPUS · STUDENT PORTAL</div><h1><?= $type === 'lost' ? 'Lost Items' : 'Found Items' ?> <span class="muted">/ Campus board</span></h1><p><?= $type === 'lost' ? 'Browse school reports of belongings that students are looking for. If you recognize an item or have information, contact the school office.' : 'Browse items that school staff have recorded and are keeping safely. If you recognize something as yours, note its reference number and claim it in person.' ?></p></div><div class="header-actions"><span class="pill">Student view · read only</span></div></div>
<div class="notice notice-blue" style="margin:0 0 18px"><span class="notice-icon">i</span><p><strong><?= $type === 'found' ? 'Found an item that belongs to you?' : 'Lost an item?' ?></strong> <?= $type === 'found' ? 'Do not try to claim it online. Visit the school Admin/Teacher or designated office and provide the item reference code. Staff will check ownership and record the handover.' : 'Ask the school Admin/Teacher for help. New lost reports are entered by authorized school staff in this version.' ?></p></div>
<div class="toolbar"><form method="get" class="search-form"><div class="search-input"><span>⌕</span><input type="search" name="q" value="<?= e($q) ?>" placeholder="Search item name, details, location, reference…"></div><select class="filter-select" name="category"><option value="">All categories</option><?php foreach ($categoryList as $c): ?><option value="<?= e($c) ?>" <?= $category===$c?'selected':'' ?>><?= e($c) ?></option><?php endforeach; ?></select><button class="btn btn-primary btn-small" type="submit">Search</button><?php if ($q !== '' || $category !== ''): ?><a class="btn btn-outline btn-small" href="<?= e($type) ?>-items.php">Clear</a><?php endif; ?></form><span class="small-muted"><?= count($items) ?> item(s)</span></div>
<?php if (!$items): ?><div class="panel"><div class="empty-state"><div class="empty-icon"><?= $type==='lost'?'⌕':'◇' ?></div><strong>No items found</strong><p>Try another keyword or category. New school records will appear here when the Admin/Teacher posts them.</p></div></div><?php else: ?><div class="item-grid">
<?php foreach ($items as $item): ?><article class="item-card"><a href="item.php?id=<?= (int)$item['id'] ?>" class="item-image"><?php if ($item['image_path']): ?><img loading="lazy" src="<?= e(private_image_url('item',(int)$item['id'])) ?>" alt="Photo of <?= e($item['title']) ?>"><?php else: ?><span class="item-placeholder"><?= $type==='lost'?'⌕':'◇' ?></span><?php endif; ?><span class="item-ref"><?= e($item['reference_code']) ?></span></a><div class="item-card-body"><div class="item-card-title-row"><h3><?= e($item['title']) ?></h3><span class="status-badge status-<?= e(status_class($item['status'])) ?>"><?= e(status_label($item['status'])) ?></span></div><p><?= e($item['description']) ?></p><div class="item-meta"><span>⌖ <?= e($item['location_found_or_lost']) ?></span><span>▦ <?= e($item['category']) ?></span><span>◷ <?= e(date('M j, Y',strtotime($item['event_date']))) ?></span></div><a class="btn btn-outline" href="item.php?id=<?= (int)$item['id'] ?>">View item details <span>→</span></a></div></article><?php endforeach; ?></div><?php endif; ?>
<div class="page-footer-note">FindIT Campus is for school use. Public item descriptions should not include full student ID numbers, private contact details, passwords, or other sensitive information.</div>
<?php render_footer(); ?>
