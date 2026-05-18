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
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 1. ZAVVY! DATA LAYER (Exported Functions)
// ==========================================

export async function createUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),

      // Profile & Demographics
      username:
        user.displayName || `Zavvy_${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: user.displayName || "",
      role: "student",
      state: null,
      school: null,
      "setupProgress.department": null,
      avatarUrl: "/assets/img/avatar.webp",
      profileComplete: false,

      // Zavvy! Gamification Engine
      globalXP: 0,
      synapses: 0,
      currentStreak: 1,
      highestStreak: 1,
      lastActiveDate: new Date().toISOString().split("T")[0],

      // System Preferences
      preferences: {
        soundEnabled: true,
        darkMode: true,
        selectedExam: "jamb",
      },
    });
    console.log("Zavvy! profile initialized successfully for UID:", user.uid);
  }
}

export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function updateUserProfile(uid, data) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, data);
}

// ==========================================
// 2. AUTHENTICATION UI LOGIC
// ==========================================

const loginCard = document.getElementById("login-card");

// Safety Net: Only run this logic if we are actually on the Auth page
if (loginCard) {
  const signupCard = document.getElementById("signup-card");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const pageTitle = document.querySelector("title");
  const googleLoginBtn = document.getElementById("google-login-btn");
  const googleSignupBtn = document.getElementById("google-signup-btn");

  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");

  function initialiseAuthPage() {
    if (mode === "signup") {
      signupCard.classList.remove("hidden");
      loginCard.classList.add("hidden");
      pageTitle.textContent = "Zavvy! | Create Account";
    } else {
      loginCard.classList.remove("hidden");
      signupCard.classList.add("hidden");
      pageTitle.textContent = "Zavvy! | Login";
    }
  }

  initialiseAuthPage();

  const googleProvider = new GoogleAuthProvider();

  async function handleGoogleSignIn() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createUserProfile(result.user);
      window.location.href = "dashboard.html";
    } catch (error) {
      handleAuthError(error);
    }
  }

  if (googleLoginBtn)
    googleLoginBtn.addEventListener("click", handleGoogleSignIn);
  if (googleSignupBtn)
    googleSignupBtn.addEventListener("click", handleGoogleSignIn);

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const signupBtn = signupForm.querySelector("button[type='submit']");
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    setButtonLoading(signupBtn, true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await createUserProfile(userCredential.user);
      window.location.href = "dashboard.html";
    } catch (error) {
      handleAuthError(error);
      setButtonLoading(signupBtn, false);
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const loginBtn = loginForm.querySelector("button[type='submit']");
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    setButtonLoading(loginBtn, true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (error) {
      handleAuthError(error);
      setButtonLoading(loginBtn, false);
    }
  });

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

  function setButtonLoading(buttonEl, isLoading) {
    if (!buttonEl) return;
    if (isLoading) {
      buttonEl.classList.add("btn-loading");
      buttonEl.disabled = true;
    } else {
      buttonEl.classList.remove("btn-loading");
      buttonEl.disabled = false;
    }
  }
}
