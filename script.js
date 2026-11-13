const PASSAGES = [
  "Clean code always looks like it was written by someone who cares about the craft of software engineering.",
  "Data structures and algorithms form the backbone of efficient problem solving in modern computer science.",
  "Version control with Git allows developers to track changes, collaborate safely, and deploy reliable releases.",
  "Fast typing comes from rhythm and accuracy rather than rushing through keys and fixing constant mistakes."
];

const quoteDisplay = document.getElementById("quote-display");
const quoteInput = document.getElementById("quote-input");
const timerEl = document.getElementById("timer");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const playerNameInput = document.getElementById("player-name");
const restartBtn = document.getElementById("restart-btn");
const statusMsg = document.getElementById("status-msg");
const leaderboardBody = document.getElementById("leaderboard-body");

const RACE_DURATION = 60;
let timeLeft = RACE_DURATION;
let timerInterval = null;
let isRunning = false;
let currentText = "";
let correctChars = 0;
let totalTyped = 0;

function loadNewPassage() {
  clearInterval(timerInterval);
  timeLeft = RACE_DURATION;
  isRunning = false;
  correctChars = 0;
  totalTyped = 0;

  timerEl.textContent = `${RACE_DURATION}s`;
  wpmEl.textContent = "0";
  accuracyEl.textContent = "100%";
  statusMsg.textContent = "";
  quoteInput.value = "";
  quoteInput.disabled = false;

  currentText = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
  quoteDisplay.innerHTML = "";
  currentText.split("").forEach((char) => {
    const span = document.createElement("span");
    span.textContent = char;
    quoteDisplay.appendChild(span);
  });
}

function startTimer() {
  isRunning = true;
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `${timeLeft}s`;
    updateLiveMetrics();

    if (timeLeft <= 0) {
      finishRace();
    }
  }, 1000);
}

function updateLiveMetrics() {
  const elapsedSeconds = Math.max(1, RACE_DURATION - timeLeft);
  const minutes = elapsedSeconds / 60;
  const wpm = Math.round((correctChars / 5) / minutes);
  const accuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;

  wpmEl.textContent = wpm;
  accuracyEl.textContent = `${accuracy}%`;
}

quoteInput.addEventListener("input", () => {
  if (!isRunning) startTimer();

  const typedChars = quoteInput.value.split("");
  const quoteSpans = quoteDisplay.querySelectorAll("span");

  correctChars = 0;
  totalTyped = typedChars.length;

  quoteSpans.forEach((span, index) => {
    const typedChar = typedChars[index];
    if (typedChar == null) {
      span.className = "";
    } else if (typedChar === span.textContent) {
      span.className = "correct";
      correctChars++;
    } else {
      span.className = "incorrect";
    }
  });

  updateLiveMetrics();

  if (typedChars.length >= currentText.length) {
    finishRace();
  }
});

async function finishRace() {
  clearInterval(timerInterval);
  isRunning = false;
  quoteInput.disabled = true;

  const timeTaken = Math.max(1, RACE_DURATION - timeLeft);
  const playerName = playerNameInput.value.trim() || "Anonymous";
  statusMsg.textContent = "Checking score with the PHP referee...";

  try {
    const response = await fetch("submit_score.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: playerName,
        correctChars: correctChars,
        totalTyped: totalTyped,
        timeTaken: timeTaken
      })
    });

    const result = await response.json();
    if (result.status === "success") {
      wpmEl.textContent = result.wpm;
      accuracyEl.textContent = `${result.accuracy}%`;
      statusMsg.textContent = `Official Score: ${result.wpm} WPM (${result.accuracy}% accuracy)`;
      renderLeaderboard(result.leaderboard);
    } else {
      statusMsg.textContent = result.message || "Score rejected by referee.";
    }
  } catch (err) {
    statusMsg.textContent = "Could not reach PHP! Is Apache green in XAMPP?";
  }
}

function renderLeaderboard(scores) {
  leaderboardBody.innerHTML = "";
  if (!scores || scores.length === 0) {
    leaderboardBody.innerHTML = '<tr><td colspan="5">No scores yet. Play a round to be #1!</td></tr>';
    return;
  }

  scores.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>#${index + 1}</td>
      <td></td>
      <td><strong>${entry.wpm}</strong></td>
      <td>${entry.accuracy}%</td>
      <td>${entry.date}</td>
    `;
    row.children[1].textContent = entry.name;
    leaderboardBody.appendChild(row);
  });
}

async function fetchLeaderboard() {
  try {
    const response = await fetch("get_scores.php");
    const scores = await response.json();
    renderLeaderboard(scores);
  } catch (err) {
    leaderboardBody.innerHTML = '<tr><td colspan="5">Failed to load leaderboard.</td></tr>';
  }
}

restartBtn.addEventListener("click", loadNewPassage);

loadNewPassage();
fetchLeaderboard();