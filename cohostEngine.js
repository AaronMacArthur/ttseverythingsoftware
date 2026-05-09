const SUPPORTED_EVENT_TYPES = [
  "CHAT_MESSAGE",
  "CHAT_SPIKE",
  "VIEWER_RETURNED",
  "FIRST_TIME_CHATTER",
  "KEYWORD_TRIGGER",
  "ALL_CAPS_MESSAGE",
  "PLATFORM_BATTLE_UPDATE",
  "QUIET_CHAT",
  "MANUAL_TRIGGER",
  "DONATION_OR_TIP"
];

const PLATFORM_NAMES = ["Twitch", "TikTok", "Kick", "YouTube", "Rumble", "Live", "Manual", "Mic"];
const SAFE_FALLBACK_RESPONSE = "Chat tried something spicy, but I am staying out of that one.";

const PERSONALITY_PRESETS = [
  {
    id: "sarcastic-gaming-coach",
    name: "Sarcastic Gaming Coach",
    description: "A coach who roasts bad plays without getting mean.",
    toneStyle: "witty, competitive, lightly sarcastic, gaming-focused",
    safetyRules: "No slurs, protected-class insults, harassment, or personal attacks. Roast the play, not the person.",
    maxResponseWords: 24,
    defaultVoiceId: "",
    reactionFrequency: 8,
    allowedEventTypes: ["CHAT_MESSAGE", "CHAT_SPIKE", "KEYWORD_TRIGGER", "ALL_CAPS_MESSAGE", "MANUAL_TRIGGER", "DONATION_OR_TIP"],
    promptTemplate: "You are a sarcastic gaming coach for {channel}. React to {username} from {platform}. Keep it short, playful, and TTS-ready."
  },
  {
    id: "cozy-stream-buddy",
    name: "Cozy Stream Buddy",
    description: "Warm, supportive, and low-drama.",
    toneStyle: "friendly, cozy, encouraging, lightly funny",
    safetyRules: "Keep everything kind, inclusive, non-invasive, and family-safe.",
    maxResponseWords: 24,
    defaultVoiceId: "",
    reactionFrequency: 10,
    allowedEventTypes: ["CHAT_MESSAGE", "VIEWER_RETURNED", "FIRST_TIME_CHATTER", "QUIET_CHAT", "MANUAL_TRIGGER", "DONATION_OR_TIP"],
    promptTemplate: "You are a cozy co-host for {channel}. Welcome or react to {username} from {platform}. Keep it short and warm."
  },
  {
    id: "sports-announcer",
    name: "Sports Announcer",
    description: "Play-by-play hype for chat momentum.",
    toneStyle: "energetic, broadcast-style, dramatic, punchy",
    safetyRules: "No insults about identity, appearance, or real-world harm. Keep hype safe.",
    maxResponseWords: 24,
    defaultVoiceId: "",
    reactionFrequency: 7,
    allowedEventTypes: ["CHAT_MESSAGE", "CHAT_SPIKE", "PLATFORM_BATTLE_UPDATE", "MANUAL_TRIGGER", "DONATION_OR_TIP"],
    promptTemplate: "You are a sports announcer calling a live chat moment for {channel}. Platform: {platform}. Viewer: {username}."
  },
  {
    id: "horror-narrator",
    name: "Horror Narrator",
    description: "Creepy narration for spooky streams.",
    toneStyle: "ominous, suspenseful, theatrical, not graphic",
    safetyRules: "No graphic violence, self-harm, threats, sexual content, or real-person doxxing.",
    maxResponseWords: 22,
    defaultVoiceId: "",
    reactionFrequency: 9,
    allowedEventTypes: ["CHAT_MESSAGE", "KEYWORD_TRIGGER", "QUIET_CHAT", "MANUAL_TRIGGER"],
    promptTemplate: "You are a spooky but safe horror narrator for {channel}. React to {username} from {platform} in one short line."
  },
  {
    id: "chaotic-gremlin",
    name: "Chaotic Gremlin",
    description: "Fast, weird, high-energy chaos without unsafe content.",
    toneStyle: "chaotic, absurd, fast, playful",
    safetyRules: "No slurs, harassment, sexual content involving minors, doxxing, or violent encouragement.",
    maxResponseWords: 20,
    defaultVoiceId: "",
    reactionFrequency: 5,
    allowedEventTypes: ["CHAT_MESSAGE", "CHAT_SPIKE", "KEYWORD_TRIGGER", "ALL_CAPS_MESSAGE", "PLATFORM_BATTLE_UPDATE", "MANUAL_TRIGGER", "DONATION_OR_TIP"],
    promptTemplate: "You are a chaotic but safe stream co-host for {channel}. React to {username} from {platform}. Make it short and strange."
  },
  {
    id: "family-friendly-host",
    name: "Family Friendly Host",
    description: "Clean, cheerful, and safe for all ages.",
    toneStyle: "upbeat, clean, cheerful, helpful",
    safetyRules: "Always family-friendly. No profanity, bullying, sexual content, violence, or risky jokes.",
    maxResponseWords: 24,
    defaultVoiceId: "",
    reactionFrequency: 12,
    allowedEventTypes: SUPPORTED_EVENT_TYPES,
    promptTemplate: "You are a family-friendly live stream host for {channel}. React to {username} from {platform} in a clean, short line."
  }
];

