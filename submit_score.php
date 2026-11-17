<?php
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['name'], $data['correctChars'], $data['totalTyped'], $data['timeTaken'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid score data.']);
    exit;
}

$name = trim(strip_tags($data['name']));
if ($name === '') {
    $name = 'Guest';
}
$name = substr($name, 0, 20);

$correctChars = max(0, (int)$data['correctChars']);
$totalTyped   = max(1, (int)$data['totalTyped']);
$timeTaken    = max(1, (int)$data['timeTaken']);
$difficulty   = isset($data['difficulty']) ? substr(strip_tags($data['difficulty']), 0, 15) : 'easy';
$duration     = isset($data['duration']) ? (int)$data['duration'] : 30;

$minutes  = $timeTaken / 60;
$wpm      = (int)round(($correctChars / 5) / $minutes);
$accuracy = (int)round(($correctChars / $totalTyped) * 100);
$accuracy = max(0, min(100, $accuracy));

if ($wpm > 250) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Score too high!']);
    exit;
}

$stmt = $pdo->prepare(
    "INSERT INTO scores (player_name, wpm, accuracy, difficulty, duration) 
     VALUES (:name, :wpm, :accuracy, :difficulty, :duration)"
);
$stmt->execute([
    ':name'       => $name,
    ':wpm'        => $wpm,
    ':accuracy'   => $accuracy,
    ':difficulty' => $difficulty,
    ':duration'   => $duration
]);

$topStmt = $pdo->query(
    "SELECT player_name AS name, wpm, accuracy, difficulty, duration, played_at 
     FROM scores 
     ORDER BY wpm DESC, accuracy DESC, id ASC 
     LIMIT 15"
);
$leaderboard = $topStmt->fetchAll();

echo json_encode([
    'status'      => 'success',
    'wpm'         => $wpm,
    'accuracy'    => $accuracy,
    'leaderboard' => $leaderboard
]);
?>