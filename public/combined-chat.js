const chatList = document.getElementById("popoutCombinedChatList");
const chatCount = document.getElementById("popoutChatCount");
const pinButton = document.getElementById("pinChatWindowButton");
const messages = [];
const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("tts-everything-combined-chat") : null;
let pinned = false;

pinButton.addEventListener("click", async () => {
  pinned = !pinned;
  if (window.ttsDesktop?.setCombinedChatAlwaysOnTop) {
    const result = await window.ttsDesktop.setCombinedChatAlwaysOnTop(pinned);
    pinned = Boolean(result?.pinned);
  }
  pinButton.textContent = pinned ? "Pinned" : "Pin";
  pinButton.setAttribute("aria-pressed", String(pinned));
  pinButton.classList.toggle("is-active", pinned);
});

if (channel) {
  channel.addEventListener("message", (event) => {
    if (event.data?.type === "chat-state") {
      messages.length = 0;
      messages.push(...normalizeMessages(event.data.messages || []));
      render();
    }
    if (event.data?.type === "chat-message") {
      messages.push(normalizeMessage(event.data.message));
      while (messages.length > 500) {
        messages.shift();
      }
      render();
    }
  });
  channel.postMessage({ type: "chat-request-state" });
}

function normalizeMessages(source) {
  return Array.isArray(source) ? source.map(normalizeMessage).filter((message) => message.message) : [];
}

function normalizeMessage(source) {
  return {
    id: String(source?.id || ""),
    user: String(source?.user || "Chat"),
    message: String(source?.message || ""),
    source: String(source?.source || "Live"),
    roles: Array.isArray(source?.roles) ? source.roles.map(String) : [],
    badges: Array.isArray(source?.badges) ? source.badges.map(String) : [],
    color: /^#[0-9a-f]{6}$/i.test(String(source?.color || "")) ? String(source.color) : "",
    createdAt: source?.createdAt || new Date().toISOString()
  };
}

function render() {
  chatCount.textContent = `${messages.length} ${messages.length === 1 ? "message" : "messages"}`;
  if (!messages.length) {
    chatList.innerHTML = '<li class="combined-chat-empty">Open the main app and connect live chat sources.</li>';
    return;
  }
  chatList.innerHTML = "";
  for (const message of messages.slice(-500)) {
    chatList.append(createItem(message));
  }
  chatList.scrollTop = chatList.scrollHeight;
}

function createItem(message) {
  const item = document.createElement("li");
  item.className = `combined-chat-message source-${message.source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const meta = document.createElement("div");
  meta.className = "combined-chat-meta";
  const source = document.createElement("span");
  source.className = "combined-chat-source";
  source.title = message.source;
  source.setAttribute("aria-label", message.source);
  const sourceLogo = getPlatformLogo(message.source);
  if (sourceLogo) {
    const image = document.createElement("img");
    image.src = sourceLogo;
    image.alt = "";
    source.append(image);
  } else {
    source.textContent = message.source;
  }
  const time = document.createElement("time");
  time.dateTime = message.createdAt;
  time.textContent = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  meta.append(source, time);

  const body = document.createElement("div");
  body.className = "combined-chat-body";
  const username = document.createElement("strong");
  username.className = "combined-chat-user";
  username.textContent = message.user;
  if (message.color) username.style.color = message.color;
  body.append(username);

  for (const badge of getDisplayChatBadges(message).slice(0, 2)) {
    const badgeElement = document.createElement("span");
    badgeElement.className = "combined-chat-badge";
    badgeElement.textContent = formatChatBadge(badge);
    body.append(badgeElement);
  }

  const text = document.createElement("span");
  text.className = "combined-chat-text";
  text.textContent = message.message;
  body.append(text);
  item.append(meta, body);
  return item;
}

function getDisplayChatBadges(message) {
  const values = [...(message.roles || []), ...(message.badges || [])]
    .map((value) => String(value || "").toLowerCase().replace(/[^a-z]/g, ""))
    .filter(Boolean);
  const badges = [];
  if (values.some((value) => value === "moderator" || value === "mod")) {
    badges.push("moderator");
  }
  if (values.some((value) => value === "subscriber" || value === "sub" || value === "founder" || value === "member" || value === "sponsor")) {
    badges.push("subscriber");
  }
  return badges;
}

function formatChatBadge(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "moderator" || normalized === "mod") {
    return "MOD";
  }
  if (normalized === "subscriber" || normalized === "sub") {
    return "SUB";
  }
  return String(value || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 18);
}

function getPlatformLogo(source) {
  const key = String(source || "").toLowerCase();
  if (key === "twitch") return "/platform-twitch.webp";
  if (key === "tiktok") return "/platform-tiktok.png";
  if (key === "kick") return "/platform-kick.webp";
  if (key === "youtube") return "/platform-youtube.webp";
  if (key === "rumble") return "/platform-rumble.webp";
  return "";
}
