/**
 * main.js - The Central Ecosystem Engine
 * Acts as the Traffic Cop for the entire Zavvy! platform.
 */

import { initializeTheme, setupThemeToggle, setupMobileMenu } from "./ui.js";
import { initAuthModule } from "./auth.js";
import { createToastContainer } from "./toast.js";
import { initPortal } from "./portal.js";
import { initAuthGuard, setupLogoutButtons } from "./auth-guard.js";

// ==================== ENGINE INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  setupThemeToggle();
  setupMobileMenu();
  createToastContainer();

  setupLogoutButtons();
  initAuthGuard(); 

  document.addEventListener("zavvyProfileUpdated", (e) => {
    const { photoURL, firstName } = e.detail;
    const headerName = document.getElementById("header-user-name");
    const headerImg = document.querySelector(".dash-prof .profile");

    if (headerName && firstName) headerName.textContent = firstName;
    if (headerImg && photoURL) headerImg.src = photoURL;
  });

  const currentPath = window.location.pathname;

  if (currentPath.includes("auth.html") || currentPath.includes("auth")) {
    initAuthModule();
  } else if (
    currentPath === "/" ||
    currentPath.includes("index.html") ||
    currentPath === ""
  ) {
    console.log("🏠 Landing page (index.html)");
  } else {
    console.log("🚀 Initializing Zavvy Portal...");
    initPortal();
  }
});