const DEFAULT_COHOST_SETTINGS = {
  enabled: false,
  personalityId: "cozy-stream-buddy",
  responseFrequency: 8,
  maxResponsesPerMinute: 3,
  maxResponsesPerStream: 150,
  allowedPlatforms: ["Twitch", "TikTok", "Kick", "YouTube", "Rumble"],
  allowedEventTypes: SUPPORTED_EVENT_TYPES,
  familyFriendly: true,
  chaosLevel: 3,
  quietChatAutoPrompt: false,
  micConversationEnabled: false,
  chatCommandOnly: false,
  quietChatAfterSeconds: 120,
  platformBattleEnabled: true,
  memoryEnabled: true,
  neverRespondToBannedUsers: true,
  ignoreMutedUsers: true,
  blockedWords: [],
  userCooldownSeconds: 60,
  platformCooldownSeconds: 15,
  globalCooldownSeconds: 20,
  keywords: ["clutch", "fail", "hype", "gg", "boss", "raid", "chaos"],
  aiProvider: "ollama",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaModel: "qwen2.5:7b",
  openAiModel: "gpt-4.1-mini",
  estimatedCostPerCall: 0
};

function createDefaultCohostSettings() {
  return {
    ...DEFAULT_COHOST_SETTINGS,
    allowedPlatforms: [...DEFAULT_COHOST_SETTINGS.allowedPlatforms],
    allowedEventTypes: [...DEFAULT_COHOST_SETTINGS.allowedEventTypes],
    blockedWords: [...DEFAULT_COHOST_SETTINGS.blockedWords],
    keywords: [...DEFAULT_COHOST_SETTINGS.keywords]
  };
}

function sanitizeCustomPersonalities(value = []) {
  const source = Array.isArray(value) ? value : [];
  const builtInIds = new Set(PERSONALITY_PRESETS.map((preset) => preset.id));
  const seen = new Set();
  const personalities = [];
  for (const raw of source) {
    const preset = sanitizePersonalityPreset(raw, { custom: true });
    if (!preset || builtInIds.has(preset.id) || seen.has(preset.id)) {
      continue;
    }
    seen.add(preset.id);
    personalities.push(preset);
  }
  return personalities.slice(0, 25);
}

function getPersonalityPresets(customPersonalities = []) {
  return [
    ...PERSONALITY_PRESETS,
    ...sanitizeCustomPersonalities(customPersonalities)
  ];
}

function sanitizePersonalityPreset(value, options = {}) {
  const source = value && typeof value === "object" ? value : {};
  const name = sanitizeLabel(source.name || "", 60);
  if (!name) {
    return null;
  }
  const id = options.custom
    ? normalizePersonalityId(source.id || name)
    : String(source.id || "").trim();
  if (!id) {
    return null;
  }
  const allowedEventTypes = normalizeEventTypeList(source.allowedEventTypes, DEFAULT_COHOST_SETTINGS.allowedEventTypes);
  return {
    id,
    name,
    description: safeSnippet(source.description || "Custom stream personality.", 180),
    toneStyle: safeSnippet(source.toneStyle || source.tone || "playful, concise, stream-friendly", 180),
    safetyRules: safeSnippet(source.safetyRules || "Stay safe, non-hateful, non-sexual, and do not reveal private information.", 300),
    maxResponseWords: clampInteger(source.maxResponseWords || source.maxResponseLength, 5, 60, 24),
    defaultVoiceId: String(source.defaultVoiceId || "").trim().slice(0, 120),
    reactionFrequency: clampInteger(source.reactionFrequency, 1, 100, 8),
    allowedEventTypes,
    promptTemplate: safeSnippet(source.promptTemplate || "You are a custom AI co-host for {channel}. React to {username} from {platform} in one short TTS-ready line.", 500)
  };
}

