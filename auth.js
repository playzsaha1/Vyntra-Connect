import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const nameInput = document.getElementById("nameInput");
const usernameInput = document.getElementById("usernameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

signupBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const username = usernameInput.value.trim().toLowerCase();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();

  if (!name || !username || !email || !password) {
    alert("Please fill in all fields to sign up.");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      username: username,
      email: email,
      createdAt: serverTimestamp()
    });

    localStorage.setItem(
      "vyntraUser",
      JSON.stringify({
        uid: user.uid,
        name: name,
        username: username,
        email: email
      })
    );

    window.location.href = "app.html";
  } catch (error) {
    console.error("Signup error:", error.code, error.message);

    if (error.code === "auth/email-already-in-use") {
      alert("This email already has an account. Please use Login instead.");
      passwordInput.value = "";
      return;
    }

    if (error.code === "auth/invalid-email") {
      alert("Please enter a valid email address.");
      return;
    }

    if (error.code === "auth/weak-password") {
      alert("Password must be at least 6 characters.");
      return;
    }

    alert("Signup failed: " + error.code + "\n" + error.message);
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    let userData;

    if (userSnap.exists()) {
      userData = userSnap.data();
    } else {
      userData = {
        uid: user.uid,
        name: user.email.split("@")[0],
        username: user.email.split("@")[0],
        email: user.email
      };

      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp()
      });
    }

    localStorage.setItem(
      "vyntraUser",
      JSON.stringify({
        uid: user.uid,
        name: userData.name,
        username: userData.username,
        email: userData.email
      })
    );

    window.location.href = "app.html";
  } catch (error) {
    console.error("Login error:", error.code, error.message);

    if (error.code === "auth/invalid-credential") {
      alert("Incorrect email or password.");
      return;
    }

    if (error.code === "auth/user-not-found") {
      alert("No account found with this email. Please sign up first.");
      return;
    }

    if (error.code === "auth/wrong-password") {
      alert("Incorrect password.");
      return;
    }

    alert("Login failed: " + error.code + "\n" + error.message);
  }
});c