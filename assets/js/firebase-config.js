import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAO8h-zpGL2dsv436HiTZuzL57WONjSfLg",
  authDomain: "preparena-a5fa2.firebaseapp.com",
  projectId: "preparena-a5fa2",
  storageBucket: "preparena-a5fa2.firebasestorage.app",
  messagingSenderId: "281707659217",
  appId: "1:281707659217:web:a06449475aca7d912beaf0",
  measurementId: "G-J8C71VG0VE",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
