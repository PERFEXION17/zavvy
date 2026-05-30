/**
 * leaderboards.js - Zavvy! Real-time Competitive Leaderboard
 * Global • National • Regional • All-Time with live updates + Custom Medals
 */

import { auth, db } from "../firebase-config.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { gameEngine } from "../game-engine.js";

let currentUser = null;
let currentFilter = "global";
let currentUnsubscribers = []; // For firestore cleanup
let authUnsubscribe = null; // For auth memory cleanup

export function init(container) {
  console.log("🏆 Zavvy! Real-time Leaderboards Initialized");

  container.innerHTML = `
    <div class="leaderboard-container">
      <div class="leaderboard-header">
        <h2 class="leaderboard-title">Climb the ranks. Dominate the Competition.</h2>
        
        <div class="leaderboard-tabs">
          <button data-filter="global" class="tab-btn active"><i class="ph-thin ph-globe-hemisphere-west"></i> Global</button>
          <button data-filter="national" class="tab-btn"><i class="ph-thin ph-flag"></i> National</button>
          <button data-filter="regional" class="tab-btn"><i class="ph-thin ph-map-pin-simple"></i> Regional</button>
          <button data-filter="all-time" class="tab-btn"><i class="ph-thin ph-infinity"></i> All-Time</button>
        </div>
      </div>

      <div class="my-rank-card" id="my-rank-card">
        <div class="loading-placeholder">Loading your rank...</div>
      </div>

      <div class="leaderboard-list" id="leaderboard-list">
        </div>
    </div>
  `;

  authUnsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      setupTabListeners();
      loadLeaderboard("global"); // Initial load

      checkAndTriggerWeeklyReset().then(() => {
        loadLeaderboard("global"); // Initial load
      });
    }
  });
}

function setupTabListeners() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      loadLeaderboard(currentFilter);
    });
  });
}

