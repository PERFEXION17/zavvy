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

export function init(container) {
  console.log("🛠️ Zavvy! Settings module initialized (Base64 Mode)");

  container.innerHTML = `
    <div class="settings-container">
      <h2 class="settings-title">Profile Settings</h2>
      
      <div class="profile-preview">
        <div class="dash-prof preview-wrap" id="avatar-click-zone" title="Click to change    photo">
          <div class="settings-img-wrap">
            <img class="settings-img" id="settings-preview-image" src="/assets/img/avatar.webp" alt="Profile" />
            <span class="settings-img-overlay"><i class="ph ph-camera"></i></span>
          </div>
          <span id="settings-preview-name">Champion</span>
        </div>
        <input type="file" id="avatar-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;">
        <small style="color: var(--accent-color); display: block; text-align: center; margin-top: 10px;">Click image to change (Max 1MB)</small>
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
            <rect
                x="0"
                y="0"
                rx="5"
                ry="5"
                fill="none"
                width="100%"
                height="100%"
              ></rect>
          </svg>
        </button>
      </form>

      <h2 class="settings-title">Utility Settings</h2>

    <div class="settings-section">
      <div class="settings-wrap">
        <p>Dark Mode</p>
        <button id="settings-theme-toggle" class="btn-trace theme-toggle">
          <span><i class="ph ph-power"></i></span>
          <svg aria-hidden="true" focusable="false">
            <circle cx="20" cy="20" r="19"></circle>
          </svg>
        </button>
      </div>
    </div>
    </div>
  `;

  loadUserProfile();

  // Attach Form Listener
  document
    .getElementById("profile-form")
    .addEventListener("submit", handleProfileUpdate);

  // Attach Independent Avatar Listeners
  const avatarClickZone = document.getElementById("avatar-click-zone");
  const avatarFileInput = document.getElementById("avatar-file-input");

  if (avatarClickZone && avatarFileInput) {
    avatarClickZone.addEventListener("click", () => avatarFileInput.click());
    avatarFileInput.addEventListener("change", handleAvatarUpload);
  }

  setupSettingsThemeToggle();

  function setupSettingsThemeToggle() {
    const themeBtn = document.getElementById("settings-theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("darkmode");
        const theme = document.body.classList.contains("darkmode")
          ? "dark"
          : "light";
        localStorage.setItem("theme", theme);
      });
    }
  }
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

      // Pull Base64 image exclusively from Firestore
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

  // Strict Guard: Max 800KB
  if (file.size > 1024 * 1024) {
    toast.error("Image is too large! Please choose an image under 800KB.");
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

      // FIX: Write strictly to Firestore, completely bypassing Firebase Auth's URL length limit
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { photoURL: base64String }, { merge: true });

      // Sync UI visually
      if (settingsAvatarImg) settingsAvatarImg.src = base64String;

      // Broadcast to main.js so global header updates instantly
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
      toast.error("Failed to save avatar image to server.");
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
    // FIX: Only update the displayName in Auth. Never pass Base64 strings here.
    await updateProfile(user, { displayName: fullName });

    // Update Firestore Document (Text Fields only)
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

    // Update Local Preview Name
    const firstName = fullName.split(" ")[0];
    document.getElementById("settings-preview-name").textContent = firstName;

    // Retrieve photo URL directly from the existing image tag so the broadcast doesn't wipe it
    const photoURL = document.getElementById("settings-preview-image").src;

    // Broadcast to main.js so global header name updates instantly
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
