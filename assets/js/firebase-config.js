import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAi03Zknt670iQOaYpzw-s_mfXgu8pr83M",
  authDomain: "zavvy-app.firebaseapp.com",
  projectId: "zavvy-app",
  storageBucket: "zavvy-app.firebasestorage.app",
  messagingSenderId: "9259468189",
  appId: "1:9259468189:web:ba1c1280c391c859781b74",
  measurementId: "G-RPT3C1F3Z5",
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
