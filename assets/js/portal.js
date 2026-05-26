/**
 * portal.js - Portal Router & Layout Controller
 * Enhanced with smooth fade/scale/lift transitions
 */

import { initHeaderWidget } from "./app/header-widget.js";

const NAV_ITEMS = [
  {
    slug: "home",
    label: "Home",
    icon: "/assets/img/icons/home-icon.webp",
    component: () => import("./app/home.js"),
  },
  {
    slug: "neo",
    label: "Neo",
    icon: "/assets/img/icons/neo-icon.webp",
    component: () => import("./app/sparks.js"),
  },
  {
    slug: "sim",
    label: "Sim",
    icon: "/assets/img/icons/laptop-icon.webp",
    component: () => import("./app/sim.js"),
  },
  {
    slug: "synapse",
    label: "The Synapse",
    icon: "/assets/img/icons/brain-icon.webp",
    component: () => import("./app/synapse.js"),
  },
  {
    slug: "leaderboards",
    label: "Leaderboards",
    icon: "/assets/img/icons/shield-icon.webp",
    component: () => import("./app/leaderboards.js"),
  },
  {
    slug: "shop",
    label: "Shop",
    icon: "/assets/img/icons/shop-icon.webp",
    component: () => import("./app/shop.js"),
  },
  {
    slug: "profile",
    label: "Profile",
    icon: "assets/img/icons/profile-icon.webp",
    component: () => import("./app/profile.js"),
  },
  {
    slug: "settings",
    label: "Settings",
    icon: "/assets/img/icons/gear-icon.webp",
    component: () => import("./app/settings.js"),
  },
];

const MOBILE_CORE_SLUGS = ["home", "neo", "sim", "synapse"];
const OVERFLOW_SLUGS = ["leaderboards", "shop", "profile"];

let currentSection = null;

export function initPortal() {
  console.log("🧩 Zavvy Portal Initializing with Smooth Transitions...");

  initHeaderWidget();
  setupNavigation();
  setupRouting();
  handleInitialRoute();
}

function getCurrentTab() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tab") || "home";
}

function setTabParam(slug) {
  const url = new URL(window.location);
  url.searchParams.set("tab", slug);
  history.replaceState({}, "", url);
}

// ==================== NAVIGATION SETUP ====================

function createMobItem(item) {
  const mobItem = document.createElement("a");
  mobItem.href = `?tab=${item.slug}`;
  mobItem.className = "mob-nav-item";
  mobItem.dataset.slug = item.slug;
  mobItem.innerHTML = `<span class="icon"><img src="${item.icon}"></span>`;
  mobItem.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo(item.slug);
    const overflowMenu = document.getElementById("mob-overflow-menu");
    if (overflowMenu) overflowMenu.classList.remove("visible");
  });
  return mobItem;
}

function setupNavigation() {
  const sidebarNav = document.getElementById("sidebar-nav");
  const mobileNav = document.getElementById("mobile-bottom-nav");

  if (!sidebarNav || !mobileNav) return;

  sidebarNav.innerHTML = "";
  mobileNav.innerHTML = `<div class="mob-nav"></div>`;
  const mobContainer = mobileNav.querySelector(".mob-nav");

  NAV_ITEMS.forEach((item) => {
    // Sidebar
    const link = document.createElement("a");
    link.href = `?tab=${item.slug}`;
    link.className = "sidebar-item";
    link.dataset.slug = item.slug;
    link.innerHTML = `
      <span class="icon"><img src="${item.icon}"></span>
      <span class="pad-dash-text">${item.label}</span>
    `;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(item.slug);
    });
    sidebarNav.appendChild(link);
  });

  // Mobile Bottom Nav logic
  MOBILE_CORE_SLUGS.forEach((slug) => {
    const item = NAV_ITEMS.find((nav) => nav.slug === slug);
    if (item) mobContainer.appendChild(createMobItem(item));
  });

  // More trigger
  const moreBtn = document.createElement("button");
  moreBtn.className = "mob-nav-item more-trigger";
  moreBtn.innerHTML = `<span class="icon"><img src="/assets/img/icons/more-icon.webp" alt="more icon"></span>`;
  moreBtn.onclick = () =>
    document.getElementById("mob-overflow-menu").classList.toggle("visible");
  mobContainer.appendChild(moreBtn);

  // Settings
  const settingsItem = NAV_ITEMS.find((nav) => nav.slug === "settings");
  if (settingsItem) mobContainer.appendChild(createMobItem(settingsItem));

  // Hidden Overlay
  const overlay = document.createElement("div");
  overlay.id = "mob-overflow-menu";
  overlay.className = "hidden-menu";
  OVERFLOW_SLUGS.forEach((slug) => {
    const item = NAV_ITEMS.find((nav) => nav.slug === slug);
    if (item) overlay.appendChild(createMobItem(item));
  });
  mobileNav.appendChild(overlay);
}

// ==================== ROUTING ====================

function setupRouting() {
  window.addEventListener("popstate", handleRouteChange);
}

function handleInitialRoute() {
  navigateTo(getCurrentTab(), false);
}

function handleRouteChange() {
  navigateTo(getCurrentTab(), false);
}

export async function navigateTo(slug, updateHistory = true) {
  const item = NAV_ITEMS.find((nav) => nav.slug === slug);
  if (!item) return navigateTo("home");

  const uppercaseLabel = item.label.toUpperCase();
  document.title = `${uppercaseLabel} | Zavvy!`;

  // Update active states
  document.querySelectorAll(".sidebar-item, .mob-nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.slug === slug);
  });

  if (updateHistory) {
    setTabParam(slug);
  }

  await loadSection(item);
}

// ==================== SMOOTH TRANSITION ENGINE ====================
async function loadSection(navItem) {
  const viewport = document.getElementById("content-viewport");
  if (!viewport) return;

  // Fade out current content
  const currentContent = viewport.firstElementChild;
  if (currentContent) {
    currentContent.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
    currentContent.style.opacity = "0";
    currentContent.style.transform = "scale(0.95) translateY(20px)";

    // Give time for exit animation
    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  if (currentSection?.cleanup) currentSection.cleanup();

  // Show loading state
  viewport.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.4s;">
      <div class="loading-img" style="width:100px;">
        <img src="/assets/img/Z!.webp" alt="loading"/>
      </div>
    </div>
  `;

  // Brief loading delay for better UX
  await new Promise((resolve) => setTimeout(resolve, 180));

  try {
    const module = await navItem.component();
    currentSection = module;

    if (typeof module.init === "function") {
      viewport.innerHTML = "";

      // Create wrapper for entrance animation
      const contentWrapper = document.createElement("div");
      contentWrapper.className = "section-content-wrapper";
      contentWrapper.style.cssText = `
        width: 100%;
        height: 100%;
        opacity: 0;
        transform: scale(0.96) translateY(30px);
        transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;

      viewport.appendChild(contentWrapper);

      // Initialize the module
      module.init(contentWrapper);

      // Trigger smooth entrance
      requestAnimationFrame(() => {
        contentWrapper.style.opacity = "1";
        contentWrapper.style.transform = "scale(1) translateY(0)";
      });
    }
  } catch (error) {
    console.error(`Failed to load ${navItem.slug}:`, error);
    viewport.innerHTML = `<p style="color:var(--error-red);text-align:center;padding:80px;">Failed to load ${navItem.label}</p>`;
  }
}
