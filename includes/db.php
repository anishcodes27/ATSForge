<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

$mongoUri = $_ENV['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017';
$dbName = $_ENV['MONGODB_DB'] ?? 'atsforge';

try {
    $mongoClient = new MongoDB\Client($mongoUri);
    // Select the database
    $db = $mongoClient->$dbName;
} catch (\Exception $e) {
    http_response_code(500);
    exit(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

/**
 * Helper function to get the currently logged in user ID from the auth cookie
 * Returns the MongoDB\BSON\ObjectId as a string, or null
 */
function getCurrentUserId($db) {
    if (!isset($_COOKIE['auth_token'])) {
        return null;
    }
    
    $token = $_COOKIE['auth_token'];
    
    // Find user by token
    $user = $db->users->findOne(['auth_token' => $token]);
    
    return $user ? (string) $user['_id'] : null;
}
