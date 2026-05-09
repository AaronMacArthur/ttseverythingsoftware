const debugPanel = document.getElementById("debug");
const params = new URLSearchParams(window.location.search);
const debugEnabled = params.get("debug") === "1";
let lastSpeaking = null;

if (debugEnabled) {
  debugPanel.hidden = false;
}

pollStatus();
window.setInterval(pollStatus, 150);

async function pollStatus() {
  try {
    const response = await fetch("/api/obs-pepe/status", {
      cache: "no-store",
      credentials: "include"
    });
    const data = response.ok ? await response.json() : { speaking: false };
    setSpeaking(Boolean(data.speaking), data);
  } catch {
    setSpeaking(false, { title: "Waiting for desktop app" });
  }
}

function setSpeaking(isSpeaking, data) {
  if (lastSpeaking !== isSpeaking) {
    document.body.classList.toggle("is-speaking", isSpeaking);
    lastSpeaking = isSpeaking;
  }
  if (debugEnabled) {
    const label = isSpeaking ? "Open" : "Closed";
    const source = data?.source ? ` - ${data.source}` : "";
    const title = data?.title ? ` - ${data.title}` : "";
    debugPanel.textContent = `${label}${source}${title}`;
  }
}
