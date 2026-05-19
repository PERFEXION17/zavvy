/**
 * ui.js - The UI Presentation and DOM Manipulation Layer
 * STRICTLY for global elements that exist across the entire ecosystem.
 */

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

export function initializeTheme() {
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    document.body.classList.add("darkmode");
  }
}

export function setupThemeToggle() {
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      document.body.classList.toggle("darkmode");
      const theme = document.body.classList.contains("darkmode")
        ? "dark"
        : "light";
      localStorage.setItem("theme", theme);
    });
  }
}

export function setupMobileMenu() {
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
}

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
