import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const chats = [
  {
    id: 1,
    name: "Maya",
    type: "DM",
    online: true,
    messages: [
      { sender: "them", text: "Are we still studying tonight?", time: "4:21 PM" },
      { sender: "me", text: "Yeah, I’ll send the notes soon.", time: "4:22 PM" },
      { sender: "them", text: "This mode switching idea is actually cool.", time: "4:23 PM" }
    ]
  },
  {
    id: 2,
    name: "Family",
    type: "Group",
    online: false,
    messages: [
      { sender: "them", text: "Dinner at 7?", time: "3:58 PM" },
      { sender: "me", text: "I’ll be home by then.", time: "4:00 PM" }
    ]
  },
  {
    id: 3,
    name: "Design Creators",
    type: "Community",
    online: true,
    messages: [
      { sender: "them", text: "New design pack dropped today.", time: "2:14 PM" },
      { sender: "me", text: "Add it to the design library later.", time: "2:16 PM" }
    ]
  },
  {
    id: 4,
    name: "Gaming Lounge",
    type: "Community",
    online: true,
    messages: [
      { sender: "them", text: "Anyone online tonight?", time: "1:45 PM" },
      { sender: "me", text: "Maybe later.", time: "1:49 PM" }
    ]
  }
];

const modeInfo = {
  core: {
    title: "Core",
    text: "Clean, simple, everyday chat."
  },
  pulse: {
    title: "Pulse",
    text: "Bright, social, energetic."
  },
  neon: {
    title: "Neon",
    text: "Futuristic, glowing, immersive."
  },
  cozy: {
    title: "Cozy",
    text: "Warm, calm, personal."
  },
  velocity: {
    title: "Velocity",
    text: "Fast, animated, energetic, and social."
  }
};

let currentUser = null;
let currentUserData = null;
let activeChatId = 1;
let activeMode = localStorage.getItem("vyntraMode") || "core";

const body = document.body;
const chatList = document.getElementById("chatList");
const messageArea = document.getElementById("messageArea");
const activeChatName = document.getElementById("activeChatName");
const activeChatStatus = document.getElementById("activeChatStatus");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const searchInput = document.getElementById("searchInput");
const modeButtons = document.querySelectorAll(".mode-btn");
const modeCard = document.getElementById("modeCard");
const closeTutorial = document.getElementById("closeTutorial");
const tutorial = document.getElementById("tutorial");
const logoutBtn = document.getElementById("logoutBtn");
const userLabel = document.getElementById("userLabel");
const profilePreview = document.getElementById("profilePreview");

function normalise(value = "") {
  return String(value).toLowerCase().trim();
}

onAuthStateChanged(auth, async user => {
  const savedUser = JSON.parse(localStorage.getItem("vyntraUser"));

  if (!user && !savedUser) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user || savedUser;

  await ensureUserProfile();
  await loadCurrentUserData();

  setupUserLabels();
  setupTutorial();
  setupFriendFinder();
  await loadFriends();

  applyMode(activeMode);
  renderChats();
  renderMessages();
});

async function ensureUserProfile() {
  if (!currentUser) return;

  const uid = currentUser.uid;
  const email = normalise(currentUser.email || "");
  const savedUser = JSON.parse(localStorage.getItem("vyntraUser")) || {};

  const fallbackName =
    savedUser.name ||
    currentUser.displayName ||
    (email ? email.split("@")[0] : "Vyntra User");

  const fallbackUsername =
    savedUser.username ||
    fallbackName.toLowerCase().replace(/\s+/g, "");

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid,
      name: fallbackName,
      nameLower: normalise(fallbackName),
      username: normalise(fallbackUsername).replace(/\s+/g, ""),
      email,
      photo: currentUser.photoURL || "",
      friends: [],
      createdAt: serverTimestamp()
    });
  } else {
    const data = snap.data();

    await setDoc(
      userRef,
      {
        uid,
        name: data.name || fallbackName,
        nameLower: normalise(data.name || fallbackName),
        username: normalise(data.username || fallbackUsername).replace(/\s+/g, ""),
        email: normalise(data.email || email),
        photo: data.photo || currentUser.photoURL || "",
        friends: data.friends || []
      },
      { merge: true }
    );
  }
}

async function loadCurrentUserData() {
  if (!currentUser) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    currentUserData = snap.data();

    localStorage.setItem(
      "vyntraUser",
      JSON.stringify({
        uid: currentUserData.uid,
        name: currentUserData.name,
        username: currentUserData.username,
        email: currentUserData.email
      })
    );
  }
}

