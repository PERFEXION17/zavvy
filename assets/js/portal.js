/**
 * portal.js - Portal Router & Layout Controller
 * Enhanced with permanent global routing & declarative event delegation
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
  console.log("🧩 Zavvy Portal Initializing with Centralized Router...");

  // Expose routing globally EXACTLY once here. It lives for the entire session lifecycle.
  window.navigateTo = (slug) => navigateTo(slug);

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

  // Hidden Overflow Menu
  const overlay = document.createElement("div");
  overlay.id = "mob-overflow-menu";
  overlay.className = "hidden-menu";
  OVERFLOW_SLUGS.forEach((slug) => {
    const item = NAV_ITEMS.find((nav) => nav.slug === slug);
    if (item) overlay.appendChild(createMobItem(item));
  });
  mobileNav.appendChild(overlay);
}

// ==================== ROUTING ENGINE ====================

function setupRouting() {
  window.addEventListener("popstate", handleRouteChange);

  /**
   * GLOBAL LINK HIJACKING (Event Delegation)
   * Listens for clicks anywhere on the page. If the clicked element (or any of its parents)
   * contains a `data-nav` attribute, intercept the click and route natively.
   */
  document.body.addEventListener("click", (e) => {
    const navTarget = e.target.closest("[data-nav]");
    if (navTarget) {
      e.preventDefault();
      const slug = navTarget.getAttribute("data-nav");
      navigateTo(slug);
    }
  });
}

function handleInitialRoute() {
  navigateTo(getCurrentTab(), false);
}

function handleRouteChange() {
  navigateTo(getCurrentTab(), false);
}

// Named export allows external manual triggers if strictly necessary
export async function navigateTo(slug, updateHistory = true) {
  const item = NAV_ITEMS.find((nav) => nav.slug === slug);
  if (!item) return navigateTo("home");

  const uppercaseLabel = item.label.toUpperCase();
  document.title = `${uppercaseLabel} | Zavvy!`;

  // Update active states across sidebar and mobile bars instantly
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

  // Fade out current content safely without altering global methods
  const currentContent = viewport.firstElementChild;
  if (currentContent) {
    currentContent.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
    currentContent.style.opacity = "0";
    currentContent.style.transform = "scale(0.95) translateY(20px)";

    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  // Gracefully clean up the previous page's streams
  if (currentSection?.cleanup) {
    try {
      currentSection.cleanup();
    } catch (err) {
      console.error("Cleanup error on module switch:", err);
    }
  }

  // Show loading basin state
  viewport.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; opacity: 1; transition: opacity 0.4s;">
      <div class="loading-img" style="width:100px;">
        <img src="/assets/img/Z!.webp" alt="loading"/>
      </div>
    </div>
  `;

  await new Promise((resolve) => setTimeout(resolve, 180));

  try {
    const module = await navItem.component();
    currentSection = module;

    if (typeof module.init === "function") {
      viewport.innerHTML = "";

      // Create wrapper for transition entrance animations
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

      // Initialize module inside its dedicated sandboxed wrapper
      module.init(contentWrapper);

      // Trigger crisp entrance animation frame
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
