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

const savedUser = JSON.parse(localStorage.getItem("vyntraUser"));

if (!savedUser) {
  window.location.href = "login.html";
} else {
  userLabel.textContent = "@" + savedUser.username;
  profilePreview.textContent = "@" + savedUser.username;
}

if (localStorage.getItem("vyntraTutorialSeen") === "yes") {
  tutorial.style.display = "none";
}

closeTutorial.addEventListener("click", () => {
  tutorial.style.display = "none";
  localStorage.setItem("vyntraTutorialSeen", "yes");
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("vyntraUser");
  window.location.href = "login.html";
});

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
      <div class="chat-avatar">${chat.name.charAt(0)}</div>
      <div class="chat-info">
        <strong>${chat.name}</strong>
        <span>${lastMessage ? lastMessage.text : "No messages yet"}</span>
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

  activeChatName.textContent = chat.name;
  activeChatStatus.textContent = `${chat.type} • ${chat.online ? "Online" : "Offline"} • ${modeInfo[activeMode].title} Mode`;

  messageArea.innerHTML = "";

  chat.messages.forEach(message => {
    const row = document.createElement("div");
    row.className = `message-row ${message.sender === "me" ? "me" : "them"}`;

    row.innerHTML = `
      <div class="message">${escapeHTML(message.text)}</div>
      <div class="message-time">${message.time}</div>
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

function escapeHTML(text) {
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

applyMode(activeMode);
renderChats();
renderMessages();