function sanitizeCohostSettings(settings = {}, customPersonalities = []) {
  const source = settings && typeof settings === "object" ? settings : {};
  const personality = getPersonalityPreset(source.personalityId, customPersonalities);
  return {
    enabled: Boolean(source.enabled ?? DEFAULT_COHOST_SETTINGS.enabled),
    personalityId: personality.id,
    responseFrequency: clampInteger(source.responseFrequency, 1, 100, personality.reactionFrequency || DEFAULT_COHOST_SETTINGS.responseFrequency),
    maxResponsesPerMinute: clampInteger(source.maxResponsesPerMinute, 0, 60, DEFAULT_COHOST_SETTINGS.maxResponsesPerMinute),
    maxResponsesPerStream: clampInteger(source.maxResponsesPerStream, 0, 5000, DEFAULT_COHOST_SETTINGS.maxResponsesPerStream),
    allowedPlatforms: normalizePlatformList(source.allowedPlatforms),
    allowedEventTypes: normalizeEventTypeList(source.allowedEventTypes, personality.allowedEventTypes),
    familyFriendly: Boolean(source.familyFriendly ?? DEFAULT_COHOST_SETTINGS.familyFriendly),
    chaosLevel: clampInteger(source.chaosLevel, 0, 10, DEFAULT_COHOST_SETTINGS.chaosLevel),
    quietChatAutoPrompt: Boolean(source.quietChatAutoPrompt ?? DEFAULT_COHOST_SETTINGS.quietChatAutoPrompt),
    micConversationEnabled: Boolean(source.micConversationEnabled ?? DEFAULT_COHOST_SETTINGS.micConversationEnabled),
    chatCommandOnly: Boolean(source.chatCommandOnly ?? DEFAULT_COHOST_SETTINGS.chatCommandOnly),
    quietChatAfterSeconds: clampInteger(source.quietChatAfterSeconds, 30, 1800, DEFAULT_COHOST_SETTINGS.quietChatAfterSeconds),
    platformBattleEnabled: Boolean(source.platformBattleEnabled ?? DEFAULT_COHOST_SETTINGS.platformBattleEnabled),
    memoryEnabled: Boolean(source.memoryEnabled ?? DEFAULT_COHOST_SETTINGS.memoryEnabled),
    neverRespondToBannedUsers: Boolean(source.neverRespondToBannedUsers ?? DEFAULT_COHOST_SETTINGS.neverRespondToBannedUsers),
    ignoreMutedUsers: Boolean(source.ignoreMutedUsers ?? DEFAULT_COHOST_SETTINGS.ignoreMutedUsers),
    blockedWords: normalizeStringList(source.blockedWords).slice(0, 200),
    userCooldownSeconds: clampInteger(source.userCooldownSeconds, 0, 3600, DEFAULT_COHOST_SETTINGS.userCooldownSeconds),
    platformCooldownSeconds: clampInteger(source.platformCooldownSeconds, 0, 3600, DEFAULT_COHOST_SETTINGS.platformCooldownSeconds),
    globalCooldownSeconds: clampInteger(source.globalCooldownSeconds, 0, 3600, DEFAULT_COHOST_SETTINGS.globalCooldownSeconds),
    keywords: normalizeStringList(source.keywords).slice(0, 100),
    aiProvider: normalizeAiProvider(source.aiProvider || DEFAULT_COHOST_SETTINGS.aiProvider),
    ollamaBaseUrl: normalizeOllamaBaseUrl(source.ollamaBaseUrl || DEFAULT_COHOST_SETTINGS.ollamaBaseUrl),
    ollamaModel: String(source.ollamaModel || DEFAULT_COHOST_SETTINGS.ollamaModel).trim().slice(0, 120) || DEFAULT_COHOST_SETTINGS.ollamaModel,
    openAiModel: String(source.openAiModel || DEFAULT_COHOST_SETTINGS.openAiModel).trim().slice(0, 80) || DEFAULT_COHOST_SETTINGS.openAiModel,
    estimatedCostPerCall: clampNumber(source.estimatedCostPerCall, 0, 10, DEFAULT_COHOST_SETTINGS.estimatedCostPerCall)
  };
}

function normalizeCohostState(state = {}) {
  const source = state && typeof state === "object" ? state : {};
  return {
    messageCount: Number(source.messageCount) || 0,
    responseCount: Number(source.responseCount) || 0,
    aiCallCount: Number(source.aiCallCount) || 0,
    estimatedCost: Number(source.estimatedCost) || 0,
    lastResponseAt: Number(source.lastResponseAt) || 0,
    lastMessageAt: Number(source.lastMessageAt) || 0,
    lastByUser: normalizeNumberMap(source.lastByUser),
    lastByPlatform: normalizeNumberMap(source.lastByPlatform),
    recentResponses: Array.isArray(source.recentResponses) ? source.recentResponses.slice(-50) : [],
    recentChat: Array.isArray(source.recentChat) ? source.recentChat.slice(-50) : [],
    platformBattle: normalizePlatformBattle(source.platformBattle),
    overlay: normalizeOverlayState(source.overlay),
    debugLogs: Array.isArray(source.debugLogs) ? source.debugLogs.slice(-100) : []
  };
}

function normalizeViewerMemories(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {};
  for (const [key, memory] of Object.entries(source)) {
    if (memory && typeof memory === "object") {
      normalized[key] = normalizeViewerMemory(memory);
    }
  }
  return normalized;
}

function updateViewerMemory(memories, input, voiceId = "") {
  const platform = normalizePlatform(input.platform);
  const username = sanitizeLabel(input.username || "Chat", 60);
  const streamerId = sanitizeLabel(input.streamerId || "default", 80);
  const normalizedViewerId = normalizeViewerId(input.viewerId || username);
  const key = getViewerMemoryKey(streamerId, platform, normalizedViewerId);
  const nowIso = new Date().toISOString();
  const wasKnown = Boolean(memories[key]);
  const memory = normalizeViewerMemory(memories[key] || {
    streamerId,
    platform,
    username,
    normalizedViewerId,
    firstSeenAt: nowIso
  });
  const previousLastSeenAt = memory.lastSeenAt;
  memory.streamerId = streamerId;
  memory.platform = platform;
  memory.username = username;
  memory.normalizedViewerId = normalizedViewerId;
  memory.lastSeenAt = nowIso;
  memory.messageCount += 1;
  if (voiceId && !memory.assignedVoice) {
    memory.assignedVoice = voiceId;
  }
  classifyViewerTraits(memory, String(input.message || ""));
  memories[key] = memory;
  return { key, memory, isFirstSeen: !wasKnown, previousLastSeenAt };
}

