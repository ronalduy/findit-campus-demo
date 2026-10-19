<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$admin=require_admin($pdo);
$view=(string)($_GET['view'] ?? 'items'); if(!in_array($view,['items','accounts'],true))$view='items';
if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf(); $action=(string)($_POST['action']??''); $id=(int)($_POST['recycle_id']??0);
    $st=$pdo->prepare('SELECT * FROM recycle_bin WHERE id=? LIMIT 1'); $st->execute([$id]); $entry=$st->fetch();
    if(!$entry){set_flash('danger','Recycle Bin record not found.');redirect('recycle-bin.php?view='.$view);}
    $payload=json_decode((string)$entry['payload_json'],true);
    if(!is_array($payload)){set_flash('danger','This stored record cannot be read.');redirect('recycle-bin.php?view='.$view);}
    try{
        if($action==='restore'){
            if($entry['entity_type']==='account'){
                if(($payload['role']??'')!=='student' || ($payload['status']??'')==='rejected') throw new RuntimeException('Rejected applications cannot be restored because their Student ID is meant to be reusable.');
                $sql='INSERT INTO users (id,username,student_id,full_name,program,year_level,password_hash,role,status,id_photo_path,selfie_photo_path,review_note,reviewed_by,reviewed_at,consent_privacy,created_at,updated_at,failed_login_attempts,locked_until) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
                $pdo->prepare($sql)->execute([(int)$payload['id'],$payload['username']??null,$payload['student_id']??null,$payload['full_name'],$payload['program']??null,$payload['year_level']??null,$payload['password_hash'],$payload['role'],$payload['status'],$payload['id_photo_path']??null,$payload['selfie_photo_path']??null,$payload['review_note']??null,$payload['reviewed_by']??null,$payload['reviewed_at']??null,(int)($payload['consent_privacy']??0),$payload['created_at']??date('Y-m-d H:i:s'),$payload['updated_at']??date('Y-m-d H:i:s'),(int)($payload['failed_login_attempts']??0),$payload['locked_until']??null]);
            } elseif($entry['entity_type']==='item') {
                $sql='INSERT INTO items (id,reference_code,item_type,title,description,category,location_found_or_lost,event_date,image_path,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';
                $pdo->prepare($sql)->execute([(int)$payload['id'],$payload['reference_code'],$payload['item_type'],$payload['title'],$payload['description'],$payload['category'],$payload['location_found_or_lost'],$payload['event_date'],$payload['image_path']??null,$payload['status'],$payload['created_by'],$payload['created_at']??date('Y-m-d H:i:s'),$payload['updated_at']??date('Y-m-d H:i:s')]);
            } elseif($entry['entity_type']==='handover') {
                $sql='INSERT INTO handover_records (id,item_id,linked_lost_item_id,claimant_type,claimant_name,claimant_student_id,released_by,handover_notes,released_at) VALUES (?,?,?,?,?,?,?,?,?)';
                $pdo->prepare($sql)->execute([(int)$payload['id'],$payload['item_id'],$payload['linked_lost_item_id']??null,$payload['claimant_type'],$payload['claimant_name'],$payload['claimant_student_id']??null,$payload['released_by'],$payload['handover_notes']??null,$payload['released_at']??date('Y-m-d H:i:s')]);
            }
            $pdo->prepare('DELETE FROM recycle_bin WHERE id=?')->execute([$id]);
            audit($pdo,(int)$admin['id'],'recycle_record_restored',$entry['entity_type'],(int)($entry['original_id']??0),'Record restored from Recycle Bin.');
            set_flash('success','Record restored. Check the active list before continuing.');
        } elseif($action==='purge') {
            purge_payload_media($payload);
            $pdo->prepare('DELETE FROM recycle_bin WHERE id=?')->execute([$id]);
            audit($pdo,(int)$admin['id'],'recycle_record_purged',$entry['entity_type'],(int)($entry['original_id']??0),'Recycle Bin record permanently deleted by Admin.');
            set_flash('success','Record permanently deleted from the Recycle Bin.');
        } else { set_flash('danger','Unknown Recycle Bin action.'); }
    } catch(Throwable $ex) {
        set_flash('danger',$ex instanceof RuntimeException?$ex->getMessage():'Could not complete the action. The record may already exist or a linked record must be restored first.');
    }
    redirect('recycle-bin.php?view='.$view);
}
// Expired records are purged when an administrator visits this page; XAMPP itself does not run a scheduled job automatically.
purge_expired_recycle_bin($pdo);
$filter=$view==='accounts'?"entity_type='account'":"entity_type IN ('item','handover')";
$rows=$pdo->query("SELECT r.*,u.full_name AS deleted_by_name FROM recycle_bin r LEFT JOIN users u ON u.id=r.deleted_by WHERE $filter ORDER BY r.deleted_at DESC LIMIT 300")->fetchAll();
render_header('Recycle Bin','recycle');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> TEMPORARY DELETED RECORDS</div><h1>Recycle Bin</h1><p>Records are kept for 30 days. Expired records are purged when an Admin visits the system after their expiry.</p></div></div>
<div class="tabs" style="display:flex;gap:10px;margin:16px 0 20px;flex-wrap:wrap"><a class="btn <?= $view==='items'?'btn-primary':'btn-outline' ?>" href="recycle-bin.php?view=items">Deleted Items &amp; Handovers</a><a class="btn <?= $view==='accounts'?'btn-primary':'btn-outline' ?>" href="recycle-bin.php?view=accounts">Deleted Accounts</a></div>
<section class="panel"><div class="panel-heading-row"><div><h2><?= $view==='accounts'?'Deleted student accounts':'Deleted items and handover records' ?></h2><p>Latest 300 records in this category.</p></div><span class="pill"><?=count($rows)?> record(s)</span></div>
<?php if(!$rows):?><div class="empty-state"><strong>No deleted records</strong><p>Records moved to the Recycle Bin will appear here.</p></div><?php else:?><div class="table-wrap"><table><thead><tr><th>Record</th><th>Type</th><th>Deleted at</th><th>Deleted by</th><th>Expires</th><th>Actions</th></tr></thead><tbody>
<?php foreach($rows as $r): $d=json_decode((string)$r['payload_json'],true)?:[]; $label=$r['entity_type']==='item'?((string)($d['title']??'Deleted item')):($r['entity_type']==='handover'?('Handover — '.(string)($d['claimant_name']??'Claimant')):((string)($d['full_name']??'Deleted student'))); $ref=$r['entity_type']==='item'?($d['reference_code']??''):($r['entity_type']==='account'?($d['student_id']??''):('Handover #'.(int)$r['original_id'])); $exp=strtotime($r['deleted_at'].' +30 days'); ?>
<tr><td><span class="table-main"><?=e($label)?></span><span class="table-sub"><?=e((string)$ref)?></span></td><td><?=e(ucfirst($r['entity_type']))?></td><td><?=e(date('M j, Y · g:i A',strtotime($r['deleted_at'])))?></td><td><?=e($r['deleted_by_name']?:'System / prior account')?></td><td><?=e(date('M j, Y', $exp))?></td><td class="action-cell">
<?php if($r['entity_type']!=='account' || (($d['status']??'')!=='rejected')):?><form method="post" style="display:inline" onsubmit="return confirm('Restore this record? It may fail if its ID or reference is already in use.');"><?=csrf_field()?><input type="hidden" name="action" value="restore"><input type="hidden" name="recycle_id" value="<?=(int)$r['id']?>"><button class="btn btn-outline btn-small" type="submit">Restore</button></form><?php else:?><small class="field-help">Rejected app · ID released</small><?php endif;?>
<form method="post" style="display:inline" onsubmit="return confirm('Permanently delete this record and its stored photos? This cannot be undone.');"><?=csrf_field()?><input type="hidden" name="action" value="purge"><input type="hidden" name="recycle_id" value="<?=(int)$r['id']?>"><button class="btn btn-danger btn-small" type="submit">Delete permanently</button></form></td></tr>
<?php endforeach;?></tbody></table></div><?php endif;?></section>
<?php render_footer(); ?>
