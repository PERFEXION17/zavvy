/**
 * auth-ui.js - Auth-specific UI helpers
 * Fully aligned with your .btn-loading CSS
 */

import { toast } from "./toast.js";

export function setButtonLoading(btn, isLoading) {
  if (!btn) return;

  const span = btn.querySelector("span");
  const originalText =
    btn.dataset.originalText || span?.textContent || btn.textContent;

  if (isLoading) {
    btn.dataset.originalText = originalText;
    btn.disabled = true;

    btn.classList.add("btn-loading");

    if (span) span.textContent = originalText;
  } else {
    btn.disabled = false;
    btn.classList.remove("btn-loading");

    if (span) span.textContent = originalText;
  }
}

export function showAuthMessage(message, type = "error") {
  if (type === "success") {
    toast.success(message);
  } else {
    toast.error(message);
  }
}

export function showAuthToast(message, type = "error", duration = 5500) {
  toast[type === "success" ? "success" : "error"](message, duration);
}
