/**
 * leaderboards.js - Zavvy! Real-time Competitive Leaderboard
 * Global • National • Regional with live updates + Custom Medals
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
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

let currentUser = null;
let currentFilter = "global";
let currentUnsubscribers = []; // For cleanup

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
        </div>
      </div>

      <div class="my-rank-card" id="my-rank-card">
        <div class="loading-placeholder">Loading your rank...</div>
      </div>

      <div class="leaderboard-list" id="leaderboard-list">
        <!-- Populated by real-time listener -->
      </div>
    </div>
  `;

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      setupTabListeners();
      loadLeaderboard("global"); // Initial load
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

  if (filter === "regional" && currentUser) {
    getDoc(doc(db, "users", currentUser.uid)).then((userSnap) => {
      const userState = userSnap.exists()
        ? userSnap.data().state || "FCT"
        : "FCT";

      q = query(
        collection(db, "users"),
        where("state", "==", userState),
        orderBy("globalXP", "desc"),
        limit(25),
      );
      startRealtimeListener(q, filter);
    });
    return;
  }

  // Global / National
  q = query(collection(db, "users"), orderBy("globalXP", "desc"), limit(50));
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

      renderLeaderboard(users);
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

function renderLeaderboard(users) {
  const listEl = document.getElementById("leaderboard-list");
  let html = "";

  users.forEach((user, index) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    const isCurrentUser = currentUser && user.id === currentUser.uid;

    let rankDisplay = `<span class="rank-num">#${rank}</span>`;

    if (isTop3) {
      const medalSrc =
        rank === 1
          ? "/assets/img/gold-medal.webp"
          : rank === 2
            ? "/assets/img/silver-medal.webp"
            : "/assets/img/bronze-medal.webp";

      rankDisplay = `<img src="${medalSrc}" class="medal-img" alt="Rank ${rank} Medal">`;
    }

    html += `
      <div class="leaderboard-row ${isTop3 ? "top-three" : ""} ${isCurrentUser ? "current-user" : ""}">
        <div class="rank-position">
          ${rankDisplay}
        </div>
        <div class="user-avatar-info">
          <img src="${user.photoURL || "/assets/img/avatar.webp"}" alt="" class="lb-avatar">
          <div class="user-meta">
            <strong>${user.fullName || user.username || "Zavvy Champion"}</strong>
            ${user.state ? `<small class="user-state">${user.state}</small>` : ""}
          </div>
        </div>
        <div class="xp-info">
          <span class="xp-amount">${(user.globalXP || 0).toLocaleString()}</span>
          <small>XP</small>
        </div>
      </div>
    `;
  });

  listEl.innerHTML =
    html ||
    `<p style="text-align:center; padding: 60px; color: var(--dynamic-accent);">No champions yet. Be the first!</p>`;
}

async function renderMyRank(users, filter) {
  const card = document.getElementById("my-rank-card");
  if (!currentUser) return;

  try {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (!userSnap.exists()) return;

    const me = userSnap.data();
    const myXP = me.globalXP || 0;
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
}
