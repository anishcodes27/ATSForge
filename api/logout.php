<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/db.php';

if (isset($_COOKIE['auth_token'])) {
    $token = $_COOKIE['auth_token'];
    try {
        $db->users->updateOne(
            ['auth_token' => $token],
            ['$set' => ['auth_token' => null]]
        );
    } catch (\Exception $e) {
        // Ignore DB error on logout, still clear cookie
    }

    setcookie('auth_token', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

echo json_encode(['success' => true]);
