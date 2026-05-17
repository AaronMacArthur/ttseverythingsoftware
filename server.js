const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const Stripe = require("stripe");
const { Pool } = require("pg");
const cohostEngine = require("./cohostEngine");

loadEnvFile();

const DESKTOP_MODE = process.env.DESKTOP_MODE === "1";
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const APP_URL = (process.env.APP_URL || `http://${HOST}:${PORT}`).replace(/\/+$/, "");
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const DESKTOP_SETTINGS_FILE = path.join(DATA_DIR, "desktop-settings.json");
const DESKTOP_CONFIG_FILE = process.env.DESKTOP_CONFIG_FILE
  ? path.resolve(process.env.DESKTOP_CONFIG_FILE)
  : DESKTOP_SETTINGS_FILE;
const DATABASE_URL = process.env.DATABASE_URL || "";
const STORAGE_MODE = DATABASE_URL ? "postgres" : "json";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";
const CARTESIA_BASE_URL = "https://api.cartesia.ai";
const CARTESIA_VERSION = "2026-03-01";
const DEFAULT_CARTESIA_VOICE_ID = "f786b574-daa5-4673-aa0c-cbe3e8534c02";
const SAVED_SECRET_MASK = "******";
const SESSION_COOKIE = "ttstotwitch_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const SESSION_SECRET = process.env.SESSION_SECRET || "replace-this-session-secret";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const DESKTOP_STDERR_LOG = process.env.DESKTOP_STDERR_LOG || "";
const DESKTOP_STDOUT_LOG = process.env.DESKTOP_STDOUT_LOG || "";
const ADMIN_EMAIL = "aaron.macarthur1999@gmail.com";
const MAX_TTS_QUEUE_LENGTH = Math.floor(clampEnvNumber("MAX_TTS_QUEUE_LENGTH", 1, 500, 50));
const MAX_CONCURRENT_TTS_JOBS = Math.floor(clampEnvNumber("MAX_CONCURRENT_TTS_JOBS", 1, 10, 2));
const MAX_CHAT_HISTORY_IN_MEMORY = Math.floor(clampEnvNumber("MAX_CHAT_HISTORY_IN_MEMORY", 1, 5000, 500));
const MAX_LOG_ENTRIES_IN_MEMORY = Math.floor(clampEnvNumber("MAX_LOG_ENTRIES_IN_MEMORY", 1, 5000, 500));
const MEMORY_LOG_INTERVAL_MS = 60_000;
const HARD_BLOCKED_TTS_TERM_REGEX = /\b(?:n[1!i][g9@q][g9@q][3e]?[r]?|n[1!i][g9@q][g9@q][a@4]|n[1!i][g9@q]{2,}[a@43e1!ur0h]*|kn[e3i1!]{1,3}g[g9@q]*[a@4uhre3]*|kn[e3i][e3]?[g9@q]{2,}|k?nie[g9@q]{2,}|k?n[i1!e3][g9@q]{2,}|(?:nick|nik|mick|mk)[g9@q]{2,}[a@4uhre3]*|(?:nick|nik|mick)[g9@q]+(?:gur|guh|gah|gurr|guhh|gahh|ger|gro)*|n[iy][e3]?[g9@q]{2,}|ne{1,2}g[g9@q]{2,}|naig[g9@q]+|n[i1!e3][e3]?g[g9@q]{2,}|(?:knee|kni|knick|nikk|mick|nie|ny|neeg|naig|knig|kneg)[g9@q]{2,}[a@4uhre30!1]*|n\s+[i1!]\s*[g9@q]\s*[g9@q]|n\s+i\s+g+\s+[e3a@4]|[n]\s+[i1!e3]\s+[g9@q]\s+[g9@q]|n[1!i][g9@q][g9@q][3e][r]?|n[1!i][g9@q][3e][g9@q]|[kmn][i1!e3y]{1,2}[g9@q]{2,}[a@43e1!ur0h]{0,8})\b/i;
const HARD_BLOCKED_TTS_EXACT_REGEX = /\b(?:n[\W_]*word|enword|n[\W_]*bomb|the[\W_]*n|n[\W_]*b[0o]mb|n[\W_]*w[0o]rd|nig[\W_]*ger|nigg|nigga|nigger)\b/i;
const HARD_BLOCKED_TTS_SUBSTRING_REGEX = /(?:n[1!i][g9@q]{2,}[a@43e1!ur0h]{0,8}|[kmn][i1!e3y]{1,2}[g9@q]{2,}[a@43e1!ur0h]{0,8}|n[\W_]*word|enword|n[\W_]*bomb|the[\W_]*n|n[\W_]*b[0o]mb|n[\W_]*w[0o]rd|nig[\W_]*ger|nigg|nigga|nigger)/i;
const DEFAULT_MODERATION_SETTINGS = {
  skipCommands: true,
  skipLinks: true,
  skipEmotesOnly: true,
  speakMentionsOnly: false,
  neverSkipMidSpeech: true,
  followersOnly: false,
  minMessageLength: 2,
  maxMessageCharacters: 100,
  userCooldownSeconds: 0,
  maxQueueSize: 50,
  fastChatMessageThreshold: 10,
  fastChatWindowSeconds: 12,
  fastChatSkipBehavior: "drop_oldest",
  messagePauseSeconds: 0,
  ttsAntiSpamEnabled: true,
  ttsAntiSpamMaxRepeatedWordCount: 4,
  ttsAntiSpamMaxRepeatedShortTokenCount: 3,
  ttsAntiSpamMaxAlternatingPatternCount: 3,
  ttsAntiSpamAction: "skip",
  ttsAntiSpamBlockedPhrases: [],
  ttsAntiSpamBlockedSounds: ["azhh"],
  bannedChatters: [],
  bannedWords: []
};

const PLANS = [
  {
    id: "free",
    name: "Free Tier",
    description: "A free monthly plan for trying TTS to Twitch live.",
    monthlyPriceCents: 0,
    monthlyCharacters: 5000,
    highlight: "Free monthly allowance"
  },
  {
    id: "starter",
    name: "Starter",
    description: "For casual creators running regular Twitch TTS.",
    monthlyPriceCents: 900,
    monthlyCharacters: 40000,
    highlight: "Great for smaller communities"
  },
  {
    id: "creator",
    name: "Creator",
    description: "For creators using TTS frequently across streams.",
    monthlyPriceCents: 1900,
    monthlyCharacters: 90000,
    highlight: "Best balance of price and volume"
  },
  {
    id: "pro",
    name: "Pro",
    description: "For high-volume channels with heavy live chat activity.",
    monthlyPriceCents: 3900,
    monthlyCharacters: 200000,
    highlight: "For serious live usage"
  }
];

const FREE_PLAN = PLANS[0];

const BUILT_IN_VOICES = [
  { name: "John", voiceId: "sB7vwSCyX0tQmU24cW2C" },
  { name: "Hope", voiceId: "zGjIP4SZlMnY9m93k97r" },
  { name: "Donavon", voiceId: "DMyrgzQFny3JI1Y1paM5" },
  { name: "Spuds", voiceId: "NOpBlnGInO9m6vDvFkFC" },
  { name: "Mark", voiceId: "UgBBYS2sOqTuMpoF3BR0" },
  { name: "Ellllen", voiceId: "BIvP0GN1cAtSRTxNHnWS" },
  { name: "Lucas", voiceId: "s0XGIcqmceN2l7kjsqoZ" },
  { name: "Ember", voiceId: "WtA85syCrJwasGeHGH2p" },
  { name: "Victor", voiceId: "cPoqAvGWCPfCfyPMwe4z" },
  { name: "Milly", voiceId: "VD1if7jDVYtAKs4P0FIY" },
  { name: "Jerry", voiceId: "rHWSYoq8UlV0YIBKMryp" },
  { name: "Cherry", voiceId: "XJ2fW4ybq7HouelYYGcL" },
  { name: "Clyde", voiceId: "QMJTqaMXmGnG8TCm8WQG" },
  { name: "Edward", voiceId: "zYcjlYFOd3taleS0gkk3" },
  { name: "Russel", voiceId: "NYC9WEgkq1u4jiqBseQ9" },
  { name: "Rachel", voiceId: "aD6riP1btT197c6dACmy" },
  { name: "Blondie", voiceId: "si0svtk05vPEuvwAW93c" },
  { name: "Sean", voiceId: "4NJLA7OQNVkeKe4jVdHw" },
  { name: "Marshal", voiceId: "XsmrVB66q3D4TaXVaWNF" },
  { name: "Austin", voiceId: "Xb3zeLrTi6F4ziIcXdwk" },
  { name: "Bunty", voiceId: "omLr0bN17lYIC1JWLSYV" },
  { name: "Tashi", voiceId: "YIXhzp6l2M0ddzOGIbJ3" },
  { name: "Smeegle", voiceId: "1zvnni6XluAvqQJWPf1M" }
];
const DEFAULT_LIVE_SETTINGS = {
  browserSourceEnabled: false,
  twitchSourceEnabled: true,
  tiktokSourceEnabled: false,
  kickSourceEnabled: false,
  youtubeSourceEnabled: false,
  rumbleSourceEnabled: false,
  streamerbotSourceEnabled: false,
  ttsProvider: "elevenlabs",
  ttsProviderMode: "single",
  sourceTtsProviders: {
    Twitch: "elevenlabs",
    TikTok: "cartesia",
    Kick: "elevenlabs",
    YouTube: "elevenlabs",
    Rumble: "elevenlabs"
  },
  voiceMode: "source",
  fallbackVoiceId: BUILT_IN_VOICES[0].voiceId,
  fixedVoiceProvider: "elevenlabs",
  fixedVoiceId: BUILT_IN_VOICES[0].voiceId,
  modelId: "eleven_flash_v2_5",
  elevenLabsModelId: "eleven_flash_v2_5",
  cartesiaModelId: "sonic-3",
  stability: 0.45,
  similarityBoost: 0.75,
  speed: 1
};

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

let cachedStore = null;
let pgPool = null;
let persistQueue = Promise.resolve();
let activeTtsJobs = 0;
let ttsJobSequence = 0;
const ttsJobQueue = [];
const runtimeLogEntries = [];
const OBS_PEPE_STATUS_STALE_MS = 3000;
const COHOST_OVERLAY_STATUS_STALE_MS = 15000;
let obsPepeStatus = {
  speaking: false,
  title: "",
  source: "",
  text: "",
  updatedAt: ""
};
const cohostOverlayClients = new Set();

