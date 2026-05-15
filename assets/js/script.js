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