function updatePlatformBattle(platformBattle, input, eventType = "CHAT_MESSAGE") {
  const battle = normalizePlatformBattle(platformBattle);
  const platform = normalizePlatform(input.platform);
  const username = sanitizeLabel(input.username || "Chat", 60);
  const normalizedViewerId = normalizeViewerId(input.viewerId || username);
  const stats = battle.platforms[platform] || createPlatformStats();
  if (["CHAT_MESSAGE", "ALL_CAPS_MESSAGE", "KEYWORD_TRIGGER"].includes(eventType)) {
    stats.messageCount += 1;
  }
  if (normalizedViewerId) {
    stats.uniqueChatters[normalizedViewerId] = true;
  }
  if (input.source === "AI_COHOST" || eventType === "MANUAL_TRIGGER") {
    stats.aiMomentCount += 1;
  }
  if (input.ttsQueued) {
    stats.ttsCount += 1;
  }
  stats.lastMessageAt = Date.now();
  battle.platforms[platform] = stats;
  battle.lastUpdatedAt = new Date().toISOString();
  return battle;
}

async function evaluateCohostMessage(input, context = {}) {
  const customPersonalities = sanitizeCustomPersonalities(context.customPersonalities);
  const settings = sanitizeCohostSettings(context.settings, customPersonalities);
  const state = normalizeCohostState(context.state);
  const memories = normalizeViewerMemories(context.memories);
  const moderation = context.moderation || {};
  const platform = normalizePlatform(input.platform);
  const username = sanitizeLabel(input.username || "Chat", 60);
  const message = String(input.message || "").trim();
  const streamerId = sanitizeLabel(input.streamerId || "default", 80);
  const memoryResult = settings.memoryEnabled
    ? updateViewerMemory(memories, { ...input, platform, username, message, streamerId }, input.assignedVoice || "")
    : { key: "", memory: null, isFirstSeen: false, previousLastSeenAt: "" };
  const battle = updatePlatformBattle(state.platformBattle, { ...input, platform, username }, "CHAT_MESSAGE");
  const eventType = detectEventType(input, {
    settings,
    state,
    memory: memoryResult.memory,
    isFirstSeen: memoryResult.isFirstSeen,
    previousLastSeenAt: memoryResult.previousLastSeenAt,
    platformBattle: battle
  });
  const decision = shouldTriggerCohost({
    input: { ...input, platform, username, message, streamerId },
    settings,
    state,
    memory: memoryResult.memory,
    eventType,
    moderation
  });

  state.messageCount += 1;
  state.lastMessageAt = Date.now();
  state.recentChat.push({ platform, username, message: safeSnippet(message, 160), eventType, createdAt: new Date().toISOString() });
  state.recentChat = state.recentChat.slice(-50);
  state.platformBattle = battle;

  if (!decision.shouldRespond) {
    addDebugLog(state, { type: "skip", eventType, platform, username, reason: decision.reason });
    return { shouldRespond: false, responseText: "", voiceId: "", priority: "normal", eventType, metadata: { reason: decision.reason }, state, memories };
  }

  const personality = getPersonalityPreset(settings.personalityId, customPersonalities);
  const aiResult = await generateCohostResponse({
    message,
    platform,
    username,
    streamerId,
    eventType,
    personality,
    settings,
    recentChat: state.recentChat.slice(-8),
    viewerMemory: buildRelevantMemory(memoryResult.memory),
    platformBattle: getPlatformBattleSummary(battle)
  }, context.provider || {});
  const moderated = moderateGeneratedResponse(aiResult.text, settings, moderation);
  const responseText = moderated.safe ? limitWords(aiResult.text, personality.maxResponseWords) : SAFE_FALLBACK_RESPONSE;

  state.responseCount += 1;
  state.aiCallCount += aiResult.usedAiProvider ? 1 : 0;
  state.estimatedCost += aiResult.usedAiProvider ? settings.estimatedCostPerCall : 0;
  state.lastResponseAt = Date.now();
  state.lastByUser[`${platform}:${normalizeViewerId(username)}`] = state.lastResponseAt;
  state.lastByPlatform[platform] = state.lastResponseAt;
  state.recentResponses.push({ signature: normalizeText(responseText), text: responseText, createdAt: new Date().toISOString() });
  state.recentResponses = state.recentResponses.slice(-50);
  state.platformBattle = updatePlatformBattle(state.platformBattle, { platform, username, source: "AI_COHOST" }, eventType);
  state.overlay = createOverlayState({ personality, responseText, eventType, platformBattle: state.platformBattle, queueStatus: context.queueStatus || {} });
  addDebugLog(state, {
    type: "response",
    eventType,
    platform,
    username,
    personalityId: personality.id,
    responseText,
    reason: decision.reason,
    cost: aiResult.usedAiProvider ? settings.estimatedCostPerCall : 0
  });

  return {
    shouldRespond: true,
    responseText,
    voiceId: personality.defaultVoiceId || input.assignedVoice || context.defaultVoiceId || "",
    priority: getPriorityForEvent(eventType),
    eventType,
    metadata: {
      reason: decision.reason,
      personalityId: personality.id,
      usedAiProvider: aiResult.usedAiProvider,
      moderationFallback: !moderated.safe,
      costEstimate: aiResult.usedAiProvider ? settings.estimatedCostPerCall : 0
    },
    state,
    memories
  };
}

async function generateManualCohostResponse(input, context = {}) {
  return evaluateCohostMessage({
    message: input.message || "Manual co-host trigger",
    platform: input.platform || "Manual",
    username: input.username || "Streamer",
    streamerId: input.streamerId || "default",
    eventType: "MANUAL_TRIGGER",
    force: true,
    assignedVoice: input.assignedVoice || ""
  }, context);
}

