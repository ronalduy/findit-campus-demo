<?php
// FindIT Campus local XAMPP configuration.
declare(strict_types=1);
date_default_timezone_set('Asia/Manila');

if (session_status() !== PHP_SESSION_ACTIVE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

const DB_HOST = '127.0.0.1';
const DB_NAME = 'findit_campus';
const DB_USER = 'root';
const DB_PASS = ''; // Default XAMPP setup. Change this if your MySQL root account has a password.
const OFFICE_LOCATION = 'School Admin / Guidance Office';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SESSION_IDLE_SECONDS = 1800; // 30 minutes

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $exception) {
    http_response_code(500);
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FindIT Campus setup</title>';
    echo '<style>body{font-family:Arial,sans-serif;background:#f3f6fc;color:#14213d;padding:30px;line-height:1.6}.box{max-width:720px;margin:5vh auto;background:white;padding:28px;border-radius:18px;box-shadow:0 10px 40px #14213d18}code{background:#eef2ff;padding:3px 6px;border-radius:5px}</style>';
    echo '<div class="box"><h1>FindIT Campus needs database setup</h1><p>Apache/PHP is running, but the MySQL connection failed. Start Apache and MySQL in XAMPP, open phpMyAdmin, import <code>database/findit_campus.sql</code>, then refresh this page.</p><p>Default XAMPP settings in <code>config.php</code> use username <code>root</code> and a blank password. If your MySQL setup is different, update those values.</p></div></html>';
    exit;
}
