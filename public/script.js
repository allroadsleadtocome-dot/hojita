const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");
const removeImage = document.getElementById("removeImage");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.querySelector(".sidebar");
const chatList = document.getElementById("chatList");

let chats = [];
let currentChatId = null;
let currentFile = null;
let currentFileType = null;

const LEAF_SVG = `<svg viewBox="0 0 100 100" width="20" height="20"><path d="M50 92 C30 80 10 65 5 40 C0 15 20 5 35 8 C50 11 55 20 55 20 C55 20 60 5 80 5 C95 5 98 20 95 35 C90 55 75 70 55 85 L50 92Z" fill="#4ade80" opacity="0.9"/><path d="M50 92 C45 80 40 65 42 50 C44 35 50 25 55 20" stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M50 50 C40 55 30 58 25 55" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/><path d="M55 45 C48 42 42 38 38 32" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/><path d="M58 55 C65 50 72 48 78 50" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/></svg>`;

function loadChats() {
  try { chats = JSON.parse(localStorage.getItem("hojita_chats")) || []; }
  catch { chats = []; }
}

function saveChats() {
  localStorage.setItem("hojita_chats", JSON.stringify(chats));
}

function getChat(id) {
  return chats.find((c) => c.id === id);
}

function getPreview(text) {
  return text.replace(/<[^>]*>/g, "").substring(0, 40) || "Chat vacío";
}

function renderSidebar() {
  chatList.innerHTML = "";
  chats.forEach((chat) => {
    const div = document.createElement("div");
    div.className = `chat-item${chat.id === currentChatId ? " active" : ""}`;
    div.innerHTML = `
      <span class="chat-title">${getPreview(chat.messages[0]?.text || "Nuevo chat")}</span>
      <button class="del-btn" data-id="${chat.id}">&times;</button>
    `;
    div.addEventListener("click", (e) => {
      if (e.target.classList.contains("del-btn")) return;
      selectChat(chat.id);
    });
    div.querySelector(".del-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    });
    chatList.appendChild(div);
  });
}

function selectChat(id) {
  currentChatId = id;
  const chat = getChat(id);
  if (!chat) return;
  messagesEl.innerHTML = "";
  welcomeEl.classList.add("hidden");
  chat.messages.forEach((m) => {
    addMessageUI(m.text, m.role, m.file, m.fileType);
  });
  renderSidebar();
  scrollToBottom();
}

function newChat() {
  const id = Date.now().toString();
  chats.push({ id, messages: [] });
  currentChatId = id;
  messagesEl.innerHTML = "";
  welcomeEl.classList.remove("hidden");
  saveChats();
  renderSidebar();
}

function deleteChat(id) {
  chats = chats.filter((c) => c.id !== id);
  if (currentChatId === id) {
    currentChatId = null;
    messagesEl.innerHTML = "";
    welcomeEl.classList.remove("hidden");
  }
  saveChats();
  renderSidebar();
}

function markdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function parseQuizBlock(text) {
  const match = text.match(/\[QUIZ\]([\s\S]*?)\[\/QUIZ\]/);
  if (!match) return null;
  return { full: match[0], inner: match[1].trim() };
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessageUI(text, role, file, fileType) {
  const group = document.createElement("div");
  group.className = "message-group";
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = role === "bot" ? LEAF_SVG : `<span style="font-size:16px">👤</span>`;
  const content = document.createElement("div");
  content.className = "content";

  if (file && fileType?.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = `data:${fileType};base64,${file}`;
    content.appendChild(img);
  } else if (file && fileType === "application/pdf") {
    const pdfTag = document.createElement("div");
    pdfTag.className = "pdf-badge";
    pdfTag.innerHTML = "📄 PDF adjunto";
    content.appendChild(pdfTag);
  }

  if (role === "bot" && parseQuizBlock(text)) {
    const qb = parseQuizBlock(text);
    const lines = qb.inner.split("\n").filter(Boolean);
    const question = lines[0]?.replace(/^Pregunta:\s*/i, "") || "Pregunta";
    const options = lines.filter(l => /^[A-D]\)/.test(l.trim()));
    const parts = text.split("[QUIZ]")[0].trim();
    if (parts) {
      const p = document.createElement("div");
      p.innerHTML = markdown(parts);
      content.appendChild(p);
    }
    const quizDiv = document.createElement("div");
    quizDiv.className = "quiz-box";
    const qP = document.createElement("div");
    qP.className = "quiz-question";
    qP.textContent = question;
    quizDiv.appendChild(qP);
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt";
      btn.textContent = opt.trim();
      btn.addEventListener("click", () => {
        document.querySelectorAll(".quiz-opt").forEach(b => b.disabled = true);
        selectQuizOption(btn, opt, group);
      });
      quizDiv.appendChild(btn);
    });
    content.appendChild(quizDiv);
    const after = text.split("[/QUIZ]")[1] || "";
    if (after.trim()) {
      const p2 = document.createElement("div");
      p2.innerHTML = markdown(after);
      content.appendChild(p2);
    }
  } else {
    const p = document.createElement("div");
    p.innerHTML = markdown(text);
    content.appendChild(p);
  }

  msg.appendChild(avatar);
  msg.appendChild(content);
  group.appendChild(msg);
  messagesEl.appendChild(group);
}

