const THEMES = [
  { id: "emerald", label: "🎨 Midnight Emerald" },
  { id: "cyberpunk", label: "🎨 Cyberpunk Neon" },
  { id: "crimson", label: "🎨 Solar Crimson" },
  { id: "ocean", label: "🎨 Deep Ocean" }
];

const PASSAGES = {
  easy: [
    "Fast typing comes from steady rhythm and accuracy rather than rushing through keys and fixing mistakes.",
    "Clean code always looks like it was written by someone who cares about the craft of software.",
    "Practice makes progress, and typing a little bit every day builds real speed and confidence.",
    "Good habits at the keyboard keep your hands relaxed and help you focus on your ideas."
  ],
  medium: [
    "Data structures and algorithms form the backbone of efficient problem solving in modern computer science.",
    "Version control with Git allows developers to track changes, collaborate safely, and deploy reliable releases.",
    "Building responsive web interfaces requires balancing visual polish, fast load times, and intuitive controls.",
    "Debugging is twice as hard as writing the code in the first place, so keep every function simple and clear."
  ],
  hard: [
    "Asynchronous JavaScript leverages the event loop, microtask queues, and Promises to execute non-blocking I/O operations at scale.",
    "Optimizing Linux server permissions with chown and chmod prevents unauthorized access while allowing Apache processes to write JSON logs.",
    "Cryptographic hash functions guarantee data integrity by mapping arbitrary byte streams into fixed-length hexadecimal digests.",
    "Full-stack engineering bridges client-side state synchronization with stateless REST APIs, relational schemas, and containerized deployments."
  ]
};

// DOM Elements
const passageDisplay = document.getElementById("passage-display");
const typingInput = document.getElementById("typing-input");
const typingCard = document.getElementById("typing-card");
const progressBar = document.getElementById("progress-bar");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const timerEl = document.getElementById("timer");
const streakEl = document.getElementById("streak");
const statusMsg = document.getElementById("status-msg");
const playerNameInput = document.getElementById("player-name");
const restartBtn = document.getElementById("restart-btn");
const soundToggleBtn = document.getElementById("sound-toggle");
const themeToggleBtn = document.getElementById("theme-toggle");
const leaderboardBody = document.getElementById("leaderboard-body");

// Automatic 30-Second Theme Rotation
let currentThemeIndex = 0;
let themeInterval = null;

function applyTheme(index) {
  currentThemeIndex = index % THEMES.length;
  const theme = THEMES[currentThemeIndex];
  if (theme.id === "emerald") {
    document.body.removeAttribute("data-theme");
  } else {
    document.body.setAttribute("data-theme", theme.id);
  }
  themeToggleBtn.textContent = theme.label;
}

function startThemeRotation() {
  clearInterval(themeInterval);
  themeInterval = setInterval(() => {
    applyTheme(currentThemeIndex + 1);
  }, 30000); // Switches theme every 30 seconds
}

themeToggleBtn.addEventListener("click", () => {
  applyTheme(currentThemeIndex + 1);
  startThemeRotation(); // Reset the 30-second countdown after manual click
});

// Game State
let currentDifficulty = "easy";
let selectedDuration = 30;
let timeLeft = selectedDuration;
let currentText = "";
let lastPassage = "";
let timerInterval = null;
let isPlaying = false;
let isFinished = false;
let soundEnabled = true;
let streak = 0;
let prevTypedLength = 0;

// Web Audio API Synthesized Mechanical Key Click
let audioCtx = null;
function playKeySound(isCorrect) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (isCorrect) {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(75, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.09, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.085);
    }
  } catch (e) {
    // Ignore audio errors on restricted devices
  }
}

// Pick a new non-repeating passage
function loadNewPassage() {
  clearInterval(timerInterval);
  isPlaying = false;
  isFinished = false;
  timeLeft = selectedDuration;
  streak = 0;
  prevTypedLength = 0;

  const pool = PASSAGES[currentDifficulty];
  let chosen = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1) {
    while (chosen === lastPassage) {
      chosen = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  lastPassage = chosen;
  currentText = chosen;

  passageDisplay.innerHTML = "";
  currentText.split("").forEach((char, idx) => {
    const span = document.createElement("span");
    span.textContent = char;
    span.className = idx === 0 ? "char current" : "char";
    passageDisplay.appendChild(span);
  });

  typingInput.value = "";
  typingInput.disabled = false;
  progressBar.style.width = "0%";
  wpmEl.textContent = "0";
  accuracyEl.textContent = "100%";
  timerEl.textContent = `${selectedDuration}s`;
  streakEl.textContent = "🔥 0";
  statusMsg.textContent = "Ready when you are — timer starts on your first keystroke.";
}

// Live Stats Calculator
function updateLiveStats() {
  const spans = passageDisplay.querySelectorAll(".char");
  const typedLen = typingInput.value.length;
  let correctCount = 0;

  for (let i = 0; i < typedLen && i < spans.length; i++) {
    if (spans[i].classList.contains("correct")) correctCount++;
  }

  const elapsedSeconds = Math.max(1, selectedDuration - timeLeft);
  const liveWpm = Math.round((correctCount / 5) / (elapsedSeconds / 60));
  const liveAcc = typedLen > 0 ? Math.round((correctCount / typedLen) * 100) : 100;

  wpmEl.textContent = liveWpm;
  accuracyEl.textContent = `${liveAcc}%`;
}

// Start Countdown Timer
function startTimer() {
  isPlaying = true;
  statusMsg.textContent = "Race in progress! Keep your rhythm steady...";
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `${timeLeft}s`;
    updateLiveStats();

    if (timeLeft <= 0) {
      finishRace();
    }
  }, 1000);
}

