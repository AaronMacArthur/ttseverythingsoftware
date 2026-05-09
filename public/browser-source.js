const sourceElements = {
  audioPlayer: document.getElementById("browserSourcePlayer"),
  email: document.getElementById("browserSourceEmail"),
  login: document.getElementById("browserSourceLogin"),
  loginButton: document.getElementById("browserSourceLoginButton"),
  loginFeedback: document.getElementById("browserSourceLoginFeedback"),
  loginForm: document.getElementById("browserSourceLoginForm"),
  password: document.getElementById("browserSourcePassword"),
  runtime: document.getElementById("browserSourceRuntime"),
  status: document.getElementById("browserSourceStatus"),
  title: document.getElementById("browserSourceTitle")
};

const state = {
  browserSourceKey: "",
  currentUser: null,
  voices: [],
  pendingMessages: [],
  playbackQueue: [],
  speakerAssignments: {},
  voiceVolumes: {},
  recentSpeakerActivity: new Map(),
  recentMessageTimestamps: [],
  tiktokGifters: new Set(),
  isGenerating: false,
  isPlaying: false,
  rotateIndex: 0,
  settingsPollTimer: null,
  tiktokFollowers: new Set(),
  tiktokSocket: null,
  twitchSocket: null,
  heartbeatTimer: null,
  reconnectTimer: null,
  playbackDelayTimer: null,
  debug: false
};

const MAX_CLIENT_CHAT_HISTORY = 500;

async function readTtsResponseJson(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  await response.text();
  const statusText = response.status ? ` (${response.status})` : "";
  throw new Error(`${fallbackMessage}${statusText}: TTS returned an HTML page instead of JSON. Refresh the browser source, then reconnect it from the dashboard.`);
}

initializeBrowserSource();

async function initializeBrowserSource() {
  const params = new URLSearchParams(window.location.search);
  state.browserSourceKey = String(params.get("key") || "").trim();
  state.debug = params.get("debug") === "1";
  sourceElements.loginForm.addEventListener("submit", handleBrowserSourceLogin);
  if (state.debug) {
    document.body.classList.remove("browser-source-body");
  }

  sourceElements.audioPlayer.addEventListener("ended", handlePlaybackFinished);
  sourceElements.audioPlayer.addEventListener("error", handlePlaybackFinished);

  await bootstrapBrowserSource();
}

async function bootstrapBrowserSource() {
  try {
    const [configResponse, bootstrapResponse] = await Promise.all([
      fetch("/api/config"),
      fetch(getBrowserSourceConfigUrl(), { credentials: "include" })
    ]);
    const configData = await configResponse.json();
    const bootstrapData = await bootstrapResponse.json();

    if (!bootstrapResponse.ok) {
      if (bootstrapResponse.status === 401) {
        showLogin();
        return;
      }
      if (bootstrapResponse.status === 404) {
        showLogin(bootstrapData.error || "Browser source not found.");
        return;
      }
      throw new Error(bootstrapData.error || "Unable to load browser source.");
    }

    state.voices = configData.voices || [];
    state.currentUser = bootstrapData.user;
    showRuntime();
    syncSpeakerAssignments(state.currentUser.voiceMap);
    syncVoiceVolumes(state.currentUser.voiceVolumes);
    sourceElements.title.textContent = `Browser source live for ${state.currentUser.channelName || state.currentUser.email}`;
    startHeartbeat();
    startSettingsPoll();
    syncLiveConnections();
  } catch (error) {
    showLogin(error.message);
  }
}

async function handleBrowserSourceLogin(event) {
  event.preventDefault();
  toggleLoginButton(true);
  setLoginFeedback("Logging in...", false);

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: sourceElements.email.value,
        password: sourceElements.password.value
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to log in.");
    }

    sourceElements.password.value = "";
    await bootstrapBrowserSource();
  } catch (error) {
    setLoginFeedback(error.message, true);
  } finally {
    toggleLoginButton(false);
  }
}

function getBrowserSourceConfigUrl() {
  const query = state.browserSourceKey ? `?key=${encodeURIComponent(state.browserSourceKey)}` : "";
  return `/api/browser-source/config${query}`;
}

