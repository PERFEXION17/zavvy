// ==================== USER STATE & AUTH MANAGEMENT ===================
import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const loadingScreen = document.getElementById("loading-screen");

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Current User:", user.email);
    updateUI(true);
  } else {
    console.log("No user logged in.");
    updateUI(false);
  }

  if (loadingScreen) {
    loadingScreen.classList.add("fade-out");
  }
});

const logoutButtons = document.querySelectorAll(".logout-btn");

logoutButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Logout Error:", error);
      });
  });
});

/**
 * Updates the global user interface based on authorization state.
 * Loops through all class instances to support both desktop and mobile menus.
 * @param {boolean} isLoggedIn
 */
function updateUI(isLoggedIn) {
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

// ==================== DARK MODE ====================
const themeBtn = document.getElementById("theme-toggle");
const currentTheme = localStorage.getItem("theme");

if (currentTheme === "dark") {
  document.body.classList.add("darkmode");
}

function themeToggle() {
  document.body.classList.toggle("darkmode");
  const theme = document.body.classList.contains("darkmode") ? "dark" : "light";
  localStorage.setItem("theme", theme);
}

if (themeBtn) {
  themeBtn.addEventListener("click", themeToggle);
}

// ==================== MENU TOGGLE ====================

const menuToggle = document.getElementById("menu-toggle");
const menuClose = document.getElementById("menu-close");
const mobileMenu = document.getElementById("mob-menu");

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    mobileMenu.classList.add("open");
  });
}

if (menuClose && mobileMenu) {
  menuClose.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
  });
}
