/**
 * home.js - Zavvy! Premium Minimal Dashboard
 * Refactored for SPA Memory Management & Single-Source Auth
 */

import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { gameEngine } from "../game-engine.js";

// Global unsubscribers for SPA memory cleanup
let authUnsubscribe = null;
let teaserUnsubscribe = null;

export function init(container) {
  console.log("🏠 Zavvy! Premium Minimal Dashboard Initialized");

  const hour = new Date().getHours();
  let timeOfDayGreeting = "Good evening";
  if (hour < 12) timeOfDayGreeting = "Good morning";
  else if (hour < 18) timeOfDayGreeting = "Good afternoon";

  // INJECT STATIC HTML STRUCTURE
  container.innerHTML = `
    <div class="home-container">
      <div class="hero-banner">
        <div class="hero-content">
          <h1>${timeOfDayGreeting}, <br/> <span id="user-firstname">Champion</span></h1>
          <div class="date">
            <i class="ph ph-calendar"></i>
            <span id="current-date">Loading date...</span>
          </div>
          <p class="motivational-text">
            Discipline today, success tomorrow.<br>
            Keep showing up for your future self.
          </p>
        </div>
        <div class="hero-visual"></div>
      </div>

      <div class="dashboard-main">
        <div class="progress-column">
          <div class="progress-section">
            <div class="section-header">
              <div class="section-header-wrap">
                <i class="ph ph-chart-line"></i>
                <h2>Progress Overview</h2>
              </div>
            </div>
            
            <div class="xp-progress-container">
              <div class="xp-circle" id="xp-circle">
                <div class="circle-inner">
                  <div class="xp-number" id="xp-value">0</div>
                  <div class="xp-label">XP</div>
                  <div class="level-badge" id="current-level">Level 1</div>
                </div>
              </div>
            </div>
            
            <div class="xp-to-next" id="xp-to-next">Loading XP...</div>
            <div class="stats-grid" id="stats-grid"></div>
          </div>
        </div>

        <div class="quests-column">
          <div class="section-header">
            <div class="section-header-wrap">
              <i class="ph ph-clipboard-text"></i>
              <h2>Daily Quests</h2>
            </div>
            <span class="quests-complete" id="quests-complete">Loading...</span>
          </div>
          <div class="quest-list" id="daily-quests"></div>
        </div>
      </div>

      <div class="recent-section">
        <div class="section-header">
          <div class="section-header-wrap">
            <i class="ph ph-clock-counter-clockwise"></i>
            <h2>Recent Activity</h2>
          </div>
          <a href="?tab=profile" onclick="window.navigateTo('profile'); return false;" class="view-all">View All →</a>
        </div>
        <div class="activity-list" id="recent-activity"></div>
      </div>
      
      <div class="leaderboard-teaser">
        <div class="section-header">
          <div class="section-header-wrap">
            <i class="ph ph-trophy"></i>
            <h2>Top Champions</h2>
          </div>
          <a href="?tab=leaderboards" onclick="window.navigateTo('leaderboards'); return false;" class="view-all">Full Rankings →</a>
        </div>
        <div id="home-leaderboard-teaser" class="teaser-list"></div>
      </div>
    </div>
  `;

  // Expose routing globally for in-page anchors
  window.navigateTo = (slug) => {
    import("../portal.js")
      .then((mod) => mod.navigateTo(slug))
      .catch((err) => console.error("Navigation failed:", err));
  };

  // BOOTSTRAP DYNAMIC LOGIC
  updateCurrentDate();
  initializeDataStream();
}

// ==================== CORE DATA STREAM ====================

function initializeDataStream() {
  // Single Source of Truth for Auth State to prevent redundant network requests
  authUnsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    // 1. Instantly update display name from Auth object
    const nameEl = document.getElementById("user-firstname");
    if (nameEl)
      nameEl.textContent = user.displayName
        ? user.displayName.split(" ")[0]
        : "Champion";

    // 2. Fetch heavy dashboard metrics from Firestore
    await loadRealDashboardData(user.uid);

    // 3. Boot up the real-time leaderboard teaser
    loadRealTimeTeaser();
  });
}

// ==================== UI RENDERERS ====================

