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
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const demoChats = [
  {
    id: "demo-1",
    name: "Maya",
    type: "Demo",
    online: true,
    isReal: false,
    messages: [
      { sender: "them", text: "Are we still studying tonight?", time: "4:21 PM" },
      { sender: "me", text: "Yeah, I’ll send the notes soon.", time: "4:22 PM" },
      { sender: "them", text: "This mode switching idea is actually cool.", time: "4:23 PM" }
    ]
  },
  {
    id: "demo-2",
    name: "Family",
    type: "Demo Group",
    online: false,
    isReal: false,
    messages: [
      { sender: "them", text: "Dinner at 7?", time: "3:58 PM" },
      { sender: "me", text: "I’ll be home by then.", time: "4:00 PM" }
    ]
  }
];

let chats = [...demoChats];

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
let activeChatId = "demo-1";
let activeMode = localStorage.getItem("vyntraMode") || "core";
let unsubscribeMessages = null;
let unsubscribeChats = null;
let unsubscribeRequests = null;

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
  if (!user) {
    localStorage.removeItem("vyntraUser");
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  await ensureUserProfile();
  await loadCurrentUserData();

  setupUserLabels();
  setupTutorial();
  setupFriendSystem();

  listenForFriendRequests();
  listenForRealChats();

  applyMode(activeMode);
  renderChats();
  renderMessages();
});

async function ensureUserProfile() {
  const savedUser = JSON.parse(localStorage.getItem("vyntraUser")) || {};

  const fallbackName =
    savedUser.name ||
    currentUser.displayName ||
    currentUser.email.split("@")[0];

  const fallbackUsername =
    savedUser.username ||
    fallbackName.toLowerCase().replace(/\s+/g, "");

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: currentUser.uid,
      name: fallbackName,
      nameLower: normalise(fallbackName),
      username: normalise(fallbackUsername).replace(/\s+/g, ""),
      email: normalise(currentUser.email),
      photo: currentUser.photoURL || "",
      friends: [],
      createdAt: serverTimestamp()
    });
  } else {
    const data = snap.data();

    await setDoc(
      userRef,
      {
        uid: currentUser.uid,
        name: data.name || fallbackName,
        nameLower: normalise(data.name || fallbackName),
        username: normalise(data.username || fallbackUsername).replace(/\s+/g, ""),
        email: normalise(data.email || currentUser.email),
        photo: data.photo || currentUser.photoURL || "",
        friends: data.friends || []
      },
      { merge: true }
    );
  }
}

async function loadCurrentUserData() {
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
    currentUser.email.split("@")[0] ||
    "user";

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

function setupFriendSystem() {
  const rightbar = document.querySelector(".rightbar");

  if (!rightbar || document.getElementById("friendSystemPanel")) return;

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "friendSystemPanel";

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

    <h2 style="margin-top: 18px;">Requests</h2>
    <div id="friendRequestsList">
      <p class="muted">No requests yet.</p>
    </div>
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

  if ((currentUserData.friends || []).includes(foundUser.uid)) {
    resultBox.innerHTML = "<p class='muted'>You are already friends with this user.</p>";
    return;
  }

  resultBox.innerHTML = `
    <div class="friend-result-card">
      <div class="chat-avatar">${escapeHTML(foundUser.name || "U").charAt(0)}</div>

      <div>
        <strong>${escapeHTML(foundUser.name || "Unknown User")}</strong>
        <p>${escapeHTML(foundUser.email || "")}</p>
        <p>@${escapeHTML(foundUser.username || "")}</p>

        <button class="small-friend-btn" id="sendRequestBtn">
          Send Friend Request
        </button>
      </div>
    </div>
  `;

  document
    .getElementById("sendRequestBtn")
    .addEventListener("click", () => sendFriendRequest(foundUser));
}

async function sendFriendRequest(foundUser) {
  const requestId = `${currentUser.uid}_${foundUser.uid}`;
  const reverseRequestId = `${foundUser.uid}_${currentUser.uid}`;

  const requestRef = doc(db, "friendRequests", requestId);
  const reverseRequestRef = doc(db, "friendRequests", reverseRequestId);

  const existingRequest = await getDoc(requestRef);
  const reverseRequest = await getDoc(reverseRequestRef);

  if (existingRequest.exists() && existingRequest.data().status === "pending") {
    alert("Friend request already sent.");
    return;
  }

  if (reverseRequest.exists() && reverseRequest.data().status === "pending") {
    alert("This user already sent you a request. Accept it from your Requests panel.");
    return;
  }

  await setDoc(requestRef, {
    id: requestId,
    fromUid: currentUser.uid,
    fromName: currentUserData.name,
    fromUsername: currentUserData.username,
    fromEmail: currentUserData.email,
    toUid: foundUser.uid,
    toName: foundUser.name,
    toUsername: foundUser.username,
    toEmail: foundUser.email,
    status: "pending",
    createdAt: serverTimestamp()
  });

  document.getElementById("friendSearchResult").innerHTML =
    "<p class='muted'>Friend request sent.</p>";

  document.getElementById("friendSearchInput").value = "";
}

function listenForFriendRequests() {
  if (unsubscribeRequests) unsubscribeRequests();

  const requestsRef = collection(db, "friendRequests");
  const q = query(
    requestsRef,
    where("toUid", "==", currentUser.uid),
    where("status", "==", "pending")
  );

  unsubscribeRequests = onSnapshot(q, snapshot => {
    const requestBox = document.getElementById("friendRequestsList");
    if (!requestBox) return;

    requestBox.innerHTML = "";

    if (snapshot.empty) {
      requestBox.innerHTML = "<p class='muted'>No requests yet.</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const request = docSnap.data();

      const div = document.createElement("div");
      div.className = "friend-result-card";

      div.innerHTML = `
        <div class="chat-avatar">${escapeHTML(request.fromName || "U").charAt(0)}</div>

        <div>
          <strong>${escapeHTML(request.fromName || "Unknown User")}</strong>
          <p>@${escapeHTML(request.fromUsername || "")}</p>
          <p>${escapeHTML(request.fromEmail || "")}</p>

          <button class="small-friend-btn accept-request-btn" data-request-id="${request.id}">
            Accept
          </button>
        </div>
      `;

      requestBox.appendChild(div);
    });

    document.querySelectorAll(".accept-request-btn").forEach(button => {
      button.addEventListener("click", () => {
        acceptFriendRequest(button.dataset.requestId);
      });
    });
  });
}

