"use strict";

const crypto = require("crypto");
const { EventEmitter } = require("events");
const fs = require("fs");
const path = require("path");
const { redactWebSocketUrl } = require("./TikTokDiagnostics");

class TikTokBrowserTransport extends EventEmitter {
  constructor(options = {}) {
    super();
    this.browser = null;
    this.context = null;
    this.page = null;
    this.profileDir = options.profileDir || "";
    this.sequence = 0;
    this.socketSequence = 0;
    this.sockets = new Map();
    this.browserChannel = options.browserChannel || "";
    this.executablePath = options.executablePath || process.env.TTS_TIKTOK_BROWSER_PATH || "";
  }

  async start(options = {}) {
    const handle = normalizeHandle(options.username);
    if (!handle) {
      throw new Error("Enter a TikTok handle before connecting.");
    }
    await this.stop();
    const profileDir = options.profileDir || this.profileDir;
    if (!profileDir) {
      throw new Error("TikTok browser profile directory is missing.");
    }
    fs.mkdirSync(profileDir, { recursive: true });

    const { chromium } = require("playwright-core");
    const launchOptions = {
      headless: Boolean(options.headless),
      viewport: { width: 1280, height: 900 },
      serviceWorkers: "block",
      args: ["--disable-blink-features=AutomationControlled"]
    };
    const launchAttempts = buildLaunchAttempts(this.executablePath, this.browserChannel);
    let lastError = null;
    for (const attempt of launchAttempts) {
      try {
        this.context = await chromium.launchPersistentContext(profileDir, { ...launchOptions, ...attempt });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!this.context) {
      throw new Error(`Unable to launch a Chromium browser for TikTok. Install Microsoft Edge/Chrome or set TTS_TIKTOK_BROWSER_PATH. ${lastError?.message || ""}`.trim());
    }

    this.context.on("page", (page) => this.attachPage(page));
    this.page = this.context.pages()[0] || await this.context.newPage();
    this.attachPage(this.page);
    this.emit("status", { browserState: "running", websocketState: "waiting" });
    const liveUrl = `https://www.tiktok.com/@${encodeURIComponent(handle)}/live`;
    await this.page.goto(liveUrl, { waitUntil: "domcontentloaded", timeout: Number(options.navigationTimeoutMs) || 60000 });
    this.emit("status", { browserState: "page_loaded", websocketState: "waiting" });
    this.startPageHealthChecks();
  }

  attachPage(page) {
    if (!page || page.__ttsEverythingTikTokAttached) {
      return;
    }
    page.__ttsEverythingTikTokAttached = true;
    page.on("websocket", (socket) => this.attachSocket(socket));
    page.on("close", () => this.emit("status", { browserState: "live_ended", websocketState: "closed" }));
    page.on("crash", () => this.emit("error", new Error("TikTok browser page crashed.")));
  }

  attachSocket(socket) {
    const socketUrl = typeof socket.url === "function" ? socket.url() : String(socket.url || "");
    if (!isLikelyTikTokWebcastSocket(socketUrl)) {
      return;
    }
    const socketId = `tiktok-socket-${++this.socketSequence}`;
    const socketUrlRedacted = redactWebSocketUrl(socketUrl);
    this.sockets.set(socketId, { socketUrlRedacted, openedAt: Date.now() });
    this.emit("socket", { socketId, socketUrlRedacted });
    this.emit("status", { websocketState: "connected" });

    socket.on("framesent", (event) => {
      this.emitFrame("sent", socketId, socketUrlRedacted, getFramePayload(event));
    });
    socket.on("framereceived", (event) => {
      this.emitFrame("received", socketId, socketUrlRedacted, getFramePayload(event));
    });
    socket.on("close", () => {
      this.sockets.delete(socketId);
      this.emit("socketClosed", { socketId });
      if (!this.sockets.size) {
        this.emit("status", { websocketState: "closed" });
      }
    });
  }

  emitFrame(direction, socketId, socketUrlRedacted, payload) {
    const buffer = payloadToBuffer(payload);
    const utf8Preview = payloadUtf8Preview(buffer);
    const frame = {
      id: `twf_${Date.now()}_${++this.sequence}`,
      timestamp: new Date().toISOString(),
      direction,
      socketId,
      socketUrlRedacted,
      payloadKind: typeof payload === "string" ? "text" : "binary",
      payloadBase64: buffer.toString("base64"),
      payloadUtf8Preview: utf8Preview,
      byteLength: buffer.length,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      sequence: this.sequence
    };
    this.emit("frame", frame);
    if (direction === "received") {
      this.emit("status", { websocketState: "receiving" });
    }
  }

  startPageHealthChecks() {
    clearInterval(this.healthTimer);
    this.healthTimer = setInterval(async () => {
      if (!this.page || this.page.isClosed()) {
        return;
      }
      try {
        const url = this.page.url();
        const title = await this.page.title().catch(() => "");
        if (/login/i.test(url) || /log in|sign up/i.test(title)) {
          this.emit("status", {
            browserState: "manual_login_required",
            userMessage: "TikTok requires login in the opened browser. Log in manually; TTS Everything will continue automatically."
          });
          return;
        }
        if (!this.sockets.size) {
          this.emit("status", {
            browserState: "page_loaded",
            websocketState: "waiting",
            userMessage: "TikTok page loaded, but no LIVE event socket has been detected yet."
          });
        }
      } catch (error) {
        this.emit("error", error);
      }
    }, 5000);
  }

  async stop() {
    clearInterval(this.healthTimer);
    this.healthTimer = null;
    this.sockets.clear();
    const context = this.context;
    this.context = null;
    this.page = null;
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

function isLikelyTikTokWebcastSocket(socketUrl) {
  const value = String(socketUrl || "").toLowerCase();
  return value.includes("tiktok") && (value.includes("webcast") || value.includes("live") || value.includes("im/") || value.includes("ws"));
}

function getFramePayload(event) {
  if (event && typeof event === "object" && Object.prototype.hasOwnProperty.call(event, "payload")) {
    return event.payload;
  }
  return event;
}

function payloadToBuffer(payload) {
  if (Buffer.isBuffer(payload)) {
    return payload;
  }
  if (payload instanceof ArrayBuffer) {
    return Buffer.from(payload);
  }
  if (ArrayBuffer.isView(payload)) {
    return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
  }
  return Buffer.from(String(payload ?? ""), "utf8");
}

function payloadUtf8Preview(buffer) {
  const text = buffer.toString("utf8").replace(/\0/g, "").trim();
  if (!text || (text.match(/\uFFFD/g) || []).length > 2) {
    return undefined;
  }
  return text.slice(0, 240);
}

function buildLaunchAttempts(executablePath, preferredChannel) {
  const attempts = [];
  if (executablePath) {
    attempts.push({ executablePath });
  }
  if (preferredChannel) {
    attempts.push({ channel: preferredChannel });
  }
  attempts.push({ channel: "msedge" }, { channel: "chrome" }, {});
  return attempts;
}

function normalizeHandle(value) {
  return String(value || "").replace(/^@+/, "").trim();
}

module.exports = {
  TikTokBrowserTransport,
  getFramePayload,
  isLikelyTikTokWebcastSocket,
  payloadToBuffer,
  payloadUtf8Preview
};
