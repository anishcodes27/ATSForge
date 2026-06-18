<?php
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Calls the Gemini API to analyze a resume against a target role.
 * Returns a structured JSON array as per our requirements.
 */
function analyzeResumeWithGemini($resumeText, $targetRole) {
    $apiKeys = [
        $_ENV['GEMINI_API_KEY_1'] ?? '',
        $_ENV['GEMINI_API_KEY_2'] ?? '',
        $_ENV['GEMINI_API_KEY_3'] ?? ''
    ];

    // Filter out empty keys
    $apiKeys = array_filter($apiKeys, function($key) {
        return !empty($key) && $key !== 'your_gemini_api_key_here';
    });

    if (empty($apiKeys)) {
        throw new Exception("No valid Gemini API Keys found in .env file.");
    }

    $prompt = "You are an expert ATS (Applicant Tracking System) and Senior Technical Recruiter. " .
              "Analyze the following resume for the role of '{$targetRole}'.\n\n" .
              "Resume Content:\n" .
              substr($resumeText, 0, 15000) . "\n\n" . // Limit text to avoid token limits
              "Evaluate ATS compatibility, score the resume, identify missing skills, suggest keywords, and recommend improvements. " .
              "Your response MUST be ONLY a valid JSON object with the following exact structure and no markdown formatting (no ```json): \n" .
              "{\n" .
              '  "ats_score": Integer from 0 to 100,' . "\n" .
              '  "strengths": [Array of 3-5 short strings highlighting strong points],' . "\n" .
              '  "weaknesses": [Array of 3-5 short strings highlighting weak points],' . "\n" .
              '  "missing_skills": [Array of 5-8 technical skills missing for this role],' . "\n" .
              '  "keywords": [Array of 8-10 ATS-friendly keywords to include],' . "\n" .
              '  "recommendations": [Array of 3-5 general resume improvement tips],' . "\n" .
              '  "project_improvements": [Array of 2-3 tips for better project descriptions],' . "\n" .
              '  "achievement_improvements": [Array of 2-3 tips for quantifiable achievements]' . "\n" .
              "}";

    $data = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt]
                ]
            ]
        ],
        "generationConfig" => [
            "temperature" => 0.2,
            "responseMimeType" => "application/json"
        ]
    ];

    $options = [
        'http' => [
            'header'  => "Content-type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($data),
            'ignore_errors' => true
        ]
    ];

    $context  = stream_context_create($options);
    $lastError = "Unknown error occurred during API call.";

    foreach ($apiKeys as $apiKey) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;
        $result = @file_get_contents($url, false, $context);

        if ($result === FALSE) {
            $lastError = "Network error connecting to Gemini API with a key.";
            continue; // Try next key
        }

        $response = json_decode($result, true);

        if (isset($response['error'])) {
            $lastError = "Gemini API Error: " . $response['error']['message'];
            continue; // Try next key
        }

        if (isset($response['candidates'][0]['content']['parts'][0]['text'])) {
            $jsonText = $response['candidates'][0]['content']['parts'][0]['text'];
            
            $jsonText = preg_replace('/```json\s*(.*?)\s*```/s', '$1', $jsonText);
            $jsonText = trim($jsonText);
            
            $parsedData = json_decode($jsonText, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $parsedData; // Success, return data immediately
            } else {
                $lastError = "Failed to parse Gemini response as JSON. Error: " . json_last_error_msg();
                continue; // Try next key
            }
        } else {
            $lastError = "Unexpected response structure from Gemini API.";
            continue; // Try next key
        }
    }

    // If loop completes without returning, all keys failed
    throw new Exception("All API keys failed. Last error: " . $lastError);
}
