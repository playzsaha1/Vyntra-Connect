// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA_IzxDVRD1eGknsJnWGFBjdYCDhIV_4G8",
  authDomain: "vyntra-connect.firebaseapp.com",
  projectId: "vyntra-connect",
  storageBucket: "vyntra-connect.firebasestorage.app",
  messagingSenderId: "284704554554",
  appId: "1:284704554554:web:166236c33d1b92a5593f03",
  measurementId: "G-E5EMP9W27W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };