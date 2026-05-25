/**
 * app/sim.js - Zavvy! Sim Selection Page
 * English compulsory + Choose 3 more subjects
 * Now includes polished mini landing page before subject selection
 */

import { auth } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { simQuestions } from "../sim-questions.js";

let currentUser = null;
let selectedSubjects = ["english"];

export function init(container) {
  console.log("🚀 Sim Module Initialized with Landing Page");

  container.innerHTML = `
    <div class="sim-container">

      <!-- MINI LANDING PAGE -->
      <div id="sim-landing-page" class="sim-landing">
        <div class="sim-landing-text">
          <h1><img src="/assets/img/zavvy!-sim.webp" alt="sim logo"></h1>
          <div class="sim-landing-action">
            <div class="sim-mini-text">
              <h2>Experience JAMB Style Examination</h2>
              <p>Timed • Scored • Gamified.</p>
            </div>
            
            <button id="enter-sim-btn" class="btn-trace">
              <span>ENTER THE SIM</span>
              <svg aria-hidden="true" focusable="false">
                <rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect>
              </svg>
            </button>
          </div>
        </div>
        <div class="sim-landing-img">
          
        </div>
      </div>

      <!-- SUBJECT SELECTION (Hidden Initially) -->
      <div id="sim-selection-page" class="sim-selection hidden">
        <div class="sim-header">
          <h1><img src="/assets/img/zavvy!-sim.webp" alt="sim logo"></h1>
          <p>Realistic exam experience • Earn XP & Sparks on completion</p>
        </div>

        <div class="selection-area">
          <h3>Selected Subjects <span id="selected-count">1 of 4</span></h3>
          <div id="selected-subjects" class="selected-tags"></div>

          <h3>Select 3 Additional Subjects</h3>
          <div id="subjects-grid" class="subjects-grid"></div>
        </div>

        <button id="start-exam-btn" class="btn-trace" disabled>
          <span>Start SIM Exam</span>
          <svg>
            <rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect>
          </svg>
        </button>
      </div>
    </div>
  `;

  initializeAuth();
  populateSubjectSelection();
  renderSelectedSubjects();
  setupEventListeners();
}

// ==================== AUTH ====================
function initializeAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
  });
}

// ==================== LANDING → SELECTION TRANSITION ====================
function showSelectionPage() {
  const landing = document.getElementById("sim-landing-page");
  const selection = document.getElementById("sim-selection-page");

  landing.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
  landing.style.opacity = "0";
  landing.style.transform = "scale(0.9)";

  setTimeout(() => {
    landing.classList.add("hidden");
    selection.classList.remove("hidden");

    // Slight entrance animation
    selection.style.opacity = "0";
    selection.style.transform = "translateY(20px)";
    setTimeout(() => {
      selection.style.transition = "all 0.5s ease";
      selection.style.opacity = "1";
      selection.style.transform = "translateY(0)";
    }, 50);
  }, 600);
}

// ==================== SUBJECT SELECTION LOGIC ====================
function populateSubjectSelection() {
  const grid = document.getElementById("subjects-grid");
  grid.innerHTML = "";

  const availableSubjects = Object.keys(simQuestions).filter(
    (s) => s !== "english",
  );

  availableSubjects.forEach((subject) => {
    const label = document.createElement("label");
    label.className = "subject-checkbox-label";
    label.innerHTML = `
      <input type="checkbox" value="${subject}" class="subject-checkbox">
      <span class="subject-name">${subject.charAt(0).toUpperCase() + subject.slice(1)}</span>
    `;
    grid.appendChild(label);
  });

  document.querySelectorAll(".subject-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => updateSelection(e));
  });
}

function updateSelection(e) {
  const checked = Array.from(
    document.querySelectorAll(".subject-checkbox:checked"),
  ).map((cb) => cb.value);

  if (checked.length > 3) {
    e.target.checked = false;
    alert("You can only select 3 additional subjects!");
    return;
  }

  selectedSubjects = ["english", ...checked];
  renderSelectedSubjects();
}

function renderSelectedSubjects() {
  const container = document.getElementById("selected-subjects");
  const countEl = document.getElementById("selected-count");

  container.innerHTML = selectedSubjects
    .map(
      (sub) =>
        `<span class="selected-tag" style="text-transform: capitalize;">${sub}</span>`,
    )
    .join("");

  countEl.textContent = `${selectedSubjects.length} of 4`;
  document.getElementById("start-exam-btn").disabled =
    selectedSubjects.length !== 4;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Landing button
  document
    .getElementById("enter-sim-btn")
    .addEventListener("click", showSelectionPage);

  // Start Exam
  document
    .getElementById("start-exam-btn")
    .addEventListener("click", startExam);
}

function startExam() {
  if (!currentUser) {
    alert("Please log in to take the exam.");
    return;
  }

  const subjectsParam = selectedSubjects.join(",");
  window.location.href = `zavvy-sim.html?subjects=${subjectsParam}`;
}

export function cleanup() {
  console.log("🧹 Sim module cleaned up");
}
