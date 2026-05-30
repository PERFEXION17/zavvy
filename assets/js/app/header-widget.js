/**
 * header-widget.js - Global UI Controller for Zavvy! Portal
 */
import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  onSnapshot,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { gameEngine } from "../game-engine.js";

const streakEl = document.getElementById("header-streak");
const sparksEl = document.getElementById("header-sparks");
const heartsEl = document.getElementById("header-hearts");
const xpEl = document.getElementById("header-xp");
const userNameEl = document.getElementById("header-user-name");
const profileImgEl = document.getElementById("header-profile-img");
const userLevelEl = document.getElementById("header-user-level");

export function initHeaderWidget() {
  console.log("📊 Health & Economy Header Initializing...");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      userNameEl.textContent = user.displayName || "Champion";
      const userRef = doc(db, "users", user.uid);

      onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          // 1. Check for Heart Regeneration
          const currentHearts =
            data.hearts !== undefined
              ? data.hearts
              : gameEngine.HEART_CONFIG.MAX_HEARTS;
          const regenData = gameEngine.calculateHeartRegen(
            currentHearts,
            data.lastHeartUpdate,
          );

          if (regenData.updated) {
            await updateDoc(userRef, {
              hearts: regenData.hearts,
              lastHeartUpdate: regenData.lastUpdate,
            });
            return;
          }

          // 2. Hydrate the streak and update the Flame UI!
          const streakData = gameEngine.getDisplayStreak(
            data.currentStreak || 0,
            data.lastActiveDate,
          );

          streakEl.textContent = streakData.count;

          // Target the flame icon dynamically
          const streakIcon = streakEl.previousElementSibling;
          if (streakIcon && streakIcon.tagName === "IMG") {
            if (streakData.maintainedToday && streakData.count > 0) {
              // Streak is active and defended today -> Full Color
              streakIcon.style.filter = "none";
              streakIcon.style.opacity = "1";
            } else {
              // Streak is pending (or 0) -> Grayed out
              streakIcon.style.filter = "grayscale(100%)";
              streakIcon.style.opacity = "0.3";
            }
          }

          sparksEl.textContent = data.sparks || 0;
          heartsEl.textContent = regenData.hearts;
          xpEl.textContent = data.globalXP || 0;

          const levelData = gameEngine.calculateLevel(data.globalXP || 0);
          if (userLevelEl) {
            userLevelEl.textContent = `Level ${levelData.level}`;
          }

          if (data.avatarUrl) {
            profileImgEl.src = data.avatarUrl;
          }
        }
      });
    }
  });
}
