/**
 * auth-controller.js - The Auth Page Feature Module
 * Only executes when the user is specifically on the Auth page.
 */

import {
  signInWithGoogleService,
  registerWithEmailService,
  loginWithEmailService,
} from "./auth-service.js";
import { setButtonLoading } from "./ui.js";

export function initAuthModule() {
  setupAuthRouting();
  setupAuthListeners();
  setupPasswordToggle();
}

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

function setupAuthListeners() {
  const googleLoginBtn = document.getElementById("google-login-btn");
  const googleSignupBtn = document.getElementById("google-signup-btn");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogleService();
      window.location.href = "portal.html";
    } catch (error) {
      handleAuthError(error);
    }
  };

  if (googleLoginBtn)
    googleLoginBtn.addEventListener("click", handleGoogleSignIn);
  if (googleSignupBtn)
    googleSignupBtn.addEventListener("click", handleGoogleSignIn);

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const signupBtn = signupForm.querySelector("button[type='submit']");
      const email = document.getElementById("signup-email").value;
      const password = document.getElementById("signup-password").value;

      setButtonLoading(signupBtn, true);
      try {
        await registerWithEmailService(email, password);
        window.location.href = "portal.html";
      } catch (error) {
        handleAuthError(error);
        setButtonLoading(signupBtn, false);
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const loginBtn = loginForm.querySelector("button[type='submit']");
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      setButtonLoading(loginBtn, true);
      try {
        await loginWithEmailService(email, password);
        window.location.href = "portal.html";
      } catch (error) {
        handleAuthError(error);
        setButtonLoading(loginBtn, false);
      }
    });
  }
}

function handleAuthError(error) {
  let message = "An unexpected error occurred.";
  switch (error.code) {
    case "auth/email-already-in-use":
      message = "This email is already registered. Try logging in.";
      break;
    case "auth/invalid-email":
      message = "Please enter a valid email address.";
      break;
    case "auth/weak-password":
      message = "Password should be at least 6 characters.";
      break;
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      message = "Invalid email or password.";
      break;
    case "auth/popup-closed-by-user":
      message = "The sign-in popup was closed before completing.";
      break;
    default:
      message = error.message;
  }
  alert(message);
  console.error("Auth Error:", error.code, error.message);
}

function setupPasswordToggle() {
  const togglePassword = document.querySelector("#togglePassword");
  const passwordField = document.querySelector(".password-input");

  if (togglePassword && passwordField) {
    togglePassword.addEventListener("click", function () {
      const type =
        passwordField.getAttribute("type") === "password" ? "text" : "password";
      passwordField.setAttribute("type", type);
      togglePassword.classList.toggle("ph-eye-slash");
    });
  }
}
