/**
 * home.js - Zavvy! Premium Minimal Dashboard
 * With Phosphor Thin Icons + Premium Clean Design
 */

import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { gameEngine } from "../game-engine.js";

export function init(container) {
  console.log("🏠 Zavvy! Premium Minimal Dashboard Initialized");

  const hour = new Date().getHours();
  let timeOfDayGreeting = "Good evening";
  if (hour < 12) {
    timeOfDayGreeting = "Good morning";
  } else if (hour < 18) {
    timeOfDayGreeting = "Good afternoon";
  }

  container.innerHTML = `
    <div class="home-container">

      <!-- HERO BANNER -->
      <div class="hero-banner">
        <div class="hero-content">
          <h1>${timeOfDayGreeting}, <br/> <span id="user-firstname">Champion</span></h1>
          <div class="date">
            <i class="ph ph-calendar"></i>
            <span id="current-date">Monday, 25 May 2026</span>
          </div>
          <p class="motivational-text">
            Discipline today, success tomorrow.<br>
            Keep showing up for your future self.
          </p>
        </div>
        <div class="hero-visual">
        </div>
      </div>

      <div class="dashboard-main">

        <!-- LEFT COLUMN: PROGRESS -->
        <div class="progress-column">
          <div class="progress-section">
            <div class="section-header">
              <i class="ph ph-chart-line"></i>
              <h2>Progress Overview</h2>
            </div>
            
            <div class="xp-progress-container">
              <div class="xp-circle" id="xp-circle">
                <div class="circle-inner">
                  <div class="xp-number" id="xp-value">2845</div>
                  <div class="xp-label">XP</div>
                  <div class="level-badge" id="current-level">Level 12</div>
                </div>
              </div>
            </div>
                  
            
            <div class="xp-to-next" id="xp-to-next">1,155 XP to Level 12</div>

            <!-- Stats Grid -->
            <div class="stats-grid" id="stats-grid"></div>
          </div>
        </div>

        <!-- RIGHT COLUMN: DAILY QUESTS -->
        <div class="quests-column">
          <div class="section-header">
            <div class="section-header-wrap">
              <i class="ph ph-clipboard-text"></i>
              <h2>Daily Quests</h2>
            </div>
            <span class="quests-complete" id="quests-complete">2/3 Completed</span>
          </div>
          <div class="quest-list" id="daily-quests">
            <!-- Populated by JS -->
          </div>
        </div>

      </div>

      <!-- RECENT ACTIVITY -->
      <div class="recent-section">
        <div class="section-header">
          <i class="ph ph-clock-counter-clockwise"></i>
          <h2>Recent Activity</h2>
          <a href="#" onclick="window.navigateTo('profile')" class="view-all">View All →</a>
        </div>
        <div class="activity-list" id="recent-activity">
          <!-- Populated by JS -->
        </div>
      </div>

    </div>
  `;

  window.navigateTo = (slug) => {
    import("./portal.js")
      .then((mod) => mod.navigateTo(slug))
      .catch((err) => console.error("Navigation failed:", err));
  };

  initializeDynamicContent();
}

// ==================== DYNAMIC CONTENT ====================

async function initializeDynamicContent() {
  updateCurrentDate();
  updateUserDisplayName();
  await loadRealDashboardData();
}

function updateCurrentDate() {
  const dateEl = document.getElementById("current-date");
  if (!dateEl) return;
  const now = new Date();
  const options = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  dateEl.textContent = now.toLocaleDateString("en-US", options);
}

function updateUserDisplayName() {
  const nameEl = document.getElementById("user-firstname");
  if (!nameEl) return;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      const displayName = user.displayName
        ? user.displayName.split(" ")[0]
        : "Champion";
      nameEl.textContent = displayName;
    }
  });
}

async function loadRealDashboardData() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return;

      const data = userDoc.data();
      const xp = data.globalXP || 0;

      document.getElementById("xp-value").textContent = xp.toLocaleString();

      const levelData = gameEngine.calculateLevel(xp);

      document.getElementById("current-level").textContent =
        `Level ${levelData.level}`;

      // FIX: Dynamically update the XP to next level text!
      const xpTextEl = document.getElementById("xp-to-next");
      if (xpTextEl) {
        xpTextEl.textContent = `${levelData.xpToNextLevel.toLocaleString()} XP to Level ${levelData.level + 1}`;
      }

      updateXPProgressCircle(levelData.progress);
      renderStats(data);
      renderDailyQuests(data);
      renderRecentActivity();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  });
}

