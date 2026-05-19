/**
 * auth-service.js - The Data & Authentication Service Layer
 * Strictly handles Firebase communications and database writes.
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
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==================== FIRESTORE PROFILING ====================

export async function createUserProfile(user) {
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
      synapses: 0,
      currentStreak: 1,
      highestStreak: 1,
      lastActiveDate: new Date().toISOString().split("T")[0],
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

// ==================== AUTHENTICATION SERVICES ====================

export async function signInWithGoogleService() {
  const googleProvider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, googleProvider);
  await createUserProfile(result.user);
  return result;
}

export async function registerWithEmailService(email, password) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  await createUserProfile(userCredential.user);
  return userCredential;
}

export async function loginWithEmailService(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}