function setupUserLabels() {
  const username =
    currentUserData?.username ||
    currentUser?.email?.split("@")[0] ||
    "founder";

  userLabel.textContent = "@" + username;
  profilePreview.textContent = "@" + username;
}

function setupTutorial() {
  if (localStorage.getItem("vyntraTutorialSeen") === "yes") {
    tutorial.style.display = "none";
  }

  closeTutorial.addEventListener("click", () => {
    tutorial.style.display = "none";
    localStorage.setItem("vyntraTutorialSeen", "yes");
  });
}

logoutBtn.addEventListener("click", async () => {
  localStorage.removeItem("vyntraUser");

  try {
    await signOut(auth);
  } catch (error) {
    console.warn("Logout warning:", error);
  }

  window.location.href = "login.html";
});

function setupFriendFinder() {
  const rightbar = document.querySelector(".rightbar");

  if (!rightbar || document.getElementById("friendFinderPanel")) return;

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "friendFinderPanel";

  panel.innerHTML = `
    <h2>Find Friends</h2>
    <p class="muted">Search by email, username, or display name.</p>

    <input
      id="friendSearchInput"
      class="search-input"
      type="text"
      placeholder="Search users..."
    />

    <button id="friendSearchBtn" class="secondary-btn full">
      Search User
    </button>

    <div id="friendSearchResult"></div>

    <h2 style="margin-top: 18px;">My Friends</h2>
    <div id="friendsList"></div>
  `;

  rightbar.insertBefore(panel, rightbar.firstChild);

  document
    .getElementById("friendSearchBtn")
    .addEventListener("click", searchFriend);

  document
    .getElementById("friendSearchInput")
    .addEventListener("keydown", event => {
      if (event.key === "Enter") searchFriend();
    });
}

async function searchFriend() {
  const input = document.getElementById("friendSearchInput");
  const resultBox = document.getElementById("friendSearchResult");

  const search = normalise(input.value);
  const searchNoSpaces = search.replace(/\s+/g, "");

  resultBox.innerHTML = "";

  if (!search) {
    alert("Type an email, username, or name.");
    return;
  }

  resultBox.innerHTML = "<p class='muted'>Searching...</p>";

  const usersRef = collection(db, "users");
  const usersSnap = await getDocs(usersRef);

  let foundUser = null;

  usersSnap.forEach(docSnap => {
    const user = docSnap.data();

    const email = normalise(user.email);
    const username = normalise(user.username);
    const name = normalise(user.name);
    const nameNoSpaces = name.replace(/\s+/g, "");

    const matches =
      email === search ||
      username === searchNoSpaces ||
      name === search ||
      nameNoSpaces === searchNoSpaces ||
      email.includes(search) ||
      username.includes(searchNoSpaces) ||
      name.includes(search);

    if (matches && !foundUser) {
      foundUser = user;
    }
  });

  if (!foundUser) {
    resultBox.innerHTML = "<p class='muted'>No user found. Ask them to sign up first.</p>";
    return;
  }

  if (foundUser.uid === currentUser.uid) {
    resultBox.innerHTML = "<p class='muted'>You cannot add yourself.</p>";
    return;
  }

  resultBox.innerHTML = `
    <div class="friend-result-card">
      <div class="chat-avatar">${escapeHTML(foundUser.name || "U").charAt(0)}</div>

      <div>
        <strong>${escapeHTML(foundUser.name || "Unknown User")}</strong>
        <p>${escapeHTML(foundUser.email || "")}</p>
        <p>@${escapeHTML(foundUser.username || "")}</p>

        <button class="small-friend-btn" data-friend-id="${foundUser.uid}">
          Add Friend
        </button>
      </div>
    </div>
  `;

  document
    .querySelector(".small-friend-btn")
    .addEventListener("click", () => addFriend(foundUser.uid));
}

async function addFriend(friendUid) {
  if (!currentUser) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const friends = snap.data().friends || [];

    if (friends.includes(friendUid)) {
      alert("This user is already your friend.");
      return;
    }
  }

  await updateDoc(userRef, {
    friends: arrayUnion(friendUid)
  });

  alert("Friend added!");

  document.getElementById("friendSearchInput").value = "";
  document.getElementById("friendSearchResult").innerHTML = "";

  await loadFriends();
}

