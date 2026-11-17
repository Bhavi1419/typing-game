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

const themes = ["emerald", "cyberpunk", "crimson", "ocean"];
let currentThemeIndex = 0;
let autoThemeEnabled = true;

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
const autoThemeBtn = document.getElementById("auto-theme-btn");

function applyTheme(themeName) {
  document.documentElement.setAttribute("data-theme", themeName);
  currentThemeIndex = themes.indexOf(themeName);
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === themeName);
  });
}

setInterval(() => {
  if (!autoThemeEnabled) return;
  const nextIndex = (currentThemeIndex + 1) % themes.length;
  applyTheme(themes[nextIndex]);
}, 30000);

function loadNewParagraph() {
  clearInterval(timerInterval);
  isStarted = false;
  timeLeft = selectedDuration;
  timerEl.textContent = timeLeft + "s";
  wpmEl.textContent = "0 WPM";
  accuracyEl.textContent = "100%";
  statusEl.textContent = "Start typing in the box above to begin the timer...";

  const list = paragraphs[currentDifficulty] || paragraphs.easy;
  currentText = list[Math.floor(Math.random() * list.length)];

  quoteDisplay.innerHTML = "";
  currentText.split("").forEach((char, index) => {
    const span = document.createElement("span");
    span.innerText = char;
    if (index === 0) span.classList.add("current");
    quoteDisplay.appendChild(span);
  });

  quoteInput.value = "";
  quoteInput.disabled = false;
  quoteInput.focus();
}

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft + "s";
    updateLiveStats();

    if (timeLeft <= 0) {
      finishRace();
    }
  }, 1000);
}

function updateLiveStats() {
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

  wpmEl.textContent = wpm + " WPM";
  accuracyEl.textContent = accuracy + "%";

  if (typed.length >= currentText.length) {
    finishRace();
  }
}

function finishRace() {
  clearInterval(timerInterval);
  quoteInput.disabled = true;

  const typed = quoteInput.value;
  const spans = quoteDisplay.querySelectorAll("span");
  let correctChars = 0;

  spans.forEach((span, index) => {
    if (typed[index] === span.innerText) {
      correctChars++;
    }
  });

  const totalTyped = Math.max(1, typed.length);
  const timeTaken = Math.max(1, selectedDuration - timeLeft);
  const playerName = playerNameInput.value.trim() !== "" ? playerNameInput.value.trim() : "Guest";

  statusEl.textContent = "Saving score to TiDB Cloud...";

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
        wpmEl.textContent = data.wpm + " WPM";
        accuracyEl.textContent = data.accuracy + "%";
        statusEl.textContent = `Finished! Official Score: ${data.wpm} WPM (${data.accuracy}% accuracy)`;
        renderLeaderboard(data.leaderboard);
      } else {
        statusEl.textContent = "Error: " + (data.message || "Could not save score.");
      }
    })
    .catch(err => {
      console.error("Submit error:", err);
      statusEl.textContent = "Network error while saving score.";
    });
}

function loadLeaderboard() {
  fetch("get_scores.php")
    .then(res => res.json())
    .then(scores => renderLeaderboard(scores))
    .catch(err => {
      console.error("Leaderboard load error:", err);
      leaderboardBody.innerHTML = `<tr><td colspan="6">Unable to load leaderboard.</td></tr>`;
    });
}

function renderLeaderboard(scores) {
  if (!Array.isArray(scores) || scores.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="6">No scores recorded yet. Complete a race to claim #1!</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = scores
    .map(
      (row, idx) => `
      <tr>
        <td>#${idx + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td><strong>${row.wpm} WPM</strong></td>
        <td>${row.accuracy}%</td>
        <td>${escapeHtml(row.difficulty || "easy")}</td>
        <td>${row.duration || 30}s</td>
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

quoteInput.addEventListener("input", () => {
  if (!isStarted) {
    isStarted = true;
    startTimer();
  }
  updateLiveStats();
});

restartBtn.addEventListener("click", loadNewParagraph);

document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDifficulty = btn.dataset.difficulty;
    loadNewParagraph();
  });
});

document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDuration = parseInt(btn.dataset.duration, 10) || 30;
    loadNewParagraph();
  });
});

document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    applyTheme(btn.dataset.theme);
  });
});

autoThemeBtn.addEventListener("click", () => {
  autoThemeEnabled = !autoThemeEnabled;
  autoThemeBtn.textContent = autoThemeEnabled ? "Auto Theme: ON" : "Auto Theme: OFF";
});

loadNewParagraph();
loadLeaderboard();