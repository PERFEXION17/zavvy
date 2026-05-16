import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc, // <-- Added for updating profile data
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- Core DOM Elements ---
const userNameSpan = document.getElementById("user-name");
const dashUsernameSpan = document.getElementById("dash-username");
const logoutBtn = document.getElementById("logout-btn");
const welcomeTextHeading = document.getElementById("welcome-text");

// --- Settings Panel DOM Elements ---
const settingsForm = document.getElementById("profile-settings-form");
const settingsFullName = document.getElementById("settings-fullname");
const settingsUsername = document.getElementById("settings-username");
const settingsAge = document.getElementById("settings-age");
const settingsDepartment = document.getElementById("settings-department");
const settingsEmail = document.getElementById("settings-email");

// --- Authentication & Initialization ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User is logged in:", user.uid);
    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      const statStreak = document.getElementById("stat-streak");

      if (docSnap.exists()) {
        const userData = docSnap.data();
        const fullName = userData.displayName || user.email;
        const firstName = fullName.split(" ")[0];

        // 1. Dynamic Greeting
        if (welcomeTextHeading) {
          if (userData.profileComplete === false) {
            welcomeTextHeading.textContent = "Welcome, ";
          } else {
            welcomeTextHeading.textContent = "Welcome back, ";
          }
        }

        if (userNameSpan) userNameSpan.textContent = fullName;
        if (dashUsernameSpan) dashUsernameSpan.textContent = `${firstName}!`;

        if (statStreak) {
          const currentStreak = userData.stats?.streakDays ?? 0;

          statStreak.textContent = `${currentStreak} Days`;
        }

        if (settingsFullName)
          settingsFullName.value = userData.displayName || "";
        if (settingsUsername) settingsUsername.value = userData.username || "";
        if (settingsAge) settingsAge.value = userData.age || "";
        if (settingsEmail) settingsEmail.value = userData.email || user.email;

        if (userData.setupProgress?.department) {
          const deptValue = userData.setupProgress.department;
          if (document.getElementById("settings-department"))
            document.getElementById("settings-department").value = deptValue;
          if (document.getElementById("settings-department-trigger"))
            document.getElementById("settings-department-trigger").textContent =
              deptValue;
        }
      }
    } catch (error) {
      console.error("Error fetching user profile data:", error);
    }
  } else {
    // Redirect if not authenticated
    window.location.href = "auth.html";
  }
});

// --- Settings Form Update Listener ---

if (settingsForm) {
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Visual feedback during update
    const updateBtn = document.getElementById("update-profile-btn");
    setButtonLoading(updateBtn, true);

    try {
      const userRef = doc(db, "users", currentUser.uid);

      // Update the database record
      await updateDoc(userRef, {
        displayName: settingsFullName.value.trim(),
        username: settingsUsername.value.toLowerCase().trim(),
        age: parseInt(settingsAge.value),
        "setupProgress.department": settingsDepartment.value,
        profileComplete: true,
      });

      // Update UI elements instantly without a reload
      const newFullName = settingsFullName.value.trim();
      const newFirstName = newFullName.split(" ")[0];

      if (userNameSpan) userNameSpan.textContent = newFullName;
      if (dashUsernameSpan) dashUsernameSpan.textContent = `${newFirstName}!`;
      if (welcomeTextHeading) welcomeTextHeading.textContent = "Welcome back, ";

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setButtonLoading(updateBtn, false);
    }
  });
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

// --- Custom Dropdown Controller Engine ---
const dropdownWrapper = document.getElementById("department-dropdown");
if (dropdownWrapper) {
  const trigger = document.getElementById("settings-department-trigger");
  const panel = dropdownWrapper.querySelector(".dropdown-options-panel");
  const hiddenInput = document.getElementById("settings-department");
  const items = dropdownWrapper.querySelectorAll(".dropdown-item");

  // Toggle dropdown open/close on click
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("hidden");
  });

  // Handle option selection
  items.forEach((item) => {
    item.addEventListener("click", () => {
      const chosenValue = item.getAttribute("data-value");

      // Update trigger text and hidden form value
      trigger.textContent = chosenValue;
      hiddenInput.value = chosenValue;

      // Close panel
      panel.classList.add("hidden");
    });
  });

  // Close dropdown if user clicks anywhere else on the screen
  document.addEventListener("click", () => {
    panel.classList.add("hidden");
  });
}