function showLogin(message) {
  disconnectLiveSources();
  if (state.heartbeatTimer) {
    window.clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
  if (state.settingsPollTimer) {
    window.clearInterval(state.settingsPollTimer);
    state.settingsPollTimer = null;
  }
  document.body.classList.remove("browser-source-body");
  document.body.classList.add("browser-source-login-body");
  sourceElements.login.hidden = false;
  sourceElements.runtime.hidden = true;
  sourceElements.runtime.setAttribute("aria-hidden", "true");
  sourceElements.login.classList.remove("browser-source-hidden");
  sourceElements.runtime.classList.add("browser-source-hidden");
  setLoginFeedback(message || "", Boolean(message));
}

function showRuntime() {
  document.body.classList.add("browser-source-body");
  document.body.classList.remove("browser-source-login-body");
  sourceElements.login.hidden = true;
  sourceElements.runtime.hidden = !state.debug;
  sourceElements.runtime.setAttribute("aria-hidden", state.debug ? "false" : "true");
  sourceElements.login.classList.add("browser-source-hidden");
  sourceElements.runtime.classList.toggle("browser-source-hidden", !state.debug);
}

function setLoginFeedback(message, isError) {
  sourceElements.loginFeedback.textContent = message;
  sourceElements.loginFeedback.className = "feedback";
  sourceElements.loginFeedback.classList.toggle("error", Boolean(isError));
  sourceElements.loginFeedback.classList.toggle("success", !isError);
}

function toggleLoginButton(isBusy) {
  sourceElements.loginButton.disabled = isBusy;
  sourceElements.loginButton.textContent = isBusy ? "Logging in..." : "Log in";
}

function syncLiveConnections() {
  if (!state.currentUser?.liveSettings?.browserSourceEnabled) {
    disconnectLiveSources();
    state.pendingMessages.length = 0;
    state.playbackQueue.length = 0;
    setStatus("Browser Source TTS is currently turned off in the dashboard.");
    return;
  }

  connectLiveSources();
}

function connectLiveSources() {
  disconnectLiveSources();

  const liveSettings = state.currentUser.liveSettings || {};
  const wantsTwitch = Boolean(liveSettings.twitchSourceEnabled);

  if (!wantsTwitch) {
    setStatus("Browser Source TTS is enabled, but Twitch is off. TikFinity is dashboard-only.");
    return;
  }

  if (liveSettings.twitchSourceEnabled) {
    connectToTwitch(state.currentUser.channelName);
  }

  setStatus("Browser source is connected and waiting for messages.");
}

function ensureLiveConnectionsHealthy() {
  if (!state.currentUser?.liveSettings?.browserSourceEnabled) {
    return;
  }

  const liveSettings = state.currentUser.liveSettings || {};
  const needsTwitch = Boolean(liveSettings.twitchSourceEnabled);
  const twitchHealthy = !needsTwitch || (state.twitchSocket && state.twitchSocket.readyState <= WebSocket.OPEN);

  if (twitchHealthy) {
    return;
  }

  scheduleLiveReconnect();
}

function scheduleLiveReconnect() {
  if (state.reconnectTimer) {
    return;
  }

  state.reconnectTimer = window.setTimeout(() => {
    state.reconnectTimer = null;
    if (state.currentUser?.liveSettings?.browserSourceEnabled) {
      connectLiveSources();
    }
  }, 2000);
}

function connectToTwitch(channel) {
  const normalizedChannel = normalizeChannel(channel);
  if (!normalizedChannel) {
    return;
  }

  const socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
  state.twitchSocket = socket;

  socket.addEventListener("open", () => {
    socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");
    socket.send("PASS SCHMOOPIIE");
    socket.send(`NICK justinfan${Math.floor(Math.random() * 80000 + 1000)}`);
    socket.send(`JOIN #${normalizedChannel}`);
    setStatus(`Connected to Twitch #${normalizedChannel}. Waiting for chat messages...`);
  });

  socket.addEventListener("message", (event) => {
    const rawLines = String(event.data).split("\r\n").filter(Boolean);
    for (const line of rawLines) {
      if (line.startsWith("PING")) {
        socket.send(line.replace("PING", "PONG"));
        continue;
      }
      if (line.includes(" NOTICE ")) {
        setStatus(`Twitch notice: ${line.split(" :").pop() || "Connection notice."}`);
      }
      if (line.includes(" PRIVMSG ")) {
        const parsed = parsePrivmsg(line);
        if (parsed) {
          enqueueIncomingMessage(parsed);
        }
      }
    }
  });

  socket.addEventListener("close", () => {
    if (state.twitchSocket === socket) {
      state.twitchSocket = null;
      setStatus("Twitch chat connection closed. Reconnecting...");
      scheduleLiveReconnect();
    }
  });

  socket.addEventListener("error", () => {
    if (state.twitchSocket === socket) {
      setStatus("Unable to connect to Twitch chat. Retrying...");
      scheduleLiveReconnect();
    }
  });
}

function connectToTikFinity() {
  const socket = new WebSocket("ws://localhost:21213/");
  state.tiktokSocket = socket;

  socket.addEventListener("open", () => {
    setStatus("Connected to TikFinity. Waiting for TikTok Live comments...");
  });

  socket.addEventListener("message", (event) => {
    const parsed = parseTikFinityMessage(event.data);
    if (parsed) {
      enqueueIncomingMessage(parsed);
    }
  });

  socket.addEventListener("close", () => {
    if (state.tiktokSocket === socket) {
      state.tiktokSocket = null;
      setStatus("TikFinity connection closed. Reconnecting...");
      scheduleLiveReconnect();
    }
  });

  socket.addEventListener("error", () => {
    setStatus("Unable to connect to TikFinity on ws://localhost:21213/. Make sure TikFinity is running locally.");
    scheduleLiveReconnect();
  });
}

function disconnectLiveSources() {
  if (state.reconnectTimer) {
    window.clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (state.playbackDelayTimer) {
    window.clearTimeout(state.playbackDelayTimer);
    state.playbackDelayTimer = null;
  }
  if (state.twitchSocket) {
    state.twitchSocket.close();
    state.twitchSocket = null;
  }
  if (state.tiktokSocket) {
    state.tiktokSocket.close();
    state.tiktokSocket = null;
  }
}

function parsePrivmsg(line) {
  const match = line.match(/^(?:@([^ ]+) )?:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :([\s\S]*)$/);
  if (!match) {
    return null;
  }

  const [, rawTags = "", prefixUser = "", message = ""] = match;
  const tags = parseTags(rawTags ? `@${rawTags}` : "");
  const user = tags["display-name"] || prefixUser || "unknown";
  return message.trim()
    ? { id: tags.id || createClientId(), user, message: message.trim(), source: "Twitch" }
    : null;
}

function parseTags(tagSection) {
  if (!tagSection.startsWith("@")) {
    return {};
  }
  const tags = {};
  for (const pair of tagSection.slice(1).split(" ")[0].split(";")) {
    const [key, value = ""] = pair.split("=");
    tags[key] = value;
  }
  return tags;
}

function parseTikFinityMessage(rawMessage) {
  let payload;
  try {
    payload = JSON.parse(rawMessage);
  } catch {
    return null;
  }

  const messageType = String(payload.event || payload.type || payload.name || payload.eventName || payload.topic || "").toLowerCase();
  const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
  if (messageType.includes("follow")) {
    const followerUser = normalizeViewerId(extractTikTokUser(data));
    if (followerUser) {
      state.tiktokFollowers.add(followerUser);
    }
  }
  const gifterEventUser = extractTikTokGifterEventUser(data, messageType);
  if (gifterEventUser) {
    state.tiktokGifters.add(gifterEventUser);
  }

  const comment = extractTikTokComment(data);
  const user = extractTikTokUser(data);
  if (!comment || !user) {
    return null;
  }

  return {
    id: String(data.commentId || data.msgId || data.messageId || data.id || createClientId()),
    user,
    message: comment.trim(),
    source: "TikTok",
    isFollower: inferTikTokFollowerState(data, messageType, user) || inferTikTokGifterState(data, messageType, user)
  };
}

function extractTikTokComment(data) {
  const candidates = [
    data.comment,
    data.message,
    data.text,
    data.content,
    data.commentText,
    data.label,
    data.description,
    data?.event?.comment,
    data?.event?.text,
    data?.event?.message
  ];

  for (const candidate of candidates) {
    const resolved = coerceTikTokText(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return "";
}

function extractTikTokUser(data) {
  const userData = data.user && typeof data.user === "object" ? data.user : {};
  const candidates = [
    userData.nickname,
    userData.uniqueId,
    userData.displayName,
    userData.userId,
    data.nickname,
    data.uniqueId,
    data.displayName,
    data.username,
    data.userName,
    data.screenName,
    data.userId
  ];

  for (const candidate of candidates) {
    const resolved = coerceTikTokText(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return "";
}

function coerceTikTokText(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => coerceTikTokText(item)).filter(Boolean).join(" ").trim();
  }
  if (value && typeof value === "object") {
    const nestedCandidates = [value.text, value.content, value.label, value.value, value.string];
    for (const nested of nestedCandidates) {
      const resolved = coerceTikTokText(nested);
      if (resolved) {
        return resolved;
      }
    }
  }
  return "";
}

function enqueueIncomingMessage(entry) {
  if (!entry.isTest && !shouldSpeakMessage(entry)) {
    return;
  }

  const antiSpamResult = entry.isTest
    ? { blocked: false, action: "allow", text: entry.message, reason: "" }
    : applyTtsAntiSpam(entry.message, state.currentUser.moderation);
  if (antiSpamResult.blocked && antiSpamResult.action === "skip") {
    logAntiSpamSkip(entry, antiSpamResult);
    return;
  }

  if (!entry.isTest && !prepareBacklogForMessage()) {
    return;
  }

  const voice = getVoiceAssignment(entry.user);
  const messageForSpeech = antiSpamResult.blocked ? antiSpamResult.text : entry.message;
  const cleanedMessage = entry.isTest
    ? String(messageForSpeech || "").trim().slice(0, 100)
    : sanitizeMessage(messageForSpeech);
  if (!cleanedMessage) {
    if (antiSpamResult.blocked) {
      logAntiSpamSkip(entry, { ...antiSpamResult, reason: `${antiSpamResult.reason}; no readable text remained` });
    }
    return;
  }
  if (antiSpamResult.blocked) {
    logAntiSpamSkip(entry, antiSpamResult);
  }
  if (!entry.isTest && isSpeakerOnCooldown(entry)) {
    return;
  }

  state.pendingMessages.push({
    id: entry.id,
    title: entry.user,
    text: cleanedMessage,
    voiceId: voice.voiceId,
    voiceName: voice.name,
    modelId: state.currentUser.liveSettings.modelId,
    source: entry.source
  });

  enforceMaxQueueSize();

  processSpeechQueue();
}

function prepareBacklogForMessage() {
  const moderation = state.currentUser.moderation;
  const now = Date.now();
  const windowMs = Number(moderation.fastChatWindowSeconds || 12) * 1000;
  state.recentMessageTimestamps.push(now);
  while (state.recentMessageTimestamps.length && now - state.recentMessageTimestamps[0] > windowMs) {
    state.recentMessageTimestamps.shift();
  }
  trimClientHistory();

  const isFastChat = state.recentMessageTimestamps.length >= Number(moderation.fastChatMessageThreshold || 10);
  const isAtLimit = getBacklogSize() >= Number(moderation.maxQueueSize || 50);
  if (!isFastChat && !isAtLimit) {
    return true;
  }

  return applySkipBehavior(moderation.fastChatSkipBehavior || "drop_oldest");
}

function applySkipBehavior(skipBehavior) {
  if (skipBehavior === "drop_newest") {
    return false;
  }
  if (skipBehavior === "latest_only") {
    state.pendingMessages.length = 0;
    state.playbackQueue.length = 0;
    return true;
  }
  if (state.pendingMessages.length) {
    state.pendingMessages.shift();
  } else if (state.playbackQueue.length) {
    state.playbackQueue.shift();
  }
  return true;
}

function enforceMaxQueueSize() {
  const maxQueueSize = Number(state.currentUser?.moderation?.maxQueueSize || 50);
  while (getBacklogSize() > maxQueueSize) {
    if (state.pendingMessages.length) {
      state.pendingMessages.shift();
    } else if (state.playbackQueue.length) {
      state.playbackQueue.shift();
    } else {
      break;
    }
  }
}

function getBacklogSize() {
  return state.pendingMessages.length + state.playbackQueue.length + (state.isGenerating ? 1 : 0);
}

function trimClientHistory() {
  if (state.recentMessageTimestamps.length > MAX_CLIENT_CHAT_HISTORY) {
    state.recentMessageTimestamps.splice(0, state.recentMessageTimestamps.length - MAX_CLIENT_CHAT_HISTORY);
  }
  while (state.tiktokFollowers.size > MAX_CLIENT_CHAT_HISTORY) {
    const oldestKey = state.tiktokFollowers.keys().next().value;
    state.tiktokFollowers.delete(oldestKey);
  }
  while (state.tiktokGifters.size > MAX_CLIENT_CHAT_HISTORY) {
    const oldestKey = state.tiktokGifters.keys().next().value;
    state.tiktokGifters.delete(oldestKey);
  }
  while (state.recentSpeakerActivity.size > MAX_CLIENT_CHAT_HISTORY) {
    const oldestKey = state.recentSpeakerActivity.keys().next().value;
    state.recentSpeakerActivity.delete(oldestKey);
  }
}

function applyTtsAntiSpam(message, moderation) {
  if (!moderation?.ttsAntiSpamEnabled) {
    return { blocked: false, action: "allow", text: message, reason: "" };
  }

  const normalized = normalizeAntiSpamText(message);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return { blocked: false, action: "allow", text: message, reason: "" };
  }

  const phrase = findBlockedPhrase(normalized, moderation.ttsAntiSpamBlockedPhrases);
  if (phrase) {
    return buildAntiSpamResult(message, normalized, tokens, moderation, `matched blocked phrase "${phrase}"`, new Set(phrase.split(/\s+/)));
  }

  const blockedSound = findBlockedSound(tokens, moderation.ttsAntiSpamBlockedSounds);
  if (blockedSound) {
    return buildAntiSpamResult(message, normalized, tokens, moderation, `matched blocked sound "${blockedSound}"`, new Set([blockedSound]));
  }

  const repeated = findRepeatedToken(tokens, Number(moderation.ttsAntiSpamMaxRepeatedWordCount || 4), () => true);
  if (repeated) {
    return buildAntiSpamResult(message, normalized, tokens, moderation, `repeated token "${repeated.token}" appeared ${repeated.count} times`, new Set([repeated.token]));
  }

  const repeatedShort = findRepeatedToken(tokens, Number(moderation.ttsAntiSpamMaxRepeatedShortTokenCount || 3), isShortSoundToken);
  if (repeatedShort) {
    return buildAntiSpamResult(message, normalized, tokens, moderation, `short sound "${repeatedShort.token}" appeared ${repeatedShort.count} times`, new Set([repeatedShort.token]));
  }

  const alternating = findAlternatingPattern(tokens, Number(moderation.ttsAntiSpamMaxAlternatingPatternCount || 3));
  if (alternating) {
    return buildAntiSpamResult(message, normalized, tokens, moderation, `alternating pattern "${alternating.pattern.join(" ")}" repeated ${alternating.count} times`, new Set(alternating.pattern));
  }

  const score = scorePhonemeSpam(tokens);
  if (score.isSpam) {
    return buildAntiSpamResult(message, normalized, tokens, moderation, score.reason, new Set(tokens.filter(isShortSoundToken)));
  }

  return { blocked: false, action: "allow", text: message, reason: "" };
}

function buildAntiSpamResult(originalMessage, normalized, tokens, moderation, reason, spamTokens) {
  const action = moderation.ttsAntiSpamAction || "skip";
  if (action === "placeholder") {
    return { blocked: true, action, text: "[message skipped]", reason };
  }
  if (action === "remove") {
    return { blocked: true, action, text: tokens.filter((token) => !spamTokens.has(token)).join(" "), reason };
  }
  return { blocked: true, action: "skip", text: originalMessage, normalized, reason };
}

function findBlockedPhrase(normalized, phrases) {
  return (phrases || []).find((phrase) => phrase && (` ${normalized} `).includes(` ${phrase} `)) || "";
}

function findBlockedSound(tokens, sounds) {
  const blocked = new Set(sounds || []);
  return tokens.find((token) => blocked.has(token)) || "";
}

function findRepeatedToken(tokens, maxCount, predicate) {
  const counts = new Map();
  for (const token of tokens) {
    if (!predicate(token)) {
      continue;
    }
    const nextCount = (counts.get(token) || 0) + 1;
    counts.set(token, nextCount);
    if (nextCount > maxCount) {
      return { token, count: nextCount };
    }
  }
  return null;
}

function findAlternatingPattern(tokens, maxPatternCount) {
  for (const size of [2, 3]) {
    for (let index = 0; index <= tokens.length - size * (maxPatternCount + 1); index += 1) {
      const pattern = tokens.slice(index, index + size);
      if (!pattern.every(isShortSoundToken) || new Set(pattern).size < 2) {
        continue;
      }
      let count = 1;
      let cursor = index + size;
      while (cursor + size <= tokens.length && pattern.every((token, offset) => tokens[cursor + offset] === token)) {
        count += 1;
        cursor += size;
      }
      if (count > maxPatternCount) {
        return { pattern, count };
      }
    }
  }
  return null;
}

function scorePhonemeSpam(tokens) {
  if (tokens.length < 5) {
    return { isSpam: false, reason: "" };
  }
  const uniqueCount = new Set(tokens).size;
  const shortCount = tokens.filter(isShortSoundToken).length;
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  const shortRatio = shortCount / tokens.length;
  const uniqueRatio = uniqueCount / tokens.length;
  const repeatedRatio = maxCount / tokens.length;
  if (shortRatio >= 0.8 && uniqueRatio <= 0.45) {
    return { isSpam: true, reason: `low variety short sounds (${Math.round(shortRatio * 100)}% short tokens)` };
  }
  if (repeatedRatio >= 0.65 && shortRatio >= 0.6) {
    return { isSpam: true, reason: `message was mostly one repeated sound (${Math.round(repeatedRatio * 100)}%)` };
  }
  return { isSpam: false, reason: "" };
}

function isShortSoundToken(token) {
  return token.length <= 3 || (/^[aeiouyh]+$/.test(token) && token.length <= 5);
}

function normalizeAntiSpamText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function logAntiSpamSkip(entry, result) {
  console.info(`[TTS anti-spam] ${entry.user || "Chat"} skipped because ${result.reason}`);
}

function shouldSpeakMessage(entry) {
  const moderation = state.currentUser.moderation;
  const text = entry.message.trim();
  if (isBannedChatter(entry.user, moderation)) {
    return false;
  }
  if (text.length < moderation.minMessageLength) {
    return false;
  }
  if (text.length > moderation.maxMessageCharacters) {
    return false;
  }
  if (moderation.skipCommands && /^[!/$.]/.test(text)) {
    return false;
  }
  if (moderation.skipLinks && /https?:\/\/|www\./i.test(text)) {
    return false;
  }
  if (moderation.skipEmotesOnly && looksLikeEmoteOnly(text)) {
    return false;
  }
  if (moderation.followersOnly && entry.source === "TikTok" && !entry.isFollower) {
    return false;
  }
  if (moderation.speakMentionsOnly && entry.source === "Twitch") {
    return text.toLowerCase().includes(String(state.currentUser.channelName || "").toLowerCase());
  }
  return true;
}

function isBannedChatter(user, moderation) {
  const normalizedUser = normalizeViewerId(user);
  const bannedChatters = Array.isArray(moderation?.bannedChatters) ? moderation.bannedChatters : [];
  return Boolean(normalizedUser && bannedChatters.includes(normalizedUser));
}

function sanitizeMessage(message) {
  const moderation = state.currentUser.moderation;
  const bannedWords = new Set(moderation.bannedWords || []);
  const normalized = sanitizeEnglishSpeechText(message);
  const allowedWords = [];

  for (const word of normalized.split(/\s+/).filter(Boolean)) {
    const cleanedToken = word.trim();
    if (!cleanedToken) {
      continue;
    }
    if (bannedWords.has(cleanedToken) || hasWordWithFourSameLetters(cleanedToken)) {
      continue;
    }
    allowedWords.push(cleanedToken);
  }

  return allowedWords.join(" ").trim().slice(0, moderation.maxMessageCharacters);
}

function sanitizeEnglishSpeechText(message) {
  return String(message || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .toLowerCase()
    .replace(/[^a-z\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasWordWithFourSameLetters(word) {
  const counts = new Map();
  for (const character of String(word || "").toLowerCase()) {
    if (!/[a-z]/.test(character)) {
      continue;
    }
    const nextCount = (counts.get(character) || 0) + 1;
    if (nextCount >= 4) {
      return true;
    }
    counts.set(character, nextCount);
  }
  return false;
}

function isSpeakerOnCooldown(entry) {
  const cooldownMs = Math.max(0, Number(state.currentUser?.moderation?.userCooldownSeconds) || 0) * 1000;
  if (!cooldownMs) {
    return false;
  }

  const key = `${entry.source || "Live"}:${normalizeViewerId(entry.user)}`;
  const now = Date.now();
  const lastSpokenAt = state.recentSpeakerActivity.get(key) || 0;
  if (now - lastSpokenAt < cooldownMs) {
    return true;
  }

  state.recentSpeakerActivity.set(key, now);
  trimClientHistory();
  return false;
}

function looksLikeEmoteOnly(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.length ? tokens.every((token) => /^[A-Z0-9_]+$/.test(token)) : true;
}

async function processSpeechQueue() {
  if (state.isGenerating || !state.pendingMessages.length || !state.currentUser) {
    return;
  }
  if (!state.currentUser.liveSettings?.browserSourceEnabled) {
    state.pendingMessages.length = 0;
    state.playbackQueue.length = 0;
    setStatus("Browser Source TTS is off. Turn it on in the dashboard to resume.");
    return;
  }

  state.isGenerating = true;
  const nextClip = state.pendingMessages.shift();
  const liveSettings = state.currentUser.liveSettings;

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({
        browserSourceKey: state.browserSourceKey,
        text: nextClip.text,
        voiceId: nextClip.voiceId,
        modelId: nextClip.modelId,
        stability: liveSettings.stability,
        similarityBoost: liveSettings.similarityBoost,
        speed: liveSettings.speed,
        source: nextClip.source,
        speakerName: nextClip.title,
        voiceName: nextClip.voiceName
      })
    });
    const data = await readTtsResponseJson(response, "Unable to generate speech");
    if (!response.ok) {
      throw new Error(data.error || "Unable to generate speech.");
    }

    nextClip.audioUrl = `data:${data.mimeType};base64,${data.audioBase64}`;
    if (isBannedChatter(nextClip.title, state.currentUser.moderation)) {
      setStatus(`${nextClip.title} is banned from TTS. Generated clip skipped.`);
      return;
    }
    state.currentUser.remainingCharacters = Number(data.meta?.remainingCharacters ?? state.currentUser.remainingCharacters);
    state.playbackQueue.push(nextClip);
    setStatus(`Live on ${nextClip.source}. ${Number(state.currentUser.remainingCharacters).toLocaleString()} characters left.`);

    if (!state.currentUser.moderation.neverSkipMidSpeech) {
      const latestClip = state.playbackQueue[state.playbackQueue.length - 1];
      state.playbackQueue.length = 0;
      playClip(latestClip);
    } else if (!state.isPlaying) {
      playNextClip();
    }
  } catch (error) {
    setStatus(error.message);
  } finally {
    state.isGenerating = false;
    if (state.pendingMessages.length) {
      processSpeechQueue();
    }
  }
}

function playClip(clip) {
  state.isPlaying = true;
  if (state.playbackDelayTimer) {
    window.clearTimeout(state.playbackDelayTimer);
    state.playbackDelayTimer = null;
  }
  sourceElements.audioPlayer.volume = getVoiceVolume(clip.voiceId);
  const audioUrl = clip.audioUrl;
  sourceElements.audioPlayer.src = audioUrl;
  clip.audioUrl = "";
  sourceElements.audioPlayer.play().catch(() => {
    clip.audioUrl = audioUrl;
    state.isPlaying = false;
    setStatus("OBS browser source blocked autoplay. Enable page audio in OBS.");
  });
}

function playNextClip() {
  if (!state.playbackQueue.length) {
    state.isPlaying = false;
    return;
  }
  playClip(state.playbackQueue.shift());
}

function handlePlaybackFinished() {
  state.isPlaying = false;
  sourceElements.audioPlayer.removeAttribute("src");
  sourceElements.audioPlayer.load();
  if (state.currentUser?.moderation?.neverSkipMidSpeech) {
    scheduleNextClip();
  }
}

function scheduleNextClip() {
  if (!state.playbackQueue.length) {
    return;
  }
  const pauseMs = Math.max(0, Number(state.currentUser?.moderation?.messagePauseSeconds) || 0) * 1000;
  if (!pauseMs) {
    playNextClip();
    return;
  }
  if (state.playbackDelayTimer) {
    window.clearTimeout(state.playbackDelayTimer);
  }
  state.playbackDelayTimer = window.setTimeout(() => {
    state.playbackDelayTimer = null;
    playNextClip();
  }, pauseMs);
}

function getVoiceAssignment(user) {
  const key = user.toLowerCase();
  if (state.speakerAssignments[key]) {
    return state.speakerAssignments[key];
  }

  const liveSettings = state.currentUser.liveSettings;
  let voice;
  if (liveSettings.voiceMode === "fixed") {
    voice = state.voices.find((item) => item.voiceId === liveSettings.fallbackVoiceId) || state.voices[0];
  } else if (liveSettings.voiceMode === "random") {
    voice = state.voices[Math.floor(Math.random() * state.voices.length)];
  } else {
    voice = state.voices[state.rotateIndex % state.voices.length];
    state.rotateIndex += 1;
  }

  state.speakerAssignments[key] = voice;
  void persistVoiceMap();
  return voice;
}

function inferTikTokFollowerState(data, messageType, user) {
  const normalizedUser = normalizeViewerId(user);
  if (normalizedUser && state.tiktokFollowers.has(normalizedUser)) {
    return true;
  }
  const candidates = [data.isFollower, data.following, data.followRole, data.user?.isFollower, data.user?.following, data.user?.followRole, data.user?.isFollowingHost];
  for (const value of candidates) {
    if (value === true || value === 1 || value === "1" || value === "true" || value === "follower") {
      return true;
    }
  }
  return messageType.includes("follow");
}

function inferTikTokGifterState(data, messageType, user) {
  const normalizedUser = normalizeViewerId(user);
  if (normalizedUser && state.tiktokGifters.has(normalizedUser)) {
    return true;
  }

  const userData = data.user && typeof data.user === "object" ? data.user : {};
  const candidates = [
    data.isGifter,
    data.gifter,
    data.isTopGifter,
    data.topGifter,
    data.gifterLevel,
    data.giftLevel,
    data.topGifterRank,
    data.totalGiftCount,
    data.diamondCount,
    data.isMember,
    data.member,
    data.isTeamMember,
    data.teamMember,
    data.memberLevel,
    data.isSubscriber,
    data.subscriber,
    data.subscriberLevel,
    userData.isGifter,
    userData.gifter,
    userData.isTopGifter,
    userData.topGifter,
    userData.gifterLevel,
    userData.giftLevel,
    userData.topGifterRank,
    userData.totalGiftCount,
    userData.diamondCount,
    userData.isMember,
    userData.member,
    userData.isTeamMember,
    userData.teamMember,
    userData.memberLevel,
    userData.isSubscriber,
    userData.subscriber,
    userData.subscriberLevel
  ];
  if (candidates.some(isTikTokGifterValue)) {
    return true;
  }

  return hasTikTokGifterBadge(data) || messageType.includes("top_gifter") || messageType.includes("member") || messageType.includes("subscribe");
}

function isTikTokGifterValue(value) {
  if (value === true || value === 1 || value === "1") {
    return true;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  const normalizedValue = String(value || "").trim().toLowerCase();
  return normalizedValue === "true" ||
    normalizedValue === "gifter" ||
    normalizedValue === "top_gifter" ||
    normalizedValue === "top gifter" ||
    normalizedValue === "member" ||
    normalizedValue === "team_member" ||
    normalizedValue === "team member" ||
    normalizedValue === "subscriber" ||
    normalizedValue === "subscribe";
}

function hasTikTokGifterBadge(data) {
  const text = JSON.stringify([
    data.badges,
    data.badgeList,
    data.userBadges,
    data.user?.badges,
    data.user?.badgeList,
    data.user?.userBadges
  ]).toLowerCase();
  return text.includes("gifter") ||
    text.includes("gift_rank") ||
    text.includes("ranklist_top_gifter") ||
    text.includes("member") ||
    text.includes("subscriber");
}

function extractTikTokGifterEventUser(data, messageType) {
  if (!messageType.includes("gift") && !data.giftId && !data.giftName) {
    return "";
  }
  return normalizeViewerId(extractTikTokUser(data));
}

function normalizeChannel(value) {
  return String(value || "").trim().toLowerCase().replace(/^#/, "");
}

function normalizeViewerId(value) {
  return String(value || "").trim().toLowerCase();
}

function createClientId() {
  return `client_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function setStatus(message) {
  sourceElements.status.textContent = message;
}

function syncSpeakerAssignments(voiceMap) {
  state.speakerAssignments = {};

  const source = voiceMap && typeof voiceMap === "object" ? voiceMap : {};
  for (const [user, voiceId] of Object.entries(source)) {
    const normalizedUser = String(user || "").trim().toLowerCase();
    const voice = state.voices.find((entry) => entry.voiceId === voiceId);
    if (normalizedUser && voice) {
      state.speakerAssignments[normalizedUser] = voice;
    }
  }
}

function syncVoiceVolumes(voiceVolumes) {
  state.voiceVolumes = {};
  const source = voiceVolumes && typeof voiceVolumes === "object" ? voiceVolumes : {};
  for (const [voiceId, rawVolume] of Object.entries(source)) {
    const volume = Number(rawVolume);
    if (Number.isFinite(volume) && volume >= 0 && volume <= 1) {
      state.voiceVolumes[voiceId] = volume;
    }
  }
}

function getVoiceVolume(voiceId) {
  const volume = Number(state.voiceVolumes[String(voiceId || "")]);
  return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
}

function serializeVoiceMap() {
  const voiceMap = {};
  for (const [user, voice] of Object.entries(state.speakerAssignments)) {
    if (user && voice?.voiceId) {
      voiceMap[user] = voice.voiceId;
    }
  }
  return voiceMap;
}

async function persistVoiceMap() {
  try {
    const response = await fetch("/api/account/voice-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        browserSourceKey: state.browserSourceKey,
        voiceMap: serializeVoiceMap()
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to save chatter voice map.");
    }
    state.currentUser = data.user;
    syncSpeakerAssignments(state.currentUser.voiceMap);
  } catch (error) {
    setStatus(error.message || "Unable to save chatter voice map.");
  }
}

function startHeartbeat() {
  if (state.heartbeatTimer) {
    window.clearInterval(state.heartbeatTimer);
  }
  sendHeartbeat();
  state.heartbeatTimer = window.setInterval(sendHeartbeat, 15000);
}

function startSettingsPoll() {
  if (state.settingsPollTimer) {
    window.clearInterval(state.settingsPollTimer);
  }
  refreshBrowserSourceConfig();
  state.settingsPollTimer = window.setInterval(refreshBrowserSourceConfig, 3000);
}

async function sendHeartbeat() {
  try {
    await fetch("/api/browser-source/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        browserSourceKey: state.browserSourceKey
      })
    });
  } catch {
    // Browser source should keep running even if the ping briefly fails.
  }
}

async function refreshBrowserSourceConfig() {
  try {
    const response = await fetch(getBrowserSourceConfigUrl(), { credentials: "include" });
    const data = await response.json();
    if (!response.ok) {
      if (!state.browserSourceKey && response.status === 401) {
        showLogin();
      }
      return;
    }

    const browserSourceWasEnabled = Boolean(state.currentUser?.liveSettings?.browserSourceEnabled);
    const twitchWasEnabled = Boolean(state.currentUser?.liveSettings?.twitchSourceEnabled);
    const tiktokWasEnabled = Boolean(state.currentUser?.liveSettings?.tiktokSourceEnabled);

    state.currentUser = data.user;
    syncSpeakerAssignments(state.currentUser.voiceMap);
    syncVoiceVolumes(state.currentUser.voiceVolumes);
    if (data.testMessage) {
      enqueueIncomingMessage(data.testMessage);
    }

    const browserSourceIsEnabled = Boolean(state.currentUser?.liveSettings?.browserSourceEnabled);
    const twitchIsEnabled = Boolean(state.currentUser?.liveSettings?.twitchSourceEnabled);
    const tiktokIsEnabled = Boolean(state.currentUser?.liveSettings?.tiktokSourceEnabled);

    if (
      browserSourceWasEnabled !== browserSourceIsEnabled ||
      twitchWasEnabled !== twitchIsEnabled ||
      tiktokWasEnabled !== tiktokIsEnabled
    ) {
      syncLiveConnections();
    } else {
      ensureLiveConnectionsHealthy();
    }
  } catch {
    // Keep the source alive even if config refresh fails briefly.
  }
}
