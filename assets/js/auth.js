/**
 * auth.js - The Complete Auth Feature Module
 * Handles UI, Firebase logic, and user provisioning for the Auth page.
 */

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { toast } from "./toast.js";

// ==================== INITIALIZATION ====================
export function initAuthModule() {
  console.log("Zavvy! Auth Module Initialized");
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

// ==================== FIREBASE SERVICES ====================
async function createUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
      username:
        user.displayName || `Zavvy_${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: user.displayName || "",
      role: "student",
      state: null,
      school: null,
      "setupProgress.department": null,
      avatarUrl: "/assets/img/avatar.webp",
      profileComplete: false,
      globalXP: 0,
      currentLevel: 1,
      sparks: 0,
      currentStreak: 0,
      highestStreak: 0,
      lastActiveDate: "", // Format: "2026-05-22"
      dailyQuests: {
        lastResetDate: "", // Format: "2026-05-22"
        quests: [], // Will be populated by engine
      },

      zavvySimExamsTaken: 0,
      neoLessonsCompleted: 0,
      synapseGamesPlayed: 0,
      totalStudyMinutes: 0,

      activityLog: [], // Array of daily summaries
    });
    console.log(
      "Zavvy! profile initialized successfully for UID:",
      user.uid,
    );
  }
}

// ==================== LISTENERS & HANDLERS ====================
function setupAuthListeners() {
  const googleLoginBtn = document.getElementById("google-login-btn");
  const googleSignupBtn = document.getElementById("google-signup-btn");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  // Google Sign In
  const handleGoogleSignIn = async (e) => {
    const btn = e.target.closest("button");
    setButtonLoading(btn, true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await createUserProfile(result.user);

      toast.success("Welcome to Zavvy!");
      setTimeout(() => (window.location.href = "portal.html"), 800);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setButtonLoading(btn, false);
    }
  };

  googleLoginBtn?.addEventListener("click", handleGoogleSignIn);
  googleSignupBtn?.addEventListener("click", handleGoogleSignIn);

  // Email Sign Up
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = signupForm.querySelector("button[type='submit']");
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    setButtonLoading(btn, true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await createUserProfile(userCredential.user);

      toast.success("Account created successfully!");
      setTimeout(() => (window.location.href = "portal.html"), 1000);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setButtonLoading(btn, false);
    }
  });

  // Email Login
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector("button[type='submit']");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    setButtonLoading(btn, true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Login successful! Welcome back.");
      setTimeout(() => (window.location.href = "portal.html"), 800);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ==================== UI HELPERS ====================
function setButtonLoading(btn, isLoading) {
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
      return error.message || "An unexpected error occurred.";
  }
}

function setupPasswordToggle() {
  document.querySelectorAll("#login-form, #signup-form").forEach((form) => {
    const toggleBtn = form.querySelector(".ph-eye, .ph-eye-slash");
    const passwordInput = form.querySelector(".password-input");
    if (!toggleBtn || !passwordInput) return;

    toggleBtn.addEventListener("click", () => {
      const isPassword = passwordInput.getAttribute("type") === "password";
      passwordInput.setAttribute("type", isPassword ? "text" : "password");
      toggleBtn.classList.toggle("ph-eye", !isPassword);
      toggleBtn.classList.toggle("ph-eye-slash", isPassword);
    });
  });
}

function setupFormValidation() {
  document.querySelectorAll("#login-form, #signup-form").forEach((form) => {
    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector(".password-input");

    emailInput?.addEventListener("input", () => {
      emailInput.setCustomValidity(
        emailInput.validity.typeMismatch
          ? "Please enter a valid email address"
          : "",
      );
    });

    passwordInput?.addEventListener("input", () => {
      passwordInput.setCustomValidity(
        passwordInput.value.length < 6
          ? "Password must be at least 6 characters"
          : "",
      );
    });
  });
}
