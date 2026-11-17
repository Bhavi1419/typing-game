<?php
header('Content-Type: application/json');
require_once 'db.php';

$stmt = $pdo->query(
    "SELECT player_name AS name, wpm, accuracy, difficulty, duration, played_at 
     FROM scores 
     ORDER BY wpm DESC, accuracy DESC, id ASC 
     LIMIT 15"
);

echo json_encode($stmt->fetchAll());
?>