function shouldTriggerCohost({ input, settings, state, memory, eventType, moderation }) {
  if (!settings.enabled && !input.force) return skip("AI co-host is disabled.");
  if (!input.force && !settings.allowedPlatforms.includes(input.platform) && input.platform !== "Manual") return skip(`${input.platform} is not enabled for AI co-host.`);
  if (!settings.allowedEventTypes.includes(eventType) && !input.force) return skip(`${eventType} is not enabled for this personality.`);
  const unsafe = moderateIncomingMessage(input.message, settings, moderation);
  if (!unsafe.safe) return skip(unsafe.reason);
  const normalizedUser = normalizeViewerId(input.username);
  if (settings.neverRespondToBannedUsers && normalizeStringList(moderation.bannedChatters).includes(normalizedUser)) return skip("Viewer is banned from TTS.");
  if (settings.ignoreMutedUsers && normalizeStringList(moderation.mutedUsers).includes(normalizedUser)) return skip("Viewer is muted.");
  if (isLowValueMessage(input.message) && !input.force) return skip("Skipped low-value chat message.");
  const now = Date.now();
  if (!input.force && settings.maxResponsesPerStream && state.responseCount >= settings.maxResponsesPerStream) return skip("Max AI responses for this stream reached.");
  if (!input.force && settings.globalCooldownSeconds && now - state.lastResponseAt < settings.globalCooldownSeconds * 1000) return skip("Global co-host cooldown is active.");
  const userKey = `${input.platform}:${normalizedUser}`;
  if (!input.force && settings.userCooldownSeconds && now - (state.lastByUser[userKey] || 0) < settings.userCooldownSeconds * 1000) return skip("Viewer cooldown is active.");
  if (!input.force && settings.platformCooldownSeconds && now - (state.lastByPlatform[input.platform] || 0) < settings.platformCooldownSeconds * 1000) return skip("Platform cooldown is active.");
  if (!input.force && settings.maxResponsesPerMinute > 0) {
    const recentCount = state.recentResponses.filter((entry) => now - Date.parse(entry.createdAt || 0) < 60000).length;
    if (recentCount >= settings.maxResponsesPerMinute) return skip("Max AI responses per minute reached.");
  }
  if (!input.force && eventType === "CHAT_MESSAGE" && settings.responseFrequency > 1 && state.messageCount % settings.responseFrequency !== settings.responseFrequency - 1) {
    return skip(`Waiting for response frequency ${settings.responseFrequency}.`);
  }
  if (memory?.moderationFlags?.possibleSpammer && !input.force) return skip("Viewer memory marked this as possible spam.");
  return { shouldRespond: true, reason: input.force ? "Manual trigger." : `${eventType} matched co-host rules.` };
}

function detectEventType(input, context = {}) {
  if (input.eventType && SUPPORTED_EVENT_TYPES.includes(input.eventType)) return input.eventType;
  const message = String(input.message || "");
  const normalized = normalizeText(message);
  if (context.isFirstSeen) return "FIRST_TIME_CHATTER";
  if (context.memory && context.memory.messageCount > 1 && wasAway(context.previousLastSeenAt)) return "VIEWER_RETURNED";
  if (isAllCapsMessage(message)) return "ALL_CAPS_MESSAGE";
  if ((context.settings?.keywords || []).some((keyword) => keyword && normalized.includes(normalizeText(keyword)))) return "KEYWORD_TRIGGER";
  if (getRecentChatSpeed(context.state) >= 8) return "CHAT_SPIKE";
  if (context.settings?.platformBattleEnabled && hasPlatformBattleShift(context.platformBattle)) return "PLATFORM_BATTLE_UPDATE";
  return "CHAT_MESSAGE";
}

function getPlatformBattleSummary(platformBattle) {
  const battle = normalizePlatformBattle(platformBattle);
  const leaderboard = Object.entries(battle.platforms)
    .map(([platform, stats]) => ({
      platform,
      messageCount: Number(stats.messageCount) || 0,
      uniqueChatters: Object.keys(stats.uniqueChatters || {}).length,
      ttsCount: Number(stats.ttsCount) || 0,
      aiMomentCount: Number(stats.aiMomentCount) || 0,
      score: calculatePlatformScore(stats)
    }))
    .sort((a, b) => b.score - a.score);
  return {
    winningPlatform: leaderboard[0]?.platform || "",
    leaderboard,
    recentMomentum: leaderboard.slice(0, 3).map((entry) => `${entry.platform}: ${entry.score}`).join(", ")
  };
}

async function generateCohostResponse(input, provider = {}) {
  if (input.settings.aiProvider === "ollama" && typeof fetch === "function") {
    try {
      const text = await generateOllamaResponse(input, provider);
      if (text) return { text, usedAiProvider: true };
    } catch {
      return { text: createMockResponse(input), usedAiProvider: false };
    }
  }
  if (input.settings.aiProvider === "openai" && provider.openAiApiKey && typeof fetch === "function") {
    try {
      const text = await generateOpenAiResponse(input, provider);
      if (text) return { text, usedAiProvider: true };
    } catch {
      return { text: createMockResponse(input), usedAiProvider: false };
    }
  }
  return { text: createMockResponse(input), usedAiProvider: false };
}

