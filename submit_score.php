<?php
header('Content-Type: application/json');

$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

if (!$data || !isset($data['correctChars'], $data['totalTyped'], $data['timeTaken'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing game numbers.']);
    exit;
}

$name = trim($data['name'] ?? 'Anonymous');
$name = substr(preg_replace('/[^a-zA-Z0-9 _-]/', '', $name), 0, 20);
if ($name === '') {
    $name = 'Anonymous';
}

$correctChars = (int) $data['correctChars'];
$totalTyped   = (int) $data['totalTyped'];
$timeTaken    = (int) $data['timeTaken'];

if ($timeTaken <= 0 || $timeTaken > 60 || $correctChars < 0 || $totalTyped < $correctChars) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid race numbers.']);
    exit;
}

// Referee calculates Words Per Minute (WPM) and Accuracy
$minutes  = $timeTaken / 60;
$wpm      = (int) round(($correctChars / 5) / $minutes);
$accuracy = $totalTyped > 0 ? round(($correctChars / $totalTyped) * 100, 1) : 0;

// Anti-cheat check
if ($wpm > 250) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Too fast! No robots allowed.']);
    exit;
}

$file = __DIR__ . '/scores.json';
$scores = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
if (!is_array($scores)) {
    $scores = [];
}

$scores[] = [
    'name'     => $name,
    'wpm'      => $wpm,
    'accuracy' => $accuracy,
    'date'     => date('Y-m-d')
];

// Sort highest WPM at the top
usort($scores, function ($a, $b) {
    if ($b['wpm'] === $a['wpm']) {
        return $b['accuracy'] <=> $a['accuracy'];
    }
    return $b['wpm'] <=> $a['wpm'];
});

// Keep only the top 15 winners
$scores = array_slice($scores, 0, 15);

file_put_contents($file, json_encode($scores, JSON_PRETTY_PRINT), LOCK_EX);

echo json_encode([
    'status'      => 'success',
    'wpm'         => $wpm,
    'accuracy'    => $accuracy,
    'leaderboard' => $scores
]);