const server = http.createServer(async (req, res) => {
  try {
    const normalizedRequestUrl = String(req.url || "/").replace(/^\/{2,}/, "/");
    const requestUrl = new URL(normalizedRequestUrl, `http://${req.headers.host}`);

    if (req.method === "POST" && requestUrl.pathname === "/api/billing/webhook") {
      const rawBody = await readRawBody(req);
      return await handleStripeWebhook(req, res, rawBody);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        desktopMode: DESKTOP_MODE,
        hasApiKey: Boolean(getElevenLabsApiKey()),
        hasCartesiaApiKey: Boolean(getCartesiaApiKey()),
        authReady: DESKTOP_MODE || SESSION_SECRET !== "replace-this-session-secret",
        billingReady: Boolean(stripe && STRIPE_WEBHOOK_SECRET),
        hasStripeKey: Boolean(stripe),
        storageMode: STORAGE_MODE,
        databaseReady: STORAGE_MODE === "postgres",
        freeTierCharacters: FREE_PLAN.monthlyCharacters
      });
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/config") {
      return sendJson(res, 200, {
        voices: BUILT_IN_VOICES,
        plans: PLANS.map(toPublicPlan),
        billingEnabled: Boolean(!DESKTOP_MODE && stripe),
        freeTierCharacters: FREE_PLAN.monthlyCharacters,
        adminEmail: ADMIN_EMAIL,
        desktopMode: DESKTOP_MODE,
        hasApiKey: Boolean(getElevenLabsApiKey()),
        hasCartesiaApiKey: Boolean(getCartesiaApiKey())
      });
    }

    if (DESKTOP_MODE && req.method === "GET" && requestUrl.pathname === "/api/desktop/settings") {
      return handleDesktopSettings(req, res);
    }

    if (DESKTOP_MODE && req.method === "POST" && requestUrl.pathname === "/api/desktop/settings") {
      const body = await readJsonBody(req);
      return handleUpdateDesktopSettings(req, res, body);
    }

    if (DESKTOP_MODE && req.method === "POST" && requestUrl.pathname === "/api/desktop/reset") {
      return handleResetDesktopApp(req, res);
    }

    if (DESKTOP_MODE && req.method === "GET" && requestUrl.pathname === "/api/kick/chatroom") {
      return await handleKickChatroom(req, res, requestUrl);
    }

    if (DESKTOP_MODE && req.method === "GET" && requestUrl.pathname === "/api/youtube/live-chat") {
      return await handleYoutubeLiveChat(req, res, requestUrl);
    }

    if (DESKTOP_MODE && req.method === "GET" && requestUrl.pathname === "/api/rumble/live-chat") {
      return await handleRumbleLiveChat(req, res, requestUrl);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auth/register") {
      const body = await readJsonBody(req);
      return await handleRegister(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auth/login") {
      const body = await readJsonBody(req);
      return await handleLogin(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auth/logout") {
      return handleLogout(req, res);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/auth/me") {
      return handleMe(req, res);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/account/profile") {
      const body = await readJsonBody(req);
      return await handleUpdateProfile(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/account/moderation") {
      const body = await readJsonBody(req);
      return await handleUpdateModeration(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/account/live-settings") {
      const body = await readJsonBody(req);
      return await handleUpdateLiveSettings(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/account/voice-map") {
      const body = await readJsonBody(req);
      return await handleUpdateVoiceMap(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/account/voice-volumes") {
      const body = await readJsonBody(req);
      return await handleUpdateVoiceVolumes(req, res, body);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/account/usage") {
      return handleUsage(req, res);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/account/recent-spoken") {
      return handleRecentSpoken(req, res);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/runtime/status") {
      return handleRuntimeStatus(req, res);
    }

    if (DESKTOP_MODE && req.method === "GET" && requestUrl.pathname === "/api/obs-pepe/status") {
      return handleObsPepeStatus(req, res);
    }

    if (DESKTOP_MODE && req.method === "POST" && requestUrl.pathname === "/api/obs-pepe/status") {
      const body = await readJsonBody(req);
      return handleUpdateObsPepeStatus(req, res, body);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/browser-source/config") {
      return handleBrowserSourceConfig(req, res, requestUrl);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/browser-source/ping") {
      const body = await readJsonBody(req);
      return handleBrowserSourcePing(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/browser-source/test") {
      const body = await readJsonBody(req);
      return handleBrowserSourceTest(req, res, body);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/admin/users") {
      return handleAdminUsers(req, res);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/admin/grant") {
      const body = await readJsonBody(req);
      return await handleAdminGrant(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/admin/ban") {
      const body = await readJsonBody(req);
      return handleAdminBan(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/admin/reset-browser-source") {
      const body = await readJsonBody(req);
      return handleAdminResetBrowserSource(req, res, body);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/admin/usage") {
      return handleAdminUserUsage(req, res, requestUrl);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/billing/packages") {
      return sendJson(res, 200, {
        billingEnabled: Boolean(stripe),
        freeTierCharacters: FREE_PLAN.monthlyCharacters,
        packages: PLANS.filter((plan) => plan.id !== "free").map(toPublicPlan)
      });
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/billing/checkout") {
      if (DESKTOP_MODE) {
        throw createUserError(404, "Billing is not used in the desktop app.");
      }
      const body = await readJsonBody(req);
      return await handleCreateCheckout(req, res, body);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/billing/portal") {
      if (DESKTOP_MODE) {
        throw createUserError(404, "Billing is not used in the desktop app.");
      }
      return await handleCreateBillingPortal(req, res);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/voices") {
      return sendJson(res, 200, { voices: BUILT_IN_VOICES });
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/tts") {
      const body = await readJsonBody(req);
      const user = requireUserFromRequestOrBrowserSource(req, body);
      return enqueueTtsRequest(req, res, body, user);
    }

    if (req.method === "GET" && (requestUrl.pathname === "/admin.html" || requestUrl.pathname === "/admin.js")) {
      requireAdmin(req);
      return serveStaticFile(req, requestUrl.pathname, res);
    }

    if (req.method === "GET") {
      return serveStaticFile(req, requestUrl.pathname, res);
    }

    sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logDesktopServerError(error, req);
    if (!res.headersSent && !res.writableEnded && !res.destroyed) {
      sendJson(res, statusCode, {
        error: error.expose ? error.message : "Unexpected server error."
      });
    } else if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  }
});

startServer().catch((error) => {
  console.error("Unable to start TTS to Twitch:", error);
  process.exit(1);
});

async function startServer() {
  await ensureDataStore();
  if (DESKTOP_MODE) {
    const store = readStore();
    ensureDesktopUser(store);
    writeStore(store);
    loadDesktopSettingsIntoEnv();
  }
  startMemoryLogging();
  server.listen(PORT, HOST, () => {
    console.log(`TTS to Twitch running at ${APP_URL}`);
    console.log(`Storage mode: ${STORAGE_MODE}`);
  });
}

function handleDesktopSettings(req, res) {
  requireUser(req);
  sendJson(res, 200, { settings: getPublicDesktopSettings() });
}

function handleUpdateDesktopSettings(req, res, body) {
  const store = readStore();
  const user = ensureDesktopUser(store);
  const desktopSettings = readDesktopSettings();
  const channelName = normalizeChannel(body?.channelName || user.channelName || desktopSettings.channelName);
  const apiKey = getSubmittedSecret(body?.apiKey);

  user.email = "desktop@local.app";
  user.channelName = channelName;
  desktopSettings.channelName = channelName;
  desktopSettings.elevenLabsApiKey = apiKey || desktopSettings.elevenLabsApiKey || "";
  desktopSettings.cartesiaApiKey = getSubmittedSecret(body?.cartesiaApiKey) || desktopSettings.cartesiaApiKey || "";
  desktopSettings.cartesiaVoiceId = normalizeCartesiaVoiceId(body?.cartesiaVoiceId || desktopSettings.cartesiaVoiceId);
  desktopSettings.customVoices = sanitizeCustomVoices(body?.customVoices ?? desktopSettings.customVoices);
  desktopSettings.kickChannel = normalizeChannel(body?.kickChannel || desktopSettings.kickChannel);
  desktopSettings.youtubeApiKey = getSubmittedSecret(body?.youtubeApiKey) || desktopSettings.youtubeApiKey || "";
  desktopSettings.youtubeLiveChatId = String(body?.youtubeLiveChatId || desktopSettings.youtubeLiveChatId || "").trim();
  desktopSettings.rumbleApiUrl = getSubmittedSecret(body?.rumbleApiUrl) || desktopSettings.rumbleApiUrl || "";
  desktopSettings.streamerbotEndpoint = normalizeStreamerbotEndpoint(body?.streamerbotEndpoint || desktopSettings.streamerbotEndpoint);
  desktopSettings.minimizeToTrayOnExit = Boolean(body?.minimizeToTrayOnExit);
  desktopSettings.muteHotkey = normalizeHotkey(body?.muteHotkey ?? desktopSettings.muteHotkey);
  if (body?.liveSettings && typeof body.liveSettings === "object") {
    user.liveSettings = sanitizeLiveSettings(body.liveSettings, { customVoices: desktopSettings.customVoices });
    desktopSettings.liveSettings = user.liveSettings;
  }
  writeDesktopSettings(desktopSettings);
  if (desktopSettings.elevenLabsApiKey) {
    process.env.ELEVENLABS_API_KEY = desktopSettings.elevenLabsApiKey;
  }
  if (desktopSettings.cartesiaApiKey) {
    process.env.CARTESIA_API_KEY = desktopSettings.cartesiaApiKey;
  }
  writeStore(store);

  sendJson(res, 200, {
    settings: getPublicDesktopSettings(),
    user: toPublicUser(user)
  });
}

function handleResetDesktopApp(req, res) {
  requireUser(req);
  for (const filePath of new Set([DESKTOP_CONFIG_FILE, DESKTOP_SETTINGS_FILE])) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.CARTESIA_API_KEY;

  const store = createEmptyStore();
  const user = ensureDesktopUser(store);
  return createSessionAndRespond(res, store, user);
}

async function handleKickChatroom(req, res, requestUrl) {
  requireUser(req);
  const channel = normalizeChannel(requestUrl.searchParams.get("channel"));
  if (!channel) {
    throw createUserError(400, "Enter a Kick channel.");
  }

  const endpoints = [
    `https://kick.com/api/v2/channels/${encodeURIComponent(channel)}/chatroom`,
    `https://kick.com/api/v1/channels/${encodeURIComponent(channel)}`
  ];
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 TTSToTwitchDesktop"
      }
    });
    if (!response.ok) {
      continue;
    }
    const data = await response.json();
    const chatroom = data.chatroom || data;
    const chatroomId = chatroom?.id || data.chatroom_id;
    if (chatroomId) {
      sendJson(res, 200, { chatroomId: String(chatroomId), channel });
      return;
    }
  }

  throw createUserError(404, "Unable to find that Kick channel chatroom.");
}

async function handleYoutubeLiveChat(req, res, requestUrl) {
  requireUser(req);
  const desktopSettings = readDesktopSettings();
  const apiKey = String(requestUrl.searchParams.get("apiKey") || desktopSettings.youtubeApiKey || "").trim();
  const liveChatId = String(requestUrl.searchParams.get("liveChatId") || desktopSettings.youtubeLiveChatId || "").trim();
  const pageToken = String(requestUrl.searchParams.get("pageToken") || "").trim();
  if (!apiKey || !liveChatId) {
    throw createUserError(400, "Enter a YouTube API key and live chat ID.");
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("liveChatId", liveChatId);
  url.searchParams.set("part", "snippet,authorDetails");
  url.searchParams.set("maxResults", "200");
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createUserError(response.status, data.error?.message || "Unable to read YouTube live chat.");
  }

  sendJson(res, 200, data);
}

async function handleRumbleLiveChat(req, res, requestUrl) {
  requireUser(req);
  const desktopSettings = readDesktopSettings();
  const apiUrl = String(requestUrl.searchParams.get("url") || desktopSettings.rumbleApiUrl || "").trim();
  if (!apiUrl || !/^https:\/\/.+/i.test(apiUrl)) {
    throw createUserError(400, "Enter a valid Rumble Live Stream API URL.");
  }

  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TTSToTwitchDesktop"
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createUserError(response.status, "Unable to read Rumble live chat.");
  }

  sendJson(res, 200, data);
}

async function handleRegister(req, res, body) {
  if (DESKTOP_MODE) {
    const store = readStore();
    const user = ensureDesktopUser(store);
    writeStore(store);
    return createSessionAndRespond(res, store, user);
  }

  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  const channelName = normalizeChannel(body?.channelName || "");

  if (!email) {
    throw createUserError(400, "Enter a valid email address.");
  }

  if (password.length < 8) {
    throw createUserError(400, "Password must be at least 8 characters.");
  }

  if (!channelName) {
    throw createUserError(400, "Enter your Default Twitch channel.");
  }

  const store = readStore();
  if (store.users.some((user) => user.email === email)) {
    throw createUserError(409, "An account with that email already exists.");
  }
  if (store.users.some((user) => normalizeChannel(user.channelName) === channelName)) {
    throw createUserError(409, "Look's like you already have an account!");
  }

  const passwordRecord = hashPassword(password);
  const user = {
    id: createId("user"),
    email,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
    planId: FREE_PLAN.id,
    monthlyQuota: FREE_PLAN.monthlyCharacters,
    monthlyUsed: 0,
    bonusCharacters: 0,
    usagePeriodStart: new Date().toISOString(),
    channelName,
    browserSourceKey: crypto.randomBytes(24).toString("hex"),
    liveSettings: createDefaultLiveSettings(),
    moderation: createDefaultModerationSettings(),
    voiceMap: createDefaultVoiceMap(),
    voiceVolumes: createDefaultVoiceVolumes(),
    stripeCustomerId: "",
    createdAt: new Date().toISOString()
  };

  store.users.push(user);
  store.usage.push({
      id: createId("usage"),
      userId: user.id,
      type: "plan_started",
      characters: 0,
      balanceAfter: user.monthlyQuota,
      note: "Free tier activated",
      createdAt: new Date().toISOString()
    });
  writeStore(store);

  createSessionAndRespond(res, store, user);
}

async function handleLogin(req, res, body) {
  if (DESKTOP_MODE) {
    const store = readStore();
    const user = ensureDesktopUser(store);
    writeStore(store);
    return createSessionAndRespond(res, store, user);
  }

  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  const store = readStore();
  const user = store.users.find((entry) => entry.email === email);

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    throw createUserError(401, "Incorrect email or password.");
  }
  if (user.bannedAt) {
    throw createUserError(403, "This account has been banned. Contact support if you believe this is a mistake.");
  }

  createSessionAndRespond(res, store, user);
}

function handleLogout(req, res) {
  const sessionId = getSessionIdFromRequest(req);
  if (sessionId) {
    const store = readStore();
    store.sessions = store.sessions.filter((entry) => entry.id !== sessionId);
    writeStore(store);
  }

  res.setHeader("Set-Cookie", buildExpiredCookie());
  sendJson(res, 200, { ok: true });
}

function handleMe(req, res) {
  const user = requireUser(req);
  sendJson(res, 200, {
    user: toPublicUser(user),
    billingEnabled: Boolean(!DESKTOP_MODE && stripe),
    plans: PLANS.map(toPublicPlan),
    freeTierCharacters: FREE_PLAN.monthlyCharacters,
    desktopMode: DESKTOP_MODE,
    desktopSettings: DESKTOP_MODE ? getPublicDesktopSettings() : null
  });
}

function handleUpdateProfile(req, res, body) {
  const user = requireUser(req);
  sendJson(res, 200, { user: toPublicUser(user) });
}

function handleUpdateModeration(req, res, body) {
  const sessionUser = requireUser(req);
  const store = readStore();
  const user = store.users.find((entry) => entry.id === sessionUser.id);

  if (!user) {
    throw createUserError(404, "User not found.");
  }

  user.moderation = sanitizeModerationSettings(body);
  writeStore(store);

  sendJson(res, 200, {
    ok: true,
    user: toPublicUser(user)
  });
}

function handleUpdateLiveSettings(req, res, body) {
  const sessionUser = requireUser(req);
  const store = readStore();
  const user = store.users.find((entry) => entry.id === sessionUser.id);

  if (!user) {
    throw createUserError(404, "User not found.");
  }

  user.liveSettings = sanitizeLiveSettings(body);
  if (DESKTOP_MODE) {
    const desktopSettings = readDesktopSettings();
    desktopSettings.liveSettings = user.liveSettings;
    writeDesktopSettings(desktopSettings);
  }
  writeStore(store);

  sendJson(res, 200, {
    ok: true,
    user: toPublicUser(user),
    browserSourceUrl: `${APP_URL}/browser-source.html`
  });
}

function handleUpdateVoiceMap(req, res, body) {
  const sessionUser = requireUserFromRequestOrBrowserSource(req, body);
  const store = readStore();
  const user = store.users.find((entry) => entry.id === sessionUser.id);

  if (!user) {
    throw createUserError(404, "User not found.");
  }

  user.voiceMap = sanitizeVoiceMap(body?.voiceMap);
  if (DESKTOP_MODE) {
    const desktopSettings = readDesktopSettings();
    desktopSettings.voiceMap = user.voiceMap;
    writeDesktopSettings(desktopSettings);
  }
  writeStore(store);

  sendJson(res, 200, {
    ok: true,
    user: toPublicUser(user)
  });
}

function handleUpdateVoiceVolumes(req, res, body) {
  const sessionUser = requireUser(req);
  const store = readStore();
  const user = store.users.find((entry) => entry.id === sessionUser.id);

  if (!user) {
    throw createUserError(404, "User not found.");
  }

  user.voiceVolumes = sanitizeVoiceVolumes(body?.voiceVolumes);
  writeStore(store);

  sendJson(res, 200, {
    ok: true,
    user: toPublicUser(user)
  });
}

function handleUsage(req, res) {
  const user = requireUser(req);
  const store = readStore();
  const items = store.usage
    .filter((entry) => entry.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);

  sendJson(res, 200, { items });
}

function handleRecentSpoken(req, res) {
  const user = requireUser(req);
  const store = readStore();
  const items = store.usage
    .filter((entry) => entry.userId === user.id && entry.type === "character_usage")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 25)
    .map(toRecentSpokenItem);

  sendJson(res, 200, { items });
}