async function acceptFriendRequest(requestId) {
  const requestRef = doc(db, "friendRequests", requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    alert("Request no longer exists.");
    return;
  }

  const request = requestSnap.data();

  if (request.toUid !== currentUser.uid) {
    alert("This request is not for your account.");
    return;
  }

  const fromUserRef = doc(db, "users", request.fromUid);
  const toUserRef = doc(db, "users", request.toUid);

  await updateDoc(fromUserRef, {
    friends: arrayUnion(request.toUid)
  });

  await updateDoc(toUserRef, {
    friends: arrayUnion(request.fromUid)
  });

  const chatId = createChatId(request.fromUid, request.toUid);
  const chatRef = doc(db, "chats", chatId);

  await setDoc(
    chatRef,
    {
      id: chatId,
      members: [request.fromUid, request.toUid],
      memberNames: {
        [request.fromUid]: request.fromName,
        [request.toUid]: request.toName
      },
      memberUsernames: {
        [request.fromUid]: request.fromUsername,
        [request.toUid]: request.toUsername
      },
      lastMessage: "You are now connected.",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: "system",
    text: "You are now connected. Start chatting!",
    createdAt: serverTimestamp()
  });

  await updateDoc(requestRef, {
    status: "accepted",
    acceptedAt: serverTimestamp()
  });

  await loadCurrentUserData();

  alert("Friend request accepted!");
}

function listenForRealChats() {
  if (unsubscribeChats) unsubscribeChats();

  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("members", "array-contains", currentUser.uid));

  unsubscribeChats = onSnapshot(q, snapshot => {
    const realChats = [];

    snapshot.forEach(docSnap => {
      const chat = docSnap.data();
      const otherUid = chat.members.find(uid => uid !== currentUser.uid);

      const name =
        chat.memberNames?.[otherUid] ||
        chat.memberUsernames?.[otherUid] ||
        "Friend";

      realChats.push({
        id: chat.id,
        chatId: chat.id,
        name,
        type: "Friend",
        online: true,
        isReal: true,
        lastMessage: chat.lastMessage || "Start chatting",
        messages: []
      });
    });

    chats = [...realChats, ...demoChats];

    if (!chats.find(chat => chat.id === activeChatId)) {
      activeChatId = chats[0]?.id || "demo-1";
    }

    renderChats();
    renderMessages();

    const activeChat = getActiveChat();

    if (activeChat?.isReal) {
      listenForMessages(activeChat.chatId);
    }
  });
}

function listenForMessages(chatId) {
  if (unsubscribeMessages) unsubscribeMessages();

  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  unsubscribeMessages = onSnapshot(q, snapshot => {
    const chat = chats.find(item => item.chatId === chatId);

    if (!chat) return;

    chat.messages = [];

    snapshot.forEach(docSnap => {
      const msg = docSnap.data();

      chat.messages.push({
        sender:
          msg.senderId === "system"
            ? "them"
            : msg.senderId === currentUser.uid
              ? "me"
              : "them",
        text: msg.text,
        time: formatFirestoreTime(msg.createdAt)
      });
    });

    renderChats();
    renderMessages();
  });
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
    const lastMessage =
      chat.isReal
        ? chat.lastMessage
        : chat.messages[chat.messages.length - 1]?.text;

    const button = document.createElement("button");
    button.className = `chat-item ${chat.id === activeChatId ? "active" : ""}`;

    button.innerHTML = `
      <div class="chat-avatar">${escapeHTML(chat.name.charAt(0))}</div>
      <div class="chat-info">
        <strong>${escapeHTML(chat.name)}</strong>
        <span>${lastMessage ? escapeHTML(lastMessage) : "No messages yet"}</span>
      </div>
    `;

    button.addEventListener("click", () => {
      activeChatId = chat.id;
      renderChats();
      renderMessages();

      const activeChat = getActiveChat();

      if (activeChat?.isReal) {
        listenForMessages(activeChat.chatId);
      } else if (unsubscribeMessages) {
        unsubscribeMessages();
      }
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

async function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  const chat = getActiveChat();

  if (!chat) return;

  if (chat.isReal) {
    messageInput.value = "";

    await addDoc(collection(db, "chats", chat.chatId, "messages"), {
      senderId: currentUser.uid,
      text,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "chats", chat.chatId), {
      lastMessage: text,
      updatedAt: serverTimestamp()
    });

    return;
  }

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

function createChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function formatFirestoreTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";

  return timestamp.toDate().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
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