function loadLeaderboard(filter) {
  // Cleanup previous listeners
  currentUnsubscribers.forEach((unsub) => unsub());
  currentUnsubscribers = [];

  const listEl = document.getElementById("leaderboard-list");
  listEl.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.4s;">
      <div class="loading-img" style="width:80px;">
        <img src="/assets/img/Z!.webp" alt="loading"/>
      </div>
    </div>
  `;

  let q;
  const xpField = filter === "all-time" ? "globalXP" : "weeklyXP";

  if (filter === "regional" && currentUser) {
    getDoc(doc(db, "users", currentUser.uid)).then((userSnap) => {
      const userState = userSnap.exists()
        ? userSnap.data().state || "FCT"
        : "FCT";

      q = query(
        collection(db, "users"),
        where("state", "==", userState),
        orderBy(xpField, "desc"),
        limit(25),
      );
      startRealtimeListener(q, filter);
    });
    return;
  }

  // Global / National / All-Time
  q = query(collection(db, "users"), orderBy(xpField, "desc"), limit(50));
  startRealtimeListener(q, filter);
}

function startRealtimeListener(firestoreQuery, filter) {
  const listEl = document.getElementById("leaderboard-list");

  const unsubscribe = onSnapshot(
    firestoreQuery,
    (snapshot) => {
      const users = [];
      snapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() });
      });

      renderLeaderboard(users, filter);
      if (currentUser) renderMyRank(users, filter);
    },
    (error) => {
      console.error("Realtime leaderboard error:", error);

      if (
        error.code === "failed-precondition" ||
        error.message.includes("index")
      ) {
        listEl.innerHTML = `
          <div style="padding: 40px; text-align: center; color: var(--dynamic-accent);">
            <p><strong>Regional leaderboard is being prepared.</strong></p>
            <small>Please wait a few minutes while we build the index.</small>
          </div>
        `;
      } else {
        listEl.innerHTML = `<p style="color: var(--error-red); text-align:center; padding: 60px;">Live updates unavailable. Please refresh.</p>`;
      }
    },
  );

  currentUnsubscribers.push(unsubscribe);
}

function renderLeaderboard(users, filter) {
  const listEl = document.getElementById("leaderboard-list");

  if (users.length === 0) {
    listEl.innerHTML = `<p style="text-align:center; padding: 60px; color: var(--dynamic-accent);">No champions yet. Be the first!</p>`;
    return;
  }

  const xpField = filter === "all-time" ? "globalXP" : "weeklyXP";
  let html = ``;

  // Helper to render podium slots
  const renderPodiumCol = (user, rank, type) => {
    if (!user) return `<div class="podium-col ${type}"></div>`;

    const xpValue = user[xpField] || 0;
    const levelData = gameEngine.calculateLevel(xpValue);
    const name = user.fullName || user.username || "Zavvy Champion";
    const avatar = user.photoURL || "/assets/img/avatar.webp";

    return `
      <div class="podium-col ${type}">
        <div class="podium-avatar-container">
          <img src="${avatar}" alt="${name}" class="podium-avatar">
          <div class="rank-badge">${rank}</div>
        </div>
        <div class="podium-name">${name}</div>
        <div class="podium-level">Level ${levelData.level}</div>
        <div class="podium-box">
          <div class="podium-xp">${xpValue.toLocaleString()}</div>
          <div class="podium-xp-label">XP</div>
        </div>
      </div>
    `;
  };

  // 1. Build the Top 3 Podium block
  html += `<div class="podium-wrapper">`;
  html += renderPodiumCol(users[1], 2, "p2"); // Second place on Left
  html += renderPodiumCol(users[0], 1, "p1"); // First place Center
  html += renderPodiumCol(users[2], 3, "p3"); // Third place on Right
  html += `</div>`;

  // 2. Build the remaining list
  if (users.length > 3) {
    html += `<div class="list-wrapper">`;
    for (let i = 3; i < users.length; i++) {
      const user = users[i];
      const rank = i + 1;
      const xpValue = user[xpField] || 0;
      const levelData = gameEngine.calculateLevel(xpValue);
      const name = user.fullName || user.username || "Zavvy Champion";
      const avatar = user.photoURL || "/assets/img/avatar.webp";

      html += `
        <div class="list-item">
          <div class="list-rank">${rank}</div>
          <img src="${avatar}" class="list-avatar" alt="${name}">
          <div class="list-name">${name}</div>
          <div class="list-level">Level ${levelData.level}</div>
          <div class="list-xp">${xpValue.toLocaleString()} XP</div>
        </div>
      `;
    }
    html += `</div>`;
  }

  listEl.innerHTML = html;
}

async function renderMyRank(users, filter) {
  const card = document.getElementById("my-rank-card");
  if (!currentUser) return;

  try {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (!userSnap.exists()) return;

    const me = userSnap.data();
    const xpField = filter === "all-time" ? "globalXP" : "weeklyXP";
    const myXP = me[xpField] || 0;

    let myRank = users.findIndex((u) => u.id === currentUser.uid) + 1;
    if (myRank === 0) myRank = "50+";

    card.innerHTML = `
      <div class="my-rank-inner">
        <div class="my-rank-left">
          <span class="my-rank-label">YOUR RANK • ${filter.toUpperCase()}</span>
          <span class="my-rank-big">${myRank}</span>
        </div>
        <div class="my-rank-xp">
          <strong>${myXP.toLocaleString()}</strong> <small>XP</small>
        </div>
      </div>
    `;
  } catch (e) {
    console.warn("Personal rank display failed");
  }
}

export function cleanup() {
  console.log("🧹 Leaderboards cleaned up");

  currentUnsubscribers.forEach((unsub) => unsub());
  currentUnsubscribers = [];
  if (authUnsubscribe) authUnsubscribe();
}


// ==================== CLIENT-SIDE WEEKLY RESET ====================


/**
 * Calculates the exact Unix timestamp of the most recent Sunday at 23:59:00
 */
function getLastResetTargetTimestamp() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const lastSunday = new Date(now);
  // Subtract days to roll back to the most recent Sunday
  lastSunday.setDate(now.getDate() - currentDay);
  lastSunday.setHours(23, 59, 0, 0);
  
  // If it IS Sunday but we haven't hit 23:59 yet, roll back 7 days to the previous Sunday night
  if (currentDay === 0 && now.getTime() < lastSunday.getTime()) {
    lastSunday.setDate(lastSunday.getDate() - 7);
  }
  
  return lastSunday.getTime();
}

/**
 * Checks if a new weekly cycle has passed since the last tracked database reset
 */
export async function checkAndTriggerWeeklyReset() {
  try {
    const systemRef = doc(db, "system", "leaderboard_state");
    const systemSnap = await getDoc(systemRef);
    
    const targetResetTime = getLastResetTargetTimestamp();
    
    if (systemSnap.exists()) {
      const lastResetProcessed = systemSnap.data().lastResetTimestamp || 0;
      
      // If our targeted Sunday reset timestamp is greater than what's saved, a reset is due!
      if (targetResetTime > lastResetProcessed) {
        await executeLeaderboardWipe(systemRef, targetResetTime);
      }
    } else {
      // First-time initialization of the tracking document
      await setDoc(systemRef, { lastResetTimestamp: targetResetTime });
      console.log("🏆 Initialized global leaderboard tracking document.");
    }
  } catch (err) {
    console.warn("Leaderboard reset check skipped due to permissions or missing records:", err);
  }
}

/**
 * Wipes weeklyXP for all users and updates the system milestone timestamp
 */
async function executeLeaderboardWipe(systemRef, resetTimestamp) {
  console.log("🧹 New week detected! Clearing weekly scores across Zavvy!...");
  
  try {
    // 1. Instantly update the tracking document first to block racing conditions from other concurrent users
    await setDoc(systemRef, { lastResetTimestamp: resetTimestamp });
    
    // 2. Fetch all users and reset their weekly scores via chunked batches
    const usersSnap = await getDocs(collection(db, "users"));
    let batch = writeBatch(db);
    let counter = 0;
    
    for (const userDoc of usersSnap.docs) {
      batch.update(doc(db, "users", userDoc.id), { weeklyXP: 0 });
      counter++;
      
      // Safe batch limits for Firestore
      if (counter === 400) {
        await batch.commit();
        batch = writeBatch(db);
        counter = 0;
      }
    }
    
    if (counter > 0) {
      await batch.commit();
    }
    
    console.log(`✅ Client-side reset successfully completed for ${usersSnap.size} profiles.`);
  } catch (err) {
    console.error("Critical error wiping weekly leaderboard:", err);
  }
}
