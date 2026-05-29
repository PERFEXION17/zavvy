/**
 * home.js - Zavvy! Premium Minimal Dashboard
 * Refactored for Clean Content-Isolation & Declarative SPA Navigation
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
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { gameEngine } from "../game-engine.js";

// Global unsubscribers for strict SPA memory lifecycle control
let authUnsubscribe = null;
let userUnsubscribe = null;
let activityUnsubscribe = null;
let teaserUnsubscribe = null;

export function init(container) {
  console.log("🏠 Zavvy! Premium Minimal Dashboard Initialized");

  const hour = new Date().getHours();
  let timeOfDayGreeting = "Good evening";
  if (hour < 12) timeOfDayGreeting = "Good morning";
  else if (hour < 18) timeOfDayGreeting = "Good afternoon";

  // INJECT CLEAN HTML STRUCTURE (No inline onclick bindings)
  container.innerHTML = `
    <div class="home-container">
      <div class="hero-banner">
        <div class="hero-content">
          <h1>${timeOfDayGreeting}, <br/> <span id="user-firstname">Champion</span></h1>
          <div class="date">
            <i class="ph-thin ph-calendar"></i>
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
                <i class="ph-thin ph-chart-line"></i>
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
              <i class="ph-thin ph-clipboard-text"></i>
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
            <i class="ph-thin ph-clock-counter-clockwise"></i>
            <h2>Recent Activity</h2>
          </div>
          <a href="?tab=profile" data-nav="profile" class="view-all">View All →</a>
        </div>
        <div class="activity-list" id="recent-activity"></div>
      </div>
      
      <div class="leaderboard-teaser">
        <div class="section-header">
          <div class="section-header-wrap">
            <i class="ph-thin ph-trophy"></i>
            <h2>Top Champions</h2>
          </div>
          <a href="?tab=leaderboards" data-nav="leaderboards" class="view-all">Full Rankings →</a>
        </div>
        <div id="home-leaderboard-teaser" class="teaser-list"></div>
      </div>
    </div>
  `;

  // BOOTSTRAP REALTIME DATA STREAMS
  updateCurrentDate();
  initializeDataStream();
}

// ==================== REAL-TIME DATA STREAM ====================

function initializeDataStream() {
  authUnsubscribe = onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const nameEl = document.getElementById("user-firstname");
    if (nameEl) {
      nameEl.textContent = user.displayName
        ? user.displayName.split(" ")[0]
        : "Champion";
    }

    const userRef = doc(db, "users", user.uid);
    userUnsubscribe = onSnapshot(
      userRef,
      (userDoc) => {
        if (!userDoc.exists()) return;

        const data = userDoc.data();
        const xp = data.globalXP || 0;
        const levelData = gameEngine.calculateLevel(xp);

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
      },
      (error) => console.error("User profile document stream failure:", error),
    );

    const logsQuery = query(
      collection(db, "users", user.uid, "activity_logs"),
      orderBy("timestamp", "desc"),
      limit(4),
    );

    activityUnsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logs = [];
        snapshot.forEach((docSnap) => {
          logs.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderRecentActivity(logs);
      },
      (error) =>
        console.error("Activity logs collection stream failure:", error),
    );

    loadRealTimeTeaser();
  });
}

// ==================== RUNTIME UI RENDERERS ====================

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

function updateXPProgressCircle(percentage) {
  const circle = document.getElementById("xp-circle");
  if (!circle) return;

  const progress = Math.min(Math.max(percentage, 0), 100);
  const degrees = (progress / 100) * 360;

  circle.style.background = `conic-gradient(
    var(--dynamic-accent, #ffd700) 0deg ${degrees}deg, 
    var(--bg-color-2, #222) ${degrees}deg 360deg
  )`;
}

function renderStats(data) {
  const statsGrid = document.getElementById("stats-grid");
  if (!statsGrid) return;

  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon"><i class="ph-thin ph-laptop"></i></div>
      <div class="stat-wrap">
        <div class="stat-value">${data.zavvySimExamsTaken || 0}</div>
        <div class="stat-label">SIMs Taken</div>
        <div class="stat-info"><span class="up">▲ 12%</span> This week</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="ph-thin ph-target"></i></div>
      <div class="stat-wrap">
        <div class="stat-value">84%</div>
        <div class="stat-label">Avg Score</div>
        <div class="stat-info"><span class="down">▼ 2%</span> This week</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="ph-thin ph-timer"></i></div>
      <div class="stat-wrap">
        <div class="stat-value">1h 30m</div>
        <div class="stat-label">Total Time</div>
        <div class="stat-info"><span class="up">▲ 4%</span> This week</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="ph-thin ph-trophy"></i></div>
      <div class="stat-wrap">
        <div class="stat-value">${data.synapseGamesPlayed || 0}</div>
        <div class="stat-label">Games Played</div>
        <div class="stat-info"><span class="up">▲ 10%</span> This week</div>
      </div>
    </div>
  `;
}

function renderDailyQuests(data) {
  const questsContainer = document.getElementById("daily-quests");
  if (!questsContainer) return;

  let activeQuests = [];

  if (
    data.dailyQuests &&
    !gameEngine.shouldResetQuests(data.dailyQuests.lastResetDate)
  ) {
    activeQuests = data.dailyQuests.quests || [];
  } else {
    activeQuests = gameEngine.QUEST_TEMPLATES.map((tpl) => ({
      ...tpl,
      progress: 0,
      completed: false,
    }));
  }

  const completedCount = activeQuests.filter((q) => q.completed).length;
  const metricsIndicator = document.getElementById("quests-complete");
  if (metricsIndicator) {
    metricsIndicator.textContent = `${completedCount}/${activeQuests.length} Done`;
  }

  const getQuestDescription = (type) => {
    switch (type) {
      case "sim_complete":
        return "Take a full-length simulation test";
      case "neo_complete":
        return "Focus and learn in adaptive mode";
      case "synapse_play":
        return "Sharpen your knowledge";
      default:
        return "Complete your gamified platform mission";
    }
  };

  let html = "";
  activeQuests.forEach((quest) => {
    const iconClass = quest.icon || "clipboard-text";

    if (quest.completed) {
      html += `
        <div class="quest-item completed">
          <i class="ph-thin ph-${iconClass} quest-icon"></i>
          <div class="quest-content">
            <h4>${quest.title}</h4>
            <p>${getQuestDescription(quest.type)}</p>
            <div class="xp-reward">${quest.rewardXP} XP</div>
          </div>
          <i class="ph-thin ph-check-circle quest-check"></i>
        </div>
      `;
    } else {
      const percentage =
        quest.target > 0
          ? Math.floor((quest.progress / quest.target) * 100)
          : 0;
      html += `
        <div class="quest-item">
          <i class="ph-thin ph-${iconClass} quest-icon"></i>
          <div class="quest-content">
            <h4>${quest.title}</h4>
            <p>${getQuestDescription(quest.type)}</p>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
              </div>
              <small>${quest.progress}/${quest.target}</small>
            </div>
            <div class="xp-reward">${quest.rewardXP} XP</div>
          </div>
        </div>
      `;
    }
  });

  questsContainer.innerHTML =
    html || `<p class="empty-msg">No active quests found.</p>`;
}

function renderRecentActivity(logs) {
  const container = document.getElementById("recent-activity");
  if (!container) return;

  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="empty-activity-log" style="text-align: center; padding: 32px; color: rgba(255,255,255,0.4);">
        <i class="ph-thin ph-sparkle" style="font-size: 28px; margin-bottom: 8px; display: inline-block;"></i>
        <p>Your history feed is clear.</p>
        <small>Complete lessons or practice tests to earn rewards!</small>
      </div>
    `;
    return;
  }

  const resolveActivityMetadata = (type) => {
    switch (type) {
      case "sim_complete":
        return { title: "Zavvy! SIM", label: "SIM", icon: "laptop" };
      case "neo_lesson":
        return { title: "Zavvy! Neo", label: "Neo", icon: "book-open" };
      case "synapse_game":
        return { title: "The Synapse", label: "The Synapse", icon: "brain" };
      case "daily_quest":
        return {
          title: "Daily Quest Mastered",
          label: "Daily Quest",
          icon: "trophy",
        };
      default:
        return { title: "Zavvy Platform Task", label: "Zavvy!", icon: "star" };
    }
  };

  let html = "";
  logs.forEach((log) => {
    const meta = resolveActivityMetadata(log.activity);
    const performanceIndicator = meta.showScore
      ? `${log.score}%`
      : `<img src="/assets/img/icons/spark-icon.webp" alt="spark-icon"> +${log.sparks || 0}`;

    html += `
      <div class="activity-row">
        <div class="activity-details-wrap">
          <i class="ph-thin ph-${meta.icon} activity-icon"></i>
          <div class="activity-details">
            <strong>${meta.title}</strong>
            <span class="activity-type">${meta.label}</span>
          </div>
        </div>
        <div class="activity-stats">
          <div class="activity-score">${performanceIndicator}</div>
          <div class="activity-xp"><img src="/assets/img/icons/xp-icon.webp" alt="xp-icon"> +${log.xp || 0}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function loadRealTimeTeaser() {
  const teaserEl = document.getElementById("home-leaderboard-teaser");
  if (!teaserEl) return;

  teaserEl.innerHTML = `
    <div style="width: 100%; height: 140px; display: flex; justify-content: center; align-items: center;">
      <div class="loading-img" style="width:50px;">
        <img src="/assets/img/Z!.webp" alt="loading" style="animation: pulse 1.5s infinite;"/>
      </div>
    </div>
  `;

  const q = query(
    collection(db, "users"),
    orderBy("globalXP", "desc"),
    limit(5),
  );

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
        `<div class="empty-teaser"><p>Start learning to claim Rank #1!</p></div>`;
    },
    (error) => {
      console.error("Leaderboard teaser engine runtime failure:", error);
      teaserEl.innerHTML = `<div class="empty-teaser"><p>Live brackets temporarily offline.</p></div>`;
    },
  );
}

// ==================== SPA MEMORY CLEANUP HOOK ====================

export function cleanup() {
  console.log("🧹 Home section streams terminated cleanly.");

  // Terminate data pipelines safely
  if (userUnsubscribe) userUnsubscribe();
  if (activityUnsubscribe) activityUnsubscribe();
  if (teaserUnsubscribe) teaserUnsubscribe();
  if (authUnsubscribe) authUnsubscribe();

  // Note: window.navigateTo is untouched so navigation never crashes!
}
