<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/db.php';

$userId = getCurrentUserId($db);

if (!$userId) {
    http_response_code(401);
    echo json_encode(['authenticated' => false]);
    exit;
}

try {
    $user = $db->users->findOne(['_id' => new MongoDB\BSON\ObjectId($userId)]);

    if ($user) {
        echo json_encode([
            'authenticated' => true, 
            'user' => [
                'name' => $user['name'],
                'email' => $user['email']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['authenticated' => false]);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
