/**
 * settings.js - Profile & Utilities Hub
 * Uses Base64 String conversion to bypass Storage CORS issues safely.
 * Independent Avatar Upload + Profile Form Logic.
 * Integrated with Zavvy! Global Toast System.
 */

import { auth, db } from "../firebase-config.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { toast } from "../toast.js";
import { applyTheme, saveThemePreference } from "../ui.js";

export function init(container) {
  console.log("🛠️ Zavvy! Settings module initialized (Base64 Mode)");

  container.innerHTML = `
    <div class="settings-container">
      <h2 class="settings-title">Profile Settings</h2>
      
      <div class="profile-preview">
        <div class="dash-prof preview-wrap" id="avatar-click-zone" title="Click to change photo">
          <div class="settings-img-wrap">
            <img class="settings-img" id="settings-preview-image" src="/assets/img/avatar.webp" alt="Profile" />
            <span class="settings-img-overlay"><i class="ph-thin ph-camera"></i></span>
          </div>
          <span id="settings-preview-name">Champion</span>
        </div>
        <input type="file" id="avatar-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;">
        <small style="color: var(--dynamic-accent); display: block; text-align: center; margin-top: 10px;">Click image to change (Max 1MB)</small>
      </div>

      <form id="profile-form" class="settings-section">
        <div class="settings-wrap">
          <label>Full Name</label>
          <input type="text" id="full-name" required>
        </div>
        
        <div class="settings-wrap">
          <label>Username</label>
          <input type="text" id="username" required>
        </div>

        <div class="settings-wrap">
          <label>Date of Birth</label>
          <input type="date" id="dob" required>
        </div>

        <div class="settings-wrap">
          <label>State of Residence</label>
          <input type="text" id="state" required>
        </div>

        <div class="settings-wrap">
          <label>School / Institution</label>
          <input type="text" id="school" required>
        </div>

        <button type="submit" id="update-btn" class="btn-trace">
          <span>Update Profile</span>
          <svg aria-hidden="true" focusable="false">
            <rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect>
          </svg>
        </button>
      </form>

      <h2 class="settings-title">Utility Settings</h2>

      <div class="settings-section">
        <div class="settings-wrap">
          <p>Theme Preference</p>
          <div class="custom-select-wrapper">
            <select id="theme-select" class="custom-select">
              <option value="system">System (Default)</option>
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
            <i class="ph-thin ph-caret-down"></i>
          </div>
        </div>
      </div>

      <button class="logout-btn btn-trace mob-logout-btn" id="sidebar-logout">
        <span class="icon"><i class="ph-thin ph-sign-out"></i></span>
        <span class="pad-dash-text">Log Out</span>
        <svg aria-hidden="true" focusable="false">
          <rect x="0" y="0" rx="5" ry="5" fill="none" width="100%" height="100%"></rect>
        </svg>
      </button>
    </div>
  `;

  loadUserProfile();

  // Attach Form Listener
  document
    .getElementById("profile-form")
    .addEventListener("submit", handleProfileUpdate);

  // Avatar Listeners
  const avatarClickZone = document.getElementById("avatar-click-zone");
  const avatarFileInput = document.getElementById("avatar-file-input");

  if (avatarClickZone && avatarFileInput) {
    avatarClickZone.addEventListener("click", () => avatarFileInput.click());
    avatarFileInput.addEventListener("change", handleAvatarUpload);
  }

  setupCustomThemeSelector();
}

// ==================== CUSTOM THEME SELECTOR ====================

function setupCustomThemeSelector() {
  const themeSelect = document.getElementById("theme-select");
  if (!themeSelect) return;

  const user = auth.currentUser;
  let currentTheme = "system";

  if (user) {
    getDoc(doc(db, "users", user.uid)).then((docSnap) => {
      if (docSnap.exists()) {
        currentTheme = docSnap.data().theme || "system";
        themeSelect.value = currentTheme;
      }
    });
  } else {
    currentTheme = localStorage.getItem("theme") || "system";
    themeSelect.value = currentTheme;
  }

  themeSelect.addEventListener("change", () => {
    const selected = themeSelect.value;
    applyTheme(selected);
    saveThemePreference(selected);
    toast.success(`Theme changed to ${selected}`);
  });
}

// ==================== 1. LOAD EXISTING PROFILE ====================

async function loadUserProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const previewImg = document.getElementById("settings-preview-image");
  const previewName = document.getElementById("settings-preview-name");

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      document.getElementById("full-name").value =
        data.fullName || user.displayName || "";
      document.getElementById("username").value = data.username || "";
      document.getElementById("dob").value = data.dateOfBirth || "";
      document.getElementById("state").value = data.state || "";
      document.getElementById("school").value = data.school || "";

      previewName.textContent = data.fullName
        ? data.fullName.split(" ")[0]
        : "Champion";
      if (data.photoURL) previewImg.src = data.photoURL;
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    toast.error("Failed to load profile data.");
  }
}

// ==================== 2. INDEPENDENT AVATAR UPLOAD ====================

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 1024 * 1024) {
    toast.error("Image is too large! Please choose an image under 1MB.");
    return;
  }

  const settingsAvatarImg = document.getElementById("settings-preview-image");
  if (settingsAvatarImg) settingsAvatarImg.style.opacity = "0.5";

  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64String = event.target.result;

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { photoURL: base64String }, { merge: true });

      if (settingsAvatarImg) settingsAvatarImg.src = base64String;

      const firstName = document.getElementById(
        "settings-preview-name",
      ).textContent;
      document.dispatchEvent(
        new CustomEvent("zavvyProfileUpdated", {
          detail: { photoURL: base64String, firstName },
        }),
      );

      toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to save avatar image.");
    } finally {
      if (settingsAvatarImg) settingsAvatarImg.style.opacity = "1";
    }
  };

  reader.readAsDataURL(file);
}

// ==================== 3. TEXT FORM UPDATE ====================

async function handleProfileUpdate(e) {
  e.preventDefault();
  const updateBtn = document.getElementById("update-btn");
  const originalText = updateBtn.querySelector("span").textContent;

  updateBtn.classList.add("btn-loading");
  updateBtn.querySelector("span").textContent = "Saving...";

  const user = auth.currentUser;
  if (!user) {
    toast.error("Session expired. Please log in again.");
    return;
  }

  const fullName = document.getElementById("full-name").value.trim();
  const username = document.getElementById("username").value.trim();
  const dob = document.getElementById("dob").value;
  const state = document.getElementById("state").value.trim();
  const school = document.getElementById("school").value.trim();

  try {
    await updateProfile(user, { displayName: fullName });

    await setDoc(
      doc(db, "users", user.uid),
      {
        fullName,
        username,
        dateOfBirth: dob,
        state,
        school,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    const firstName = fullName.split(" ")[0];
    document.getElementById("settings-preview-name").textContent = firstName;

    const photoURL = document.getElementById("settings-preview-image").src;

    document.dispatchEvent(
      new CustomEvent("zavvyProfileUpdated", {
        detail: { photoURL, firstName },
      }),
    );

    toast.success("Profile details updated successfully!");
  } catch (error) {
    console.error("Profile update error:", error);
    toast.error("Failed to update profile. Please try again.");
  } finally {
    updateBtn.classList.remove("btn-loading");
    updateBtn.querySelector("span").textContent = originalText;
  }
}
