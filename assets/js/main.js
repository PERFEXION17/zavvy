/**
 * main.js - The Central Ecosystem Engine
 * Acts as the Traffic Cop for the Zavvy! ecosystem.
 */

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  updateUI,
  removeLoadingScreen,
  initializeTheme,
  setupThemeToggle,
  setupMobileMenu,
} from "./ui.js";

import { initAuthModule } from "./auth-controller.js";
import { createToastContainer } from "./toast.js";

// ==================== ENGINE INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Boot up Global UI Features
  initializeTheme();
  setupThemeToggle();
  setupMobileMenu();
  setupLogoutButtons();
  createToastContainer();

  // 2. The Traffic Cop: Route specific modules based on current page
  const currentPath = window.location.pathname;

  if (currentPath.includes("auth.html") || currentPath.includes("auth")) {
    initAuthModule(); // Only runs if the user is on the auth page!
  }
});

// ==================== GLOBAL AUTH MANAGEMENT ===================

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Zavvy! Engine - Current User:", user.email);
    updateUI(true);
  } else {
    console.log("Zavvy! Engine - No user logged in.");
    updateUI(false);
  }

  // Clear the loading screen once state is verified
  removeLoadingScreen();
});

// ==================== GLOBAL LOGOUT LOGIC ====================

function setupLogoutButtons() {
  const logoutButtons = document.querySelectorAll(".logout-btn");

  logoutButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          window.location.href = "index.html"; // Route back to landing
        })
        .catch((error) => {
          console.error("Logout Error:", error);
        });
    });
  });
}
