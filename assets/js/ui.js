/**
 * ui.js - The UI Presentation and DOM Manipulation Layer
 * STRICTLY for global elements that exist across the entire ecosystem.
 */

import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

export function updateUI(isLoggedIn) {
  const loginButtons = document.querySelectorAll(".login-btn");
  const signupButtons = document.querySelectorAll(".signup-btn");
  const profileElements = document.querySelectorAll(".profile");
  const logoutButtons = document.querySelectorAll(".logout-btn");

  if (isLoggedIn) {
    loginButtons.forEach((btn) => btn.classList.add("hidden"));
    signupButtons.forEach((btn) => btn.classList.add("hidden"));
    profileElements.forEach((el) => el.classList.remove("hidden"));
    logoutButtons.forEach((btn) => btn.classList.remove("hidden"));
  } else {
    loginButtons.forEach((btn) => btn.classList.remove("hidden"));
    signupButtons.forEach((btn) => btn.classList.remove("hidden"));
    profileElements.forEach((el) => el.classList.add("hidden"));
    logoutButtons.forEach((btn) => btn.classList.add("hidden"));
  }
}

export function removeLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.classList.add("fade-out");
  }
}

// ==================== THEME SYSTEM ====================

export async function initializeTheme() {
  const user = auth.currentUser;
  let userTheme = "system";

  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        userTheme = userDoc.data().theme || "system";
      }
    } catch (e) {
      console.warn("Failed to load user theme preference");
    }
  } else {
    userTheme = localStorage.getItem("theme") || "system";
  }

  applyTheme(userTheme);
  setupSystemThemeListener();
}

export function applyTheme(theme) {
  localStorage.setItem("theme", theme);
  document.documentElement.setAttribute("data-theme", theme);

  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.body.classList.toggle("darkmode", isDark);
  } else {
    document.body.classList.toggle("darkmode", theme === "dark");
  }
}

function setupSystemThemeListener() {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "system") {
      applyTheme("system");
    }
  });
}

export function saveThemePreference(theme) {
  localStorage.setItem("theme", theme);

  const user = auth.currentUser;
  if (user) {
    setDoc(doc(db, "users", user.uid), { theme }, { merge: true }).catch(
      (err) => console.error("Failed to save theme to Firestore:", err),
    );
  }
}

// ==================== MOBILE MENU ====================

export function setupMobileMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const mobileMenu = document.getElementById("mob-menu");

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () =>
      mobileMenu.classList.add("open"),
    );
  }

  if (menuClose && mobileMenu) {
    menuClose.addEventListener("click", () =>
      mobileMenu.classList.remove("open"),
    );
  }
}

// ==================== BUTTON LOADING ====================

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

// ==================== CONFIRMATION MODAL ====================

let currentConfirmModal = null;

export function showConfirmModal(options = {}) {
  return new Promise((resolve) => {
    const {
      title = "Are you sure?",
      message = "This action cannot be undone.",
      confirmText = "Yes",
      cancelText = "Cancel",
      isDestructive = false,
    } = options;

    if (currentConfirmModal) currentConfirmModal.remove();

    const modalHTML = `
      <div class="confirm-modal-overlay">
        <div class="confirm-modal">
          <div class="confirm-modal-content">
            <h3>${title}</h3>
            <p>${message}</p>
            
            <div class="confirm-modal-actions">
              <button id="confirm-cancel-btn" class="btn-trace">
                <span>${cancelText}</span>
                <svg><rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect></svg>
              </button>
              <button id="confirm-proceed-btn" class="${isDestructive ? "btn-trace btn-destructive" : "btn-trace"}">
                <span>${confirmText}</span>
                <svg><rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement("div");
    container.innerHTML = modalHTML;
    document.body.appendChild(container);
    currentConfirmModal = container;

    const overlay = container.querySelector(".confirm-modal-overlay");
    const cancelBtn = container.querySelector("#confirm-cancel-btn");
    const proceedBtn = container.querySelector("#confirm-proceed-btn");

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        resolve(false);
        container.remove();
      }
    });

    cancelBtn.addEventListener("click", () => {
      resolve(false);
      container.remove();
    });

    proceedBtn.addEventListener("click", () => {
      resolve(true);
      container.remove();
    });

    const escHandler = (e) => {
      if (e.key === "Escape") {
        resolve(false);
        container.remove();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  });
}