function updateCurrentDate() {
  const dateEl = document.getElementById("current-date");
  if (!dateEl) return;
  dateEl.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function loadRealDashboardData(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return;

    const data = userDoc.data();
    const xp = data.globalXP || 0;
    const levelData = gameEngine.calculateLevel(xp);

    // Update Core Progress UI
    document.getElementById("xp-value").textContent = xp.toLocaleString();
    document.getElementById("current-level").textContent =
      `Level ${levelData.level}`;

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

function loadRealTimeTeaser() {
  const teaserEl = document.getElementById("home-leaderboard-teaser");
  if (!teaserEl) return;

  teaserEl.innerHTML = `
    <div style="width: 100%; height: 180px; display: flex; justify-content: center; align-items: center;">
      <div class="loading-img" style="width:60px;">
        <img src="/assets/img/Z!.webp" alt="loading"/>
      </div>
    </div>
  `;

  const q = query(
    collection(db, "users"),
    orderBy("globalXP", "desc"),
    limit(5),
  );

  // Store the unsubscribe function directly to prevent SPA memory leaks
  teaserUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      let html = "";

      snapshot.docs.forEach((docSnap, index) => {
        const user = docSnap.data();
        const rank = index + 1;
        const isTop3 = rank <= 3;
        let rankDisplay = `<span class="teaser-rank-num">#${rank}</span>`;

        if (isTop3) {
          const medalSrc =
            rank === 1
              ? "/assets/img/gold-medal.webp"
              : rank === 2
                ? "/assets/img/silver-medal.webp"
                : "/assets/img/bronze-medal.webp";
          rankDisplay = `<img src="${medalSrc}" class="teaser-medal-img" alt="Rank ${rank}">`;
        }

        html += `
        <div class="teaser-row ${isTop3 ? "top-three" : ""}">
          <div class="teaser-rank">${rankDisplay}</div>
          <img src="${user.photoURL || "/assets/img/avatar.webp"}" class="teaser-avatar" alt="">
          <div class="teaser-name">${user.fullName || user.username || "Champion"}</div>
          <div class="teaser-xp">${(user.globalXP || 0).toLocaleString()} XP</div>
        </div>
      `;
      });

      teaserEl.innerHTML =
        html ||
        `
      <div class="empty-teaser">
        <p>Be the first champion on the leaderboard!</p>
        <small>Start taking SIMs to climb the ranks</small>
      </div>
    `;
    },
    (error) => {
      console.error("Teaser realtime error:", error);
      teaserEl.innerHTML = `<div class="empty-teaser"><p>Live Leaderboard unavailable.</p></div>`;
    },
  );
}

// ==================== STATIC DATA RENDERERS ====================

function renderStats(data) {
  document.getElementById("stats-grid").innerHTML = `
    <div class="stat-card">
      <div class="stat-icon"><i class="ph ph-laptop"></i></div>
      <div class="stat-wrap">
        <div class="stat-value">${data.zavvySimExamsTaken || 0}</div>
        <div class="stat-label">SIMs Taken</div>
        <div class="stat-info"><span class="up">&Uparrow; 12%</span> This week</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="ph ph-target"></i></div>
      <div class="stat-wrap">
        <div class="stat-value">84%</div>
        <div class="stat-label">Avg Score</div>
        <div class="stat-info"><span class="down">&Downarrow; 2%</span> This week</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="ph ph-timer"></i></div>
      <div class="stat-wrap">
        <div class="stat-value">1h 30m</div>
        <div class="stat-label">Total Time</div>
        <div class="stat-info"><span class="up">&Uparrow; 4%</span> This week</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="ph ph-trophy"></i></div>
      <div class="stat-wrap">
        <div class="stat-value">12</div>
        <div class="stat-label">Quests Completed</div>
        <div class="stat-info"><span class="up">&Uparrow; 10%</span> This week</div>
      </div>
    </div>
  `;
}

function renderDailyQuests() {
  document.getElementById("daily-quests").innerHTML = `
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
  `;
}

function renderRecentActivity() {
  document.getElementById("recent-activity").innerHTML = `
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
}

// ==================== CLEANUP MEMORY ====================

export function cleanup() {
  console.log("🧹 Home section cleaned up. Memory freed.");
  if (teaserUnsubscribe) teaserUnsubscribe(); // Stop listening to Firestore when tab changes
  if (authUnsubscribe) authUnsubscribe(); // Stop auth listener
  if (window.navigateTo) delete window.navigateTo;
}