// Handle Typing Input
typingInput.addEventListener("input", () => {
  if (isFinished) return;
  if (!isPlaying && typingInput.value.length > 0) {
    startTimer();
  }

  const spans = passageDisplay.querySelectorAll(".char");
  const typedChars = typingInput.value.split("");
  const isAddingChar = typedChars.length > prevTypedLength;

  spans.forEach((span, idx) => {
    span.classList.remove("correct", "incorrect", "current");

    if (idx < typedChars.length) {
      if (typedChars[idx] === currentText[idx]) {
        span.classList.add("correct");
      } else {
        span.classList.add("incorrect");
      }
    } else if (idx === typedChars.length) {
      span.classList.add("current");
    }
  });

  if (isAddingChar && typedChars.length <= currentText.length) {
    const lastIdx = typedChars.length - 1;
    const isHit = typedChars[lastIdx] === currentText[lastIdx];

    if (isHit) {
      streak++;
      playKeySound(true);
    } else {
      streak = 0;
      playKeySound(false);
      typingCard.classList.remove("shake");
      void typingCard.offsetWidth;
      typingCard.classList.add("shake");
    }
    streakEl.textContent = `🔥 ${streak}`;
  }

  prevTypedLength = typedChars.length;

  const progressPct = Math.min(100, (typedChars.length / currentText.length) * 100);
  progressBar.style.width = `${progressPct}%`;
  updateLiveStats();

  if (typedChars.length >= currentText.length) {
    finishRace();
  }
});

// Finish Race & Submit Score
async function finishRace() {
  if (isFinished) return;
  isFinished = true;
  isPlaying = false;
  clearInterval(timerInterval);
  typingInput.disabled = true;

  const spans = passageDisplay.querySelectorAll(".char");
  const totalTyped = Math.min(typingInput.value.length, spans.length);
  let correctChars = 0;

  for (let i = 0; i < totalTyped; i++) {
    if (spans[i].classList.contains("correct")) correctChars++;
  }

  const timeTaken = Math.max(1, selectedDuration - timeLeft);
  const playerName = playerNameInput.value.trim() || "Guest";
  localStorage.setItem("typingPlayerName", playerName);

  statusMsg.textContent = "Submitting official score to server...";

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

    const rawText = await response.text();
    const result = JSON.parse(rawText);

    if (result.status === "success") {
      wpmEl.textContent = result.wpm;
      accuracyEl.textContent = `${result.accuracy}%`;
      statusMsg.textContent = `🏁 Finished! Official Score: ${result.wpm} WPM (${result.accuracy}% accuracy)`;
      renderLeaderboard(result.leaderboard, playerName);
    } else {
      statusMsg.textContent = result.message || "Score could not be recorded.";
    }
  } catch (err) {
    statusMsg.textContent = "Server waking up—wait 30 seconds and click New Race to try again!";
  }
}

// Render Leaderboard Table
function renderLeaderboard(scores, highlightName = "") {
  if (!Array.isArray(scores) || scores.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty-row">No scores yet. Be the first on the board!</td></tr>`;
    return;
  }

  leaderboardBody.innerHTML = scores
    .map((entry, idx) => {
      const medal = idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : `#${idx + 1}`;
      const isMe = highlightName && entry.name.toLowerCase() === highlightName.toLowerCase();
      return `
        <tr class="${isMe ? "highlight-row" : ""}">
          <td><strong>${medal}</strong></td>
          <td>${escapeHtml(entry.name)}</td>
          <td><span class="accent-primary"><strong>${entry.wpm}</strong></span></td>
          <td>${entry.accuracy}%</td>
        </tr>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

async function fetchLeaderboard() {
  try {
    const res = await fetch("get_scores.php");
    const data = await res.json();
    renderLeaderboard(data);
  } catch (e) {
    leaderboardBody.innerHTML = `<tr><td colspan="4" class="empty-row">Could not load leaderboard yet.</td></tr>`;
  }
}

// Interactive Controls & Event Listeners
passageDisplay.addEventListener("click", () => typingInput.focus());
restartBtn.addEventListener("click", () => {
  loadNewPassage();
  typingInput.focus();
});

soundToggleBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? "🔊 Sound: ON" : "🔇 Sound: OFF";
});

document.querySelectorAll("#difficulty-pills .pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#difficulty-pills .pill").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentDifficulty = btn.dataset.diff;
    loadNewPassage();
  });
});

document.querySelectorAll("#time-pills .pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#time-pills .pill").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDuration = Number(btn.dataset.time);
    loadNewPassage();
  });
});

// Initialize on Page Load
const savedName = localStorage.getItem("typingPlayerName");
if (savedName) playerNameInput.value = savedName;

applyTheme(0);
startThemeRotation();
loadNewPassage();
fetchLeaderboard();