function handleRuntimeStatus(req, res) {
  requireUser(req);
  sendJson(res, 200, {
    runtime: getRuntimeStatus()
  });
}

function handleObsPepeStatus(req, res) {
  sendJson(res, 200, getPublicObsPepeStatus());
}

function handleUpdateObsPepeStatus(req, res, body) {
  obsPepeStatus = {
    speaking: Boolean(body?.speaking),
    title: sanitizeTtsLabel(body?.title, "", 80),
    source: sanitizeTtsLabel(body?.source, "", 40),
    text: String(body?.text || "").slice(0, 160),
    updatedAt: new Date().toISOString()
  };
  sendJson(res, 200, getPublicObsPepeStatus());
}

function getPublicObsPepeStatus() {
  const updatedAtMs = Date.parse(obsPepeStatus.updatedAt || "");
  const stale = !Number.isFinite(updatedAtMs) || Date.now() - updatedAtMs > OBS_PEPE_STATUS_STALE_MS;
  return {
    speaking: Boolean(obsPepeStatus.speaking && !stale),
    title: obsPepeStatus.title,
    source: obsPepeStatus.source,
    text: obsPepeStatus.text,
    updatedAt: obsPepeStatus.updatedAt
  };
}

function handleCohostConfig(req, res) {
  const user = requireUser(req);
  const store = readStore();
  const account = store.users.find((entry) => entry.id === user.id) || user;
  migrateUserRecord(account);
  writeStore(store);
  sendJson(res, 200, {
    presets: cohostEngine.getPersonalityPresets(account.customCohostPersonalities),
    builtInPresetIds: cohostEngine.PERSONALITY_PRESETS.map((preset) => preset.id),
    customPersonalities: cohostEngine.sanitizeCustomPersonalities(account.customCohostPersonalities),
    eventTypes: cohostEngine.SUPPORTED_EVENT_TYPES,
    settings: cohostEngine.sanitizeCohostSettings(account.cohostSettings, account.customCohostPersonalities),
    state: cohostEngine.normalizeCohostState(account.cohostState),
    overlayUrl: getCohostOverlayUrl(account),
    hasOpenAiKey: Boolean(getOpenAiApiKey()),
    defaultOllamaBaseUrl: cohostEngine.DEFAULT_COHOST_SETTINGS.ollamaBaseUrl,
    defaultOllamaModel: cohostEngine.DEFAULT_COHOST_SETTINGS.ollamaModel
  });
}

function handleUpdateCohostSettings(req, res, body) {
  const sessionUser = requireUser(req);
  const store = readStore();
  const user = store.users.find((entry) => entry.id === sessionUser.id);
  if (!user) {
    throw createUserError(404, "User not found.");
  }
  const nextCustomPersonalities = body?.customPersonalities !== undefined
    ? cohostEngine.sanitizeCustomPersonalities(body.customPersonalities)
    : cohostEngine.sanitizeCustomPersonalities(user.customCohostPersonalities);
  user.customCohostPersonalities = nextCustomPersonalities;
  user.cohostSettings = cohostEngine.sanitizeCohostSettings(body?.settings || body, nextCustomPersonalities);
  if (!user.cohostOverlayToken) {
    user.cohostOverlayToken = crypto.randomBytes(24).toString("hex");
  }
  if (DESKTOP_MODE) {
    const desktopSettings = readDesktopSettings();
    desktopSettings.cohostSettings = user.cohostSettings;
    desktopSettings.customCohostPersonalities = user.customCohostPersonalities;
    writeDesktopSettings(desktopSettings);
  }
  writeStore(store);
  sendJson(res, 200, {
    ok: true,
    settings: user.cohostSettings,
    customPersonalities: user.customCohostPersonalities,
    user: toPublicUser(user),
    overlayUrl: getCohostOverlayUrl(user)
  });
}

async function handleCohostMessage(req, res, body) {
  const sessionUser = requireUser(req);
  const result = await evaluateAndPersistCohost(sessionUser.id, body || {});
  sendJson(res, 200, result);
}

async function handleCohostManualTrigger(req, res, body) {
  const sessionUser = requireUser(req);
  const result = await evaluateAndPersistCohost(sessionUser.id, {
    message: body?.message || "Manual co-host trigger",
    platform: body?.platform || "Manual",
    username: body?.username || "Streamer",
    eventType: body?.eventType || "MANUAL_TRIGGER",
    force: true
  }, true);
  sendJson(res, 200, result);
}

async function evaluateAndPersistCohost(userId, body, manual = false) {
  const store = readStore();
  const user = store.users.find((entry) => entry.id === userId);
  if (!user) {
    throw createUserError(404, "User not found.");
  }
  migrateUserRecord(user);
  const liveSettings = sanitizeLiveSettings(user.liveSettings);
  const defaultVoiceId = liveSettings.fixedVoiceId || liveSettings.fallbackVoiceId || BUILT_IN_VOICES[0]?.voiceId || "";
  const input = {
    message: body?.message || "",
    platform: body?.platform || body?.source || "Live",
    username: body?.username || body?.user || "Chat",
    viewerId: body?.viewerId || body?.username || body?.user || "",
    streamerId: body?.streamerId || user.channelName || user.id,
    eventType: body?.eventType || "",
    force: Boolean(body?.force),
    assignedVoice: body?.assignedVoice || defaultVoiceId
  };
  const context = {
    settings: user.cohostSettings,
    customPersonalities: user.customCohostPersonalities,
    state: user.cohostState,
    memories: user.viewerMemories,
    moderation: user.moderation,
    defaultVoiceId,
    queueStatus: {
      serverQueue: ttsJobQueue.length,
      activeTtsJobs
    },
    provider: {
      openAiApiKey: getOpenAiApiKey()
    }
  };
  const result = manual
    ? await cohostEngine.generateManualCohostResponse(input, context)
    : await cohostEngine.evaluateCohostMessage(input, context);
  user.cohostState = result.state;
  user.viewerMemories = result.memories;
  writeStore(store);
  if (result.shouldRespond) {
    broadcastCohostOverlay(user, result.state.overlay);
  }
  return {
    shouldRespond: result.shouldRespond,
    responseText: result.responseText,
    voiceId: result.voiceId || defaultVoiceId,
    priority: result.priority,
    eventType: result.eventType,
    metadata: result.metadata,
    state: getPublicCohostState(user)
  };
}

function handleCohostOverlayStatus(req, res, requestUrl) {
  const user = getCohostOverlayUser(requestUrl);
  sendJson(res, 200, getPublicCohostOverlay(user));
}

function handleCohostOverlayEvents(req, res, requestUrl) {
  const user = getCohostOverlayUser(requestUrl);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive"
  });
  const client = { res, userId: user.id };
  cohostOverlayClients.add(client);
  sendSse(res, "cohost", getPublicCohostOverlay(user));
  req.on("close", () => {
    cohostOverlayClients.delete(client);
  });
}

function getCohostOverlayUser(requestUrl) {
  const token = String(requestUrl.searchParams.get("token") || "").trim();
  if (!token) {
    throw createUserError(401, "Missing co-host overlay token.");
  }
  const store = readStore();
  const user = store.users.find((entry) => entry.cohostOverlayToken === token);
  if (!user) {
    throw createUserError(404, "Co-host overlay not found.");
  }
  return user;
}

function getPublicCohostOverlay(user) {
  const state = cohostEngine.normalizeCohostState(user.cohostState);
  const updatedAtMs = Date.parse(state.overlay.updatedAt || "");
  const stale = !Number.isFinite(updatedAtMs) || Date.now() - updatedAtMs > COHOST_OVERLAY_STATUS_STALE_MS;
  return {
    ...state.overlay,
    speaking: Boolean(state.overlay.speaking && !stale),
    platformBattle: cohostEngine.getPlatformBattleSummary(state.platformBattle),
    queueStatus: {
      serverQueue: ttsJobQueue.length,
      activeTtsJobs
    }
  };
}

function getPublicCohostState(user) {
  const state = cohostEngine.normalizeCohostState(user.cohostState);
  return {
    messageCount: state.messageCount,
    responseCount: state.responseCount,
    aiCallCount: state.aiCallCount,
    estimatedCost: Number(state.estimatedCost.toFixed(4)),
    platformBattle: cohostEngine.getPlatformBattleSummary(state.platformBattle),
    overlay: getPublicCohostOverlay(user),
    debugLogs: state.debugLogs.slice(0, 30)
  };
}

function broadcastCohostOverlay(user, overlay) {
  const payload = {
    ...cohostEngine.normalizeOverlayState(overlay),
    platformBattle: cohostEngine.getPlatformBattleSummary(user.cohostState?.platformBattle)
  };
  for (const client of cohostOverlayClients) {
    if (client.userId === user.id) {
      sendSse(client.res, "cohost", payload);
    }
  }
}

function sendSse(res, eventName, payload) {
  if (!res || res.destroyed || res.writableEnded) {
    return;
  }
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function logDesktopServerError(error, req) {
  if (!DESKTOP_STDERR_LOG) {
    return;
  }
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    method: req?.method || "",
    url: req?.url || "",
    message: error?.message || String(error),
    stack: error?.stack || ""
  });
  fs.appendFile(DESKTOP_STDERR_LOG, `${line}\n`, () => {});
}
function getCohostOverlayUrl(user) {
  const token = user.cohostOverlayToken || "";
  return `${APP_URL}/ai-cohost-overlay.html?token=${encodeURIComponent(token)}`;
}

function handleBrowserSourceConfig(req, res, requestUrl) {
  const browserSourceKey = String(requestUrl.searchParams.get("key") || "").trim();
  const store = readStore();
  const sessionUser = browserSourceKey ? null : requireUser(req);
  const user = browserSourceKey
    ? store.users.find((entry) => entry.browserSourceKey === browserSourceKey)
    : store.users.find((entry) => entry.id === sessionUser.id);
  if (!user) {
    throw createUserError(404, "Browser source not found.");
  }

  migrateUserRecord(user);
  resetMonthlyUsageIfNeeded(user);
  const testMessage = user.browserSourceTestMessage || null;
  user.browserSourceTestMessage = null;
  writeStore(store);

  sendJson(res, 200, {
    user: toPublicUser(user),
    browserSourceUrl: `${APP_URL}/browser-source.html`,
    testMessage
  });
}

function handleBrowserSourcePing(req, res, body) {
  const browserSourceKey = String(body?.browserSourceKey || "").trim();
  const store = readStore();
  const sessionUser = browserSourceKey ? null : requireUser(req);
  const user = browserSourceKey
    ? store.users.find((entry) => entry.browserSourceKey === browserSourceKey)
    : store.users.find((entry) => entry.id === sessionUser.id);
  if (!user) {
    throw createUserError(404, "Browser source not found.");
  }

  user.browserSourceLastSeenAt = new Date().toISOString();
  writeStore(store);
  sendJson(res, 200, { ok: true });
}

function handleBrowserSourceTest(req, res, body) {
  const sessionUser = requireUser(req);
  const store = readStore();
  const user = store.users.find((entry) => entry.id === sessionUser.id);
  if (!user) {
    throw createUserError(404, "User not found.");
  }

  migrateUserRecord(user);
  if (!user.liveSettings?.browserSourceEnabled) {
    throw createUserError(409, "Enable Browser Source TTS before sending an OBS test.");
  }

  const text = String(body?.text || "OBS test message from TTS to Twitch.").trim().slice(0, 100);
  user.browserSourceTestMessage = {
    id: createId("obs_test"),
    user: "OBS Test",
    message: text || "OBS test message from TTS to Twitch.",
    source: "OBS Test",
    isTest: true,
    createdAt: new Date().toISOString()
  };
  writeStore(store);
  sendJson(res, 200, { ok: true });
}

