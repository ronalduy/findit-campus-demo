<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$admin = require_admin($pdo);
$type = (string)($_GET['type'] ?? 'all'); $status = (string)($_GET['status'] ?? ''); $q = trim((string)($_GET['q'] ?? ''));
if (!in_array($type,['all','lost','found'],true)) $type = 'all';
$where=[]; $params=[];
if ($type!=='all') { $where[]='i.item_type=?'; $params[]=$type; }
if ($status!=='') { $where[]='i.status=?'; $params[]=$status; }
if ($q!=='') { $where[]='(i.reference_code LIKE ? OR i.title LIKE ? OR i.location_found_or_lost LIKE ? OR i.category LIKE ?)'; $like='%'.$q.'%'; array_push($params,$like,$like,$like,$like); }
$sql='SELECT i.reference_code,i.item_type,i.title,i.description,i.category,i.location_found_or_lost,i.event_date,i.status,i.created_at,u.full_name AS created_by_name FROM items i JOIN users u ON u.id=i.created_by'; if ($where) $sql.=' WHERE '.implode(' AND ',$where); $sql.=' ORDER BY i.created_at DESC LIMIT 500';
$stmt=$pdo->prepare($sql); $stmt->execute($params);
function csv_safe(mixed $value): string { $s=(string)$value; if (preg_match('/^[\s]*[=+@\-]/', $s)) $s="'".$s; return $s; }
header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="findit-campus-item-report-' . date('Ymd-His') . '.csv"'); header('X-Content-Type-Options: nosniff');
$out=fopen('php://output','w'); fwrite($out,"\xEF\xBB\xBF");
fputcsv($out,['Reference Code','Type','Item Name','Description','Category','Location','Lost/Found Date','Status','Date Posted','Posted By']);
while($row=$stmt->fetch()) { fputcsv($out,array_map('csv_safe',[$row['reference_code'],$row['item_type'],$row['title'],$row['description'],$row['category'],$row['location_found_or_lost'],$row['event_date'],status_label($row['status']),$row['created_at'],$row['created_by_name']])); }
fclose($out);
audit($pdo,(int)$admin['id'],'report_exported','report',null,'CSV item report export');
exit;
