<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../includes/db.php';

try {
    $userId = getCurrentUserId($db);
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    // Fetch all analyses ordered by newest first for this user
    $cursor = $db->analyses->find(
        ['user_id' => $userId],
        ['sort' => ['created_at' => -1]]
    );
    
    $analyses = [];
    foreach ($cursor as $doc) {
        // Convert BSONDocument to array
        $row = (array) $doc;
        $row['id'] = (string) $row['_id'];
        unset($row['_id']);
        
        // Convert UTCDateTime to string for the frontend
        if (isset($row['created_at']) && $row['created_at'] instanceof MongoDB\BSON\UTCDateTime) {
            $row['created_at'] = $row['created_at']->toDateTime()->format('Y-m-d H:i:s');
        }
        
        $analyses[] = $row;
    }

    echo json_encode([
        'success' => true,
        'data' => $analyses
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch history: ' . $e->getMessage()]);
}