function handleAdminUsers(req, res) {
  requireAdmin(req);
  const store = readStore();
  const users = store.users
    .map((user) => {
      migrateUserRecord(user);
      resetMonthlyUsageIfNeeded(user);
      const plan = getPlanById(user.planId);
      const monthlyRemaining = Math.max(0, user.monthlyQuota - user.monthlyUsed);
      return {
        id: user.id,
        email: user.email,
        channelName: user.channelName,
        planId: user.planId,
        planName: plan.name,
        monthlyQuota: user.monthlyQuota,
        monthlyUsed: user.monthlyUsed,
        monthlyRemaining,
        bonusCharacters: user.bonusCharacters,
        totalRemainingCharacters: monthlyRemaining + user.bonusCharacters,
        isBanned: Boolean(user.bannedAt),
        bannedAt: user.bannedAt || "",
        bannedReason: user.bannedReason || "",
        browserSourceUrl: `${APP_URL}/browser-source.html`,
        browserSourceActive: isBrowserSourceActive(user),
        createdAt: user.createdAt
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));

  writeStore(store);
  sendJson(res, 200, { users });
}

function handleAdminGrant(req, res, body) {
  requireAdmin(req);

  const targetEmail = normalizeEmail(body?.email);
  const characters = Math.floor(Number(body?.characters || 0));

  if (!targetEmail) {
    throw createUserError(400, "Enter a valid user email.");
  }

  if (!Number.isFinite(characters) || characters <= 0) {
    throw createUserError(400, "Grant characters must be a positive number.");
  }

  const store = readStore();
  const user = store.users.find((entry) => entry.email === targetEmail);
  if (!user) {
    throw createUserError(404, "User not found.");
  }

  migrateUserRecord(user);
  resetMonthlyUsageIfNeeded(user);
  user.bonusCharacters += characters;

  const monthlyRemaining = Math.max(0, user.monthlyQuota - user.monthlyUsed);
  const totalRemaining = monthlyRemaining + user.bonusCharacters;

  store.usage.push({
    id: createId("usage"),
    userId: user.id,
    type: "admin_grant",
    characters,
    balanceAfter: totalRemaining,
    note: `Admin grant: ${characters} bonus characters`,
    createdAt: new Date().toISOString()
  });
  writeStore(store);

  sendJson(res, 200, {
    ok: true,
    user: {
      email: user.email,
      bonusCharacters: user.bonusCharacters,
      totalRemainingCharacters: totalRemaining
    }
  });
}

function handleAdminBan(req, res, body) {
  requireAdmin(req);

  const targetEmail = normalizeEmail(body?.email);
  const shouldBan = Boolean(body?.banned);
  const reason = String(body?.reason || "").trim().slice(0, 240);

  if (!targetEmail) {
    throw createUserError(400, "Enter a valid user email.");
  }
  if (targetEmail === ADMIN_EMAIL) {
    throw createUserError(400, "The admin account cannot be banned.");
  }

  const store = readStore();
  const user = store.users.find((entry) => entry.email === targetEmail);
  if (!user) {
    throw createUserError(404, "User not found.");
  }

  migrateUserRecord(user);
  if (shouldBan) {
    user.bannedAt = new Date().toISOString();
    user.bannedReason = reason || "Banned by admin";
    store.sessions = store.sessions.filter((entry) => entry.userId !== user.id);
  } else {
    user.bannedAt = "";
    user.bannedReason = "";
  }
  writeStore(store);

  sendJson(res, 200, {
    ok: true,
    user: {
      email: user.email,
      isBanned: Boolean(user.bannedAt),
      bannedReason: user.bannedReason
    }
  });
}

function handleAdminResetBrowserSource(req, res, body) {
  requireAdmin(req);
  const targetEmail = normalizeEmail(body?.email);
  if (!targetEmail) {
    throw createUserError(400, "Enter a valid user email.");
  }

  const store = readStore();
  const user = store.users.find((entry) => entry.email === targetEmail);
  if (!user) {
    throw createUserError(404, "User not found.");
  }

  user.browserSourceKey = crypto.randomBytes(24).toString("hex");
  user.browserSourceLastSeenAt = "";
  user.browserSourceTestMessage = null;
  writeStore(store);

  sendJson(res, 200, {
    ok: true,
    user: {
      email: user.email,
      browserSourceUrl: `${APP_URL}/browser-source.html`
    }
  });
}

function handleAdminUserUsage(req, res, requestUrl) {
  requireAdmin(req);
  const targetEmail = normalizeEmail(requestUrl.searchParams.get("email"));
  if (!targetEmail) {
    throw createUserError(400, "Enter a valid user email.");
  }

  const store = readStore();
  const user = store.users.find((entry) => entry.email === targetEmail);
  if (!user) {
    throw createUserError(404, "User not found.");
  }

  const items = store.usage
    .filter((entry) => entry.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);

  sendJson(res, 200, { items });
}

async function handleCreateCheckout(req, res, body) {
  if (!stripe) {
    throw createUserError(503, "Stripe is not configured yet.");
  }

  const user = requireUser(req);
  const planId = String(body?.planId || "");
  const plan = PLANS.find((entry) => entry.id === planId && entry.id !== "free");

  if (!plan) {
    throw createUserError(400, "Choose a valid paid plan.");
  }

  const store = readStore();
  const target = store.users.find((entry) => entry.id === user.id);
  if (!target) {
    throw createUserError(404, "User not found.");
  }
  if (target.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(target.subscriptionStatus)) {
    throw createUserError(409, "You already have an active subscription. Use Manage billing to make changes.");
  }

  const customerId = await ensureStripeCustomer(target, store);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: target.id,
    success_url: `${APP_URL}?checkout=success`,
    cancel_url: `${APP_URL}?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      userId: target.id,
      planId: plan.id
    },
    subscription_data: {
      metadata: {
        userId: target.id,
        planId: plan.id
      }
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          recurring: {
            interval: "month"
          },
          product_data: {
            name: `${plan.name} Plan`,
            description: `${plan.monthlyCharacters.toLocaleString()} characters per month`
          },
          unit_amount: plan.monthlyPriceCents
        }
      }
    ]
  });

  store.purchases.push({
    id: createId("purchase"),
    stripeSessionId: session.id,
    stripeSubscriptionId: "",
    userId: target.id,
    planId: plan.id,
    monthlyCharacters: plan.monthlyCharacters,
    amountCents: plan.monthlyPriceCents,
    status: "pending",
    type: "subscription_checkout",
    createdAt: new Date().toISOString(),
    completedAt: ""
  });
  writeStore(store);

  sendJson(res, 200, { checkoutUrl: session.url });
}

async function handleCreateBillingPortal(req, res) {
  if (!stripe) {
    throw createUserError(503, "Stripe is not configured yet.");
  }

  const sessionUser = requireUser(req);
  const store = readStore();
  const user = store.users.find((entry) => entry.id === sessionUser.id);
  if (!user) {
    throw createUserError(404, "User not found.");
  }

  const customerId = await ensureStripeCustomer(user, store);
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${APP_URL}/#plans`
  });

  sendJson(res, 200, { portalUrl: portalSession.url });
}

async function handleStripeWebhook(req, res, rawBody) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    throw createUserError(503, "Stripe webhooks are not configured.");
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    throw createUserError(400, "Missing Stripe signature header.");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    throw createUserError(400, "Webhook signature verification failed.");
  }

  if (event.type === "checkout.session.completed") {
    await applyCompletedCheckoutSession(event.data.object);
  } else if (event.type === "invoice.paid") {
    await applyPaidInvoice(event.data.object);
  } else if (event.type === "customer.subscription.updated") {
    applySubscriptionUpdated(event.data.object);
  } else if (event.type === "customer.subscription.deleted") {
    applySubscriptionDeleted(event.data.object);
  }

  sendJson(res, 200, { received: true });
}

async function applyCompletedCheckoutSession(session) {
  const stripeSessionId = session.id;
  const userId = session.metadata?.userId || session.client_reference_id || "";
  const planId = session.metadata?.planId || "";

  if (!stripeSessionId || !userId || !planId) {
    return;
  }

  const store = readStore();
  const purchase = store.purchases.find((entry) => entry.stripeSessionId === stripeSessionId);
  const user = store.users.find((entry) => entry.id === userId);
  const plan = PLANS.find((entry) => entry.id === planId);

  if (!user || !plan) {
    return;
  }

  let subscription = null;
  const subscriptionId = getStripeId(session.subscription);
  if (subscriptionId && stripe) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  }

  if (purchase) {
    purchase.status = "completed";
    purchase.stripeSubscriptionId = subscriptionId;
    purchase.completedAt = new Date().toISOString();
  }

  applyPaidPlanToUser(user, plan, {
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: subscription?.status || "active",
    subscriptionCurrentPeriodStart: stripeTimestampToIso(subscription?.current_period_start) || new Date().toISOString(),
    subscriptionCurrentPeriodEnd: stripeTimestampToIso(subscription?.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    resetUsage: true,
    note: `Subscription started: ${plan.name}`
  });
  addUsageRecord(store, user, "plan_changed", `Subscription started: ${plan.name}`);
  writeStore(store);
}

async function applyPaidInvoice(invoice) {
  const subscriptionId = getStripeId(invoice.subscription);
  let subscription = null;
  if (subscriptionId && stripe) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  }

  const userId = subscription?.metadata?.userId || invoice.subscription_details?.metadata?.userId || "";
  const planId = subscription?.metadata?.planId || invoice.subscription_details?.metadata?.planId || "";
  const store = readStore();
  const user = findBillingUser(store, { userId, subscriptionId, customerId: getStripeId(invoice.customer) });
  const plan = PLANS.find((entry) => entry.id === planId) || getPlanById(user?.subscriptionPlanId || user?.planId);

  if (!user || !plan || plan.id === "free") {
    return;
  }

  const alreadyProcessed = store.usage.some(
    (entry) => entry.type === "subscription_renewed" && entry.note === `Stripe invoice paid: ${invoice.id}`
  );
  if (alreadyProcessed) {
    return;
  }

  applyPaidPlanToUser(user, plan, {
    stripeSubscriptionId: subscriptionId || user.stripeSubscriptionId,
    subscriptionStatus: subscription?.status || "active",
    subscriptionCurrentPeriodStart: stripeTimestampToIso(subscription?.current_period_start) || new Date().toISOString(),
    subscriptionCurrentPeriodEnd: stripeTimestampToIso(subscription?.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    resetUsage: true,
    note: `Stripe invoice paid: ${invoice.id}`
  });
  addUsageRecord(store, user, "subscription_renewed", `Stripe invoice paid: ${invoice.id}`);
  writeStore(store);
}

function applySubscriptionUpdated(subscription) {
  const store = readStore();
  const user = findBillingUser(store, {
    userId: subscription.metadata?.userId || "",
    subscriptionId: subscription.id,
    customerId: getStripeId(subscription.customer)
  });
  if (!user) {
    return;
  }

  const plan = PLANS.find((entry) => entry.id === subscription.metadata?.planId) || getPlanById(user.planId);
  user.stripeSubscriptionId = subscription.id;
  user.subscriptionStatus = subscription.status || user.subscriptionStatus;
  user.subscriptionPlanId = plan.id;
  user.subscriptionCurrentPeriodStart = stripeTimestampToIso(subscription.current_period_start) || user.subscriptionCurrentPeriodStart;
  user.subscriptionCurrentPeriodEnd = stripeTimestampToIso(subscription.current_period_end) || user.subscriptionCurrentPeriodEnd;
  user.cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

  if (!["active", "trialing", "past_due"].includes(user.subscriptionStatus)) {
    downgradeUserToFree(user);
    addUsageRecord(store, user, "subscription_ended", `Subscription ${user.subscriptionStatus}`);
  }

  writeStore(store);
}

function applySubscriptionDeleted(subscription) {
  const store = readStore();
  const user = findBillingUser(store, {
    userId: subscription.metadata?.userId || "",
    subscriptionId: subscription.id,
    customerId: getStripeId(subscription.customer)
  });
  if (!user) {
    return;
  }

  downgradeUserToFree(user);
  user.subscriptionStatus = "canceled";
  user.stripeSubscriptionId = "";
  user.cancelAtPeriodEnd = false;
  addUsageRecord(store, user, "subscription_ended", "Subscription canceled");
  writeStore(store);
}

function enqueueTtsRequest(req, res, body, user) {
  const moderation = sanitizeModerationSettings(user.moderation);

  if (ttsJobQueue.length >= MAX_TTS_QUEUE_LENGTH) {
    if ((moderation.fastChatSkipBehavior === "drop_oldest" || moderation.fastChatSkipBehavior === "latest_only") && ttsJobQueue.length) {
      const droppedJobs = moderation.fastChatSkipBehavior === "latest_only"
        ? ttsJobQueue.splice(0, ttsJobQueue.length)
        : [ttsJobQueue.shift()];
      for (const droppedJob of droppedJobs) {
        droppedJob.cancelled = true;
        removeQueuedCloseHandler(droppedJob);
        recordRuntimeLog("tts_queue_drop", `Dropped queued TTS job ${droppedJob.id} because the server queue was full.`);
        sendJsonIfOpen(droppedJob.res, 429, {
          error: "TTS is busy, so an older queued message was skipped."
        });
      }
    } else {
      recordRuntimeLog("tts_queue_reject", `Rejected TTS request for ${user.id} because the server queue was full.`);
      sendJson(res, 429, {
        error: "TTS is busy. This message was skipped before it entered the queue."
      });
      return;
    }
  }

  const job = {
    id: ++ttsJobSequence,
    req,
    res,
    body,
    user,
    enqueuedAt: Date.now(),
    started: false,
    cancelled: false,
    handleClientClose: null
  };
  job.handleClientClose = () => {
    if (job.started || job.cancelled || res.writableEnded) {
      return;
    }
    job.cancelled = true;
    const index = ttsJobQueue.indexOf(job);
    if (index !== -1) {
      ttsJobQueue.splice(index, 1);
      recordRuntimeLog("tts_queue_disconnect", `Removed queued TTS job ${job.id} after the client disconnected.`);
    }
  };
  res.on("close", job.handleClientClose);

  ttsJobQueue.push(job);
  drainTtsQueue();
}