async function loadFriends() {
  const friendsList = document.getElementById("friendsList");

  if (!friendsList || !currentUser) return;

  friendsList.innerHTML = "";

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists() || !snap.data().friends || snap.data().friends.length === 0) {
    friendsList.innerHTML = "<p class='muted'>No friends added yet.</p>";
    return;
  }

  const friendIds = snap.data().friends;

  for (const friendUid of friendIds) {
    const friendSnap = await getDoc(doc(db, "users", friendUid));

    if (friendSnap.exists()) {
      const friend = friendSnap.data();

      friendsList.innerHTML += `
        <button class="chat-item friend-chat-btn" data-friend-id="${friend.uid}">
          <div class="chat-avatar">${escapeHTML(friend.name || "U").charAt(0)}</div>
          <div class="chat-info">
            <strong>${escapeHTML(friend.name || "Unknown User")}</strong>
            <span>@${escapeHTML(friend.username || "")}</span>
          </div>
        </button>
      `;
    }
  }

  document.querySelectorAll(".friend-chat-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const friendUid = button.dataset.friendId;
      await openFriendChat(friendUid);
    });
  });
}

async function openFriendChat(friendUid) {
  const friendSnap = await getDoc(doc(db, "users", friendUid));

  if (!friendSnap.exists()) return;

  const friend = friendSnap.data();

  const existingChat = chats.find(chat => chat.friendUid === friendUid);

  if (existingChat) {
    activeChatId = existingChat.id;
  } else {
    const newChat = {
      id: Date.now(),
      friendUid,
      name: friend.name || friend.email || "Friend",
      type: "Friend",
      online: true,
      messages: [
        {
          sender: "them",
          text: `You are now connected with ${friend.name || "this user"}.`,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
        }
      ]
    };

    chats.push(newChat);
    activeChatId = newChat.id;
  }

  renderChats();
  renderMessages();
}

function applyMode(mode) {
  activeMode = mode;
  localStorage.setItem("vyntraMode", mode);

  body.classList.remove(
    "core-mode",
    "pulse-mode",
    "neon-mode",
    "cozy-mode",
    "velocity-mode"
  );

  body.classList.add(`${mode}-mode`);

  modeButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  modeCard.innerHTML = `
    <h3>${modeInfo[mode].title}</h3>
    <p>${modeInfo[mode].text}</p>
  `;

  renderMessages();
}

modeButtons.forEach(button => {
  button.addEventListener("click", () => {
    applyMode(button.dataset.mode);
  });
});

function getActiveChat() {
  return chats.find(chat => chat.id === activeChatId);
}

function renderChats() {
  const searchTerm = searchInput.value.toLowerCase();

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm)
  );

  chatList.innerHTML = "";

  filteredChats.forEach(chat => {
    const lastMessage = chat.messages[chat.messages.length - 1];

    const button = document.createElement("button");
    button.className = `chat-item ${chat.id === activeChatId ? "active" : ""}`;

    button.innerHTML = `
      <div class="chat-avatar">${escapeHTML(chat.name.charAt(0))}</div>
      <div class="chat-info">
        <strong>${escapeHTML(chat.name)}</strong>
        <span>${lastMessage ? escapeHTML(lastMessage.text) : "No messages yet"}</span>
      </div>
    `;

    button.addEventListener("click", () => {
      activeChatId = chat.id;
      renderChats();
      renderMessages();
    });

    chatList.appendChild(button);
  });
}

function renderMessages() {
  const chat = getActiveChat();

  if (!chat) return;

  activeChatName.textContent = chat.name;
  activeChatStatus.textContent = `${chat.type} • ${chat.online ? "Online" : "Offline"} • ${modeInfo[activeMode].title} Mode`;

  messageArea.innerHTML = "";

  chat.messages.forEach(message => {
    const row = document.createElement("div");
    row.className = `message-row ${message.sender === "me" ? "me" : "them"}`;

    row.innerHTML = `
      <div class="message">${escapeHTML(message.text)}</div>
      <div class="message-time">${escapeHTML(message.time)}</div>
    `;

    messageArea.appendChild(row);
  });

  messageArea.scrollTop = messageArea.scrollHeight;
}

function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  const chat = getActiveChat();

  chat.messages.push({
    sender: "me",
    text,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  });

  messageInput.value = "";
  renderChats();
  renderMessages();

  setTimeout(() => {
    chat.messages.push({
      sender: "them",
      text: getAutoReply(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    });

    renderChats();
    renderMessages();
  }, 700);
}

function getAutoReply() {
  const replies = [
    "That sounds good.",
    "Wait, that’s actually cool.",
    "Send me more details.",
    "I like that idea.",
    "Let’s test it properly."
  ];

  return replies[Math.floor(Math.random() * replies.length)];
}

function escapeHTML(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

searchInput.addEventListener("input", renderChats);