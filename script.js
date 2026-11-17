const paragraphs = {
  easy: [
    "The quick brown fox jumps over the lazy dog near the quiet river bank while the morning sun warms the green grass.",
    "Coding every day builds strong problem solving skills and helps you write clean programs that run fast and reliably.",
    "A good keyboard and steady posture make typing smooth and comfortable even during long study sessions at night."
  ],
  medium: [
    "Developers use version control systems like Git to track every change, collaborate across teams, and deploy updates safely to cloud servers.",
    "Relational databases organize structured data into tables with primary keys, allowing web applications to store and retrieve records in milliseconds.",
    "Consistent practice improves finger muscle memory, reducing backspace corrections and boosting both words per minute and overall accuracy."
  ],
  hard: [
    "Containerizing PHP 8.2 with Apache and PDO MySQL drivers ensures identical runtime behavior across local XAMPP environments and production cloud hosts!",
    "Asynchronous JavaScript fetches JSON payloads from REST endpoints without blocking the main UI thread, keeping animations smooth at 60fps.",
    "Encrypting database connections with TLS certificates protects sensitive credentials in transit against interception across public networks."
  ]
};

let currentDifficulty = "easy";
let selectedDuration = 30;
let timeLeft = 30;
let timerInterval = null;
let isStarted = false;
let currentText = "";
let startTime = null;

const quoteDisplay = document.getElementById("quote-display");
const quoteInput = document.getElementById("quote-input");
const timerEl = document.getElementById("timer");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const statusEl = document.getElementById("status-message");
const playerNameInput = document.getElementById("player-name");
const leaderboardBody = document.getElementById("leaderboard-body");
const restartBtn = document.getElementById("restart-btn");

function loadNewParagraph() {
  clearInterval(timerInterval);
  isStarted = false;
  timeLeft = selectedDuration;
  if (timerEl) timerEl.textContent = timeLeft + "s";
  if (wpmEl) wpmEl.textContent = "0";
  if (accuracyEl) accuracyEl.textContent = "100%";
  if (statusEl) statusEl.textContent = "Start typing in the box below to begin the timer...";

  const list = paragraphs[currentDifficulty] || paragraphs.easy;
  currentText = list[Math.floor(Math.random() * list.length)];

  if (quoteDisplay) {
    quoteDisplay.innerHTML = "";
    currentText.split("").forEach((char, index) => {
      const span = document.createElement("span");
      span.innerText = char;
      if (index === 0) span.classList.add("current");
      quoteDisplay.appendChild(span);
    });
  }

  if (quoteInput) {
    quoteInput.value = "";
    quoteInput.disabled = false;
    quoteInput.focus();
  }
}

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.textContent = timeLeft + "s";
    updateLiveStats();

    if (timeLeft <= 0) {
      finishRace();
    }
  }, 1000);
}

function updateLiveStats() {
  if (!quoteInput || !quoteDisplay) return;
  const typed = quoteInput.value;
  const spans = quoteDisplay.querySelectorAll("span");
  let correctChars = 0;

  spans.forEach((span, index) => {
    span.classList.remove("correct", "incorrect", "current");
    const typedChar = typed[index];

    if (typedChar == null) {
      if (index === typed.length) {
        span.classList.add("current");
      }
    } else if (typedChar === span.innerText) {
      span.classList.add("correct");
      correctChars++;
    } else {
      span.classList.add("incorrect");
    }
  });

  const elapsedSeconds = Math.max(1, (Date.now() - startTime) / 1000);
  const wpm = Math.round((correctChars / 5) / (elapsedSeconds / 60));
  const accuracy = typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100;

  if (wpmEl) wpmEl.textContent = wpm;
  if (accuracyEl) accuracyEl.textContent = accuracy + "%";

  if (typed.length >= currentText.length) {
    finishRace();
  }
}

function finishRace() {
  clearInterval(timerInterval);
  if (quoteInput) quoteInput.disabled = true;

  const typed = quoteInput ? quoteInput.value : "";
  const spans = quoteDisplay ? quoteDisplay.querySelectorAll("span") : [];
  let correctChars = 0;

  spans.forEach((span, index) => {
    if (typed[index] === span.innerText) {
      correctChars++;
    }
  });

  const totalTyped = Math.max(1, typed.length);
  const timeTaken = Math.max(1, selectedDuration - timeLeft);
  const playerName = playerNameInput && playerNameInput.value.trim() !== ""
    ? playerNameInput.value.trim()
    : "Guest";

  if (statusEl) statusEl.textContent = "Saving score to cloud database...";

  fetch("submit_score.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: playerName,
      correctChars: correctChars,
      totalTyped: totalTyped,
      timeTaken: timeTaken,
      difficulty: currentDifficulty,
      duration: selectedDuration
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        if (wpmEl) wpmEl.textContent = data.wpm;
        if (accuracyEl) accuracyEl.textContent = data.accuracy + "%";
        if (statusEl) {
          statusEl.textContent = `Finished! Official Score: ${data.wpm} WPM (${data.accuracy}% accuracy)`;
        }
        renderLeaderboard(data.leaderboard);
      } else {
        if (statusEl) statusEl.textContent = "Error: " + (data.message || "Could not save score.");
      }
    })
    .catch(err => {
      console.error("Submit error:", err);
      if (statusEl) statusEl.textContent = "Network error while saving score.";
    });
}

function loadLeaderboard() {
  fetch("get_scores.php")
    .then(res => res.json())
    .then(scores => {
      renderLeaderboard(scores);
    })
    .catch(err => console.error("Leaderboard load error:", err));
}

function renderLeaderboard(scores) {
  if (!leaderboardBody) return;
  if (!Array.isArray(scores) || scores.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="5">No scores recorded yet. Be the first!</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = scores
    .map(
      (row, idx) => `
      <tr>
        <td>#${idx + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.wpm} WPM</td>
        <td>${row.accuracy}%</td>
        <td>${escapeHtml(row.difficulty || "easy")}</td>
      </tr>
    `
    )
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

if (quoteInput) {
  quoteInput.addEventListener("input", () => {
    if (!isStarted) {
      isStarted = true;
      startTimer();
    }
    updateLiveStats();
  });
}

if (restartBtn) {
  restartBtn.addEventListener("click", loadNewParagraph);
}

document.querySelectorAll("[data-difficulty]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-difficulty]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDifficulty = btn.dataset.difficulty;
    loadNewParagraph();
  });
});

document.querySelectorAll("[data-duration]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-duration]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDuration = parseInt(btn.dataset.duration, 10) || 30;
    loadNewParagraph();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  loadNewParagraph();
  loadLeaderboard();
});