import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAi03Zknt670iQOaYpzw-s_mfXgu8pr83M",
  authDomain: "zavvy-app.firebaseapp.com",
  projectId: "zavvy-app",
  storageBucket: "zavvy-app.firebasestorage.app",
  messagingSenderId: "9259468189",
  appId: "1:9259468189:web:ba1c1280c391c859781b74",
  measurementId: "G-RPT3C1F3Z5",
  databaseURL: "https://zavvy-app.firebaseio.com",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);

export { getAnalytics };
