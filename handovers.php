<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$admin = require_admin($pdo);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $itemId = (int)($_POST['item_id'] ?? 0);
    $linkedLostId = (int)($_POST['linked_lost_item_id'] ?? 0) ?: null;
    $claimantType = (string)($_POST['claimant_type'] ?? 'student');
    $claimantName = trim((string)($_POST['claimant_name'] ?? ''));
    $claimantStudentId = trim((string)($_POST['claimant_student_id'] ?? ''));
    $notes = trim((string)($_POST['handover_notes'] ?? ''));
    if (!in_array($claimantType, ['student','staff','other'], true) || $claimantName === '' || strlen($claimantName) > 160) { set_flash('danger','Enter the claimant name and select a valid claimant type.'); redirect('handovers.php'); }
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT * FROM items WHERE id=? AND item_type='found' FOR UPDATE"); $stmt->execute([$itemId]); $item = $stmt->fetch();
        if (!$item || !in_array($item['status'], ['available_for_claim','claim_under_review'], true)) throw new RuntimeException('This found item is not available to release. Refresh the page and check its status.');
        if ($linkedLostId) {
            $lost = $pdo->prepare("SELECT id FROM items WHERE id=? AND item_type='lost' AND status <> 'closed'"); $lost->execute([$linkedLostId]);
            if (!$lost->fetch()) throw new RuntimeException('The linked lost report could not be found or is already closed.');
        }
        $insert = $pdo->prepare('INSERT INTO handover_records (item_id, linked_lost_item_id, claimant_type, claimant_name, claimant_student_id, released_by, handover_notes, released_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
        $insert->execute([$itemId, $linkedLostId, $claimantType, $claimantName, $claimantStudentId ?: null, (int)$admin['id'], $notes ?: null]);
        $pdo->prepare("UPDATE items SET status='returned' WHERE id=?")->execute([$itemId]);
        if ($linkedLostId) $pdo->prepare("UPDATE items SET status='closed' WHERE id=? AND item_type='lost'")->execute([$linkedLostId]);
        $pdo->commit();
        audit($pdo, (int)$admin['id'], 'item_handed_over', 'item', $itemId, $item['reference_code'] . ' released to ' . $claimantName);
        set_flash('success','Handover saved. The found item is now marked Returned.');
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        set_flash('danger', $exception instanceof RuntimeException ? $exception->getMessage() : 'The handover could not be saved. Please try again.');
    }
    redirect('handovers.php');
}
$available = $pdo->query("SELECT id, reference_code, title, category, location_found_or_lost FROM items WHERE item_type='found' AND status IN ('available_for_claim','claim_under_review') ORDER BY created_at ASC")->fetchAll();
$openLost = $pdo->query("SELECT id, reference_code, title, category FROM items WHERE item_type='lost' AND status IN ('open','matched') ORDER BY created_at DESC LIMIT 200")->fetchAll();
$history = $pdo->query('SELECT h.*, i.reference_code, i.title, u.full_name AS released_by_name FROM handover_records h JOIN items i ON i.id=h.item_id JOIN users u ON u.id=h.released_by ORDER BY h.released_at DESC LIMIT 100')->fetchAll();
render_header('Handover records','handovers');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> IN-PERSON ITEM RELEASE</div><h1>Handover records</h1><p>Use this form only after the claimant has visited the school office and staff have checked ownership in person.</p></div></div>
<div class="content-grid handover-grid"><section class="panel"><div class="panel-heading-row"><div><h2>Record an item handover</h2><p>Saving this form marks the found item as Returned.</p></div><span class="heading-icon">✓</span></div><div class="panel-body"><form method="post" class="form-stack"><?= csrf_field() ?><div class="field"><label for="item_id">Found item <span class="required">*</span></label><select name="item_id" id="item_id" required><option value="">Select an item</option><?php foreach ($available as $item): ?><option value="<?= (int)$item['id'] ?>"><?= e($item['reference_code'] . ' — ' . $item['title'] . ' (' . $item['location_found_or_lost'] . ')') ?></option><?php endforeach; ?></select><?php if (!$available): ?><small class="field-help">There are no found items waiting for release.</small><?php endif; ?></div><div class="field"><label for="claimant_type">Claimant type <span class="required">*</span></label><select name="claimant_type" id="claimant_type" required><option value="student">Student</option><option value="staff">Faculty / Staff</option><option value="other">Other authorized claimant</option></select></div><div class="field"><label for="claimant_name">Claimant full name <span class="required">*</span></label><input name="claimant_name" id="claimant_name" required maxlength="160" placeholder="Name of person receiving item"></div><div class="field"><label for="claimant_student_id">Student ID (if applicable)</label><input name="claimant_student_id" id="claimant_student_id" maxlength="80" placeholder="Leave blank for staff or other claimant"></div><div class="field"><label for="linked_lost_item_id">Related lost report (optional)</label><select name="linked_lost_item_id" id="linked_lost_item_id"><option value="">No linked report</option><?php foreach ($openLost as $lost): ?><option value="<?= (int)$lost['id'] ?>"><?= e($lost['reference_code'] . ' — ' . $lost['title']) ?></option><?php endforeach; ?></select><small class="field-help">If selected, the related lost report will be closed after the handover.</small></div><div class="field"><label for="handover_notes">Verification / handover notes</label><textarea class="textarea-note" name="handover_notes" id="handover_notes" maxlength="1000" placeholder="Example: Claimant described the sticker on the back; identity checked by staff."></textarea></div><div class="notice notice-blue"><span class="notice-icon">i</span><p>Confirm the claimant is authorized and record only the details needed by school policy. Never record passwords or unnecessary sensitive details.</p></div><button class="btn btn-primary btn-block" type="submit" <?= !$available?'disabled':'' ?>>✓ Confirm handover &amp; mark returned</button></form></div></section>
<section class="panel"><div class="panel-heading-row"><div><h2>Before releasing an item</h2><p>Simple in-person verification checklist.</p></div></div><div class="panel-body stack"><div class="rule-line"><span class="rule-number">01</span><div><strong>Ask the claimant to describe the item</strong><p>Ask for details that are not fully shown in the public post, such as a mark, sticker, or contents.</p></div></div><div class="rule-line"><span class="rule-number">02</span><div><strong>Check the relevant school record</strong><p>Use a student ID or school record if your school policy requires it. Do not rely on OCR alone.</p></div></div><div class="rule-line"><span class="rule-number">03</span><div><strong>Record the release</strong><p>Save the claimant name, found-item reference, releasing staff member, date, and short notes.</p></div></div><div class="rule-line"><span class="rule-number">04</span><div><strong>Keep the audit trail</strong><p>The system records who completed the handover and when.</p></div></div></div></section></div>
<section class="panel items-management-panel"><div class="panel-heading-row"><div><h2>Handover history</h2><p>Latest 100 recorded item releases.</p></div><span class="pill"><?= count($history) ?> record(s)</span></div><?php if (!$history): ?><div class="empty-state"><div class="empty-icon">✓</div><strong>No handovers recorded</strong><p>Completed item releases will appear here.</p></div><?php else: ?><div class="table-wrap"><table><thead><tr><th>Released at</th><th>Item</th><th>Claimant</th><th>Released by</th><th>Notes</th></tr></thead><tbody><?php foreach ($history as $h): ?><tr><td><?= e(date('M j, Y · g:i A',strtotime($h['released_at']))) ?></td><td><span class="table-main"><?= e($h['title']) ?></span><span class="table-sub"><?= e($h['reference_code']) ?></span></td><td><span class="table-main"><?= e($h['claimant_name']) ?></span><span class="table-sub"><?= e(ucfirst($h['claimant_type'])) ?><?= $h['claimant_student_id'] ? ' · ' . e($h['claimant_student_id']) : '' ?></span></td><td><?= e($h['released_by_name']) ?></td><td><?= e($h['handover_notes'] ?: '—') ?></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?></section>
<?php render_footer(); ?>
