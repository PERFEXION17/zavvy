/**
 * zavvy-sim.js - Full Immersive JAMB CBT Engine
 * Receives subjects via URL: zavvy-sim.html?subjects=english,mathematics,biology,commerce
 * + Mobile Subject Nav + Review Mode + Enhanced Button States
 */

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { simQuestions } from "./sim-questions.js";
import { toast } from "./toast.js";
import { showConfirmModal } from "./ui.js";

import { gameEngine } from "./game-engine.js";

let currentUser = null;
let selectedSubjects = [];
let currentSubject = "english";
let currentIdx = 0;
let timeLeft = 120 * 60;
let countdownTimer;
let userAnswers = {};
let isSubmitting = false;
let isReviewMode = false;

// DOM Elements
const timerEl = document.getElementById("timer");
const subjectNav = document.getElementById("subject-nav");
const questionText = document.getElementById("question-text");
const optionsArea = document.getElementById("options-area");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const submitBtn = document.getElementById("submit-exam-btn");
const resultOverlay = document.getElementById("result-overlay");
const questionCounter = document.getElementById("question-counter");
const currentSubjectDisplay = document.getElementById(
  "current-subject-display",
);

function getSelectedSubjectsFromURL() {
  const params = new URLSearchParams(window.location.search);
  const subjectsStr = params.get("subjects");
  if (!subjectsStr) return ["english"];

  const subjects = subjectsStr.split(",").map((s) => s.trim().toLowerCase());
  if (!subjects.includes("english")) subjects.unshift("english");
  return [...new Set(subjects)];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function initExam() {
  selectedSubjects = getSelectedSubjectsFromURL();

  selectedSubjects.forEach((subject) => {
    if (simQuestions[subject]) shuffleArray(simQuestions[subject]);
  });

  initializeUserAnswers();
  renderSubjectNav();
  renderMobileSubjectNav();
  startTimer();
  renderQuestion();

  prevBtn.addEventListener("click", () => {
    if (currentIdx > 0) {
      currentIdx--;
      renderQuestion();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentIdx < simQuestions[currentSubject].length - 1) {
      currentIdx++;
      renderQuestion();
    }
  });

  // Submit button handler (dynamic based on mode)
  submitBtn.addEventListener("click", handleSubmitButtonClick);
}

function initializeUserAnswers() {
  userAnswers = {};
  selectedSubjects.forEach((subject) => {
    const numQ = simQuestions[subject] ? simQuestions[subject].length : 0;
    userAnswers[subject] = Array(numQ).fill(null);
  });
}

// ==================== SUBJECT NAV (Desktop + Mobile) ====================
function renderSubjectNav() {
  subjectNav.innerHTML = "";
  selectedSubjects.forEach((subject) => {
    const btn = document.createElement("button");
    btn.className = `subject-tab ${subject === currentSubject ? "active" : ""}`;
    btn.textContent = subject.charAt(0).toUpperCase() + subject.slice(1);
    btn.onclick = () => {
      currentSubject = subject;
      currentIdx = 0;
      renderSubjectNav();
      renderMobileSubjectNav();
      renderQuestion();
    };
    subjectNav.appendChild(btn);
  });
}

function renderMobileSubjectNav() {
  let mobileNav = document.getElementById("mobile-subject-nav");

  if (!mobileNav) {
    mobileNav = document.createElement("div");
    mobileNav.id = "mobile-subject-nav";
    mobileNav.className = "mobile-subject-nav";
    const controlsArea =
      document.querySelector(
        ".exam-controls, .navigation-buttons, #options-area",
      )?.parentElement || document.body;
    controlsArea.appendChild(mobileNav);
  }

  mobileNav.innerHTML = "";
  selectedSubjects.forEach((subject) => {
    const btn = document.createElement("button");
    btn.className = `mobile-subject-tab ${subject === currentSubject ? "active" : ""}`;
    btn.textContent = subject.charAt(0).toUpperCase() + subject.slice(1, 9);
    btn.onclick = () => {
      currentSubject = subject;
      currentIdx = 0;
      renderSubjectNav();
      renderMobileSubjectNav();
      renderQuestion();
    };
    mobileNav.appendChild(btn);
  });
}

function startTimer() {
  countdownTimer = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(countdownTimer);
      submitExam();
      return;
    }
    timeLeft--;
    const h = Math.floor(timeLeft / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((timeLeft % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (timeLeft % 60).toString().padStart(2, "0");
    timerEl.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

function renderQuestion() {
  const questions = simQuestions[currentSubject];
  if (!questions || questions.length === 0) return;

  const q = questions[currentIdx];

  questionCounter.textContent = `${currentIdx + 1} of ${questions.length}${isReviewMode ? " (Review)" : ""}`;
  currentSubjectDisplay.textContent =
    currentSubject.charAt(0).toUpperCase() + currentSubject.slice(1);

  questionText.innerHTML = `<strong>${currentIdx + 1}.</strong> ${q.q}`;
  optionsArea.innerHTML = "";

  q.o.forEach((option, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";

    if (isReviewMode) {
      const userAns = userAnswers[currentSubject][currentIdx];
      const correctAns = q.a;

      if (i === correctAns) btn.classList.add("correct");
      if (i === userAns)
        btn.classList.add(userAns === correctAns ? "correct" : "incorrect");
      btn.disabled = true;
    } else {
      if (userAnswers[currentSubject][currentIdx] === i)
        btn.classList.add("selected");
      btn.onclick = () => selectOption(i);
    }

    btn.innerHTML = option;
    optionsArea.appendChild(btn);
  });

  // UX Polish: Visual disable states
  prevBtn.disabled = currentIdx === 0;
  nextBtn.disabled = currentIdx === questions.length - 1;
  prevBtn.classList.toggle("disabled", currentIdx === 0);
  nextBtn.classList.toggle("disabled", currentIdx === questions.length - 1);
}

function selectOption(index) {
  userAnswers[currentSubject][currentIdx] = index;
  renderQuestion();
}

// ==================== SUBMIT BUTTON HANDLER (Dynamic) ====================
function handleSubmitButtonClick() {
  if (isReviewMode) {
    // In review mode → Return to Dashboard
    window.location.href = "portal.html?tab=home";
  } else {
    // Normal exam mode
    showConfirmModal({
      title: "Submit Exam?",
      message:
        "You cannot return after submission. Are you sure you want to finish now?",
      confirmText: "Yes, Submit",
      cancelText: "Review Answers",
      isDestructive: true,
    }).then(async (confirmed) => {
      if (confirmed) {
        await submitExam();
      }
    });
  }
}

// ==================== SUBMISSION ====================
async function submitExam() {
  if (isSubmitting) return;
  isSubmitting = true;
  clearInterval(countdownTimer);

  if (!currentUser) {
    isSubmitting = false;
    return toast.error("Authentication error. Result could not be saved.");
  }

  setButtonLoading(submitBtn, true);

  let totalScore = 0;
  const breakdown = {};

  selectedSubjects.forEach((subject) => {
    let correct = 0;
    const questions = simQuestions[subject];
    if (questions) {
      questions.forEach((q, idx) => {
        if (userAnswers[subject][idx] === q.a) correct++;
      });
      const score = Math.round((correct / questions.length) * 100);
      totalScore += score;
      breakdown[subject] = { correct, score };
    }
  });

  const finalScore = totalScore;
  let finalXP = 0;
  let finalSparks = 0;

  try {
    const rewardResult = await gameEngine.awardActivityRewards(
      currentUser.uid,
      "sim_complete",
      finalScore,
    );

    if (!rewardResult) {
      throw new Error(
        "Game Engine rejected the transaction. Check Firestore Rules.",
      );
    }

    finalXP = rewardResult.xpEarned;
    finalSparks = rewardResult.sparksEarned;

    await addDoc(collection(db, "users", currentUser.uid, "exam_history"), {
      examType: "JAMB UTME Mock",
      score: finalScore,
      breakdown,
      timeSpentSeconds: 120 * 60 - timeLeft,
      xpAwarded: finalXP,
      sparksAwarded: finalSparks,
      dateCompleted: serverTimestamp(),
    });

    toast.success(`Exam completed! +${finalXP} XP`);
  } catch (e) {
    console.error("Firebase Sync Error:", e);
    toast.error(
      "Failed to save result to dashboard. Check internet connection.",
    );
  } finally {
    setButtonLoading(submitBtn, false);
  }

  renderResult(finalScore, finalXP, finalSparks, breakdown);
}

function renderResult(score, xp, sparks, breakdown) {
  let html = `
    <article class="result-card">
      <div class="result-wrap">
        <h2>${score >= 250 ? "Outstanding Performance!" : "SIM Completed"}</h2>
        <div class="final-score">${score}</div>
        <p class="score-label">Total Score</p>
      </div>
      <div class="rewards-con">
        <div class="rewards">
          <div class="rewards-wrap">
            <img src="/assets/img/icons/xp-icon.webp" alt="" style=" width: 30px;"/>
            <span>+${xp} XP</span>
          </div>
          <div class="rewards-wrap">
            <img src="/assets/img/icons/spark-icon.webp" alt="" style=" width: 30px;"/>
            <span>+${sparks} Sparks</span>
          </div>
        </div>
        <div class="result-actions">
          <button onclick="window.location.href='portal.html?tab=home'" class="btn-trace">
             <span>Return to Dashboard</span>
              <svg aria-hidden="true" focusable="false">
                <rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect>
              </svg>
          </button>
          <button onclick="startReviewMode()" class="btn-trace">
             <span>Review SIM</span>
              <svg aria-hidden="true" focusable="false">
                <rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect>
              </svg>
          </button>
        </div>
      </div>
    </article>
  `;
  resultOverlay.innerHTML = html;
  resultOverlay.classList.remove("hidden");
}

// ==================== REVIEW MODE ====================
window.startReviewMode = function () {
  isReviewMode = true;
  resultOverlay.classList.add("hidden");
  currentIdx = 0;
  currentSubject = selectedSubjects[0];
  // Update Submit button text for Review Mode
  if (submitBtn) {
    submitBtn.innerHTML = `
      <span>Home</span>
      <svg aria-hidden="true" focusable="false">
        <rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect>
      </svg>
    `;
  }
  renderSubjectNav();
  renderMobileSubjectNav();
  renderQuestion();
};;

// ==================== UI HELPERS ====================
export function setButtonLoading(buttonEl, isLoading) {
  if (!buttonEl) return;
  if (isLoading) {
    buttonEl.classList.add("btn-loading");
    buttonEl.disabled = true;
  } else {
    buttonEl.classList.remove("btn-loading");
    buttonEl.disabled = false;
  }
}

// Auth Guard
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    initExam();
  } else {
    window.location.href = "auth.html";
  }
});
