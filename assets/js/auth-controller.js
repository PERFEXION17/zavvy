/**
 * auth-controller.js - The Auth Page Feature Module
 * Clean, maintainable, and integrated with global toast system
 */

import {
  signInWithGoogleService,
  registerWithEmailService,
  loginWithEmailService,
} from "./auth-service.js";

import { setButtonLoading, showAuthMessage } from "./auth-ui.js";

export function initAuthModule() {
  setupAuthRouting();
  setupAuthListeners();
  setupPasswordToggle();
  setupFormValidation();
}

// ==================== ROUTING ====================

function setupAuthRouting() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  const loginCard = document.getElementById("login-card");
  const signupCard = document.getElementById("signup-card");
  const pageTitle = document.querySelector("title");

  if (!loginCard || !signupCard) return;

  if (mode === "signup") {
    signupCard.classList.remove("hidden");
    loginCard.classList.add("hidden");
    if (pageTitle) pageTitle.textContent = "Zavvy! | Create Account";
  } else {
    loginCard.classList.remove("hidden");
    signupCard.classList.add("hidden");
    if (pageTitle) pageTitle.textContent = "Zavvy! | Login";
  }
}

// ==================== LISTENERS ====================

function setupAuthListeners() {
  const googleLoginBtn = document.getElementById("google-login-btn");
  const googleSignupBtn = document.getElementById("google-signup-btn");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  const handleGoogleSignIn = async () => {
    console.log("Google Sign-In initiated");

    const googleBtns = [googleLoginBtn, googleSignupBtn].filter(Boolean);
    googleBtns.forEach((btn) => setButtonLoading(btn, true));

    try {
      const result = await signInWithGoogleService();
      console.log("Google Sign-In Successful!", result.user.email);

      showAuthMessage("Welcome to Zavvy!", "success");

      setTimeout(() => {
        window.location.href = "portal.html";
      }, 800);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      showAuthMessage(getErrorMessage(error));
    } finally {
      googleBtns.forEach((btn) => setButtonLoading(btn, false));
    }
  };

  googleLoginBtn?.addEventListener("click", handleGoogleSignIn);
  googleSignupBtn?.addEventListener("click", handleGoogleSignIn);

  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const signupBtn = signupForm.querySelector("button[type='submit']");
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    setButtonLoading(signupBtn, true);

    try {
      await registerWithEmailService(email, password);
      showAuthMessage("Account created successfully!", "success");

      setTimeout(() => {
        window.location.href = "portal.html";
      }, 1000);
    } catch (error) {
      showAuthMessage(getErrorMessage(error));
    } finally {
      setButtonLoading(signupBtn, false);
    }
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const loginBtn = loginForm.querySelector("button[type='submit']");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    setButtonLoading(loginBtn, true);

    try {
      await loginWithEmailService(email, password);
      showAuthMessage("Login successful! Welcome back", "success");

      setTimeout(() => {
        window.location.href = "portal.html";
      }, 800);
    } catch (error) {
      showAuthMessage(getErrorMessage(error));
    } finally {
      setButtonLoading(loginBtn, false);
    }
  });
}

// ==================== ERROR HANDLING ====================

function getErrorMessage(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please log in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    default:
      return error.message || "An unexpected error occurred. Please try again.";
  }
}

// ==================== PASSWORD TOGGLE ====================

function setupPasswordToggle() {
  const forms = document.querySelectorAll("#login-form, #signup-form");

  forms.forEach((form) => {
    const toggleBtn = form.querySelector(".ph-eye, .ph-eye-slash");
    const passwordInput = form.querySelector(".password-input");

    if (!toggleBtn || !passwordInput) return;

    toggleBtn.addEventListener("click", function () {
      const isPassword = passwordInput.getAttribute("type") === "password";

      passwordInput.setAttribute("type", isPassword ? "text" : "password");

      if (isPassword) {
        toggleBtn.classList.remove("ph-eye");
        toggleBtn.classList.add("ph-eye-slash");
      } else {
        toggleBtn.classList.remove("ph-eye-slash");
        toggleBtn.classList.add("ph-eye");
      }
    });
  });
}

// ==================== FORM VALIDATION ====================

function setupFormValidation() {
  const forms = document.querySelectorAll("#login-form, #signup-form");

  forms.forEach((form) => {
    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector(".password-input");

    if (emailInput) {
      emailInput.addEventListener("input", () => {
        if (emailInput.validity.typeMismatch) {
          emailInput.setCustomValidity("Please enter a valid email address");
        } else {
          emailInput.setCustomValidity("");
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener("input", () => {
        if (passwordInput.value.length < 6) {
          passwordInput.setCustomValidity(
            "Password must be at least 6 characters",
          );
        } else {
          passwordInput.setCustomValidity("");
        }
      });
    }
  });
}