function drainTtsQueue() {
  while (activeTtsJobs < MAX_CONCURRENT_TTS_JOBS && ttsJobQueue.length) {
    const job = ttsJobQueue.shift();
    if (!job || job.cancelled || job.res.writableEnded) {
      continue;
    }
    runTtsJob(job);
  }
}

async function runTtsJob(job) {
  job.started = true;
  activeTtsJobs += 1;
  removeQueuedCloseHandler(job);

  try {
    await handleTextToSpeech(job.req, job.res, job.body, job.user);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJsonIfOpen(job.res, statusCode, {
      error: error.expose ? error.message : "Unexpected server error."
    });
  } finally {
    job.body = null;
    job.user = null;
    job.req = null;
    job.res = null;
    activeTtsJobs = Math.max(0, activeTtsJobs - 1);
    setImmediate(drainTtsQueue);
  }
}

function removeQueuedCloseHandler(job) {
  if (job?.handleClientClose && job.res) {
    job.res.off("close", job.handleClientClose);
    job.handleClientClose = null;
  }
}

async function handleTextToSpeech(req, res, body, authorizedUser) {
  const user = authorizedUser || requireUserFromRequestOrBrowserSource(req, body);
  const rawText = String(body?.text || "");
  if (containsHardBlockedTtsTerm(rawText)) {
    throw createUserError(400, "Text was blocked by hard safety filter.");
  }
  const text = sanitizeEnglishSpeechText(body?.text);
  const provider = normalizeTtsProvider(body?.ttsProvider || user.liveSettings?.ttsProvider);
  ensureApiKey(provider);

  const requestedVoiceId = String(body?.voiceId || "").trim();
  const cartesiaSettings = readDesktopSettings();
  const voiceId = provider === "cartesia"
    ? normalizeCartesiaVoiceId(requestedVoiceId || cartesiaSettings.cartesiaVoiceId || DEFAULT_CARTESIA_VOICE_ID)
    : requestedVoiceId;
  const modelId = provider === "cartesia"
    ? normalizeCartesiaModelId(body?.modelId)
    : normalizeElevenLabsModelId(body?.modelId);
  const stability = clampNumber(body?.stability, 0, 1, 0.45);
  const similarityBoost = clampNumber(body?.similarityBoost, 0, 1, 0.75);
  const speed = clampNumber(body?.speed, 0.7, 1.2, 1);
  const characterCost = text.length;
  const voice = getKnownElevenLabsVoices().find((entry) => entry.voiceId === voiceId);
  const spokenSource = sanitizeTtsLabel(body?.source, "Live", 40);
  const speakerName = sanitizeTtsLabel(body?.speakerName || body?.title, "Chat", 60);
  const voiceName = sanitizeTtsLabel(body?.voiceName || voice?.name || voiceId, "Voice", 60);
  const ttsMetadata = sanitizeTtsMetadata(body?.metadata);

  if (!text) {
    throw createUserError(400, "Text is required.");
  }

  if (containsHardBlockedTtsTerm(text)) {
    throw createUserError(400, "Text was blocked by hard safety filter.");
  }

  if (!voiceId) {
    throw createUserError(400, "Voice ID is required.");
  }

  if (provider === "elevenlabs" && !voice) {
    throw createUserError(400, "Choose a valid voice.");
  }

  if (text.length > 500) {
    throw createUserError(400, "Keep each Twitch TTS message to 500 characters or fewer.");
  }

  const store = readStore();
  const account = store.users.find((entry) => entry.id === user.id);
  if (!account) {
    throw createUserError(404, "User not found.");
  }
  if (body?.browserSourceKey && !account.liveSettings?.browserSourceEnabled) {
    throw createUserError(409, "Browser Source TTS is turned off for this account.");
  }

  resetMonthlyUsageIfNeeded(account);
  const remainingBefore = Math.max(0, account.monthlyQuota - account.monthlyUsed);
  const totalRemainingBefore = remainingBefore + account.bonusCharacters;

  if (!DESKTOP_MODE && totalRemainingBefore < characterCost) {
    throw createUserError(
      402,
      `You need ${characterCost} characters available for this message, but only have ${totalRemainingBefore} left.`
    );
  }
  writeStore(store);

  const generatedAudio = provider === "cartesia"
    ? await generateCartesiaSpeech({ text, voiceId, modelId, speed })
    : await generateElevenLabsSpeech({ text, voiceId, modelId, stability, similarityBoost, speed });
  const audioBuffer = generatedAudio.buffer;
  const refreshedStore = readStore();
  const refreshedAccount = refreshedStore.users.find((entry) => entry.id === user.id);

  if (!refreshedAccount) {
    throw createUserError(404, "User not found.");
  }

  resetMonthlyUsageIfNeeded(refreshedAccount);
  const remainingAfterRefresh = Math.max(0, refreshedAccount.monthlyQuota - refreshedAccount.monthlyUsed);
  const totalRemainingAfterRefresh = remainingAfterRefresh + refreshedAccount.bonusCharacters;

  if (totalRemainingAfterRefresh < characterCost) {
    throw createUserError(409, "Your monthly quota changed before this clip could be charged. Try again.");
  }

  let chargeRemaining = characterCost;
  if (remainingAfterRefresh > 0) {
    const monthlyCharge = Math.min(remainingAfterRefresh, chargeRemaining);
    refreshedAccount.monthlyUsed += monthlyCharge;
    chargeRemaining -= monthlyCharge;
  }
  if (chargeRemaining > 0) {
    refreshedAccount.bonusCharacters = Math.max(0, refreshedAccount.bonusCharacters - chargeRemaining);
  }

  const remaining = Math.max(0, refreshedAccount.monthlyQuota - refreshedAccount.monthlyUsed) + refreshedAccount.bonusCharacters;
  refreshedStore.usage.push({
    id: createId("usage"),
    userId: refreshedAccount.id,
    type: "character_usage",
    characters: characterCost,
    balanceAfter: remaining,
    note: `${provider} - ${modelId} - ${voiceId} - ${text.slice(0, 80)}`,
    source: spokenSource,
    speakerName,
    messageText: text.slice(0, 500),
    voiceId,
    voiceName,
    modelId,
    provider,
    metadata: ttsMetadata,
    createdAt: new Date().toISOString()
  });
  writeStore(refreshedStore);

  const base64Audio = audioBuffer.toString("base64");
  sendJson(res, 200, {
    audioBase64: base64Audio,
    mimeType: generatedAudio.mimeType,
    meta: {
      textLength: text.length,
      voiceId,
      modelId,
      provider,
      remainingCharacters: remaining,
      chargedCharacters: characterCost,
      bonusCharacters: refreshedAccount.bonusCharacters,
      recentMessage: {
        source: spokenSource,
        speakerName,
        messageText: text,
        voiceId,
        voiceName,
        modelId,
        provider
      }
    }
  });
}

async function generateElevenLabsSpeech({ text, voiceId, modelId, stability, similarityBoost, speed }) {
  const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": getElevenLabsApiKey()
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      output_format: "mp3_44100_128",
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        speed
      }
    })
  });

  if (!response.ok) {
    const rawText = await response.text();
    const payload = safeJsonParse(rawText);
    throw createApiError(response.status, payload, "Unable to generate speech.");
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: "audio/mpeg"
  };
}