function updateXPProgressCircle(percentage) {
  const circle = document.getElementById("xp-circle");
  if (!circle) return;

  const progress = Math.min(Math.max(percentage, 0), 100);
  const degrees = (progress / 100) * 360;

  circle.style.background = `conic-gradient(
    var(--accent-color) 0deg ${degrees}deg, 
    var(--bg-color-2) ${degrees}deg 360deg
  )`;
}

function renderStats(data) {
  const statsHTML = `
    <div class="stat-card">
      <div class="stat-icon">
        <i class="ph ph-laptop"></i>
      </div>
      <div class="stat-wrap">
        <div class="stat-value">${data.zavvySimExamsTaken || 0}</div>
        <div class="stat-label">SIMs Taken</div>
        <div class="stat-info"><span class="up">&Uparrow; 12%</span> This week</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <i class="ph ph-target"></i>
      </div>
      <div class="stat-wrap">
        <div class="stat-value" id="">84%</div>
        <div class="stat-label">Avg Score</div>
        <div class="stat-info"><span class="down">&Downarrow; 2%</span> This week</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">
        <i class="ph ph-timer"></i>
      </div>
      <div class="stat-wrap">
        <div class="stat-value" id="">1h 30m</div>
        <div class="stat-label">Total Time</div>
        <div class="stat-info"><span class="up">&Uparrow; 4%</span> This week</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <i class="ph ph-trophy"></i>
      </div>
      <div class="stat-wrap">
        <div class="stat-value" id="">12</div>
        <div class="stat-label">Quests Completed</div>
        <div class="stat-info"><span class="up">&Uparrow; 10%</span> This week</div>
      </div>
    </div>
  `;
  document.getElementById("stats-grid").innerHTML = statsHTML;
}

function renderDailyQuests() {
  const questsHTML = `
    <div class="quest-item completed">
      <i class="ph-thin ph-clipboard-text quest-icon"></i>
      <div class="quest-content">
        <h4>Complete 1 Full Sim</h4>
        <p>Take a full-length simulation test</p>
        <div class="xp-reward">+150 XP</div>
      </div>
      <i class="ph-thin ph-check-circle quest-check"></i>
    </div>

    <div class="quest-item">
      <i class="ph-thin ph-book-open quest-icon"></i>
      <div class="quest-content">
        <h4>Study 20 mins in Neo</h4>
        <p>Focus and learn in adaptive mode</p>
        <div class="progress-container">
          <div class="progress-bar"><div class="progress-fill" style="width: 65%"></div></div>
          <small>13/20 mins</small>
        </div>
        <div class="xp-reward">+100 XP</div>
      </div>
    </div>

    <div class="quest-item">
      <i class="ph-thin ph-brain quest-icon"></i>
      <div class="quest-content">
        <h4>Answer 30 questions in Synapse</h4>
        <p>Sharpen your knowledge</p>
        <div class="progress-container">
          <div class="progress-bar"><div class="progress-fill" style="width: 40%"></div></div>
          <small>12/30</small>
        </div>
        <div class="xp-reward">+80 XP</div>
      </div>
    </div>

    <div class="quest-item completed">
      <i class="ph-thin ph-fire quest-icon"></i>
      <div class="quest-content">
        <h4>Maintain 7-day Streak</h4>
        <p>Study daily and keep your streak</p>
        <div class="xp-reward">+200 XP</div>
      </div>
      <i class="ph-thin ph-check-circle quest-check"></i>
    </div>
  `;

  document.getElementById("daily-quests").innerHTML = questsHTML;
}

function renderRecentActivity() {
  const html = `
    <div class="activity-row">
      <i class="ph-thin ph-clipboard-text activity-icon"></i>
      <div class="activity-details">
        <strong>JAMB Mock Exam - Biology</strong>
        <span class="activity-type">Sim</span>
      </div>
      <div class="activity-score">92%</div>
      <div class="activity-xp">+150 XP</div>
    </div>
  `;
  document.getElementById("recent-activity").innerHTML = html;
}

export function cleanup() {
  console.log("🧹 Home section cleaned up");
  if (window.navigateTo) delete window.navigateTo;
}
