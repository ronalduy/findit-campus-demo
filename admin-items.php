<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$admin = require_admin($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = (string)($_POST['action'] ?? '');
    if ($action === 'update_status') {
        $itemId = (int)($_POST['item_id'] ?? 0);
        $newStatus = (string)($_POST['status'] ?? '');
        $stmt = $pdo->prepare('SELECT id, reference_code, item_type, status FROM items WHERE id=?'); $stmt->execute([$itemId]); $item = $stmt->fetch();
        $valid = $item && (($item['item_type'] === 'lost' && in_array($newStatus, ['open','matched','closed'], true)) || ($item['item_type'] === 'found' && in_array($newStatus, ['available_for_claim','claim_under_review'], true)));
        if (!$valid) { set_flash('danger','Invalid item status. A found item must be released through Handover Records to be marked returned.'); redirect('admin-items.php'); }
        $pdo->prepare('UPDATE items SET status=? WHERE id=?')->execute([$newStatus, $itemId]);
        audit($pdo, (int)$admin['id'], 'item_status_updated', 'item', $itemId, $item['reference_code'] . ': ' . $item['status'] . ' -> ' . $newStatus);
        set_flash('success','Item status updated.'); redirect('admin-items.php');
    }
    if ($action === 'save_item') {
        $itemId = (int)($_POST['item_id'] ?? 0);
        $itemType = (string)($_POST['item_type'] ?? 'found');
        $title = trim((string)($_POST['title'] ?? ''));
        $description = trim((string)($_POST['description'] ?? ''));
        $category = trim((string)($_POST['category'] ?? ''));
        $location = trim((string)($_POST['location'] ?? ''));
        $eventDate = trim((string)($_POST['event_date'] ?? ''));
        $existing = null;
        if ($itemId > 0) { $get = $pdo->prepare('SELECT * FROM items WHERE id=?'); $get->execute([$itemId]); $existing = $get->fetch(); }
        if ($itemId > 0 && !$existing) { set_flash('danger','The item record could not be found.'); redirect('admin-items.php'); }
        if ($existing) $itemType = $existing['item_type'];
        if (!in_array($itemType, ['lost','found'], true) || $title === '' || $description === '' || $category === '' || $location === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $eventDate) || strtotime($eventDate) === false) {
            set_flash('danger','Complete all required item fields and select a valid date.'); redirect($itemId ? 'admin-items.php?edit=' . $itemId : 'admin-items.php');
        }
        $imagePath = $existing['image_path'] ?? null;
        try {
            if (!empty($_FILES['item_photo']) && ($_FILES['item_photo']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                $newImage = save_uploaded_image($_FILES['item_photo'], 'items', 'item');
                if ($newImage) $imagePath = $newImage;
            }
            if ($existing) {
                $update = $pdo->prepare('UPDATE items SET title=?, description=?, category=?, location_found_or_lost=?, event_date=?, image_path=? WHERE id=?');
                $update->execute([$title, $description, $category, $location, $eventDate, $imagePath, $itemId]);
                audit($pdo, (int)$admin['id'], 'item_updated', 'item', $itemId, $existing['reference_code'] . ' updated');
                set_flash('success','Item details updated.');
            } else {
                $initialStatus = $itemType === 'lost' ? 'open' : 'available_for_claim';
                $tempCode = 'TMP-' . strtoupper(bin2hex(random_bytes(5)));
                $insert = $pdo->prepare('INSERT INTO items (reference_code, item_type, title, description, category, location_found_or_lost, event_date, image_path, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $insert->execute([$tempCode, $itemType, $title, $description, $category, $location, $eventDate, $imagePath, $initialStatus, (int)$admin['id']]);
                $newId = (int)$pdo->lastInsertId();
                $prefix = $itemType === 'lost' ? 'LS' : 'FD';
                $reference = $prefix . '-' . date('Y') . '-' . str_pad((string)$newId, 5, '0', STR_PAD_LEFT);
                $pdo->prepare('UPDATE items SET reference_code=? WHERE id=?')->execute([$reference, $newId]);
                audit($pdo, (int)$admin['id'], 'item_created', 'item', $newId, $reference . ' created');
                set_flash('success','Item posted. Reference number: ' . $reference);
            }
            redirect('admin-items.php');
        } catch (Throwable $exception) {
            set_flash('danger', $exception instanceof RuntimeException ? $exception->getMessage() : 'The item could not be saved. Check the photo type/size and try again.');
            redirect($itemId ? 'admin-items.php?edit=' . $itemId : 'admin-items.php');
        }
    }
}

$editItem = null;
if (!empty($_GET['edit'])) { $stmt = $pdo->prepare('SELECT * FROM items WHERE id=?'); $stmt->execute([(int)$_GET['edit']]); $editItem = $stmt->fetch() ?: null; }
$search = trim((string)($_GET['q'] ?? ''));
$typeFilter = (string)($_GET['type'] ?? 'all');
$sql = 'SELECT i.*, u.full_name AS created_by_name FROM items i JOIN users u ON u.id=i.created_by WHERE 1=1'; $params = [];
if (in_array($typeFilter, ['lost','found'], true)) { $sql .= ' AND i.item_type=?'; $params[] = $typeFilter; }
if ($search !== '') { $sql .= ' AND (i.reference_code LIKE ? OR i.title LIKE ? OR i.category LIKE ? OR i.location_found_or_lost LIKE ?)'; $like = '%' . $search . '%'; array_push($params,$like,$like,$like,$like); }
$sql .= ' ORDER BY i.created_at DESC LIMIT 100'; $stmt = $pdo->prepare($sql); $stmt->execute($params); $items = $stmt->fetchAll();
render_header('Manage items','items');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> LOST &amp; FOUND RECORDS</div><h1>Manage items</h1><p>Only school Admin/Teacher accounts can post and update item records. Found items shown to students should be physically kept by the school.</p></div></div>
<div class="admin-management-grid">
  <section class="panel"><div class="panel-heading-row"><div><h2><?= $editItem ? 'Edit item' : 'Post a new item' ?></h2><p><?= $editItem ? 'Update the details of this record.' : 'Create a lost report or register a found item.' ?></p></div><span class="heading-icon">＋</span></div>
    <div class="panel-body"><form method="post" enctype="multipart/form-data" class="form-stack"><?= csrf_field() ?><input type="hidden" name="action" value="save_item"><input type="hidden" name="item_id" value="<?= (int)($editItem['id'] ?? 0) ?>">
      <?php if ($editItem): ?><div class="notice notice-blue"><span class="notice-icon">i</span><p>Reference: <strong><?= e($editItem['reference_code']) ?></strong> · Type cannot be changed after creation.</p></div><input type="hidden" name="item_type" value="<?= e($editItem['item_type']) ?>"><?php else: ?><div class="field"><label for="item_type">Record type <span class="required">*</span></label><select name="item_type" id="item_type" required><option value="found">Found item — kept at school</option><option value="lost">Lost report — student is missing this item</option></select></div><?php endif; ?>
      <div class="field"><label for="title">Item name <span class="required">*</span></label><input name="title" id="title" required maxlength="150" value="<?= e($editItem['title'] ?? '') ?>" placeholder="Example: Blue water bottle"></div>
      <div class="field"><label for="description">Description <span class="required">*</span></label><textarea name="description" id="description" required maxlength="3000" placeholder="Describe visible details that help identify the item."><?= e($editItem['description'] ?? '') ?></textarea></div>
      <div class="admin-form-grid"><div class="field"><label for="category">Category <span class="required">*</span></label><select name="category" id="category" required><option value="">Choose category</option><?php foreach (['School supplies','Electronics','Wallet / ID','Clothing','Bottle / Lunch box','Accessories','Keys','Books','Other'] as $cat): ?><option value="<?= e($cat) ?>" <?= (($editItem['category'] ?? '') === $cat) ? 'selected' : '' ?>><?= e($cat) ?></option><?php endforeach; ?></select></div><div class="field"><label for="event_date">Lost / found date <span class="required">*</span></label><input type="date" name="event_date" id="event_date" required value="<?= e($editItem['event_date'] ?? date('Y-m-d')) ?>"></div><div class="field full"><label for="location">Location <span class="required">*</span></label><input name="location" id="location" required maxlength="160" value="<?= e($editItem['location_found_or_lost'] ?? '') ?>" placeholder="Example: Library entrance"></div><div class="field full"><label for="item_photo">Item photo (optional, JPEG / PNG / WebP, max 5 MB)</label><input type="file" name="item_photo" id="item_photo" accept="image/jpeg,image/png,image/webp"><small class="field-help">Do not put student IDs, phone numbers, or other private details in a public item photo.</small></div></div>
      <div class="action-row"><button type="submit" class="btn btn-primary"><?= $editItem ? 'Save changes' : '＋ Post item' ?></button><?php if ($editItem): ?><a href="admin-items.php" class="btn btn-outline">Cancel edit</a><?php endif; ?></div>
    </form></div>
  </section>
  <section class="panel"><div class="panel-heading-row"><div><h2>Posting rules</h2><p>Keep public item details safe and useful.</p></div><span class="heading-icon">✓</span></div><div class="panel-body stack"><div class="rule-line"><span class="rule-number">01</span><div><strong>Found items must be held by the school</strong><p>Confirm the physical item is at the school office before posting it as available.</p></div></div><div class="rule-line"><span class="rule-number">02</span><div><strong>Use a unique reference code</strong><p>The system generates a reference like FD-2026-00012 or LS-2026-00013.</p></div></div><div class="rule-line"><span class="rule-number">03</span><div><strong>Record returns with a handover</strong><p>Do not mark a found item returned without creating a handover record.</p></div></div><div class="rule-line"><span class="rule-number">04</span><div><strong>Protect personal information</strong><p>Never include a full student ID number or sensitive details in a public item description.</p></div></div></div></section>
</div>
<section class="panel items-management-panel"><div class="panel-heading-row"><div><h2>Item records</h2><p>Latest 100 records. Edit descriptions or update the status.</p></div><span class="pill"><?= count($items) ?> record(s)</span></div><div class="panel-body"><div class="toolbar"><form class="search-form" method="get"><div class="search-input"><span>⌕</span><input type="search" name="q" value="<?= e($search) ?>" placeholder="Search title, reference, category…"></div><select class="filter-select" name="type"><option value="all">All types</option><option value="lost" <?= $typeFilter==='lost'?'selected':'' ?>>Lost</option><option value="found" <?= $typeFilter==='found'?'selected':'' ?>>Found</option></select><button class="btn btn-outline btn-small" type="submit">Search</button></form></div>
<?php if (!$items): ?><div class="empty-state"><div class="empty-icon">◇</div><strong>No records found</strong><p>Create an item using the form above.</p></div><?php else: ?><div class="table-wrap"><table><thead><tr><th>Reference / Item</th><th>Type</th><th>Location &amp; date</th><th>Status</th><th>Update status</th><th>Actions</th></tr></thead><tbody><?php foreach ($items as $item): ?><tr><td><span class="table-main"><?= e($item['title']) ?></span><span class="table-sub"><?= e($item['reference_code']) ?> · <?= e($item['category']) ?></span></td><td><span class="pill"><?= e(ucfirst($item['item_type'])) ?></span></td><td><?= e($item['location_found_or_lost']) ?><span class="table-sub"><?= e(date('M j, Y',strtotime($item['event_date']))) ?></span></td><td><span class="status-badge status-<?= e(status_class($item['status'])) ?>"><?= e(status_label($item['status'])) ?></span></td><td><form method="post" class="inline-status-form"><?= csrf_field() ?><input type="hidden" name="action" value="update_status"><input type="hidden" name="item_id" value="<?= (int)$item['id'] ?>"><select name="status" aria-label="New status for <?= e($item['reference_code']) ?>"><?php $statusOptions = $item['item_type']==='lost' ? ['open','matched','closed'] : ['available_for_claim','claim_under_review']; foreach ($statusOptions as $option): ?><option value="<?= e($option) ?>" <?= $item['status']===$option?'selected':'' ?>><?= e(status_label($option)) ?></option><?php endforeach; ?></select><button type="submit">Save</button></form></td><td><a class="small-link" href="admin-items.php?edit=<?= (int)$item['id'] ?>">Edit</a> · <a class="small-link" href="item.php?id=<?= (int)$item['id'] ?>">View</a></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?></div></section>
<?php render_footer(); ?>