async function generateCartesiaSpeech({ text, voiceId, modelId, speed }) {
  const response = await fetch(`${CARTESIA_BASE_URL}/tts/bytes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/wav",
      Authorization: `Bearer ${getCartesiaApiKey()}`,
      "Cartesia-Version": CARTESIA_VERSION
    },
    body: JSON.stringify({
      model_id: modelId,
      transcript: text,
      voice: {
        mode: "id",
        id: voiceId
      },
      output_format: {
        container: "wav",
        encoding: "pcm_f32le",
        sample_rate: 44100
      },
      language: "en",
      generation_config: {
        speed
      },
      save: false
    })
  });

  if (!response.ok) {
    const rawText = await response.text();
    const payload = safeJsonParse(rawText);
    throw createApiError(response.status, payload, "Unable to generate Cartesia speech.");
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") || "audio/wav"
  };
}

function serveStaticFile(req, requestPath, res) {
  requestPath = `/${String(requestPath || "/").replace(/^\/+/, "")}`;

  if (requestPath === "/admin.html" || requestPath === "/admin.js") {
    requireAdmin(req);
  }

  let safePath = requestPath === "/" ? "/index.html" : requestPath;
  safePath = path.normalize(safePath).replace(/^(\.\.[/\\])+/, "");

  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (requestPath !== "/" && error.code === "ENOENT") {
        sendJson(res, 404, { error: "Not found." });
        return;
      }

      if (requestPath === "/") {
        sendJson(res, 500, { error: "Missing frontend entry file." });
        return;
      }

      sendJson(res, 500, { error: "Unable to load file." });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

function ensureStripeCustomer(user, store) {
  if (user.stripeCustomerId) {
    return Promise.resolve(user.stripeCustomerId);
  }

  return stripe.customers.create({ email: user.email }).then((customer) => {
    user.stripeCustomerId = customer.id;
    writeStore(store);
    return customer.id;
  });
}

function applyPaidPlanToUser(user, plan, options = {}) {
  user.planId = plan.id;
  user.monthlyQuota = plan.monthlyCharacters;
  user.subscriptionPlanId = plan.id;
  user.subscriptionStatus = options.subscriptionStatus || user.subscriptionStatus || "active";
  user.stripeSubscriptionId = options.stripeSubscriptionId || user.stripeSubscriptionId || "";
  user.subscriptionCurrentPeriodStart = options.subscriptionCurrentPeriodStart || user.subscriptionCurrentPeriodStart || new Date().toISOString();
  user.subscriptionCurrentPeriodEnd = options.subscriptionCurrentPeriodEnd || user.subscriptionCurrentPeriodEnd || "";
  user.cancelAtPeriodEnd = Boolean(options.cancelAtPeriodEnd);

  if (options.resetUsage) {
    user.monthlyUsed = 0;
    user.usagePeriodStart = user.subscriptionCurrentPeriodStart || new Date().toISOString();
  }
}

function downgradeUserToFree(user) {
  user.planId = FREE_PLAN.id;
  user.monthlyQuota = FREE_PLAN.monthlyCharacters;
  user.monthlyUsed = 0;
  user.usagePeriodStart = new Date().toISOString();
  user.subscriptionPlanId = "";
  user.subscriptionCurrentPeriodStart = "";
  user.subscriptionCurrentPeriodEnd = "";
}

function addUsageRecord(store, user, type, note) {
  const monthlyRemaining = Math.max(0, user.monthlyQuota - user.monthlyUsed);
  const totalRemaining = monthlyRemaining + user.bonusCharacters;
  store.usage.push({
    id: createId("usage"),
    userId: user.id,
    type,
    characters: 0,
    balanceAfter: totalRemaining,
    note,
    createdAt: new Date().toISOString()
  });
}

function findBillingUser(store, { userId = "", subscriptionId = "", customerId = "" } = {}) {
  return store.users.find((entry) => {
    return (
      (userId && entry.id === userId) ||
      (subscriptionId && entry.stripeSubscriptionId === subscriptionId) ||
      (customerId && entry.stripeCustomerId === customerId)
    );
  });
}

function getStripeId(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return value.id || "";
}

function stripeTimestampToIso(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "";
  }
  return new Date(numericValue * 1000).toISOString();
}

function requireUser(req) {
  if (DESKTOP_MODE) {
    const store = readStore();
    const user = ensureDesktopUser(store);
    migrateUserRecord(user);
    writeStore(store);
    return user;
  }

  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) {
    throw createUserError(401, "Please log in first.");
  }

  const store = readStore();
  const session = store.sessions.find((entry) => entry.id === sessionId);

  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    throw createUserError(401, "Your session expired. Please log in again.");
  }

  const user = store.users.find((entry) => entry.id === session.userId);
  if (!user) {
    throw createUserError(401, "User not found.");
  }
  if (user.bannedAt) {
    throw createUserError(403, "This account has been banned.");
  }

  migrateUserRecord(user);
  resetMonthlyUsageIfNeeded(user);
  session.expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  writeStore(store);
  return user;
}

function requireAdmin(req) {
  const user = requireUser(req);
  if (DESKTOP_MODE) {
    return user;
  }
  if (normalizeEmail(user.email) !== ADMIN_EMAIL) {
    throw createUserError(403, "Forbidden.");
  }
  return user;
}

function requireUserFromRequestOrBrowserSource(req, body) {
  try {
    return requireUser(req);
  } catch (error) {
    if (error.statusCode !== 401) {
      throw error;
    }
  }

  const browserSourceKey = String(body?.browserSourceKey || "").trim();
  if (!browserSourceKey) {
    throw createUserError(401, "Please log in first.");
  }

  const store = readStore();
  const user = store.users.find((entry) => entry.browserSourceKey === browserSourceKey);
  if (!user) {
    throw createUserError(401, "Invalid browser source key.");
  }
  if (user.bannedAt) {
    throw createUserError(403, "This account has been banned.");
  }

  migrateUserRecord(user);
  resetMonthlyUsageIfNeeded(user);
  writeStore(store);
  return user;
}

function createSessionAndRespond(res, store, user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const sessionId = createId("session");
  const signature = signSessionToken(rawToken);

  const now = Date.now();
  store.sessions = store.sessions.filter((entry) => new Date(entry.expiresAt).getTime() > now);
  store.sessions.push({
    id: sessionId,
    userId: user.id,
    tokenHash: hashValue(rawToken),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    createdAt: new Date().toISOString()
  });
  writeStore(store);

  res.setHeader("Set-Cookie", buildSessionCookie(sessionId, rawToken, signature));
  sendJson(res, 200, { user: toPublicUser(user) });
}

function getSessionIdFromRequest(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const rawCookie = cookies[SESSION_COOKIE];

  if (!rawCookie) {
    return "";
  }

  const [sessionId = "", token = "", signature = ""] = rawCookie.split(".");
  if (!sessionId || !token || !signature) {
    return "";
  }

  if (signSessionToken(token) !== signature) {
    return "";
  }

  const store = readStore();
  const session = store.sessions.find((entry) => entry.id === sessionId);
  if (!session) {
    return "";
  }

  if (session.tokenHash !== hashValue(token)) {
    return "";
  }

  return sessionId;
}

function buildSessionCookie(sessionId, token, signature) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${sessionId}.${token}.${signature}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

function buildExpiredCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function parseCookies(value) {
  const cookies = {};
  for (const part of value.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key) {
      continue;
    }
    cookies[key] = rest.join("=");
  }
  return cookies;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signSessionToken(token) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "";
  }
  return email;
}

function normalizeChannel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9_]/g, "");
}

function toPublicUser(user) {
  const plan = getPlanById(user.planId);
  const remainingCharacters = DESKTOP_MODE
    ? 999999999
    : Math.max(0, user.monthlyQuota - user.monthlyUsed) + user.bonusCharacters;
  return {
    id: user.id,
    email: user.email,
    isAdmin: DESKTOP_MODE || normalizeEmail(user.email) === ADMIN_EMAIL,
    isBanned: Boolean(user.bannedAt),
    planId: user.planId,
    planName: DESKTOP_MODE ? "Desktop Local" : plan.name,
    monthlyQuota: DESKTOP_MODE ? 999999999 : user.monthlyQuota,
    monthlyUsed: user.monthlyUsed,
    bonusCharacters: user.bonusCharacters,
    remainingCharacters,
    usagePeriodStart: user.usagePeriodStart,
    channelName: user.channelName,
    browserSourceEnabled: Boolean(user.liveSettings?.browserSourceEnabled),
    browserSourceActive: isBrowserSourceActive(user),
    browserSourceUrl: `${APP_URL}/browser-source.html`,
    cohostOverlayUrl: getCohostOverlayUrl(user),
    stripeSubscriptionId: user.stripeSubscriptionId ? "active" : "",
    subscriptionStatus: user.subscriptionStatus || "",
    subscriptionPlanId: user.subscriptionPlanId || "",
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || "",
    cancelAtPeriodEnd: Boolean(user.cancelAtPeriodEnd),
    liveSettings: sanitizeLiveSettings(user.liveSettings),
    moderation: sanitizeModerationSettings(user.moderation),
    cohostSettings: cohostEngine.sanitizeCohostSettings(user.cohostSettings, user.customCohostPersonalities),
    customCohostPersonalities: cohostEngine.sanitizeCustomPersonalities(user.customCohostPersonalities),
    cohostState: getPublicCohostState(user),
    voiceMap: sanitizeVoiceMap(user.voiceMap),
    voiceVolumes: sanitizeVoiceVolumes(user.voiceVolumes),
    createdAt: user.createdAt
  };
}

function toPublicPlan(plan) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPriceCents: plan.monthlyPriceCents,
    monthlyCharacters: plan.monthlyCharacters,
    highlight: plan.highlight
  };
}

function toRecentSpokenItem(entry) {
  return {
    id: entry.id,
    title: entry.speakerName || "Chat",
    text: entry.messageText || extractTextFromUsageNote(entry.note),
    voiceId: entry.voiceId || "",
    voiceName: entry.voiceName || "Voice",
    modelId: entry.modelId || "",
    source: entry.source || "Live",
    characters: Number(entry.characters) || 0,
    createdAt: entry.createdAt
  };
}

function extractTextFromUsageNote(note) {
  const value = String(note || "");
  const parts = value.split(" - ");
  return parts.length >= 3 ? parts.slice(2).join(" - ") : value;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function ensureApiKey(provider = "elevenlabs") {
  if (provider === "cartesia") {
    if (!getCartesiaApiKey()) {
      throw createUserError(
        500,
        DESKTOP_MODE
          ? "Add your Cartesia API key in Desktop Settings before generating speech."
          : "Missing CARTESIA_API_KEY. Add it to a local .env file before generating speech."
      );
    }
    return;
  }

  if (!getElevenLabsApiKey()) {
    throw createUserError(
      500,
      DESKTOP_MODE
        ? "Add your ElevenLabs API key in Desktop Settings before generating speech."
        : "Missing ELEVENLABS_API_KEY. Add it to a local .env file before generating speech."
    );
  }
}

function getElevenLabsApiKey() {
  if (process.env.ELEVENLABS_API_KEY) {
    return process.env.ELEVENLABS_API_KEY;
  }
  if (!DESKTOP_MODE) {
    return "";
  }
  const desktopSettings = readDesktopSettings();
  return String(desktopSettings.elevenLabsApiKey || "").trim();
}

function getCartesiaApiKey() {
  if (process.env.CARTESIA_API_KEY) {
    return process.env.CARTESIA_API_KEY;
  }
  if (!DESKTOP_MODE) {
    return "";
  }
  const desktopSettings = readDesktopSettings();
  return String(desktopSettings.cartesiaApiKey || "").trim();
}

function getOpenAiApiKey() {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  if (!DESKTOP_MODE) {
    return OPENAI_API_KEY;
  }
  const desktopSettings = readDesktopSettings();
  return String(desktopSettings.openAiApiKey || "").trim() || OPENAI_API_KEY;
}

function loadDesktopSettingsIntoEnv() {
  const apiKey = getElevenLabsApiKey();
  if (apiKey) {
    process.env.ELEVENLABS_API_KEY = apiKey;
  }
  const cartesiaApiKey = getCartesiaApiKey();
  if (cartesiaApiKey) {
    process.env.CARTESIA_API_KEY = cartesiaApiKey;
  }
}

async function ensureDataStore() {
  if (STORAGE_MODE === "postgres") {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
    });
    await pgPool.query(`
      create table if not exists app_store (
        id text primary key,
        data jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);

    const result = await pgPool.query("select data from app_store where id = $1", ["primary"]);
    if (result.rows.length) {
      cachedStore = normalizeStore(result.rows[0].data);
    } else {
      cachedStore = fs.existsSync(DATA_FILE)
        ? normalizeStore(safeJsonParse(fs.readFileSync(DATA_FILE, "utf8")))
        : createEmptyStore();
      await pgPool.query(
        "insert into app_store (id, data) values ($1, $2::jsonb)",
        ["primary", JSON.stringify(cachedStore)]
      );
    }
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(createEmptyStore(), null, 2), "utf8");
  }

  cachedStore = normalizeStore(safeJsonParse(fs.readFileSync(DATA_FILE, "utf8")));
}

function readStore() {
  const parsed = cloneStore(cachedStore || createEmptyStore());
  let changed = false;
  for (const user of parsed.users) {
    changed = migrateUserRecord(user) || changed;
  }
  if (changed) {
    writeStore(parsed);
  }

  return parsed;
}

function normalizeStore(store) {
  const parsed = store && typeof store === "object" ? store : createEmptyStore();
  if (!Array.isArray(parsed.users)) {
    parsed.users = [];
  }
  if (!Array.isArray(parsed.sessions)) {
    parsed.sessions = [];
  }
  if (!Array.isArray(parsed.purchases)) {
    parsed.purchases = [];
  }
  if (!Array.isArray(parsed.usage)) {
    parsed.usage = [];
  }
  pruneStoreHistory(parsed);

  for (const user of parsed.users) {
    migrateUserRecord(user);
  }

  return parsed;
}

function createEmptyStore() {
  return {
    users: [],
    sessions: [],
    purchases: [],
    usage: []
  };
}

function cloneStore(store) {
  return JSON.parse(JSON.stringify(store || createEmptyStore()));
}

function ensureDesktopUser(store) {
  const settings = readDesktopSettings();
  let user = store.users.find((entry) => entry.id === "desktop_user") ||
    store.users.find((entry) => entry.email === "desktop@local.app");
  if (!user) {
    user = {
      id: "desktop_user",
      email: "desktop@local.app",
      passwordHash: "",
      passwordSalt: "",
      planId: "pro",
      monthlyQuota: 999999999,
      monthlyUsed: 0,
      bonusCharacters: 0,
      usagePeriodStart: new Date().toISOString(),
      channelName: "yourchannel",
      browserSourceKey: crypto.randomBytes(24).toString("hex"),
      cohostOverlayToken: crypto.randomBytes(24).toString("hex"),
      liveSettings: createDefaultLiveSettings(),
      moderation: createDefaultModerationSettings(),
      cohostSettings: cohostEngine.createDefaultCohostSettings(),
      customCohostPersonalities: [],
      cohostState: cohostEngine.normalizeCohostState(),
      viewerMemories: {},
      voiceMap: createDefaultVoiceMap(),
      voiceVolumes: createDefaultVoiceVolumes(),
      stripeCustomerId: "",
      createdAt: new Date().toISOString()
    };
    store.users.push(user);
  }
  user.id = "desktop_user";
  user.email = "desktop@local.app";
  user.channelName = normalizeChannel(settings.channelName || user.channelName) || "yourchannel";
  if (settings.liveSettings) {
    user.liveSettings = sanitizeLiveSettings(settings.liveSettings);
  }
  if (settings.cohostSettings) {
    user.customCohostPersonalities = cohostEngine.sanitizeCustomPersonalities(settings.customCohostPersonalities || user.customCohostPersonalities);
    user.cohostSettings = cohostEngine.sanitizeCohostSettings(settings.cohostSettings, user.customCohostPersonalities);
  }
  if (settings.voiceMap) {
    user.voiceMap = sanitizeVoiceMap(settings.voiceMap);
  }
  user.planId = "pro";
  user.monthlyQuota = 999999999;
  user.bonusCharacters = 0;
  user.bannedAt = "";
  migrateUserRecord(user);
  user.monthlyQuota = 999999999;
  return user;
}

