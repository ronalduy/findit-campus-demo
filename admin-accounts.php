<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$admin = require_admin($pdo);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action=(string)($_POST['action'] ?? '');
    if ($action==='delete_student') {
        $id=(int)($_POST['user_id'] ?? 0);
        $get=$pdo->prepare("SELECT * FROM users WHERE id=? AND role='student' LIMIT 1"); $get->execute([$id]); $student=$get->fetch();
        if (!$student) { set_flash('danger','Student account not found.'); redirect('admin-accounts.php'); }
        $pdo->beginTransaction();
        try {
            archive_to_recycle($pdo,'account',$id,$student,(int)$admin['id']);
            $del=$pdo->prepare("DELETE FROM users WHERE id=? AND role='student'"); $del->execute([$id]);
            $keys=array_filter([strtolower((string)$student['student_id']),strtolower((string)$student['username'])]);
            if ($keys) { $placeholders=implode(',',array_fill(0,count($keys),'?')); $pdo->prepare("DELETE FROM login_attempts WHERE login_key IN ($placeholders)")->execute(array_values($keys)); }
            audit($pdo,(int)$admin['id'],'student_account_deleted','user',$id,'Student ' . $student['student_id'] . ' moved to Recycle Bin for 30 days.');
            $pdo->commit(); set_flash('success','Student account moved to Recycle Bin for 30 days.');
        } catch (Throwable $ex) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            set_flash('danger','The account could not be deleted. If the account owns any records, review those links before deleting it.');
        }
        redirect('admin-accounts.php');
    }
}
$q=trim((string)($_GET['q'] ?? '')); $status=(string)($_GET['status'] ?? 'all');
$sql="SELECT id,student_id,full_name,program,year_level,status,created_at,review_note FROM users WHERE role='student'"; $args=[];
if (in_array($status,['pending','approved','correction_required'],true)) { $sql.=' AND status=?'; $args[]=$status; }
if ($q!=='') { $sql.=' AND (student_id LIKE ? OR full_name LIKE ? OR program LIKE ?)'; $like='%'.$q.'%'; array_push($args,$like,$like,$like); }
$sql.=' ORDER BY created_at DESC LIMIT 300'; $st=$pdo->prepare($sql); $st->execute($args); $students=$st->fetchAll();
render_header('Student accounts','accounts');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> STUDENT ACCOUNT MANAGEMENT</div><h1>Student accounts</h1><p>Search accounts and remove accounts that are no longer needed. Deleted account details and private photos remain in Recycle Bin for 30 days.</p></div></div>
<section class="panel"><div class="panel-body"><form method="get" class="toolbar"><div class="search-input"><span>⌕</span><input type="search" name="q" value="<?=e($q)?>" placeholder="Search name, Student ID, program"></div><select class="filter-select" name="status"><option value="all">All statuses</option><?php foreach(['pending','approved','correction_required'] as $s):?><option value="<?=e($s)?>" <?=$status===$s?'selected':''?>><?=e(status_label($s))?></option><?php endforeach;?></select><button class="btn btn-outline btn-small" type="submit">Search</button></form></div>
<?php if(!$students):?><div class="empty-state"><strong>No student accounts found</strong><p>Try another search or status filter.</p></div><?php else:?><div class="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Program / Year</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody><?php foreach($students as $s):?><tr><td><span class="table-main"><?=e($s['full_name'])?></span><?php if($s['review_note']):?><span class="table-sub">Review note: <?=e($s['review_note'])?></span><?php endif;?></td><td><?=e($s['student_id'])?></td><td><?=e($s['program']?:'—')?> <span class="table-sub"><?=e($s['year_level']?:'—')?></span></td><td><span class="status-badge status-<?=e(status_class($s['status']))?>"><?=e(status_label($s['status']))?></span></td><td><?=e(date('M j, Y',strtotime($s['created_at'])))?></td><td><form method="post" onsubmit="return confirm('Delete this student account and move it to Recycle Bin for 30 days?');"><?=csrf_field()?><input type="hidden" name="action" value="delete_student"><input type="hidden" name="user_id" value="<?=(int)$s['id']?>"><button class="btn btn-danger btn-small" type="submit">Delete account</button></form></td></tr><?php endforeach;?></tbody></table></div><?php endif;?></section>
<?php render_footer(); ?>
