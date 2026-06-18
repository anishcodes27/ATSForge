<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required.']);
    exit;
}

try {
    $user = $db->users->findOne(['email' => $email]);

    if ($user && password_verify($password, $user['password_hash'])) {
        // Generate auth token
        $token = bin2hex(random_bytes(32));
        
        // Save to DB
        $db->users->updateOne(
            ['_id' => $user['_id']],
            ['$set' => ['auth_token' => $token]]
        );

        // Set HttpOnly Cookie (secure and works on Vercel)
        setcookie('auth_token', $token, [
            'expires' => time() + 86400 * 30, // 30 days
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax' // Or 'Strict'
        ]);

        echo json_encode([
            'success' => true, 
            'user' => [
                'name' => $user['name'],
                'email' => $user['email']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password.']);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Login failed: ' . $e->getMessage()]);
}
