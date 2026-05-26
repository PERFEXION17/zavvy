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
      console.log("clicked");
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

// ==================== CONFIRMATION MODAL ====================

let currentConfirmModal = null;

export function showConfirmModal(options = {}) {
  return new Promise((resolve) => {
    const {
      title = "Are you sure?",
      message = "This action cannot be undone.",
      confirmText = "Yes",
      cancelText = "Cancel",
      isDestructive = false, // For red "Submit" button
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

    // Escape key
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
