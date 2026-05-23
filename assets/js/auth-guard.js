import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { updateUI, removeLoadingScreen } from "./ui.js";

export function initAuthGuard() {
  onAuthStateChanged(auth, async (user) => {
    const currentPath = window.location.pathname;

    if (user) {
      console.log("✅ Zavvy! User authenticated:", user.uid);
      updateUI(true);

      // Route protection
      if (
        currentPath.includes("index.html") ||
        currentPath === "/" ||
        currentPath === ""
      ) {
        window.location.href = "portal.html?tab=home";
      }

      // Populate Global Header globally
      await populateGlobalHeader(user);
    } else {
      console.log("⚠️ No user logged in.");
      updateUI(false);

      if (currentPath.includes("portal.html")) {
        window.location.href = "auth.html?mode=login";
      }
    }
    removeLoadingScreen();
  });
}

async function populateGlobalHeader(user) {
  const headerName = document.getElementById("header-user-name");
  const headerImg = document.querySelector(".dash-prof .profile"); // Targeting the header image safely

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    let displayName = "Champion";
    let photoURL = "/assets/img/avatar.webp";

    if (userDoc.exists()) {
      const data = userDoc.data();
      displayName = data.fullName
        ? data.fullName.split(" ")[0]
        : data.username || "Champion";
      if (data.photoURL) photoURL = data.photoURL;
    } else {
      displayName = user.displayName
        ? user.displayName.split(" ")[0]
        : "Champion";
      if (user.photoURL) photoURL = user.photoURL;
    }

    if (headerName) headerName.textContent = displayName;
    if (headerImg) headerImg.src = photoURL;
  } catch (error) {
    console.error("Error populating header:", error);
  }
}

export function setupLogoutButtons() {
  document.addEventListener("click", (e) => {
    if (e.target.closest(".logout-btn")) {
      signOut(auth)
        .then(() => (window.location.href = "index.html"))
        .catch((error) => console.error("Logout Error:", error));
    }
  });
}