function selectQuizOption(clickedBtn, selectedText, group) {
  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  userDiv.innerHTML = `<div class="avatar"><span style="font-size:16px">👤</span></div><div class="content"><div>${selectedText.trim()}</div></div>`;
  group.appendChild(userDiv);
  scrollToBottom();

  const botDiv = document.createElement("div");
  botDiv.className = "message bot";
  botDiv.id = "typingIndicator";
  botDiv.innerHTML = `<div class="avatar">${LEAF_SVG}</div><div class="content"><div class="typing"><span></span><span></span><span></span></div></div>`;
  group.appendChild(botDiv);
  scrollToBottom();

  if (currentChatId) {
    const chat = getChat(currentChatId);
    if (chat) {
      chat.messages.push({ text: selectedText.trim(), role: "user", file: null, fileType: null });
      saveChats();
    }
  }
  const chat = getChat(currentChatId);
  const history = chat ? chat.messages.map(m => ({ role: m.role === "bot" ? "model" : "user", parts: [{ text: m.text }] })) : [];

  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `Mi respuesta es: ${selectedText.trim()}`, history }),
  })
    .then(r => r.json())
    .then(data => {
      const tb = document.getElementById("typingIndicator");
      if (tb) tb.remove();
      if (data.response) {
        addMessageUI(data.response, "bot");
        if (currentChatId) {
          const c = getChat(currentChatId);
          if (c) { c.messages.push({ text: data.response, role: "bot", file: null, fileType: null }); saveChats(); }
        }
      }
    })
    .catch(() => { const tb = document.getElementById("typingIndicator"); if (tb) tb.remove(); });
}

function addMessage(text, role, file, fileType) {
  welcomeEl.classList.add("hidden");
  if (currentChatId) {
    const chat = getChat(currentChatId);
    if (chat) {
      chat.messages.push({ text, role, file: file || null, fileType: fileType || null });
      saveChats();
      renderSidebar();
    }
  }
  addMessageUI(text, role, file, fileType);
  scrollToBottom();
}

function addTyping() {
  welcomeEl.classList.add("hidden");
  const div = document.createElement("div");
  div.className = "message bot";
  div.id = "typingIndicator";
  div.innerHTML = `<div class="avatar">${LEAF_SVG}</div><div class="content"><div class="typing"><span></span><span></span><span></span></div></div>`;
  messagesEl.appendChild(div);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

async function sendMessage() {
  const message = input.value.trim();
  if (!message && !currentFile) return;
  if (!currentChatId) newChat();

  const file = currentFile;
  const fileType = currentFileType;
  input.value = "";
  input.style.height = "auto";
  clearFile();

  const userMsg = message || (fileType?.startsWith("image/") ? "Analiza esta imagen" : "Analiza este PDF");
  addMessage(userMsg, "user", file, fileType);
  addTyping();
  sendBtn.disabled = true;

  const chat = getChat(currentChatId);
  const history = chat ? chat.messages.map(m => ({ role: m.role === "bot" ? "model" : "user", parts: [{ text: m.text }] })) : [];

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, file, mimeType: fileType, history }),
    });
    const data = await res.json();
    removeTyping();
    if (data.response) addMessage(data.response, "bot");
    else addMessage(`Error: ${data.error || "Algo salió mal"}`, "bot");
  } catch {
    removeTyping();
    addMessage("Error de conexión", "bot");
  }
  sendBtn.disabled = false;
}

function sendChip(text) {
  input.value = text;
  sendMessage();
}

function clearFile() {
  currentFile = null;
  currentFileType = null;
  imagePreview.classList.add("hidden");
  previewImg.src = "";
  fileInput.value = "";
}

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  currentFileType = file.type;

  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(",")[1];
    currentFile = base64;

    if (file.type.startsWith("image/")) {
      previewImg.src = reader.result;
      imagePreview.querySelector(".image-name").textContent = file.name;
    } else {
      previewImg.style.display = "none";
      imagePreview.querySelector(".image-name").textContent = "📄 " + file.name;
    }
    imagePreview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

removeImage.addEventListener("click", clearFile);
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
});

if (window.innerWidth > 820) {
  sidebar.classList.add("open");
}

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

loadChats();
renderSidebar();
if (chats.length > 0) selectChat(chats[0].id);
