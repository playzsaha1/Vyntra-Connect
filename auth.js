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
    signupBtn.textContent = "Creating account...";
    signupBtn.disabled = true;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData = {
      uid: user.uid,
      name,
      username,
      email,
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, "users", user.uid), userData);

    localStorage.setItem(
      "vyntraUser",
      JSON.stringify({
        uid: user.uid,
        name,
        username,
        email
      })
    );

    window.location.href = "app.html";
  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      alert("This email already has an account. Please use Login instead.");
    } else {
      alert("Signup failed: " + error.code);
    }

    signupBtn.textContent = "Sign Up";
    signupBtn.disabled = false;
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
    loginBtn.textContent = "Logging in...";
    loginBtn.disabled = true;

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    let userData = {
      uid: user.uid,
      name: user.email.split("@")[0],
      username: user.email.split("@")[0],
      email: user.email
    };

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        userData = userSnap.data();
      } else {
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp()
        });
      }
    } catch (firestoreError) {
      console.warn("Firestore profile issue, continuing login:", firestoreError);
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
    console.error(error);

    if (error.code === "auth/invalid-credential") {
      alert("Incorrect email or password.");
    } else {
      alert("Login failed: " + error.code);
    }

    loginBtn.textContent = "Login";
    loginBtn.disabled = false;
  }
});