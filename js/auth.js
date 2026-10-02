import { auth, db } from "./firebase-core.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// ==============================
// LOGIN
// ==============================
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const status = document.getElementById("loginStatus");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {

    status.textContent = "Signing in...";

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    location.href = "chat.html";

  } catch (err) {

    console.error(err);

    if (err.code === "auth/invalid-credential") {
      status.textContent = "Incorrect email or password.";
    } else if (err.code === "auth/too-many-requests") {
      status.textContent = "Too many attempts. Please try again later.";
    } else {
      status.textContent = err.message;
    }

  }
});


// ==============================
// REGISTER
// ==============================
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {

  e.preventDefault();

  const status = document.getElementById("registerStatus");

  const displayName =
    document.getElementById("regName").value.trim();

  const email =
    document.getElementById("regEmail").value.trim();

  const password =
    document.getElementById("regPassword").value;

  if (!displayName) {
    status.textContent = "Please enter your name.";
    return;
  }

  try {

    status.textContent = "Creating account...";

    // Create Firebase Authentication account
    const cred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Create matching Firestore user document
    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        displayName: displayName,

        // No Firebase Storage profile picture for now
        profileUrl: "",

        role: "user",
        status: "active",

        email: email,

        createdAt: serverTimestamp()
      }
    );

    status.textContent =
      "Account created successfully. Opening Chat...";

    setTimeout(() => {
      location.href = "chat.html";
    }, 1000);

  } catch (err) {

    console.error(err);

    if (err.code === "auth/email-already-in-use") {

      status.textContent =
        "This email already has an account. Please log in instead.";

    } else if (err.code === "auth/weak-password") {

      status.textContent =
        "Password is too weak. Use at least 6 characters.";

    } else if (err.code === "auth/invalid-email") {

      status.textContent =
        "Please enter a valid email address.";

    } else {

      status.textContent = err.message;

    }

  }

});