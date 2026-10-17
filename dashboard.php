<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
$user = require_login($pdo);
redirect($user['role'] === 'admin' ? 'admin-dashboard.php' : 'lost-items.php');
