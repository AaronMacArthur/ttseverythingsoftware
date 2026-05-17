const giftDonoList = document.getElementById("popoutGiftDonoList");
const giftDonoCount = document.getElementById("popoutGiftDonoCount");
const pinGiftDonoButton = document.getElementById("pinGiftDonoWindowButton");
const giftDonoEvents = [];
const giftDonoChannel = typeof BroadcastChannel === "function" ? new BroadcastChannel("tts-everything-gift-dono") : null;
let giftDonoPinned = false;

pinGiftDonoButton.addEventListener("click", async () => {
  giftDonoPinned = !giftDonoPinned;
  if (window.ttsDesktop?.setGiftDonoAlwaysOnTop) {
    const result = await window.ttsDesktop.setGiftDonoAlwaysOnTop(giftDonoPinned);
    giftDonoPinned = Boolean(result?.pinned);
  }
  pinGiftDonoButton.textContent = giftDonoPinned ? "Pinned" : "Pin";
  pinGiftDonoButton.setAttribute("aria-pressed", String(giftDonoPinned));
  pinGiftDonoButton.classList.toggle("is-active", giftDonoPinned);
});

if (giftDonoChannel) {
  giftDonoChannel.addEventListener("message", (event) => {
    if (event.data?.type === "gift-dono-state") {
      giftDonoEvents.length = 0;
      giftDonoEvents.push(...normalizeEvents(event.data.events || []));
      renderGiftDonoPopout();
    }
    if (event.data?.type === "gift-dono-event") {
      const item = normalizeEvent(event.data.event);
      if (!giftDonoEvents.some((existing) => existing.id === item.id)) {
        giftDonoEvents.push(item);
      }
      while (giftDonoEvents.length > 500) {
        giftDonoEvents.shift();
      }
      renderGiftDonoPopout();
    }
  });
  giftDonoChannel.postMessage({ type: "gift-dono-request-state" });
}

function normalizeEvents(source) {
  return Array.isArray(source) ? source.map(normalizeEvent).filter((event) => event.id) : [];
}

function normalizeEvent(source) {
  return {
    id: String(source?.id || ""),
    source: String(source?.source || "Live"),
    type: String(source?.type || "Gift"),
    user: String(source?.user || "Someone"),
    title: String(source?.title || "Support"),
    amount: String(source?.amount || ""),
    quantity: Math.max(1, Number(source?.quantity) || 1),
    message: String(source?.message || ""),
    createdAt: source?.createdAt || new Date().toISOString()
  };
}

function renderGiftDonoPopout() {
  giftDonoCount.textContent = `${giftDonoEvents.length} ${giftDonoEvents.length === 1 ? "event" : "events"}`;
  if (!giftDonoEvents.length) {
    giftDonoList.innerHTML = '<li class="gift-dono-empty">Open the main app and connect TikTok Live or Streamer.bot.</li>';
    return;
  }
  giftDonoList.innerHTML = "";
  for (const event of giftDonoEvents.slice(-500).reverse()) {
    giftDonoList.append(createGiftDonoItem(event));
  }
}

function createGiftDonoItem(event) {
  const item = document.createElement("li");
  item.className = `gift-dono-item source-${event.source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const source = document.createElement("span");
  source.className = "gift-dono-source";
  source.title = event.source;
  const logo = getPlatformLogo(event.source);
  if (logo) {
    const image = document.createElement("img");
    image.src = logo;
    image.alt = "";
    source.append(image);
  } else {
    source.textContent = event.source.slice(0, 2).toUpperCase();
  }

  const body = document.createElement("div");
  body.className = "gift-dono-body";
  const top = document.createElement("div");
  top.className = "gift-dono-top";
  const user = document.createElement("strong");
  user.textContent = event.user;
  const type = document.createElement("span");
  type.className = "gift-dono-type";
  type.textContent = event.type.toUpperCase();
  top.append(user, type);

  const detail = document.createElement("p");
  const amount = event.amount ? ` - ${event.amount}` : "";
  const quantity = event.quantity > 1 ? ` x${event.quantity}` : "";
  detail.textContent = `${event.title}${quantity}${amount}`;
  body.append(top, detail);

  if (event.message) {
    const message = document.createElement("p");
    message.className = "gift-dono-message";
    message.textContent = event.message;
    body.append(message);
  }

  const time = document.createElement("time");
  time.dateTime = event.createdAt;
  time.textContent = new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  item.append(source, body, time);
  return item;
}

function getPlatformLogo(source) {
  const key = String(source || "").toLowerCase();
  if (key === "tiktok") return "/platform-tiktok.png";
  return "";
}