async function generateOllamaResponse(input) {
  const baseUrl = normalizeOllamaBaseUrl(input.settings.ollamaBaseUrl);
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.settings.ollamaModel,
      prompt: `${buildPrompt(input)}\n\nEvent: ${input.eventType}\nPlatform: ${input.platform}\nViewer: ${input.username}\nMessage: ${safeSnippet(input.message, 240)}\n\nLine to speak:`,
      stream: false,
      options: {
        temperature: 0.8,
        num_predict: 60
      }
    })
  });
  if (!response.ok) return "";
  const data = await response.json();
  return sanitizeGeneratedText(data?.response || "");
}

async function generateOpenAiResponse(input, provider) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.openAiApiKey}` },
    body: JSON.stringify({
      model: input.settings.openAiModel,
      temperature: 0.8,
      max_tokens: 80,
      messages: [
        { role: "system", content: buildPrompt(input) },
        { role: "user", content: `Event: ${input.eventType}\nPlatform: ${input.platform}\nViewer: ${input.username}\nMessage: ${safeSnippet(input.message, 240)}` }
      ]
    })
  });
  if (!response.ok) return "";
  const data = await response.json();
  return sanitizeGeneratedText(data?.choices?.[0]?.message?.content || "");
}

function buildPrompt(input) {
  const personality = input.personality;
  return [
    personality.promptTemplate.replaceAll("{channel}", input.streamerId).replaceAll("{username}", input.username).replaceAll("{platform}", input.platform),
    `Tone/style: ${personality.toneStyle}.`,
    `Safety rules: ${personality.safetyRules}`,
    "Never quote unsafe chat verbatim. Do not reveal secrets, keys, or private data.",
    `Use at most ${personality.maxResponseWords} words. Return only the line to speak.`,
    "Use plain ASCII text only. No emoji, markdown, hashtags, or stage directions.",
    input.viewerMemory ? `Relevant viewer memory: ${input.viewerMemory}` : "",
    input.platformBattle?.winningPlatform ? `Platform battle: ${input.platformBattle.recentMomentum}` : ""
  ].filter(Boolean).join("\n");
}

function createMockResponse(input) {
  const battle = input.platformBattle || {};
  if (input.eventType === "PLATFORM_BATTLE_UPDATE" && battle.winningPlatform) return `${battle.winningPlatform} chat is taking over right now.`;
  if (input.eventType === "FIRST_TIME_CHATTER") return `Welcome in, ${input.username}. Chat just gained a new main character.`;
  if (input.eventType === "VIEWER_RETURNED") return `${input.username} returns to ${input.platform}, and the plot thickens.`;
  if (input.eventType === "ALL_CAPS_MESSAGE") return `${input.username} brought caps lock energy. The room has been warned.`;
  if (input.eventType === "CHAT_SPIKE") return `${input.platform} chat just hit the gas. Try to look calm.`;
  if (input.eventType === "QUIET_CHAT") return "It got quiet in here. Somebody say something mildly legendary.";
  if (input.eventType === "MANUAL_TRIGGER") return `${input.personality.name} is online and judging the vibes professionally.`;
  if (input.eventType === "DONATION_OR_TIP") return `${input.username} just powered up the stream. That deserves a dramatic zoom.`;
  return `${input.username} from ${input.platform} just added fuel to the stream.`;
}

function moderateIncomingMessage(message, settings, moderation = {}) {
  const normalized = normalizeText(message);
  if (!normalized) return { safe: false, reason: "Empty message." };
  const blockedWords = new Set([
    ...normalizeStringList(settings.blockedWords),
    ...normalizeStringList(moderation.bannedWords),
    ...normalizeStringList(moderation.ttsAntiSpamBlockedPhrases)
  ]);
  for (const word of blockedWords) {
    if (word && (` ${normalized} `).includes(` ${word} `)) return { safe: false, reason: `Blocked word or phrase: ${word}` };
  }
  if (containsSecretLikeText(message)) return { safe: false, reason: "Message looks like it contains a secret or token." };
  if (containsUnsafePattern(normalized)) return { safe: false, reason: "Message matched unsafe content patterns." };
  return { safe: true, reason: "" };
}

function moderateGeneratedResponse(text, settings, moderation = {}) {
  const incoming = moderateIncomingMessage(text, settings, moderation);
  if (!incoming.safe) return incoming;
  if (String(text || "").length > 220) return { safe: false, reason: "Generated response was too long." };
  return { safe: true, reason: "" };
}

function classifyViewerTraits(memory, message) {
  const tags = new Set(memory.traits || []);
  const flags = memory.moderationFlags || {};
  const normalized = normalizeText(message);
  if (memory.messageCount >= 25) tags.add("frequent chatter");
  if (isAllCapsMessage(message)) memory.allCapsCount += 1;
  if (memory.allCapsCount >= 3) tags.add("all caps user");
  if (/\b(backseat|you should|why didnt|wrong way|do this|skill issue)\b/.test(normalized)) tags.add("backseater");
  if (/\b(great|love|nice|good job|lets go|gg|awesome|support)\b/.test(normalized)) tags.add("positive/supportive");
  if (/\b(chaos|unhinged|wild|lmao|spam|yell)\b/.test(normalized)) tags.add("chaotic");
  if (memory.messageCount >= 5 && memory.allCapsCount / memory.messageCount > 0.7) flags.possibleSpammer = true;
  memory.traits = [...tags].slice(0, 12);
  memory.moderationFlags = flags;
  memory.aiSummary = memory.traits.length ? `${memory.username} is known for ${memory.traits.slice(0, 3).join(", ")}.` : "";
}

function buildRelevantMemory(memory) {
  if (!memory) return "";
  const parts = [];
  if (memory.messageCount > 1) parts.push(`${memory.username} has chatted ${memory.messageCount} times`);
  if (memory.traits?.length) parts.push(`traits: ${memory.traits.slice(0, 4).join(", ")}`);
  if (memory.runningJokes?.length) parts.push(`running jokes: ${memory.runningJokes.slice(0, 2).join(", ")}`);
  if (memory.aiSummary) parts.push(memory.aiSummary);
  return parts.join("; ").slice(0, 300);
}

function createOverlayState({ personality, responseText, eventType, platformBattle, queueStatus }) {
  return normalizeOverlayState({
    cohostName: personality.name,
    personalityId: personality.id,
    mode: personality.name,
    speaking: true,
    subtitleText: responseText,
    mood: moodForEvent(eventType),
    eventType,
    platformBattle: getPlatformBattleSummary(platformBattle),
    queueStatus,
    updatedAt: new Date().toISOString()
  });
}

function normalizeOverlayState(overlay = {}) {
  const source = overlay && typeof overlay === "object" ? overlay : {};
  return {
    cohostName: sanitizeLabel(source.cohostName || "AI Co-Host", 60),
    personalityId: String(source.personalityId || "cozy-stream-buddy"),
    mode: sanitizeLabel(source.mode || "Cozy Stream Buddy", 80),
    speaking: Boolean(source.speaking),
    subtitleText: safeSnippet(source.subtitleText || "", 240),
    mood: sanitizeLabel(source.mood || "Idle", 40),
    eventType: SUPPORTED_EVENT_TYPES.includes(source.eventType) ? source.eventType : "CHAT_MESSAGE",
    platformBattle: source.platformBattle || { winningPlatform: "", leaderboard: [], recentMomentum: "" },
    queueStatus: source.queueStatus || {},
    updatedAt: source.updatedAt || ""
  };
}

function getPriorityForEvent(eventType) {
  if (eventType === "DONATION_OR_TIP" || eventType === "MANUAL_TRIGGER") return "high";
  if (eventType === "QUIET_CHAT") return "low";
  return "normal";
}

function getPersonalityPreset(id, customPersonalities = []) {
  return getPersonalityPresets(customPersonalities).find((preset) => preset.id === id) || PERSONALITY_PRESETS[1];
}

function getViewerMemoryKey(streamerId, platform, normalizedViewerId) {
  return `${sanitizeLabel(streamerId || "default", 80)}:${normalizePlatform(platform)}:${normalizeViewerId(normalizedViewerId)}`;
}

function normalizeViewerMemory(memory) {
  return {
    streamerId: sanitizeLabel(memory.streamerId || "default", 80),
    platform: normalizePlatform(memory.platform),
    username: sanitizeLabel(memory.username || "Chat", 60),
    normalizedViewerId: normalizeViewerId(memory.normalizedViewerId || memory.username),
    firstSeenAt: memory.firstSeenAt || new Date().toISOString(),
    lastSeenAt: memory.lastSeenAt || "",
    messageCount: Number(memory.messageCount) || 0,
    assignedVoice: String(memory.assignedVoice || ""),
    traits: Array.isArray(memory.traits) ? memory.traits.map((tag) => sanitizeLabel(tag, 40)).filter(Boolean).slice(0, 20) : [],
    runningJokes: Array.isArray(memory.runningJokes) ? memory.runningJokes.map((tag) => sanitizeLabel(tag, 80)).filter(Boolean).slice(0, 20) : [],
    moderationFlags: memory.moderationFlags && typeof memory.moderationFlags === "object" ? memory.moderationFlags : {},
    aiSummary: safeSnippet(memory.aiSummary || "", 300),
    allCapsCount: Number(memory.allCapsCount) || 0
  };
}

function normalizePlatformBattle(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const platforms = {};
  for (const [platform, stats] of Object.entries(source.platforms || {})) platforms[normalizePlatform(platform)] = normalizePlatformStats(stats);
  return { platforms, lastUpdatedAt: source.lastUpdatedAt || "" };
}

function normalizePlatformStats(stats = {}) {
  const source = stats && typeof stats === "object" ? stats : {};
  return {
    messageCount: Number(source.messageCount) || 0,
    uniqueChatters: source.uniqueChatters && typeof source.uniqueChatters === "object" ? source.uniqueChatters : {},
    ttsCount: Number(source.ttsCount) || 0,
    aiMomentCount: Number(source.aiMomentCount) || 0,
    lastMessageAt: Number(source.lastMessageAt) || 0
  };
}

function createPlatformStats() {
  return { messageCount: 0, uniqueChatters: {}, ttsCount: 0, aiMomentCount: 0, lastMessageAt: 0 };
}

function calculatePlatformScore(stats) {
  const normalized = normalizePlatformStats(stats);
  return normalized.messageCount + Object.keys(normalized.uniqueChatters).length * 3 + normalized.ttsCount * 2 + normalized.aiMomentCount * 4;
}

function hasPlatformBattleShift(platformBattle) {
  const summary = getPlatformBattleSummary(platformBattle);
  return summary.leaderboard.length > 1 && summary.leaderboard[0].score > 0 && summary.leaderboard[0].score - summary.leaderboard[1].score <= 3;
}

function getRecentChatSpeed(state) {
  const now = Date.now();
  return (state.recentChat || []).filter((entry) => now - Date.parse(entry.createdAt || 0) < 15000).length;
}

function wasAway(lastSeenAt) {
  const time = Date.parse(lastSeenAt || "");
  return Number.isFinite(time) && Date.now() - time > 1000 * 60 * 30;
}

function isAllCapsMessage(message) {
  const letters = String(message || "").replace(/[^a-z]/gi, "");
  return letters.length >= 6 && letters === letters.toUpperCase();
}

function isLowValueMessage(message) {
  const normalized = normalizeText(message);
  return normalized.length < 3 || /^(lol|lmao|haha|ok|k|gg|hi|hey|yo|first|nice)$/.test(normalized);
}

function containsSecretLikeText(message) {
  return /\b(api[_-]?key|secret|token|password)\b/i.test(message) || /sk-[a-zA-Z0-9_-]{12,}/.test(message);
}

function containsUnsafePattern(normalized) {
  return /\b(kill yourself|kys|dox|doxx|address is|minor nude|sexual minor)\b/.test(normalized);
}

function moodForEvent(eventType) {
  return {
    CHAT_SPIKE: "Hyped",
    VIEWER_RETURNED: "Nostalgic",
    FIRST_TIME_CHATTER: "Welcoming",
    KEYWORD_TRIGGER: "Alert",
    ALL_CAPS_MESSAGE: "Loud",
    PLATFORM_BATTLE_UPDATE: "Competitive",
    QUIET_CHAT: "Curious",
    MANUAL_TRIGGER: "On Air",
    DONATION_OR_TIP: "Celebrating"
  }[eventType] || "Chatting";
}

function addDebugLog(state, item) {
  state.debugLogs.unshift({ ...item, createdAt: new Date().toISOString() });
  state.debugLogs = state.debugLogs.slice(0, 100);
}

function skip(reason) {
  return { shouldRespond: false, reason };
}

function normalizePlatform(value) {
  const platform = sanitizeLabel(value || "Live", 40);
  return PLATFORM_NAMES.find((entry) => entry.toLowerCase() === platform.toLowerCase()) || platform || "Live";
}

function normalizePersonalityId(value) {
  const id = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id.slice(0, 80);
}

function normalizePlatformList(value) {
  const source = Array.isArray(value) ? value : DEFAULT_COHOST_SETTINGS.allowedPlatforms;
  const normalized = [...new Set(source.map(normalizePlatform).filter(Boolean))];
  return normalized.length ? normalized : [...DEFAULT_COHOST_SETTINGS.allowedPlatforms];
}

function normalizeEventTypeList(value, fallback = DEFAULT_COHOST_SETTINGS.allowedEventTypes) {
  const source = Array.isArray(value) ? value : fallback;
  const normalized = [...new Set(source.map((entry) => String(entry || "").trim()).filter((entry) => SUPPORTED_EVENT_TYPES.includes(entry)))];
  return normalized.length ? normalized : [...fallback];
}

function normalizeAiProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  return ["mock", "ollama", "openai"].includes(provider) ? provider : DEFAULT_COHOST_SETTINGS.aiProvider;
}

function normalizeOllamaBaseUrl(value) {
  const url = String(value || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^/]+/i.test(url) ? url.slice(0, 160) : DEFAULT_COHOST_SETTINGS.ollamaBaseUrl;
}

function normalizeStringList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n|,/);
  return [...new Set(source.map((entry) => normalizeText(entry)).filter(Boolean))];
}

function normalizeNumberMap(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {};
  for (const [key, number] of Object.entries(source)) normalized[String(key).slice(0, 120)] = Number(number) || 0;
  return normalized;
}

function normalizeViewerId(value) {
  return String(value || "").trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_.-]/g, "");
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/https?:\/\/\S+|www\.\S+/gi, " ").replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeLabel(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeSnippet(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeGeneratedText(value) {
  return String(value || "").replace(/[^\x20-\x7E]/g, "").replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
}

function limitWords(value, maxWords) {
  return sanitizeGeneratedText(value).split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");
}

function clampInteger(value, min, max, fallback) {
  return Math.floor(clampNumber(value, min, max, fallback));
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
}

module.exports = {
  DEFAULT_COHOST_SETTINGS,
  PERSONALITY_PRESETS,
  SAFE_FALLBACK_RESPONSE,
  SUPPORTED_EVENT_TYPES,
  buildPrompt,
  createDefaultCohostSettings,
  detectEventType,
  evaluateCohostMessage,
  generateManualCohostResponse,
  getPersonalityPreset,
  getPersonalityPresets,
  getPlatformBattleSummary,
  getPriorityForEvent,
  getViewerMemoryKey,
  moderateGeneratedResponse,
  moderateIncomingMessage,
  normalizeCohostState,
  normalizeOverlayState,
  normalizeViewerMemories,
  sanitizeCohostSettings,
  sanitizeCustomPersonalities,
  sanitizePersonalityPreset,
  updatePlatformBattle,
  updateViewerMemory
};
