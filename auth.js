import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
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
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!name || !username || !email || !password) {
    alert("Please fill in all fields to sign up.");
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
    alert(error.message);
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
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

    localStorage.setItem(
      "vyntraUser",
      JSON.stringify({
        uid: user.uid,
        name: user.email.split("@")[0],
        username: user.email.split("@")[0],
        email: user.email
      })
    );

    window.location.href = "app.html";
  } catch (error) {
    alert(error.message);
  }
});