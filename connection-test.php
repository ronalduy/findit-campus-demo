<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$mode=(string)($_GET['mode']??'host');
if(!in_array($mode,['host','phone','poll'],true))$mode='host';
if($mode==='poll'){
    $user=current_user($pdo);
    if(!$user || $user['role']!=='admin'){http_response_code(401);header('Content-Type: application/json; charset=utf-8');echo json_encode(['ok'=>false,'message'=>'Admin sign-in required']);exit;}
    header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store, max-age=0');
    $token=strtolower((string)($_GET['token']??''));
    if(!preg_match('/^[a-f0-9]{32}$/',$token)){http_response_code(400);echo json_encode(['ok'=>false]);exit;}
    $st=$pdo->prepare("SELECT sent_at FROM connection_tests WHERE device_label='phone' AND test_token=? AND sent_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE) ORDER BY id DESC LIMIT 1");$st->execute([$token]);$r=$st->fetch();
    echo json_encode(['ok'=>true,'connected'=>(bool)$r,'phone_test_at'=>$r['sent_at']??null]);exit;
}
$admin=null;
if($mode==='host'){
    $admin=require_admin($pdo);
    if($_SERVER['REQUEST_METHOD']==='POST'){
        verify_csrf();
        if((string)($_POST['action']??'')==='new_test'){
            $token=bin2hex(random_bytes(16));
            $pdo->prepare("DELETE FROM connection_tests WHERE sent_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)")->execute();
            $pdo->prepare("INSERT INTO connection_tests(device_label,test_token,sent_at) VALUES('laptop',?,NOW())")->execute([$token]);
            $_SESSION['connection_test_token']=$token; audit($pdo,(int)$admin['id'],'phone_laptop_connection_test_created','connection_test',null,'Generated a temporary local network connection code.');
            redirect('connection-test.php');
        }
    }
    $token=(string)($_SESSION['connection_test_token']??'');
    render_header('Phone and laptop connection test','connection');
    ?>
    <div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> LOCAL NETWORK CHECK</div><h1>Phone ↔ laptop connection test</h1><p>This verifies that your phone can reach this PHP site and write to the same MySQL database your laptop is using.</p></div></div>
    <div class="content-grid"><section class="panel"><div class="panel-heading-row"><div><h2>1. Generate a one-time code</h2><p>Keep this page open on your laptop.</p></div><span class="heading-icon">↔</span></div><div class="panel-body">
    <form method="post" class="form-stack"><?=csrf_field()?><input type="hidden" name="action" value="new_test"><button class="btn btn-primary" type="submit">Generate connection code</button></form>
    <?php if($token && preg_match('/^[a-f0-9]{32}$/',$token)):?><div class="connection-token" style="margin-top:20px;padding:18px;border-radius:14px;background:#eef3ff;text-align:center"><small class="small-muted">Enter this code on your phone (valid for 15 minutes)</small><strong id="connection-token" style="display:block;font-size:clamp(18px,3vw,28px);letter-spacing:3px;word-break:break-all;margin:10px 0"><?=e(strtoupper($token))?></strong><button class="btn btn-outline btn-small" type="button" onclick="navigator.clipboard?.writeText('<?=e(strtoupper($token))?>')">Copy code</button><div id="connection-result" class="notice notice-blue" style="margin-top:14px"><span class="notice-icon">…</span><p>Waiting for the phone to complete the database test…</p></div></div>
    <script>(()=>{const token='<?=e($token)?>',out=document.getElementById('connection-result');let tries=0;const timer=setInterval(async()=>{tries++;try{const r=await fetch('connection-test.php?mode=poll&token='+encodeURIComponent(token),{cache:'no-store',credentials:'same-origin'});const d=await r.json();if(d.connected){clearInterval(timer);out.className='notice notice-success';out.innerHTML='<span class="notice-icon">✓</span><p><strong>Phone connected!</strong> The phone reached this XAMPP app and wrote a test record to the same MySQL database. Time: '+d.phone_test_at+'</p>';}}catch(e){}if(tries>450){clearInterval(timer);if(!out.classList.contains('notice-success')){out.className='notice notice-warning';out.innerHTML='<span class="notice-icon">!</span><p>Test timed out. Check that both devices use the same Wi-Fi and that Apache is reachable from the phone.</p>';}}},2000);})();</script>
    <?php endif;?></div></section>
    <section class="panel"><div class="panel-heading-row"><div><h2>2. Open the phone test</h2><p>Phone and laptop should use the same Wi-Fi for local testing.</p></div><span class="heading-icon">⌁</span></div><div class="panel-body stack"><div class="rule-line"><span class="rule-number">01</span><div><strong>Find your laptop IPv4 address</strong><p>On Windows, open Command Prompt and run <code>ipconfig</code>. Look under the active Wi-Fi adapter for IPv4 Address (often starts with 192.168.x.x or 10.x.x.x).</p></div></div><div class="rule-line"><span class="rule-number">02</span><div><strong>Open this address on the phone</strong><p>Use <code>http://YOUR-LAPTOP-IP/<?=e(basename(__DIR__))?>/connection-test.php?mode=phone</code> and replace YOUR-LAPTOP-IP with the IPv4 address.</p></div></div><div class="rule-line"><span class="rule-number">03</span><div><strong>Enter the one-time code</strong><p>Enter the code shown on the laptop and submit. The laptop page should change to “Phone connected”.</p></div></div><div class="notice notice-blue"><span class="notice-icon">i</span><p>If the page will not open, check that Apache is running and allow Apache through Windows Defender Firewall on <strong>Private networks only</strong>. Do not port-forward your XAMPP laptop to the public internet.</p></div></div></section></div>
    <section class="panel"><div class="panel-heading-row"><div><h2>What this test confirms</h2><p>The two devices reached the same app/database.</p></div></div><div class="panel-body"><p>When this test passes, the phone can send a request to the PHP app running on your laptop and the server can write/read the token in MySQL. Registration and item records will then be shared when you use the same site URL on both devices.</p><p><strong>Camera note:</strong> Most mobile browsers block the camera on an ordinary HTTP LAN IP. This test checks the PHP/MySQL connection, not camera permission. Test mobile camera capture on <code>localhost</code> on the laptop or through a temporary HTTPS tunnel you control.</p></div></section>
    <?php render_footer();
    exit;
}
// Phone mode intentionally requires no account: it can write only a random, temporary connectivity test token.
if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf(); $token=strtolower(preg_replace('/\s+/','',trim((string)($_POST['test_token']??''))));
    if(!preg_match('/^[a-f0-9]{32}$/',$token)){set_flash('danger','Enter the complete 32-character code shown on the laptop.');redirect('connection-test.php?mode=phone');}
    $st=$pdo->prepare("SELECT id FROM connection_tests WHERE device_label='laptop' AND test_token=? AND sent_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE) ORDER BY id DESC LIMIT 1");$st->execute([$token]);
    if(!$st->fetch()){set_flash('danger','The code is invalid or expired. Generate a new code on the laptop and try again.');redirect('connection-test.php?mode=phone');}
    $pdo->prepare("INSERT INTO connection_tests(device_label,test_token,sent_at) VALUES('phone',?,NOW())")->execute([$token]);
    render_header('Connection test successful');
    ?>
    <div class="panel narrow-panel"><div class="panel-heading-row"><div><h1>Phone connection successful</h1><p>Your phone reached the FindIT Campus PHP app and wrote a test row to MySQL.</p></div><span class="heading-icon">✓</span></div><div class="panel-body"><div class="notice notice-success"><span class="notice-icon">✓</span><p>Now check the laptop page. It should show <strong>Phone connected</strong>. This confirms both devices are reaching the same server/database.</p></div><a class="btn btn-primary" href="connection-test.php?mode=phone">Run test again</a></div></div>
    <?php render_footer();exit;
}
render_header('Phone connection test');
?>
<div class="page-header"><div><div class="eyebrow"><span class="pulse-dot"></span> PHONE CONNECTION</div><h1>Connect to the laptop server</h1><p>Enter the temporary code shown on the Admin laptop. This sends only a connection-test row, not any student information.</p></div></div>
<div class="panel narrow-panel"><div class="panel-heading-row"><div><h2>Test shared connection</h2><p>Both devices should be on the same Wi-Fi.</p></div><span class="heading-icon">↔</span></div><div class="panel-body"><form method="post" class="form-stack"><?=csrf_field()?><div class="field"><label for="test_token">One-time laptop code</label><input id="test_token" name="test_token" required minlength="32" maxlength="32" autocapitalize="characters" autocomplete="off" placeholder="Paste the 32-character code"></div><button class="btn btn-primary btn-block" type="submit">Test phone connection</button></form><p class="small-muted" style="margin-top:16px">This page uses the FindIT Campus database connection on the laptop. It does not require a student login.</p></div></div>
<?php render_footer(); ?>