function readDesktopSettings() {
  if (!DESKTOP_MODE) {
    return {};
  }
  try {
    const settingsFile = fs.existsSync(DESKTOP_CONFIG_FILE)
      ? DESKTOP_CONFIG_FILE
      : DESKTOP_SETTINGS_FILE;
    if (!fs.existsSync(settingsFile)) {
      return {};
    }
    const parsed = safeJsonParse(fs.readFileSync(settingsFile, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDesktopSettings(settings) {
  const configDir = path.dirname(DESKTOP_CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(DESKTOP_CONFIG_FILE, JSON.stringify(settings, null, 2), "utf8");
}

function getPublicDesktopSettings() {
  const settings = readDesktopSettings();
  const apiKey = String(settings.elevenLabsApiKey || getElevenLabsApiKey() || "").trim();
  const cartesiaApiKey = String(settings.cartesiaApiKey || getCartesiaApiKey() || "").trim();
  const store = readStore();
  const user = ensureDesktopUser(store);
  return {
    channelName: normalizeChannel(settings.channelName || user.channelName),
    apiKeyConfigured: Boolean(apiKey),
    apiKeyMasked: apiKey ? SAVED_SECRET_MASK : "",
    cartesiaApiKeyConfigured: Boolean(cartesiaApiKey),
    cartesiaApiKeyMasked: cartesiaApiKey ? SAVED_SECRET_MASK : "",
    cartesiaVoiceId: normalizeCartesiaVoiceId(settings.cartesiaVoiceId),
    kickChannel: normalizeChannel(settings.kickChannel),
    youtubeApiKeyConfigured: Boolean(settings.youtubeApiKey),
    youtubeApiKeyMasked: settings.youtubeApiKey ? SAVED_SECRET_MASK : "",
    youtubeLiveChatId: String(settings.youtubeLiveChatId || ""),
    rumbleApiUrlConfigured: Boolean(settings.rumbleApiUrl),
    rumbleApiUrlMasked: settings.rumbleApiUrl ? SAVED_SECRET_MASK : "",
    streamerbotEndpoint: normalizeStreamerbotEndpoint(settings.streamerbotEndpoint),
    minimizeToTrayOnExit: Boolean(settings.minimizeToTrayOnExit),
    muteHotkey: normalizeHotkey(settings.muteHotkey),
    customVoices: sanitizeCustomVoices(settings.customVoices)
  };
}

function normalizeHotkey(value) {
  return String(value || "").trim().slice(0, 80);
}

function normalizeStreamerbotEndpoint(value) {
  const endpoint = String(value || "ws://127.0.0.1:8080/").trim().slice(0, 180);
  if (!endpoint) {
    return "ws://127.0.0.1:8080/";
  }
  if (/^wss?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  return `ws://${endpoint.replace(/^\/+/, "")}`;
}

function getSubmittedSecret(value) {
  const submitted = String(value || "").trim();
  return submitted === SAVED_SECRET_MASK ? "" : submitted;
}

function normalizeCartesiaVoiceId(value) {
  return String(value || DEFAULT_CARTESIA_VOICE_ID).trim().slice(0, 120);
}

function sanitizeCustomVoices(source) {
  const raw = source && typeof source === "object" ? source : {};
  return {
    elevenlabs: sanitizeCustomVoiceList(raw.elevenlabs, "elevenlabs"),
    cartesia: sanitizeCustomVoiceList(raw.cartesia, "cartesia")
  };
}

function sanitizeCustomVoiceList(source, provider) {
  const entries = Array.isArray(source) ? source : [];
  const seen = new Set();
  const normalized = [];
  for (const entry of entries) {
    const raw = entry && typeof entry === "object" ? entry : { voiceId: entry };
    const voiceId = String(raw.voiceId || raw.id || "").trim().slice(0, 120);
    if (!voiceId || seen.has(voiceId)) {
      continue;
    }
    const name = String(raw.name || raw.label || getDefaultCustomVoiceName(provider, voiceId)).trim().slice(0, 40);
    normalized.push({
      name: name || getDefaultCustomVoiceName(provider, voiceId),
      voiceId
    });
    seen.add(voiceId);
    if (normalized.length >= 100) {
      break;
    }
  }
  return normalized;
}

function getDefaultCustomVoiceName(provider, voiceId) {
  const label = provider === "cartesia" ? "Cartesia" : "ElevenLabs";
  const shortId = String(voiceId || "").trim().slice(0, 8) || "voice";
  return `${label} ${shortId}`;
}

function getKnownElevenLabsVoices(customVoices) {
  const customSource = customVoices === undefined
    ? readDesktopSettings().customVoices
    : customVoices;
  const voices = [...BUILT_IN_VOICES];
  const seen = new Set(voices.map((voice) => voice.voiceId));
  for (const voice of sanitizeCustomVoices(customSource).elevenlabs) {
    if (!seen.has(voice.voiceId)) {
      voices.push(voice);
      seen.add(voice.voiceId);
    }
  }
  return voices;
}

function pruneStoreHistory(store) {
  if (!store || typeof store !== "object") {
    return;
  }

  if (Array.isArray(store.sessions)) {
    const now = Date.now();
    store.sessions = store.sessions
      .filter((entry) => new Date(entry.expiresAt).getTime() > now)
      .sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt))
      .slice(0, MAX_LOG_ENTRIES_IN_MEMORY);
  }

  if (!Array.isArray(store.usage)) {
    store.usage = [];
    return;
  }

  const characterUsage = [];
  const logUsage = [];
  for (const entry of store.usage) {
    if (entry?.type === "character_usage") {
      characterUsage.push(entry);
    } else {
      logUsage.push(entry);
    }
  }

  const newestFirst = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  store.usage = [
    ...characterUsage.sort(newestFirst).slice(0, MAX_CHAT_HISTORY_IN_MEMORY),
    ...logUsage.sort(newestFirst).slice(0, MAX_LOG_ENTRIES_IN_MEMORY)
  ].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function migrateUserRecord(user) {
  let changed = false;

  if (!user.planId) {
    user.planId = FREE_PLAN.id;
    changed = true;
  }

  const plan = getPlanById(user.planId);

  if (!Number.isFinite(Number(user.monthlyQuota))) {
    user.monthlyQuota = plan.monthlyCharacters;
    changed = true;
  }

  if (!Number.isFinite(Number(user.monthlyUsed))) {
    const legacyBalance = Number(user.tokenBalance);
    user.monthlyUsed = Number.isFinite(legacyBalance)
      ? Math.max(0, user.monthlyQuota - legacyBalance)
      : 0;
    changed = true;
  }

  if (!Number.isFinite(Number(user.bonusCharacters))) {
    user.bonusCharacters = 0;
    changed = true;
  }

  if (!user.usagePeriodStart) {
    user.usagePeriodStart = user.createdAt || new Date().toISOString();
    changed = true;
  }

  if (!user.browserSourceKey) {
    user.browserSourceKey = crypto.randomBytes(24).toString("hex");
    changed = true;
  }

  if (!user.cohostOverlayToken) {
    user.cohostOverlayToken = crypto.randomBytes(24).toString("hex");
    changed = true;
  }

  if (!user.browserSourceLastSeenAt) {
    user.browserSourceLastSeenAt = "";
    changed = true;
  }

  if (typeof user.stripeSubscriptionId !== "string") {
    user.stripeSubscriptionId = "";
    changed = true;
  }

  if (typeof user.subscriptionStatus !== "string") {
    user.subscriptionStatus = "";
    changed = true;
  }

  if (typeof user.subscriptionPlanId !== "string") {
    user.subscriptionPlanId = user.planId !== FREE_PLAN.id ? user.planId : "";
    changed = true;
  }

  if (typeof user.subscriptionCurrentPeriodStart !== "string") {
    user.subscriptionCurrentPeriodStart = "";
    changed = true;
  }

  if (typeof user.subscriptionCurrentPeriodEnd !== "string") {
    user.subscriptionCurrentPeriodEnd = "";
    changed = true;
  }

  if (typeof user.cancelAtPeriodEnd !== "boolean") {
    user.cancelAtPeriodEnd = false;
    changed = true;
  }

  if (typeof user.bannedAt !== "string") {
    user.bannedAt = "";
    changed = true;
  }

  if (typeof user.bannedReason !== "string") {
    user.bannedReason = "";
    changed = true;
  }

  if (!("browserSourceTestMessage" in user)) {
    user.browserSourceTestMessage = null;
    changed = true;
  }

  const normalizedLiveSettings = sanitizeLiveSettings(user.liveSettings);
  if (JSON.stringify(user.liveSettings || null) !== JSON.stringify(normalizedLiveSettings)) {
    user.liveSettings = normalizedLiveSettings;
    changed = true;
  }

  const normalizedModeration = sanitizeModerationSettings(user.moderation);
  if (JSON.stringify(user.moderation || null) !== JSON.stringify(normalizedModeration)) {
    user.moderation = normalizedModeration;
    changed = true;
  }

  const normalizedCustomCohostPersonalities = cohostEngine.sanitizeCustomPersonalities(user.customCohostPersonalities);
  if (JSON.stringify(user.customCohostPersonalities || null) !== JSON.stringify(normalizedCustomCohostPersonalities)) {
    user.customCohostPersonalities = normalizedCustomCohostPersonalities;
    changed = true;
  }

  const normalizedCohostSettings = cohostEngine.sanitizeCohostSettings(user.cohostSettings, user.customCohostPersonalities);
  if (JSON.stringify(user.cohostSettings || null) !== JSON.stringify(normalizedCohostSettings)) {
    user.cohostSettings = normalizedCohostSettings;
    changed = true;
  }

  const normalizedCohostState = cohostEngine.normalizeCohostState(user.cohostState);
  if (JSON.stringify(user.cohostState || null) !== JSON.stringify(normalizedCohostState)) {
    user.cohostState = normalizedCohostState;
    changed = true;
  }

  const normalizedViewerMemories = cohostEngine.normalizeViewerMemories(user.viewerMemories);
  if (JSON.stringify(user.viewerMemories || null) !== JSON.stringify(normalizedViewerMemories)) {
    user.viewerMemories = normalizedViewerMemories;
    changed = true;
  }

  const normalizedVoiceMap = sanitizeVoiceMap(user.voiceMap);
  if (JSON.stringify(user.voiceMap || null) !== JSON.stringify(normalizedVoiceMap)) {
    user.voiceMap = normalizedVoiceMap;
    changed = true;
  }

  const normalizedVoiceVolumes = sanitizeVoiceVolumes(user.voiceVolumes);
  if (JSON.stringify(user.voiceVolumes || null) !== JSON.stringify(normalizedVoiceVolumes)) {
    user.voiceVolumes = normalizedVoiceVolumes;
    changed = true;
  }

  if ("tokenBalance" in user) {
    delete user.tokenBalance;
    changed = true;
  }

  return changed;
}

function getPlanById(planId) {
  return PLANS.find((entry) => entry.id === planId) || FREE_PLAN;
}

function resetMonthlyUsageIfNeeded(user) {
  if (DESKTOP_MODE && user.id === "desktop_user") {
    user.monthlyQuota = 999999999;
    return false;
  }

  const plan = getPlanById(user.planId);
  if (plan.id !== FREE_PLAN.id && user.stripeSubscriptionId) {
    return false;
  }

  if (!user.usagePeriodStart) {
    user.usagePeriodStart = new Date().toISOString();
    user.monthlyUsed = 0;
    return true;
  }

  const periodStart = new Date(user.usagePeriodStart);
  const now = new Date();

  if (
    periodStart.getUTCFullYear() !== now.getUTCFullYear() ||
    periodStart.getUTCMonth() !== now.getUTCMonth()
  ) {
    user.monthlyQuota = plan.monthlyCharacters;
    user.monthlyUsed = 0;
    user.usagePeriodStart = now.toISOString();
    return true;
  }

  return false;
}

function writeStore(store) {
  pruneStoreHistory(store);
  cachedStore = normalizeStore(cloneStore(store));
  const serializedStore = JSON.stringify(cachedStore);

  if (STORAGE_MODE === "postgres") {
    persistQueue = persistQueue
      .catch(() => {})
      .then(() =>
        pgPool.query(
          `
            insert into app_store (id, data, updated_at)
            values ($1, $2::jsonb, now())
            on conflict (id)
            do update set data = excluded.data, updated_at = now()
          `,
          ["primary", serializedStore]
        )
      )
      .catch((error) => {
        console.error("Unable to persist app store to Postgres:", error);
      });
    return;
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(cachedStore, null, 2), "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendJsonIfOpen(res, statusCode, payload) {
  if (!res || res.destroyed || res.writableEnded) {
    return;
  }
  sendJson(res, statusCode, payload);
}

function getRuntimeStatus() {
  const memory = process.memoryUsage();
  return {
    ttsQueueLength: ttsJobQueue.length,
    activeTtsJobs,
    maxTtsQueueLength: MAX_TTS_QUEUE_LENGTH,
    maxConcurrentTtsJobs: MAX_CONCURRENT_TTS_JOBS,
    maxChatHistoryInMemory: MAX_CHAT_HISTORY_IN_MEMORY,
    maxLogsInMemory: MAX_LOG_ENTRIES_IN_MEMORY,
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers
    },
    recentLogs: runtimeLogEntries.slice(0, 20)
  };
}

function startMemoryLogging() {
  logMemoryUsage();
  setInterval(logMemoryUsage, MEMORY_LOG_INTERVAL_MS).unref();
}

function logMemoryUsage() {
  const status = getRuntimeStatus();
  const message = `rss=${formatBytes(status.memory.rss)} heapUsed=${formatBytes(status.memory.heapUsed)} heapTotal=${formatBytes(status.memory.heapTotal)} queue=${status.ttsQueueLength}/${status.maxTtsQueueLength} active=${status.activeTtsJobs}/${status.maxConcurrentTtsJobs}`;
  recordRuntimeLog("memory", message);
  console.info(`[memory] ${message}`);
}

function recordRuntimeLog(type, message) {
  runtimeLogEntries.unshift({
    type,
    message,
    createdAt: new Date().toISOString()
  });
  if (runtimeLogEntries.length > MAX_LOG_ENTRIES_IN_MEMORY) {
    runtimeLogEntries.length = MAX_LOG_ENTRIES_IN_MEMORY;
  }
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;

    req.on("data", (chunk) => {
      chunks.push(chunk);
      totalLength += chunk.length;

      if (totalLength > 1_000_000) {
        reject(createUserError(413, "Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", () => {
      reject(createUserError(400, "Unable to read request body."));
    });
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw) {
    return {};
  }

  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw createUserError(400, "Request body must be valid JSON.");
  }

  return parsed;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function clampEnvNumber(name, min, max, fallback) {
  return clampNumber(process.env[name], min, max, fallback);
}

function sanitizeTtsLabel(value, fallback, maxLength) {
  const label = String(value || "").replace(/\s+/g, " ").trim();
  return (label || fallback).slice(0, maxLength);
}

function sanitizeTtsMetadata(metadata) {
  const source = metadata && typeof metadata === "object" ? metadata : {};
  return {
    source: sanitizeTtsLabel(source.source, "", 40),
    triggeringUsername: sanitizeTtsLabel(source.triggeringUsername, "", 60),
    triggeringPlatform: sanitizeTtsLabel(source.triggeringPlatform, "", 40),
    eventType: sanitizeTtsLabel(source.eventType, "", 40),
    personalityId: sanitizeTtsLabel(source.personalityId, "", 80),
    chosenVoice: sanitizeTtsLabel(source.chosenVoice || source.voiceId, "", 120),
    priority: ["low", "normal", "high"].includes(source.priority) ? source.priority : "normal"
  };
}

function sanitizeEnglishSpeechText(value) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .toLowerCase()
    .replace(/[^a-z\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsHardBlockedTtsTerm(value) {
  const variants = getHardBlockScanVariants(value);
  return variants.some((entry) => (
    HARD_BLOCKED_TTS_TERM_REGEX.test(entry)
    || HARD_BLOCKED_TTS_EXACT_REGEX.test(entry)
    || HARD_BLOCKED_TTS_SUBSTRING_REGEX.test(entry)
  ));
}

function getHardBlockScanVariants(value) {
  const original = String(value || "");
  const normalized = normalizeHardBlockScanText(original);
  return [
    original,
    normalized,
    normalized.replace(/\s+/g, ""),
    normalized.replace(/[\W_]+/g, "")
  ].filter(Boolean);
}

function normalizeHardBlockScanText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[|]/g, "l")
    .replace(/[$]/g, "s")
    .replace(/[(){}\[\].,;:'"`~^*-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createDefaultModerationSettings() {
  return {
    ...DEFAULT_MODERATION_SETTINGS,
    bannedChatters: [...DEFAULT_MODERATION_SETTINGS.bannedChatters],
    bannedWords: [...DEFAULT_MODERATION_SETTINGS.bannedWords]
  };
}

function createDefaultLiveSettings() {
  return {
    ...DEFAULT_LIVE_SETTINGS
  };
}

function createDefaultVoiceMap() {
  return {};
}

function createDefaultVoiceVolumes() {
  return {};
}

function sanitizeLiveSettings(settings, options = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  const customVoices = options.customVoices === undefined
    ? readDesktopSettings().customVoices
    : options.customVoices;
  const knownElevenLabsVoices = getKnownElevenLabsVoices(customVoices);
  const fallbackVoiceId = String(source.fallbackVoiceId || DEFAULT_LIVE_SETTINGS.fallbackVoiceId);
  const hasVoice = knownElevenLabsVoices.some((voice) => voice.voiceId === fallbackVoiceId);
  const provider = normalizeTtsProvider(source.ttsProvider);
  const providerMode = source.ttsProviderMode === "both" ? "both" : "single";
  const voiceMode = normalizeVoiceMode(source.voiceMode);
  const fixedVoiceProvider = normalizeTtsProvider(source.fixedVoiceProvider);
  const fixedVoiceId = fixedVoiceProvider === "cartesia"
    ? normalizeCartesiaVoiceId(source.fixedVoiceId || DEFAULT_CARTESIA_VOICE_ID)
    : normalizeElevenLabsVoiceId(source.fixedVoiceId || DEFAULT_LIVE_SETTINGS.fixedVoiceId, customVoices);
  const sourceTtsProviders = sanitizeSourceTtsProviders(source.sourceTtsProviders);
  const elevenLabsModelId = normalizeElevenLabsModelId(source.elevenLabsModelId || source.modelId);
  const cartesiaModelId = normalizeCartesiaModelId(source.cartesiaModelId || source.modelId);
  const modelId = provider === "cartesia" ? cartesiaModelId : elevenLabsModelId;

  return {
    browserSourceEnabled: DESKTOP_MODE ? false : Boolean(source.browserSourceEnabled ?? DEFAULT_LIVE_SETTINGS.browserSourceEnabled),
    twitchSourceEnabled: Boolean(source.twitchSourceEnabled ?? DEFAULT_LIVE_SETTINGS.twitchSourceEnabled),
    tiktokSourceEnabled: Boolean(source.tiktokSourceEnabled ?? DEFAULT_LIVE_SETTINGS.tiktokSourceEnabled),
    kickSourceEnabled: Boolean(source.kickSourceEnabled ?? DEFAULT_LIVE_SETTINGS.kickSourceEnabled),
    youtubeSourceEnabled: Boolean(source.youtubeSourceEnabled ?? DEFAULT_LIVE_SETTINGS.youtubeSourceEnabled),
    rumbleSourceEnabled: Boolean(source.rumbleSourceEnabled ?? DEFAULT_LIVE_SETTINGS.rumbleSourceEnabled),
    streamerbotSourceEnabled: Boolean(source.streamerbotSourceEnabled ?? DEFAULT_LIVE_SETTINGS.streamerbotSourceEnabled),
    ttsProvider: provider,
    ttsProviderMode: providerMode,
    sourceTtsProviders,
    voiceMode,
    fallbackVoiceId: hasVoice ? fallbackVoiceId : DEFAULT_LIVE_SETTINGS.fallbackVoiceId,
    fixedVoiceProvider,
    fixedVoiceId,
    modelId,
    elevenLabsModelId,
    cartesiaModelId,
    stability: clampNumber(source.stability, 0, 1, DEFAULT_LIVE_SETTINGS.stability),
    similarityBoost: clampNumber(source.similarityBoost, 0, 1, DEFAULT_LIVE_SETTINGS.similarityBoost),
    speed: clampNumber(source.speed, 0.7, 1.2, DEFAULT_LIVE_SETTINGS.speed)
  };
}

function normalizeTtsProvider(value) {
  return String(value || "").trim().toLowerCase() === "cartesia" ? "cartesia" : "elevenlabs";
}

function normalizeVoiceMode(value) {
  const normalized = String(value || "").trim();
  if (normalized === "rotate") {
    return "source";
  }
  return ["source", "rotate_all", "fixed_all", "rotate_cartesia", "rotate_elevenlabs", "random"].includes(normalized)
    ? normalized
    : DEFAULT_LIVE_SETTINGS.voiceMode;
}

function normalizeElevenLabsVoiceId(value, customVoices) {
  const voiceId = String(value || "").trim();
  return getKnownElevenLabsVoices(customVoices).some((voice) => voice.voiceId === voiceId)
    ? voiceId
    : DEFAULT_LIVE_SETTINGS.fixedVoiceId;
}

function normalizeSourceTtsProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  return provider === "both" || provider === "cartesia" ? provider : "elevenlabs";
}

function sanitizeSourceTtsProviders(source) {
  const raw = source && typeof source === "object" ? source : {};
  return {
    Twitch: normalizeSourceTtsProvider(raw.Twitch ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.Twitch),
    TikTok: normalizeSourceTtsProvider(raw.TikTok ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.TikTok),
    Kick: normalizeSourceTtsProvider(raw.Kick ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.Kick),
    YouTube: normalizeSourceTtsProvider(raw.YouTube ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.YouTube),
    Rumble: normalizeSourceTtsProvider(raw.Rumble ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.Rumble)
  };
}

function normalizeElevenLabsModelId(value) {
  const modelId = String(value || "").trim();
  return ["eleven_flash_v2_5", "eleven_turbo_v2_5", "eleven_multilingual_v2"].includes(modelId)
    ? modelId
    : "eleven_flash_v2_5";
}

function normalizeCartesiaModelId(value) {
  const modelId = String(value || "").trim();
  return ["sonic-3", "sonic-3-2026-01-12", "sonic-3-latest"].includes(modelId)
    ? modelId
    : "sonic-3";
}

function isBrowserSourceActive(user) {
  if (!user.browserSourceLastSeenAt) {
    return false;
  }
  return Date.now() - new Date(user.browserSourceLastSeenAt).getTime() < 30000;
}

function sanitizeModerationSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const maxMessageCharacters = Number(source.maxMessageCharacters) === 11
    ? DEFAULT_MODERATION_SETTINGS.maxMessageCharacters
    : source.maxMessageCharacters;
  const bannedWords = Array.isArray(source.bannedWords)
    ? source.bannedWords
    : String(source.bannedWords || "")
        .split(/\r?\n|,/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
  const blockedPhrases = source.ttsAntiSpamBlockedPhrases === undefined
    ? [...DEFAULT_MODERATION_SETTINGS.ttsAntiSpamBlockedPhrases]
    : normalizeStringList(source.ttsAntiSpamBlockedPhrases);
  const blockedSounds = source.ttsAntiSpamBlockedSounds === undefined
    ? [...DEFAULT_MODERATION_SETTINGS.ttsAntiSpamBlockedSounds]
    : normalizeStringList(source.ttsAntiSpamBlockedSounds);
  const bannedChatters = normalizeChatterList(source.bannedChatters);

  return {
    skipCommands: Boolean(source.skipCommands ?? DEFAULT_MODERATION_SETTINGS.skipCommands),
    skipLinks: Boolean(source.skipLinks ?? DEFAULT_MODERATION_SETTINGS.skipLinks),
    skipEmotesOnly: Boolean(source.skipEmotesOnly ?? DEFAULT_MODERATION_SETTINGS.skipEmotesOnly),
    speakMentionsOnly: Boolean(source.speakMentionsOnly ?? DEFAULT_MODERATION_SETTINGS.speakMentionsOnly),
    neverSkipMidSpeech: Boolean(source.neverSkipMidSpeech ?? DEFAULT_MODERATION_SETTINGS.neverSkipMidSpeech),
    followersOnly: Boolean(source.followersOnly ?? DEFAULT_MODERATION_SETTINGS.followersOnly),
    minMessageLength: Math.floor(clampNumber(source.minMessageLength, 1, 200, DEFAULT_MODERATION_SETTINGS.minMessageLength)),
    maxMessageCharacters: Math.floor(clampNumber(maxMessageCharacters, 1, 100, DEFAULT_MODERATION_SETTINGS.maxMessageCharacters)),
    userCooldownSeconds: Math.floor(clampNumber(source.userCooldownSeconds, 0, 3600, DEFAULT_MODERATION_SETTINGS.userCooldownSeconds)),
    maxQueueSize: Math.floor(clampNumber(source.maxQueueSize, 1, 50, DEFAULT_MODERATION_SETTINGS.maxQueueSize)),
    fastChatMessageThreshold: Math.floor(clampNumber(source.fastChatMessageThreshold, 2, 200, DEFAULT_MODERATION_SETTINGS.fastChatMessageThreshold)),
    fastChatWindowSeconds: Math.floor(clampNumber(source.fastChatWindowSeconds, 2, 120, DEFAULT_MODERATION_SETTINGS.fastChatWindowSeconds)),
    fastChatSkipBehavior: ["drop_oldest", "drop_newest", "latest_only"].includes(source.fastChatSkipBehavior)
      ? source.fastChatSkipBehavior
      : DEFAULT_MODERATION_SETTINGS.fastChatSkipBehavior,
    messagePauseSeconds: clampNumber(source.messagePauseSeconds, 0, 10, DEFAULT_MODERATION_SETTINGS.messagePauseSeconds),
    ttsAntiSpamEnabled: Boolean(source.ttsAntiSpamEnabled ?? DEFAULT_MODERATION_SETTINGS.ttsAntiSpamEnabled),
    ttsAntiSpamMaxRepeatedWordCount: Math.floor(clampNumber(source.ttsAntiSpamMaxRepeatedWordCount, 2, 50, DEFAULT_MODERATION_SETTINGS.ttsAntiSpamMaxRepeatedWordCount)),
    ttsAntiSpamMaxRepeatedShortTokenCount: Math.floor(clampNumber(source.ttsAntiSpamMaxRepeatedShortTokenCount, 2, 50, DEFAULT_MODERATION_SETTINGS.ttsAntiSpamMaxRepeatedShortTokenCount)),
    ttsAntiSpamMaxAlternatingPatternCount: Math.floor(clampNumber(source.ttsAntiSpamMaxAlternatingPatternCount, 2, 50, DEFAULT_MODERATION_SETTINGS.ttsAntiSpamMaxAlternatingPatternCount)),
    ttsAntiSpamAction: ["skip", "remove", "placeholder"].includes(source.ttsAntiSpamAction)
      ? source.ttsAntiSpamAction
      : DEFAULT_MODERATION_SETTINGS.ttsAntiSpamAction,
    ttsAntiSpamBlockedPhrases: blockedPhrases,
    ttsAntiSpamBlockedSounds: blockedSounds,
    bannedChatters: bannedChatters.slice(0, 500),
    bannedWords: [...new Set(bannedWords.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean))]
  };
}

function normalizeChatterList(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\r?\n|,/);
  return [...new Set(source.map((entry) => normalizeChatterName(entry)).filter(Boolean))];
}

function normalizeChatterName(value) {
  return String(value || "").trim().toLowerCase().replace(/^@/, "");
}

function normalizeStringList(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\r?\n|,/);
  return [...new Set(source.map((entry) => normalizeAntiSpamText(entry)).filter(Boolean))];
}

function normalizeAntiSpamText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeVoiceMap(voiceMap) {
  const source = voiceMap && typeof voiceMap === "object" ? voiceMap : {};
  const normalized = {};
  const knownElevenLabsVoices = getKnownElevenLabsVoices();

  for (const [rawUser, rawAssignment] of Object.entries(source)) {
    const user = String(rawUser || "").trim().toLowerCase();
    const assignment = rawAssignment && typeof rawAssignment === "object"
      ? rawAssignment
      : { voiceId: rawAssignment, ttsProvider: "elevenlabs" };
    const provider = normalizeTtsProvider(assignment.ttsProvider);
    const voiceId = String(assignment.voiceId || "").trim();
    const voice = provider === "cartesia" ? { voiceId } : knownElevenLabsVoices.find((entry) => entry.voiceId === voiceId);
    if (!user || !voice || !voiceId) {
      continue;
    }
    normalized[user] = {
      ttsProvider: provider,
      voiceId: provider === "cartesia" ? normalizeCartesiaVoiceId(voiceId) : voice.voiceId,
      isOverride: Boolean(assignment.isOverride)
    };
  }

  return normalized;
}

function sanitizeVoiceVolumes(voiceVolumes) {
  const source = voiceVolumes && typeof voiceVolumes === "object" ? voiceVolumes : {};
  const normalized = {};
  const knownElevenLabsVoices = getKnownElevenLabsVoices();

  for (const [rawVoiceId, rawVolume] of Object.entries(source)) {
    const voiceId = String(rawVoiceId || "").trim();
    const voice = knownElevenLabsVoices.find((entry) => entry.voiceId === voiceId);
    if (!voice) {
      continue;
    }
    const volume = clampNumber(rawVolume, 0, 1, 1);
    if (volume !== 1) {
      normalized[voice.voiceId] = Number(volume.toFixed(2));
    }
  }

  return normalized;
}

function createUserError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
}

function createApiError(statusCode, payload, fallbackMessage) {
  const detail = payload?.detail;
  const message =
    detail?.message ||
    detail?.status ||
    payload?.message ||
    fallbackMessage;

  return createUserError(statusCode, message);
}

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
