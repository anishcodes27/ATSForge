<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/gemini.php';

use Smalot\PdfParser\Parser;

// Ensure this is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

    $userId = getCurrentUserId($db);
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Please log in first.']);
        exit;
    }

    // Validate input
    if (!isset($_FILES['resume']) || $_FILES['resume']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'Please upload a valid PDF resume.']);
        exit;
    }

    if (!isset($_POST['target_role']) || empty(trim($_POST['target_role']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Please provide a target job role.']);
        exit;
    }

    $file = $_FILES['resume'];
    $targetRole = trim($_POST['target_role']);

    // Check file type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if ($mime !== 'application/pdf') {
        http_response_code(400);
        echo json_encode(['error' => 'Only PDF files are allowed.']);
        exit;
    }

    try {
        // 1. Parse PDF
        $parser = new Parser();
    $pdf = $parser->parseFile($file['tmp_name']);
    $text = $pdf->getText();

    if (empty(trim($text))) {
        throw new Exception("Could not extract text from the PDF. It might be an image-based PDF or empty.");
    }

    // 2. Analyze with Gemini
    $analysisResult = analyzeResumeWithGemini($text, $targetRole);

    // 3. Store in Database
    $document = [
        'user_id' => $userId,
        'resume_name' => $file['name'],
        'target_role' => $targetRole,
        'ats_score' => $analysisResult['ats_score'] ?? 0,
        'strengths' => $analysisResult['strengths'] ?? [],
        'weaknesses' => $analysisResult['weaknesses'] ?? [],
        'missing_skills' => $analysisResult['missing_skills'] ?? [],
        'keywords' => $analysisResult['keywords'] ?? [],
        'recommendations' => $analysisResult['recommendations'] ?? [],
        'project_improvements' => $analysisResult['project_improvements'] ?? [],
        'achievement_improvements' => $analysisResult['achievement_improvements'] ?? [],
        'created_at' => new MongoDB\BSON\UTCDateTime()
    ];
    
    $result = $db->analyses->insertOne($document);
    $analysisId = (string) $result->getInsertedId();

    // 4. Return success response
    echo json_encode([
        'success' => true,
        'id' => $analysisId,
        'data' => $analysisResult
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
