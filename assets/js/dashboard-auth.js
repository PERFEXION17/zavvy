import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getUserProfile,
  updateUserProfile,
  createUserProfile,
} from "./auth.js";

// --- Core DOM Elements (Centralized) ---
const DOM = {
  userNameSpan: document.getElementById("user-name"),
  dashUsernameSpan: document.getElementById("dash-username"),
  logoutBtn: document.getElementById("logout-btn"),
  welcomeTextHeading: document.getElementById("welcome-text"),
  statStreak: document.getElementById("stat-streak"),

  settingsForm: document.getElementById("profile-settings-form"),
  settingsFullName: document.getElementById("settings-fullname"),
  settingsUsername: document.getElementById("settings-username"),
  settingsState: document.getElementById("settings-state"), // Added
  settingsSchool: document.getElementById("settings-school"), // Added
  settingsDepartment: document.getElementById("settings-department"),
  settingsEmail: document.getElementById("settings-email"),

  avatarClickZone: document.getElementById("avatar-click-zone"),
  avatarFileInput: document.getElementById("avatar-file-input"),
  settingsAvatarImg: document.getElementById("settings-avatar-img"),
  headerAvatarImg: document.getElementById("user-img"),

  dropdownWrapper: document.getElementById("department-dropdown"),
  dropdownTrigger: document.getElementById("settings-department-trigger"),
  updateProfileBtn: document.getElementById("update-profile-btn"),
};

// --- Authentication & Initialization ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  console.log("Zavvy! User is logged in:", user.uid);

  try {
    let userData = await getUserProfile(user.uid);

    // Safety Net: Provision profile if missing
    if (!userData) {
      await createUserProfile(user);
      userData = await getUserProfile(user.uid);
    }

    populateUI(userData, user.email);
  } catch (error) {
    console.error("Error fetching user profile data:", error);
  }
});

// --- UI Populator Function ---
function populateUI(userData, fallbackEmail) {
  const fullName = userData.fullName || userData.displayName || fallbackEmail;
  const firstName = fullName.split(" ")[0];

  if (DOM.welcomeTextHeading) {
    DOM.welcomeTextHeading.textContent = userData.profileComplete
      ? "Welcome back, "
      : "Welcome, ";
  }

  if (DOM.userNameSpan)
    DOM.userNameSpan.textContent = userData.username || fullName;
  if (DOM.dashUsernameSpan)
    DOM.dashUsernameSpan.textContent = `${userData.username || firstName}!`;

  if (DOM.statStreak) {
    DOM.statStreak.textContent = `${userData.currentStreak || 0} Days`;
  }

  if (DOM.settingsFullName) DOM.settingsFullName.value = fullName;
  if (DOM.settingsUsername)
    DOM.settingsUsername.value = userData.username || "";

  // Populating new Demographics fields
  if (DOM.settingsState) DOM.settingsState.value = userData.state || "";
  if (DOM.settingsSchool) DOM.settingsSchool.value = userData.school || "";

  if (DOM.settingsEmail)
    DOM.settingsEmail.value = userData.email || fallbackEmail;

  // Handle department safely from setupProgress sub-object
  if (userData.setupProgress?.department) {
    const deptValue = userData.setupProgress.department;
    if (DOM.settingsDepartment) DOM.settingsDepartment.value = deptValue;
    if (DOM.dropdownTrigger) DOM.dropdownTrigger.textContent = deptValue;
  }

  // Handle Avatar seamlessly matching backend metadata default asset
  const avatarSrc =
    userData.avatar || userData.avatarUrl || "./assets/img/default_gold.png";
  if (DOM.settingsAvatarImg) DOM.settingsAvatarImg.src = avatarSrc;
  if (DOM.headerAvatarImg) DOM.headerAvatarImg.src = avatarSrc;
}

// --- Avatar Engine Event Handlers ---
if (DOM.avatarClickZone && DOM.avatarFileInput) {
  DOM.avatarClickZone.addEventListener("click", () =>
    DOM.avatarFileInput.click(),
  );

  DOM.avatarFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("Image is too large! Please choose an image under 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target.result;
      if (DOM.settingsAvatarImg) DOM.settingsAvatarImg.style.opacity = "0.5";

      try {
        // Updating user's schema data
        await updateUserProfile(auth.currentUser.uid, {
          avatarUrl: base64String,
        });

        if (DOM.settingsAvatarImg) DOM.settingsAvatarImg.src = base64String;
        if (DOM.headerAvatarImg) DOM.headerAvatarImg.src = base64String;
        console.log("Zavvy! Avatar synced to Firestore.");
      } catch (error) {
        console.error("Error uploading avatar:", error);
        alert("Failed to save avatar image to server.");
      } finally {
        if (DOM.settingsAvatarImg) DOM.settingsAvatarImg.style.opacity = "1";
      }
    };
    reader.readAsDataURL(file);
  });
}

// --- Settings Form Update Listener ---
if (DOM.settingsForm) {
  DOM.settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setButtonLoading(DOM.updateProfileBtn, true);

    try {
      const newFullName = DOM.settingsFullName.value.trim();
      const newUsername = DOM.settingsUsername.value.toLowerCase().trim();
      const newState = DOM.settingsState
        ? DOM.settingsState.value.trim()
        : null;
      const newSchool = DOM.settingsSchool
        ? DOM.settingsSchool.value.trim()
        : null;

      // Bundle structural updates matching the Firestore schema rules
      await updateUserProfile(currentUser.uid, {
        fullName: newFullName,
        displayName: newFullName,
        username: newUsername,
        state: newState || null,
        school: newSchool || null,
        "setupProgress.department": DOM.settingsDepartment.value || null,
        profileComplete: true,
      });

      const newFirstName = newFullName.split(" ")[0];
      if (DOM.userNameSpan)
        DOM.userNameSpan.textContent = newUsername || newFullName;
      if (DOM.dashUsernameSpan)
        DOM.dashUsernameSpan.textContent = `${newUsername || newFirstName}!`;
      if (DOM.welcomeTextHeading)
        DOM.welcomeTextHeading.textContent = "Welcome back, ";

      alert("Zavvy! Profile updated successfully.");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setButtonLoading(DOM.updateProfileBtn, false);
    }
  });
}

// --- Custom Dropdown Controller Engine ---
if (DOM.dropdownWrapper && DOM.dropdownTrigger) {
  const panel = DOM.dropdownWrapper.querySelector(".dropdown-options-panel");
  const items = DOM.dropdownWrapper.querySelectorAll(".dropdown-item");

  DOM.dropdownTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("hidden");
  });

  items.forEach((item) => {
    item.addEventListener("click", () => {
      const chosenValue = item.getAttribute("data-value");
      DOM.dropdownTrigger.textContent = chosenValue;
      DOM.settingsDepartment.value = chosenValue;
      panel.classList.add("hidden");
    });
  });

  document.addEventListener("click", () => panel.classList.add("hidden"));
}

// --- Utilities ---
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

if (DOM.logoutBtn) {
  DOM.logoutBtn.addEventListener("click", () => {
    signOut(auth).catch((error) => console.error("Logout failed", error));
  });
}
