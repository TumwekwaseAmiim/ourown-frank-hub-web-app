import { auth, db } from "./firebase-core.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


let currentUser = null;
let currentProfile = null;

let allUsers = [];

let unsubscribeUsers = null;
let unsubscribeMessages = null;


// ======================================
// HELPERS
// ======================================

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char])
  );
}


function getInitials(name) {
  const text = String(name || "User").trim();
  const parts = text.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


function avatarHTML(profile) {
  if (profile?.profileUrl) {
    return `
      <img
        src="${esc(profile.profileUrl)}"
        alt="${esc(profile.displayName || "User")}"
      >
    `;
  }

  return `
    <span>
      ${esc(getInitials(profile?.displayName))}
    </span>
  `;
}


// ======================================
// AUTH STATE
// ======================================

onAuthStateChanged(auth, async (user) => {

  currentUser = user;

  if (!user) {

    document
      .getElementById("chatGate")
      ?.classList.remove("hidden");

    document
      .getElementById("chatArea")
      ?.classList.add("hidden");

    return;
  }


  try {

    const profileSnap = await getDoc(
      doc(db, "users", user.uid)
    );


    if (!profileSnap.exists()) {

      alert("Your chat profile was not found.");

      await signOut(auth);

      return;
    }


    currentProfile = {
      id: profileSnap.id,
      ...profileSnap.data()
    };


    if (currentProfile.status === "suspended") {

      alert("This chat account is suspended.");

      await signOut(auth);

      return;
    }


    document
      .getElementById("chatGate")
      ?.classList.add("hidden");

    document
      .getElementById("chatArea")
      ?.classList.remove("hidden");


    const myName =
      document.getElementById("myName");

    if (myName) {
      myName.textContent =
        currentProfile.displayName ||
        user.email ||
        "User";
    }


    const myAvatar =
      document.getElementById("myAvatar");

    if (myAvatar) {
      myAvatar.innerHTML =
        avatarHTML(currentProfile);
    }


    listenForUsers();

    listenForMessages();

  } catch (error) {

    console.error(
      "Chat initialization error:",
      error
    );

  }

});


// ======================================
// REGISTERED PEOPLE
// ======================================

function listenForUsers() {

  if (unsubscribeUsers) {
    unsubscribeUsers();
  }


  unsubscribeUsers = onSnapshot(
    collection(db, "users"),

    snapshot => {

      allUsers = snapshot.docs
        .map(d => ({
          id: d.id,
          ...d.data()
        }))
        .filter(person =>
          person.status === "active"
        )
        .sort((a, b) =>
          String(a.displayName || "")
            .localeCompare(
              String(b.displayName || "")
            )
        );


      renderUsers();

    },

    error => {

      console.error(
        "Users listener error:",
        error
      );

      const container =
        document.getElementById("chatUsers");

      if (container) {
        container.innerHTML =
          "<p>Unable to load registered people.</p>";
      }

    }
  );

}


// ======================================
// DISPLAY REGISTERED PEOPLE
// ======================================

function renderUsers() {

  const container =
    document.getElementById("chatUsers");

  if (!container) {
    return;
  }


  const searchBox =
    document.getElementById("peopleSearch");


  const search =
    String(searchBox?.value || "")
      .trim()
      .toLowerCase();


  const filtered =
    allUsers.filter(person => {

      const name =
        String(
          person.displayName || ""
        ).toLowerCase();

      return name.includes(search);

    });


  if (!filtered.length) {

    container.innerHTML = `
      <p class="muted">
        No registered people found.
      </p>
    `;

    return;
  }


  container.innerHTML =
    filtered
      .map(person => {

        const isMe =
          person.id === currentUser?.uid;


        return `
          <div class="chat-user-item">

            <div class="chat-avatar small">
              ${avatarHTML(person)}
            </div>

            <div class="chat-user-info">

              <strong>
                ${esc(
                  person.displayName ||
                  "User"
                )}
              </strong>

              <small>
                ${
                  person.role === "admin"
                    ? "Admin"
                    : "Registered User"
                }
                ${isMe ? " • You" : ""}
              </small>

            </div>

          </div>
        `;

      })
      .join("");

}


// ======================================
// PUBLIC CHAT MESSAGES
// ======================================

function listenForMessages() {

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }


  const q = query(
    collection(db, "chatMessages"),
    orderBy("createdAt", "asc"),
    limit(200)
  );


  unsubscribeMessages = onSnapshot(
    q,

    snapshot => {

      const box =
        document.getElementById(
          "chatMessages"
        );


      if (!box) {
        return;
      }


      if (snapshot.empty) {

        box.innerHTML = `
          <div class="conversation-start">

            <p>
              No messages yet.
            </p>

            <small>
              Be the first to start the conversation.
            </small>

          </div>
        `;

        return;
      }


      box.innerHTML =
        snapshot.docs
          .map(documentSnapshot => {

            const message =
              documentSnapshot.data();


            const mine =
              message.userId ===
              currentUser?.uid;


            return `
              <div
                class="private-message
                ${mine ? "mine" : "theirs"}"
              >

                <div class="message-bubble">

                  <small>
                    ${
                      mine
                        ? "You"
                        : esc(
                            message.displayName ||
                            "User"
                          )
                    }
                  </small>

                  <p>
                    ${esc(
                      message.message ||
                      ""
                    )}
                  </p>

                </div>

              </div>
            `;

          })
          .join("");


      box.scrollTop =
        box.scrollHeight;

    },

    error => {

      console.error(
        "Messages listener error:",
        error
      );

      const box =
        document.getElementById(
          "chatMessages"
        );

      if (box) {

        box.innerHTML = `
          <div class="conversation-start">
            <p>
              Could not load chat messages.
            </p>
          </div>
        `;

      }

    }
  );

}


// ======================================
// SEND PUBLIC MESSAGE
// ======================================

document
  .getElementById("chatForm")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (
        !currentUser ||
        !currentProfile
      ) {
        return;
      }


      if (
        currentProfile.status !==
        "active"
      ) {

        alert(
          "Your account is not allowed to post."
        );

        return;
      }


      const input =
        document.getElementById(
          "chatInput"
        );


      const message =
        input.value.trim();


      if (!message) {
        return;
      }


      if (message.length > 500) {

        alert(
          "Message is too long."
        );

        return;
      }


      input.disabled = true;


      try {

        await addDoc(
          collection(
            db,
            "chatMessages"
          ),
          {

            userId:
              currentUser.uid,

            displayName:
              currentProfile.displayName ||
              currentUser.email ||
              "User",

            profileUrl:
              currentProfile.profileUrl ||
              "",

            message:
              message,

            createdAt:
              serverTimestamp()

          }
        );


        input.value = "";

      } catch (error) {

        console.error(
          "Send message error:",
          error
        );

        alert(
          "Message could not be sent."
        );

      } finally {

        input.disabled = false;

        input.focus();

      }

    }
  );


// ======================================
// SEARCH REGISTERED PEOPLE
// ======================================

document
  .getElementById("peopleSearch")
  ?.addEventListener(
    "input",
    renderUsers
  );


// ======================================
// LOGOUT
// ======================================

document
  .getElementById("chatLogout")
  ?.addEventListener(
    "click",
    async () => {

      await signOut(auth);

      location.href =
        "login.html";

    }
  );