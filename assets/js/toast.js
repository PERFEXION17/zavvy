/**
 * toast.js - Global Branded Toast Notification System
 * Consistent with Zavvy! design (shadow-based, no heavy borders)
 */

export function createToastContainer() {
  let container = document.getElementById("zavvy-toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "zavvy-toast-container";
    container.style.cssText = `
      position: fixed;
      top: var(--spacing-md);
      right: var(--spacing-md);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      align-items: flex-end;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = "info", duration = 5000) {
  const container = createToastContainer();

  const toast = document.createElement("div");
  toast.className = `zavvy-toast zavvy-toast-${type}`;
  toast.style.cssText = `
    padding: var(--spacing-md);
    min-width: 280px;
    max-width: 420px;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: var(--bg-color);
    color: var(--text-color);
    font-size: var(--font-size-ui);
    font-weight: var(--font-weight-md);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    pointer-events: all;
    transform: translateX(120%);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  const styles = {
    success: { color: "#22c55e", icon: "ph-check-circle" },
    error: { color: "#ef4444", icon: "ph-x-circle" },
    warning: { color: "#f59e0b", icon: "ph-warning-circle" },
    info: { color: "#6c3baa", icon: "ph-info" },
  };

  const current = styles[type] || styles.info;

  toast.innerHTML = `
    <i class="ph-thin ${current.icon}" 
       style="font-size: 1.2rem; color: ${current.color}; flex-shrink: 0;">
    </i>
    <span style="flex: 1; line-height: 1.4; color: ${current.color};">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => (toast.style.transform = "translateX(0)"), 10);

  setTimeout(() => dismissToast(toast), duration);

  toast.addEventListener("click", () => dismissToast(toast));
}

function dismissToast(toast) {
  toast.style.transform = "translateX(120%)";
  toast.style.opacity = "0";

  setTimeout(() => toast.remove(), 400);
}

export const toast = {
  success: (msg, duration) => showToast(msg, "success", duration),
  error: (msg, duration) => showToast(msg, "error", duration),
  warning: (msg, duration) => showToast(msg, "warning", duration),
  info: (msg, duration) => showToast(msg, "info", duration),
};
