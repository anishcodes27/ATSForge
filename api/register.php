<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

if (empty($name) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format.']);
    exit;
}

try {
    // Check if email exists
    $existingUser = $db->users->findOne(['email' => $email]);
    if ($existingUser) {
        http_response_code(400);
        echo json_encode(['error' => 'Email already registered.']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    $result = $db->users->insertOne([
        'name' => $name,
        'email' => $email,
        'password_hash' => $hash,
        'auth_token' => null,
        'created_at' => new MongoDB\BSON\UTCDateTime()
    ]);

    echo json_encode(['success' => true, 'message' => 'Registration successful! You can now log in.']);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed: ' . $e->getMessage()]);
}
