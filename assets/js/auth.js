import { auth, db } from "./firebase-config.js"; // <-- Make sure db is exported from config
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Import Firestore functions
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. DOM Elements
const loginCard = document.getElementById("login-card");
const signupCard = document.getElementById("signup-card");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const pageTitle = document.querySelector("title");
const googleLoginBtn = document.getElementById("google-login-btn");
const googleSignupBtn = document.getElementById("google-signup-btn");

// 2. URL Parameter Logic
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

/**
 * FIRESTORE USER PROVISIONING
 * Creates a default profile document if it doesn't exist yet
 */
async function createUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  // If the user document doesn't exist, create it (handles new Email signups & new Google users)
  if (!docSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      createdAt: serverTimestamp(),
      profileComplete: false,
      setupProgress: {
        department: null,
        subjects: [],
      },
      stats: {
        totalPoints: 0,
        streakDays: 1,
        examsTaken: 0,
      },
    });
    console.log("Firestore profile initialized for user:", user.uid);
  }
}

/**
 * AUTHENTICATION LOGIC
 */
const googleProvider = new GoogleAuthProvider();

// --- Google Sign-In Handler ---
async function handleGoogleSignIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Success: Google auth successful for", result.user.email);

    // Provision profile if new
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

// --- Email Sign Up Handler ---
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
    console.log("Success: Account created for", userCredential.user.email);

    // Provision default profile immediately
    await createUserProfile(userCredential.user);

    window.location.href = "dashboard.html";
  } catch (error) {
    handleAuthError(error);
    setButtonLoading(signupBtn, false);
  }
});

// --- Email Login Handler ---

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const loginBtn = loginForm.querySelector("button[type='submit']");
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  setButtonLoading(loginBtn, true);

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("Success: Logged in as", userCredential.user.email);

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

/**
 * Toggles a button between a standard state and a loading state with a spinner
 * @param {HTMLButtonElement} buttonEl - The button element to toggle
 * @param {boolean} isLoading - True to show spinner, False to restore button
 */
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
