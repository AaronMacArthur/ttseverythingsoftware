const DEFAULT_MODERATION = {
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
  ttsAntiSpamBlockedSounds: [],
  bannedChatters: [],
  bannedWords: ["azhh"]
};
const HARD_BLOCKED_TTS_TERM_REGEX = /\b(?:n[1!i][g9@q][g9@q][3e]?[r]?|n[1!i][g9@q][g9@q][a@4]|n[1!i][g9@q]{2,}[a@43e1!ur0h]*|kn[e3i1!]{1,3}g[g9@q]*[a@4uhre3]*|kn[e3i][e3]?[g9@q]{2,}|k?nie[g9@q]{2,}|k?n[i1!e3][g9@q]{2,}|(?:nick|nik|mick|mk)[g9@q]{2,}[a@4uhre3]*|(?:nick|nik|mick)[g9@q]+(?:gur|guh|gah|gurr|guhh|gahh|ger|gro)*|n[iy][e3]?[g9@q]{2,}|ne{1,2}g[g9@q]{2,}|naig[g9@q]+|n[i1!e3][e3]?g[g9@q]{2,}|(?:knee|kni|knick|nikk|mick|nie|ny|neeg|naig|knig|kneg)[g9@q]{2,}[a@4uhre30!1]*|n\s+[i1!]\s*[g9@q]\s*[g9@q]|n\s+i\s+g+\s+[e3a@4]|[n]\s+[i1!e3]\s+[g9@q]\s+[g9@q]|n[1!i][g9@q][g9@q][3e][r]?|n[1!i][g9@q][3e][g9@q]|[kmn][i1!e3y]{1,2}[g9@q]{2,}[a@43e1!ur0h]{0,8})\b/i;
const HARD_BLOCKED_TTS_EXACT_REGEX = /\b(?:n[\W_]*word|enword|n[\W_]*bomb|the[\W_]*n|n[\W_]*b[0o]mb|n[\W_]*w[0o]rd|nig[\W_]*ger|nigg|nigga|nigger)\b/i;
const HARD_BLOCKED_TTS_SUBSTRING_REGEX = /(?:n[1!i][g9@q]{2,}[a@43e1!ur0h]{0,8}|[kmn][i1!e3y]{1,2}[g9@q]{2,}[a@43e1!ur0h]{0,8}|n[\W_]*word|enword|n[\W_]*bomb|the[\W_]*n|n[\W_]*b[0o]mb|n[\W_]*w[0o]rd|nig[\W_]*ger|nigg|nigga|nigger)/i;

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
  fallbackVoiceId: "",
  fixedVoiceProvider: "elevenlabs",
  fixedVoiceId: "",
  modelId: "eleven_flash_v2_5",
  elevenLabsModelId: "eleven_flash_v2_5",
  cartesiaModelId: "sonic-3",
  stability: 0.45,
  similarityBoost: 0.75,
  speed: 1
};

const CARTESIA_VOICE_PRESETS = [
  { name: "Katie", voiceId: "f786b574-daa5-4673-aa0c-cbe3e8534c02" },
  { name: "DerdleZed", voiceId: "6376f26b-718a-48b2-83e8-89513c7b1312" },
  { name: "Donald", voiceId: "258fdf9f-80c0-4c73-abb7-e0905e30cd64" }
];
const SAVED_SECRET_MASK = "******";

async function readTtsResponseJson(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  await response.text();
  const statusText = response.status ? ` (${response.status})` : "";
  throw new Error(`${fallbackMessage}${statusText}: TTS returned an HTML page instead of JSON. Refresh the dashboard, then reconnect TikTok Live.`);
}

const elements = {
  adminNavLink: document.getElementById("adminNavLink"),
  antiSpamLog: document.getElementById("antiSpamLog"),
  assignmentCount: document.getElementById("assignmentCount"),
  assignmentList: document.getElementById("assignmentList"),
  assignmentSearch: document.getElementById("assignmentSearch"),
  audioPlayer: document.getElementById("audioPlayer"),
  bannedChatters: document.getElementById("bannedChatters"),
  bannedChattersList: document.getElementById("bannedChattersList"),
  bannedWords: document.getElementById("bannedWords"),
  bannedWordsFileInput: document.getElementById("bannedWordsFileInput"),
  bannedWordsUploadStatus: document.getElementById("bannedWordsUploadStatus"),
  banTestWordButton: document.getElementById("banTestWordButton"),
  browserSourceEnabled: document.getElementById("browserSourceEnabled"),
  browserSourceUrl: document.getElementById("browserSourceUrl"),
  billingRenewalText: document.getElementById("billingRenewalText"),
  billingStatusText: document.getElementById("billingStatusText"),
  channelName: document.getElementById("channelName"),
  clearAssignmentsButton: document.getElementById("clearAssignmentsButton"),
  clearCombinedChatButton: document.getElementById("clearCombinedChatButton"),
  clearGiftDonoButton: document.getElementById("clearGiftDonoButton"),
  clearQueueButton: document.getElementById("clearQueueButton"),
  combinedChatCount: document.getElementById("combinedChatCount"),
  combinedChatList: document.getElementById("combinedChatList"),
  connectButton: document.getElementById("connectButton"),
  cartesiaProviderEnabled: document.getElementById("cartesiaProviderEnabled"),
  bothProvidersEnabled: document.getElementById("bothProvidersEnabled"),
  copyBrowserSourceButton: document.getElementById("copyBrowserSourceButton"),
  copyObsPepeSourceButton: document.getElementById("copyObsPepeSourceButton"),
  captureMuteHotkeyButton: document.getElementById("captureMuteHotkeyButton"),
  clearMuteHotkeyButton: document.getElementById("clearMuteHotkeyButton"),
  dashboardLogoutButton: document.getElementById("dashboardLogoutButton"),
  addCustomVoiceButton: document.getElementById("addCustomVoiceButton"),
  customVoiceProvider: document.getElementById("customVoiceProvider"),
  customVoiceName: document.getElementById("customVoiceName"),
  customVoiceId: document.getElementById("customVoiceId"),
  customVoiceList: document.getElementById("customVoiceList"),
  customPersonalityDescription: document.getElementById("customPersonalityDescription"),
  customPersonalityEventList: document.getElementById("customPersonalityEventList"),
  customPersonalityFrequency: document.getElementById("customPersonalityFrequency"),
  customPersonalityMaxWords: document.getElementById("customPersonalityMaxWords"),
  customPersonalityName: document.getElementById("customPersonalityName"),
  customPersonalityPrompt: document.getElementById("customPersonalityPrompt"),
  customPersonalitySafety: document.getElementById("customPersonalitySafety"),
  customPersonalitySelect: document.getElementById("customPersonalitySelect"),
  customPersonalityTone: document.getElementById("customPersonalityTone"),
  customPersonalityVoiceId: document.getElementById("customPersonalityVoiceId"),
  disconnectButton: document.getElementById("disconnectButton"),
  desktopApiKey: document.getElementById("desktopApiKey"),
  desktopCartesiaApiKey: document.getElementById("desktopCartesiaApiKey"),
  desktopCartesiaVoicePreset: document.getElementById("desktopCartesiaVoicePreset"),
  desktopCartesiaVoiceId: document.getElementById("desktopCartesiaVoiceId"),
  desktopChannelName: document.getElementById("desktopChannelName"),
  desktopKickChannel: document.getElementById("desktopKickChannel"),
  desktopRumbleApiUrl: document.getElementById("desktopRumbleApiUrl"),
  desktopYoutubeApiKey: document.getElementById("desktopYoutubeApiKey"),
  desktopYoutubeLiveChatId: document.getElementById("desktopYoutubeLiveChatId"),
  desktopSettingsPanel: document.getElementById("desktopSettingsPanel"),
  desktopSettingsStatus: document.getElementById("desktopSettingsStatus"),
  fastChatMessageThreshold: document.getElementById("fastChatMessageThreshold"),
  fastChatSkipBehavior: document.getElementById("fastChatSkipBehavior"),
  fastChatWindowSeconds: document.getElementById("fastChatWindowSeconds"),
  feedback: document.getElementById("feedback"),
  elevenLabsProviderEnabled: document.getElementById("elevenLabsProviderEnabled"),
  followersOnly: document.getElementById("followersOnly"),
  kickSourceEnabled: document.getElementById("kickSourceEnabled"),
  kickTtsProvider: document.getElementById("kickTtsProvider"),
  kickStatus: document.getElementById("kickStatus"),
  liveForm: document.getElementById("liveForm"),
  logoutButton: document.getElementById("logoutButton"),
  manageBillingButton: document.getElementById("manageBillingButton"),
  maxMessageCharacters: document.getElementById("maxMessageCharacters"),
  maxQueueSize: document.getElementById("maxQueueSize"),
  messagePauseSeconds: document.getElementById("messagePauseSeconds"),
  minimizeToTrayOnExit: document.getElementById("minimizeToTrayOnExit"),
  userCooldownSeconds: document.getElementById("userCooldownSeconds"),
  minLength: document.getElementById("minLength"),
  modelId: document.getElementById("modelId"),
  elevenLabsModelId: document.getElementById("elevenLabsModelId"),
  cartesiaModelId: document.getElementById("cartesiaModelId"),
  fixedVoiceId: document.getElementById("fixedVoiceId"),
  fixedVoicePanel: document.getElementById("fixedVoicePanel"),
  fixedVoiceProvider: document.getElementById("fixedVoiceProvider"),
  giftDonoCount: document.getElementById("giftDonoCount"),
  giftDonoList: document.getElementById("giftDonoList"),
  providerRoutingPanel: document.getElementById("providerRoutingPanel"),
  muteHotkey: document.getElementById("muteHotkey"),
  muteHotkeyStatus: document.getElementById("muteHotkeyStatus"),
  neverSkipMidSpeech: document.getElementById("neverSkipMidSpeech"),
  nowPlayingText: document.getElementById("nowPlayingText"),
  nowPlayingTitle: document.getElementById("nowPlayingTitle"),
  obsStatus: document.getElementById("obsStatus"),
  obsPepeSourceUrl: document.getElementById("obsPepeSourceUrl"),
  planStatus: document.getElementById("planStatus"),
  popoutCombinedChatButton: document.getElementById("popoutCombinedChatButton"),
  popoutGiftDonoButton: document.getElementById("popoutGiftDonoButton"),
  previewWordButton: document.getElementById("previewWordButton"),
  queueList: document.getElementById("queueList"),
  remainingStatus: document.getElementById("remainingStatus"),
  runWordTesterButton: document.getElementById("runWordTesterButton"),
  runtimeOwnerStatus: document.getElementById("runtimeOwnerStatus"),
  resetAppButton: document.getElementById("resetAppButton"),
  saveApiKeysButton: document.getElementById("saveApiKeysButton"),
  saveAssignmentsButton: document.getElementById("saveAssignmentsButton"),
  saveCustomPersonalityButton: document.getElementById("saveCustomPersonalityButton"),
  saveModerationButton: document.getElementById("saveModerationButton"),
  saveDesktopSettingsButton: document.getElementById("saveDesktopSettingsButton"),
  saveSettingsButton: document.getElementById("saveSettingsButton"),
  sessionStatus: document.getElementById("sessionStatus"),
  newCustomPersonalityButton: document.getElementById("newCustomPersonalityButton"),
  deleteCustomPersonalityButton: document.getElementById("deleteCustomPersonalityButton"),
  skipCommands: document.getElementById("skipCommands"),
  skipEmotesOnly: document.getElementById("skipEmotesOnly"),
  skipLinks: document.getElementById("skipLinks"),
  speakMentionsOnly: document.getElementById("speakMentionsOnly"),
  speed: document.getElementById("speed"),
  speedValue: document.getElementById("speedValue"),
  streamerbotEndpoint: document.getElementById("streamerbotEndpoint"),
  streamerbotSourceEnabled: document.getElementById("streamerbotSourceEnabled"),
  streamerbotStatus: document.getElementById("streamerbotStatus"),
  stability: document.getElementById("stability"),
  stabilityValue: document.getElementById("stabilityValue"),
  similarityBoost: document.getElementById("similarityBoost"),
  similarityValue: document.getElementById("similarityValue"),
  tiktokStatus: document.getElementById("tiktokStatus"),
  tiktokSourceEnabled: document.getElementById("tiktokSourceEnabled"),
  tiktokTtsProvider: document.getElementById("tiktokTtsProvider"),
  tiktokUsername: document.getElementById("tiktokUsername"),
  ttsProvider: document.getElementById("ttsProvider"),
  ttsProviderMode: document.getElementById("ttsProviderMode"),
  ttsProviderLabel: document.getElementById("ttsProviderLabel"),
  toggleRecentButton: document.getElementById("toggleRecentButton"),
  toggleMuteButton: document.getElementById("toggleMuteButton"),
  ttsMuteState: document.getElementById("ttsMuteState"),
  ttsAntiSpamAction: document.getElementById("ttsAntiSpamAction"),
  ttsAntiSpamBlockedPhrases: document.getElementById("ttsAntiSpamBlockedPhrases"),
  ttsAntiSpamBlockedSounds: document.getElementById("ttsAntiSpamBlockedSounds"),
  ttsAntiSpamEnabled: document.getElementById("ttsAntiSpamEnabled"),
  ttsAntiSpamMaxAlternatingPatternCount: document.getElementById("ttsAntiSpamMaxAlternatingPatternCount"),
  ttsAntiSpamMaxRepeatedShortTokenCount: document.getElementById("ttsAntiSpamMaxRepeatedShortTokenCount"),
  ttsAntiSpamMaxRepeatedWordCount: document.getElementById("ttsAntiSpamMaxRepeatedWordCount"),
  twitchStatus: document.getElementById("twitchStatus"),
  twitchSourceEnabled: document.getElementById("twitchSourceEnabled"),
  twitchTtsProvider: document.getElementById("twitchTtsProvider"),
  rumbleSourceEnabled: document.getElementById("rumbleSourceEnabled"),
  rumbleTtsProvider: document.getElementById("rumbleTtsProvider"),
  rumbleStatus: document.getElementById("rumbleStatus"),
  setupAccountStep: document.getElementById("setupAccountStep"),
  setupSourcesStep: document.getElementById("setupSourcesStep"),
  setupObsStep: document.getElementById("setupObsStep"),
  voiceVolumeLabel: document.getElementById("voiceVolumeLabel"),
  voiceVolumeValue: document.getElementById("voiceVolumeValue"),
  voiceVolumeVoice: document.getElementById("voiceVolumeVoice"),
  voiceMode: document.getElementById("voiceMode"),
  wordTesterInput: document.getElementById("wordTesterInput"),
  wordTesterResult: document.getElementById("wordTesterResult"),
  youtubeSourceEnabled: document.getElementById("youtubeSourceEnabled"),
  youtubeTtsProvider: document.getElementById("youtubeTtsProvider"),
  youtubeStatus: document.getElementById("youtubeStatus")
};

const queue = [];
const combinedChatMessages = [];
const giftDonoEvents = [];
const pendingMessages = [];
const playbackQueue = [];
const speakerAssignments = {};
const tiktokFollowers = new Set();
const tiktokGifters = new Set();
const recentIncomingMessages = new Map();
const recentSpeakerActivity = new Map();
const recentMessageTimestamps = [];
const antiSpamEvents = [];
const MAX_CLIENT_CHAT_HISTORY = 500;
const INCOMING_DUPLICATE_WINDOW_MS = 5000;
let voiceVolumes = {};
let draftVoiceVolumes = {};

let builtInVoices = [];
let currentUser = null;
let desktopMode = false;
let desktopSettings = null;
let currentPlayingClip = null;
let currentChannel = loadSavedChannel();
let isGenerating = false;
let isPlayingQueuedClip = false;
let moderationDirty = false;
let rotateIndex = 0;
let reconnectTimer = null;
let sessionSyncTimer = null;
let suppressReconnect = false;
let suppressReconnectTimer = null;
let playbackDelayTimer = null;
let recentExpanded = false;
let ttsMuted = false;
let obsPepeStatusSignature = "";
let capturingMuteHotkey = false;
let hotkeyAudioContext = null;
let tiktokSocket = null;
let tiktokConnectInFlight = false;
let tiktokAuthInFlight = false;
let twitchSocket = null;
let kickSocket = null;
let kickConnectInFlight = false;
let youtubePollTimer = null;
let youtubeNextPageToken = "";
let rumblePollTimer = null;
const rumbleSeenMessages = new Set();
const combinedChatChannel = typeof BroadcastChannel === "function" ? new BroadcastChannel("tts-everything-combined-chat") : null;
const giftDonoChannel = typeof BroadcastChannel === "function" ? new BroadcastChannel("tts-everything-gift-dono") : null;
let livePausedManually = false;
let browserSourceOwnsPlayback = false;
let voiceMapSavePromise = Promise.resolve();
let streamerbotSocket = null;
let streamerbotConnectInFlight = false;

initializeDashboard();

async function initializeDashboard() {
  bindEvents();
  bindDesktopPages();
  bindCombinedChatChannel();
  bindGiftDonoChannel();
  renderObsPepeSourceUrl();
  renderCombinedChat();
  renderGiftDonoEvents();
  renderAssignments();
  renderQueue();
  updateSliderLabels();
  applyModerationToForm(DEFAULT_MODERATION);
  applyLiveSettingsToForm(DEFAULT_LIVE_SETTINGS);
  await Promise.all([loadConfig(), loadSession()]);
  await loadRecentSpoken();
  applySavedChannel();
  refreshConnectionControls();
  runWordTester();
  await ensureDesiredLiveState({ silent: true, forceRefresh: true });
  startSessionSync();
}

function bindEvents() {
  elements.liveForm.addEventListener("submit", handleConnect);
  elements.clearAssignmentsButton.addEventListener("click", resetAssignments);
  elements.clearCombinedChatButton?.addEventListener("click", clearCombinedChat);
  elements.clearGiftDonoButton?.addEventListener("click", clearGiftDonoEvents);
  elements.saveAssignmentsButton.addEventListener("click", saveVoiceAssignments);
  elements.assignmentSearch.addEventListener("input", renderAssignments);
  elements.clearQueueButton.addEventListener("click", clearQueue);
  elements.copyBrowserSourceButton.addEventListener("click", () => copyField(elements.browserSourceUrl, "OBS browser source URL copied."));
  elements.copyObsPepeSourceButton?.addEventListener("click", () => copyField(elements.obsPepeSourceUrl, "OBS Pepe browser source URL copied."));
  elements.tiktokSourceEnabled.addEventListener("change", handleTikTokSourceToggle);
  elements.popoutCombinedChatButton?.addEventListener("click", openCombinedChatWindow);
  elements.popoutGiftDonoButton?.addEventListener("click", openGiftDonoWindow);
  elements.captureMuteHotkeyButton.addEventListener("click", beginMuteHotkeyCapture);
  elements.clearMuteHotkeyButton.addEventListener("click", clearMuteHotkey);
  elements.elevenLabsProviderEnabled.addEventListener("change", () => setProviderFromCheckbox("elevenlabs"));
  elements.cartesiaProviderEnabled.addEventListener("change", () => setProviderFromCheckbox("cartesia"));
  elements.bothProvidersEnabled.addEventListener("change", () => setProviderFromCheckbox("both"));
  elements.dashboardLogoutButton.addEventListener("click", handleLogout);
  elements.disconnectButton.addEventListener("click", handleManualDisconnect);
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.manageBillingButton.addEventListener("click", handleManageBilling);
  elements.banTestWordButton.addEventListener("click", banTestWord);
  elements.previewWordButton.addEventListener("click", previewTestWord);
  elements.runWordTesterButton.addEventListener("click", runWordTester);
  elements.bannedWordsFileInput?.addEventListener("change", handleBannedWordsFileUpload);
  elements.saveDesktopSettingsButton.addEventListener("click", saveDesktopSettings);
  elements.saveApiKeysButton.addEventListener("click", saveDesktopSettings);
  elements.addCustomVoiceButton.addEventListener("click", addCustomVoice);
  elements.desktopCartesiaVoicePreset.addEventListener("change", handleCartesiaVoicePresetChange);
  elements.saveModerationButton.addEventListener("click", saveAllSettings);
  elements.saveSettingsButton.addEventListener("click", saveEverything);
  elements.resetAppButton.addEventListener("click", resetApp);
  elements.toggleMuteButton.addEventListener("click", toggleTtsMute);
  elements.toggleRecentButton.addEventListener("click", toggleRecentMessages);
  elements.voiceVolumeValue.addEventListener("input", handleVoiceVolumeInput);
  elements.voiceVolumeVoice.addEventListener("change", renderSelectedVoiceVolume);
  elements.wordTesterInput.addEventListener("input", runWordTester);
  elements.audioPlayer.addEventListener("play", syncObsPepeSpeakingState);
  elements.audioPlayer.addEventListener("pause", syncObsPepeSpeakingState);
  elements.audioPlayer.addEventListener("ended", handleAudioPlaybackFinished);
  elements.audioPlayer.addEventListener("error", handleAudioPlaybackFinished);
  elements.stability.addEventListener("input", updateSliderLabels);
  elements.similarityBoost.addEventListener("input", updateSliderLabels);
  elements.speed.addEventListener("input", updateSliderLabels);

  if (window.ttsDesktop?.onToggleMute) {
    window.ttsDesktop.onToggleMute(toggleTtsMute);
  }

  const inputs = [
    elements.twitchSourceEnabled,
    elements.tiktokSourceEnabled,
    elements.tiktokUsername,
    elements.kickSourceEnabled,
    elements.youtubeSourceEnabled,
    elements.rumbleSourceEnabled,
    elements.streamerbotSourceEnabled,
    elements.streamerbotEndpoint,
    elements.minimizeToTrayOnExit,
    elements.twitchTtsProvider,
    elements.tiktokTtsProvider,
    elements.kickTtsProvider,
    elements.youtubeTtsProvider,
    elements.rumbleTtsProvider,
    elements.voiceMode,
    elements.fixedVoiceProvider,
    elements.fixedVoiceId,
    elements.modelId,
    elements.elevenLabsModelId,
    elements.cartesiaModelId,
    elements.stability,
    elements.similarityBoost,
    elements.speed,
    elements.skipCommands,
    elements.skipLinks,
    elements.skipEmotesOnly,
    elements.speakMentionsOnly,
    elements.neverSkipMidSpeech,
    elements.followersOnly,
    elements.minLength,
    elements.maxMessageCharacters,
    elements.userCooldownSeconds,
    elements.maxQueueSize,
    elements.fastChatMessageThreshold,
    elements.fastChatWindowSeconds,
    elements.fastChatSkipBehavior,
    elements.messagePauseSeconds,
    elements.ttsAntiSpamEnabled,
    elements.ttsAntiSpamMaxRepeatedWordCount,
    elements.ttsAntiSpamMaxRepeatedShortTokenCount,
    elements.ttsAntiSpamMaxAlternatingPatternCount,
    elements.ttsAntiSpamAction,
    elements.bannedChatters,
    elements.bannedWords,
  ].filter(Boolean);

  for (const input of inputs) {
    input.addEventListener("input", handleSettingsInputChange);
    input.addEventListener("change", handleSettingsInputChange);
  }
}

function bindCombinedChatChannel() {
  if (!combinedChatChannel) {
    return;
  }
  combinedChatChannel.addEventListener("message", (event) => {
    if (event.data?.type === "chat-request-state") {
      broadcastCombinedChatState();
    }
  });
}

function bindGiftDonoChannel() {
  if (!giftDonoChannel) {
    return;
  }
  giftDonoChannel.addEventListener("message", (event) => {
    if (event.data?.type === "gift-dono-request-state") {
      broadcastGiftDonoState();
    }
  });
}

async function openCombinedChatWindow() {
  if (window.ttsDesktop?.openCombinedChatWindow) {
    const result = await window.ttsDesktop.openCombinedChatWindow();
    if (!result?.ok) {
      setFeedback(result?.error || "Unable to open chat window.", true);
      return;
    }
    broadcastCombinedChatState();
    return;
  }
  window.open("/combined-chat.html", "tts-everything-combined-chat", "width=420,height=760");
  broadcastCombinedChatState();
}

async function openGiftDonoWindow() {
  if (window.ttsDesktop?.openGiftDonoWindow) {
    const result = await window.ttsDesktop.openGiftDonoWindow();
    if (!result?.ok) {
      setFeedback(result?.error || "Unable to open gifts/donos window.", true);
      return;
    }
    broadcastGiftDonoState();
    return;
  }
  window.open("/gift-dono.html", "tts-everything-gift-dono", "width=460,height=680");
  broadcastGiftDonoState();
}

function bindDesktopPages() {
  const pageButtons = Array.from(document.querySelectorAll("[data-page-target]"));
  const pagePanels = Array.from(document.querySelectorAll("[data-page]"));
  if (!pageButtons.length || !pagePanels.length) {
    return;
  }

  const showPage = (pageName) => {
    for (const button of pageButtons) {
      button.classList.toggle("is-active", button.dataset.pageTarget === pageName);
    }
    for (const panel of pagePanels) {
      panel.classList.toggle("is-active", panel.dataset.page === pageName);
    }
  };

  for (const button of pageButtons) {
    button.addEventListener("click", () => showPage(button.dataset.pageTarget));
  }

  showPage(pageButtons[0].dataset.pageTarget);
}

function syncSourceSections(settings = getLiveSettings()) {
  const liveSettings = normalizeLiveSettings(settings);
  const visibleSources = {
    twitch: liveSettings.twitchSourceEnabled,
    tiktok: liveSettings.tiktokSourceEnabled,
    kick: liveSettings.kickSourceEnabled,
    youtube: liveSettings.youtubeSourceEnabled,
    rumble: liveSettings.rumbleSourceEnabled,
    streamerbot: liveSettings.streamerbotSourceEnabled
  };

  for (const section of document.querySelectorAll("[data-source-section]")) {
    const source = section.dataset.sourceSection;
    section.classList.toggle("hidden", visibleSources[source] === false);
  }
}

function beginMuteHotkeyCapture() {
  capturingMuteHotkey = true;
  elements.muteHotkey.value = "";
  elements.muteHotkeyStatus.textContent = "Press the key combo you want to use. Esc cancels.";
  elements.captureMuteHotkeyButton.disabled = true;

  const capture = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      finishMuteHotkeyCapture();
      elements.muteHotkey.value = desktopSettings?.muteHotkey || "";
      elements.muteHotkeyStatus.textContent = "Hotkey capture canceled.";
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      finishMuteHotkeyCapture();
      await clearMuteHotkey();
      return;
    }

    const accelerator = eventToElectronAccelerator(event);
    if (!accelerator) {
      elements.muteHotkeyStatus.textContent = "Press any key or key combo.";
      return;
    }

    finishMuteHotkeyCapture();
    elements.muteHotkey.value = accelerator;
    await registerDesktopMuteHotkey(accelerator);
    await saveDesktopSettings();
  };

  const finishMuteHotkeyCapture = () => {
    capturingMuteHotkey = false;
    elements.captureMuteHotkeyButton.disabled = false;
    window.removeEventListener("keydown", capture, true);
  };

  window.addEventListener("keydown", capture, true);
}

async function clearMuteHotkey() {
  elements.muteHotkey.value = "";
  await registerDesktopMuteHotkey("");
  await saveDesktopSettings();
}

async function registerDesktopMuteHotkey(accelerator, options = {}) {
  if (!window.ttsDesktop?.setMuteHotkey) {
    return true;
  }

  const result = await window.ttsDesktop.setMuteHotkey(accelerator || "");
  if (!result?.ok) {
    elements.muteHotkeyStatus.textContent = result?.error || "Unable to register that global hotkey.";
    if (!options.silent) {
      setFeedback(elements.muteHotkeyStatus.textContent, true);
    }
    return false;
  }

  if (!options.silent) {
    elements.muteHotkeyStatus.textContent = result.accelerator
      ? `Global mute hotkey active: ${result.accelerator}`
      : "Global mute hotkey cleared.";
  }
  return true;
}

function eventToElectronAccelerator(event) {
  const key = normalizeHotkeyKey(event);
  if (!key) {
    return "";
  }

  const modifiers = [];
  if (event.ctrlKey) {
    modifiers.push("Ctrl");
  }
  if (event.altKey) {
    modifiers.push("Alt");
  }
  if (event.shiftKey) {
    modifiers.push("Shift");
  }
  if (event.metaKey) {
    modifiers.push("CommandOrControl");
  }

  return [...modifiers, key].join("+");
}

function normalizeHotkeyKey(event) {
  const key = String(event.key || "").trim();
  if (!key || ["Control", "Alt", "Shift", "Meta"].includes(key)) {
    return "";
  }
  if (/^F([1-9]|1\d|2[0-4])$/i.test(key)) {
    return key.toUpperCase();
  }
  if (key === " ") {
    return "Space";
  }
  const namedKeys = {
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Esc",
    Delete: "Delete",
    Backspace: "Backspace",
    Insert: "Insert",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    Tab: "Tab",
    Enter: "Enter"
  };
  if (namedKeys[key]) {
    return namedKeys[key];
  }
  if (/^Numpad\d$/.test(event.code || "")) {
    return `num${String(event.code).slice(-1)}`;
  }
  if (/^[a-z0-9]$/i.test(key)) {
    return key.toUpperCase();
  }
  return "";
}

function toggleTtsMute() {
  setTtsMuted(!ttsMuted);
}

function setTtsMuted(isMuted) {
  const wasMuted = ttsMuted;
  ttsMuted = Boolean(isMuted);
  elements.audioPlayer.muted = ttsMuted;
  elements.ttsMuteState.textContent = ttsMuted ? "TTS muted" : "TTS unmuted";
  elements.toggleMuteButton.textContent = ttsMuted ? "Unmute TTS now" : "Mute TTS now";
  elements.toggleMuteButton.classList.toggle("primary-button", ttsMuted);
  elements.toggleMuteButton.classList.toggle("danger-button", !ttsMuted);
  if (wasMuted !== ttsMuted) {
    void playMuteCue(ttsMuted);
  }
  syncObsPepeSpeakingState();
  setFeedback(ttsMuted ? "TTS muted." : "TTS unmuted.", false, true);
}

async function playMuteCue(isMuted) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  hotkeyAudioContext = hotkeyAudioContext || new AudioContextClass();
  const context = hotkeyAudioContext;
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(isMuted ? 420 : 620, now);
  oscillator.frequency.exponentialRampToValueAtTime(isMuted ? 260 : 880, now + 0.055);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.075);
}

async function loadConfig() {
  const response = await fetch("/api/config", { credentials: "include" });
  const data = await response.json();
  builtInVoices = data.voices || [];
  desktopMode = Boolean(data.desktopMode);
  document.body.classList.toggle("desktop-mode", desktopMode);
  elements.desktopSettingsPanel.classList.toggle("hidden", !desktopMode);
  populateVoiceVolumeSelect();
  syncVoiceModeControls(DEFAULT_LIVE_SETTINGS);
  syncSpeakerAssignments(currentUser?.voiceMap);
  syncVoiceVolumes(currentUser?.voiceVolumes);
}

async function loadSession() {
  try {
    const refreshedUser = await refreshCurrentUser();
    if (!refreshedUser) {
      setGuestState();
      return;
    }

    renderAccount();
    renderDesktopSettings(refreshedUser.desktopSettings || desktopSettings);
    syncSpeakerAssignments(currentUser.voiceMap);
    syncVoiceVolumes(currentUser.voiceVolumes);
    applyLiveSettingsToForm(getLiveSettings());
    applyModerationToForm(getModerationSettings());
    moderationDirty = false;
    updateSaveButton();
  } catch {
    setGuestState();
  }
}

function setGuestState() {
  currentUser = null;
  browserSourceOwnsPlayback = false;
  moderationDirty = false;
  elements.sessionStatus.textContent = "Guest";
  elements.planStatus.textContent = "Free Tier";
  elements.remainingStatus.textContent = "Login required";
  elements.adminNavLink.classList.add("hidden");
  elements.feedback.textContent = desktopMode
    ? "Save your desktop settings to start using local TTS."
    : "Log in on the account page to use the dashboard.";
  elements.channelName.value = "";
  elements.browserSourceUrl.value = "";
  elements.billingStatusText.textContent = "Login required";
  elements.billingRenewalText.textContent = "Sign in to manage your plan.";
  elements.manageBillingButton.disabled = true;
  applyLiveSettingsToForm(DEFAULT_LIVE_SETTINGS);
  applyModerationToForm(DEFAULT_MODERATION);
  syncVoiceVolumes({});
  setLiveControlsEnabled(false);
  updateLiveStatusStrip();
  updateSaveButton();
}

function renderAccount() {
  elements.sessionStatus.textContent = desktopMode ? "Desktop" : "Logged in";
  elements.planStatus.textContent = currentUser.planName;
  elements.remainingStatus.textContent = desktopMode
    ? "Local API key"
    : `${Number(currentUser.remainingCharacters).toLocaleString()} left`;
  elements.adminNavLink.classList.toggle("hidden", desktopMode || !currentUser.isAdmin);
  elements.browserSourceUrl.value = currentUser.browserSourceUrl || "";
  renderBillingStatus();
  renderSetupState();
  setLiveControlsEnabled(true);
  updateLiveStatusStrip();
}

function setLiveControlsEnabled(enabled) {
  elements.connectButton.disabled = !enabled;
  elements.disconnectButton.disabled = !enabled || !hasActiveConnection();
  elements.clearAssignmentsButton.disabled = !enabled;
  elements.saveAssignmentsButton.disabled = !enabled;
  elements.clearQueueButton.disabled = !enabled;
  elements.banTestWordButton.disabled = !enabled;
  elements.previewWordButton.disabled = !enabled;
  elements.saveModerationButton.disabled = !enabled;
  elements.copyBrowserSourceButton.disabled = !enabled || !elements.browserSourceUrl.value;
}

function refreshConnectionControls() {
  if (!currentUser) {
    setLiveControlsEnabled(false);
    return;
  }

  elements.connectButton.disabled = false;
  elements.disconnectButton.disabled = !hasActiveConnection();
  updateLiveStatusStrip();
  updateSaveButton();
}

function updateLiveStatusStrip() {
  const liveSettings = getLiveSettings();
  const twitchConnected = twitchSocket?.readyState === WebSocket.OPEN;
  const twitchConnecting = twitchSocket?.readyState === WebSocket.CONNECTING;
  const tiktokConnected = tiktokSocket?.readyState === WebSocket.OPEN;
  const tiktokConnecting = tiktokConnectInFlight || tiktokSocket?.readyState === WebSocket.CONNECTING;
  const kickConnected = kickSocket?.readyState === WebSocket.OPEN;
  const kickConnecting = kickConnectInFlight || kickSocket?.readyState === WebSocket.CONNECTING;
  const youtubeConnected = Boolean(youtubePollTimer);
  const rumbleConnected = Boolean(rumblePollTimer);
  const streamerbotConnected = streamerbotSocket?.readyState === WebSocket.OPEN;
  const streamerbotConnecting = streamerbotConnectInFlight || streamerbotSocket?.readyState === WebSocket.CONNECTING;

  elements.twitchStatus.textContent = liveSettings.twitchSourceEnabled
    ? twitchConnected
      ? "Connected"
      : twitchConnecting
        ? "Connecting"
        : "Ready"
    : "Off";
  elements.tiktokStatus.textContent = liveSettings.tiktokSourceEnabled
    ? tiktokConnected
      ? "Connected"
      : tiktokConnecting
        ? "Connecting"
        : "Offline"
    : "Off";
  elements.kickStatus.textContent = liveSettings.kickSourceEnabled
    ? kickConnected
      ? "Connected"
      : kickConnecting
        ? "Connecting"
        : "Ready"
    : "Off";
  elements.youtubeStatus.textContent = liveSettings.youtubeSourceEnabled
    ? youtubeConnected
      ? "Polling"
      : "Ready"
    : "Off";
  elements.rumbleStatus.textContent = liveSettings.rumbleSourceEnabled
    ? rumbleConnected
      ? "Polling"
      : "Ready"
    : "Off";
  elements.streamerbotStatus.textContent = liveSettings.streamerbotSourceEnabled
    ? streamerbotConnected
      ? "Connected"
      : streamerbotConnecting
        ? "Connecting"
        : "Ready"
    : "Off";
  elements.obsStatus.textContent = "Ready";
  elements.runtimeOwnerStatus.textContent = "Local";

  setStatusTone(elements.twitchStatus, twitchConnected, liveSettings.twitchSourceEnabled);
  setStatusTone(elements.tiktokStatus, tiktokConnected, liveSettings.tiktokSourceEnabled);
  setStatusTone(elements.kickStatus, kickConnected, liveSettings.kickSourceEnabled);
  setStatusTone(elements.youtubeStatus, youtubeConnected, liveSettings.youtubeSourceEnabled);
  setStatusTone(elements.rumbleStatus, rumbleConnected, liveSettings.rumbleSourceEnabled);
  setStatusTone(elements.streamerbotStatus, streamerbotConnected, liveSettings.streamerbotSourceEnabled);
  setStatusTone(elements.obsStatus, true, true);
  setStatusTone(elements.runtimeOwnerStatus, true, true);
}

function renderBillingStatus() {
  if (desktopMode) {
    elements.billingStatusText.textContent = desktopSettings?.apiKeyConfigured ? "ElevenLabs ready" : "API key needed";
    elements.billingRenewalText.textContent = "Desktop mode uses your own ElevenLabs API key. No website billing or quota.";
    elements.manageBillingButton.disabled = true;
    return;
  }

  const status = currentUser?.subscriptionStatus || "";
  const endDate = currentUser?.subscriptionCurrentPeriodEnd ? new Date(currentUser.subscriptionCurrentPeriodEnd) : null;
  elements.billingStatusText.textContent = status ? `${currentUser.planName} - ${status}` : `${currentUser.planName}`;
  elements.billingRenewalText.textContent = endDate && Number.isFinite(endDate.getTime())
    ? `${currentUser.cancelAtPeriodEnd ? "Cancels" : "Renews"} ${endDate.toLocaleDateString()}`
    : "Free tier or no renewal date.";
  elements.manageBillingButton.disabled = !currentUser;
}

function renderDesktopSettings(settings, options = {}) {
  if (!desktopMode || !settings) {
    return;
  }
  desktopSettings = {
    ...settings,
    customVoices: normalizeCustomVoices(settings.customVoices)
  };
  elements.desktopChannelName.value = settings.channelName || currentUser?.channelName || "";
  elements.desktopCartesiaApiKey.value = settings.cartesiaApiKeyConfigured ? SAVED_SECRET_MASK : "";
  elements.desktopCartesiaApiKey.placeholder = "Paste your Cartesia API key";
  applyCartesiaVoiceToForm(settings.cartesiaVoiceId || CARTESIA_VOICE_PRESETS[0].voiceId);
  elements.desktopKickChannel.value = settings.kickChannel || "";
  elements.tiktokUsername.value = settings.tiktokUsername || "";
  elements.desktopYoutubeApiKey.value = settings.youtubeApiKeyConfigured ? SAVED_SECRET_MASK : "";
  elements.desktopYoutubeApiKey.placeholder = "YouTube Data API key";
  elements.desktopYoutubeLiveChatId.value = settings.youtubeLiveChatId || "";
  elements.desktopRumbleApiUrl.value = settings.rumbleApiUrlConfigured ? SAVED_SECRET_MASK : "";
  elements.desktopRumbleApiUrl.placeholder = "https://rumble.com/-livestream-api/...";
  elements.streamerbotEndpoint.value = settings.streamerbotEndpoint || "ws://127.0.0.1:8080/";
  elements.minimizeToTrayOnExit.checked = Boolean(settings.minimizeToTrayOnExit);
  elements.muteHotkey.value = settings.muteHotkey || "";
  elements.muteHotkeyStatus.textContent = settings.muteHotkey
    ? `Global mute hotkey saved: ${settings.muteHotkey}`
    : "Works even when this app is not focused.";
  void registerDesktopMuteHotkey(settings.muteHotkey || "", { silent: true });
  elements.desktopApiKey.value = settings.apiKeyConfigured ? SAVED_SECRET_MASK : "";
  elements.desktopApiKey.placeholder = "Paste your ElevenLabs API key";
  elements.desktopSettingsStatus.textContent = getSavedSecretStatus(settings);
  renderCustomVoiceList();
  refreshVoiceLibraryConsumers();
  renderBillingStatus();
}

async function saveDesktopSettings(options = {}) {
  if (!desktopMode) {
    return true;
  }
  setDesktopSettingsButtonsDisabled(true);
  elements.desktopSettingsStatus.textContent = "Saving desktop settings...";
  try {
    const response = await fetch("/api/desktop/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({
        apiKey: getUnmaskedFieldValue(elements.desktopApiKey),
        cartesiaApiKey: getUnmaskedFieldValue(elements.desktopCartesiaApiKey),
        cartesiaVoiceId: getSelectedCartesiaVoiceId(),
        channelName: elements.desktopChannelName.value,
        kickChannel: elements.desktopKickChannel.value,
        youtubeApiKey: getUnmaskedFieldValue(elements.desktopYoutubeApiKey),
        youtubeLiveChatId: elements.desktopYoutubeLiveChatId.value,
        rumbleApiUrl: getUnmaskedFieldValue(elements.desktopRumbleApiUrl),
        streamerbotEndpoint: elements.streamerbotEndpoint.value,
        tiktokUsername: elements.tiktokUsername.value,
        minimizeToTrayOnExit: Boolean(elements.minimizeToTrayOnExit.checked),
        muteHotkey: elements.muteHotkey.value,
        customVoices: normalizeCustomVoices(desktopSettings?.customVoices),
        liveSettings: collectLiveSettingsFromForm()
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to save desktop settings.");
    }
    currentUser = data.user;
    renderDesktopSettings(data.settings);
    await registerDesktopMuteHotkey(data.settings?.muteHotkey || "");
    renderAccount();
    applySavedChannel();
    if (!options.silent) {
      setFeedback("Desktop settings saved.", false, true);
    }
    return true;
  } catch (error) {
    elements.desktopSettingsStatus.textContent = error.message;
    if (!options.silent) {
      setFeedback(error.message, true);
    }
    return false;
  } finally {
    setDesktopSettingsButtonsDisabled(false);
  }
}

function getSavedSecretStatus(settings) {
  const savedCount = [
    settings.apiKeyConfigured,
    settings.cartesiaApiKeyConfigured,
    settings.youtubeApiKeyConfigured,
    settings.rumbleApiUrlConfigured
  ].filter(Boolean).length;
  return savedCount
    ? `${savedCount} API ${savedCount === 1 ? "key is" : "keys are"} saved locally and shown as ${SAVED_SECRET_MASK}.`
    : "Add your API keys before generating speech.";
}

function getUnmaskedFieldValue(field) {
  const value = String(field?.value || "").trim();
  return value === SAVED_SECRET_MASK ? "" : value;
}

function setDesktopSettingsButtonsDisabled(disabled) {
  elements.saveDesktopSettingsButton.disabled = disabled;
  elements.saveApiKeysButton.disabled = disabled;
  elements.addCustomVoiceButton.disabled = disabled;
}

function getElevenLabsVoices() {
  return mergeVoiceLists(builtInVoices, getCustomVoices("elevenlabs"));
}

function getCustomVoices(provider) {
  const normalizedProvider = normalizeProviderValue(provider);
  return normalizeCustomVoices(desktopSettings?.customVoices)[normalizedProvider] || [];
}

function normalizeCustomVoices(source) {
  const raw = source && typeof source === "object" ? source : {};
  return {
    elevenlabs: normalizeCustomVoiceList(raw.elevenlabs, "elevenlabs"),
    cartesia: normalizeCustomVoiceList(raw.cartesia, "cartesia")
  };
}

function normalizeCustomVoiceList(source, provider) {
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

function mergeVoiceLists(...lists) {
  const merged = [];
  const seen = new Set();
  for (const list of lists) {
    for (const voice of Array.isArray(list) ? list : []) {
      const voiceId = String(voice?.voiceId || "").trim();
      if (!voiceId || seen.has(voiceId)) {
        continue;
      }
      merged.push({ name: String(voice.name || "Voice").trim() || "Voice", voiceId });
      seen.add(voiceId);
    }
  }
  return merged;
}

function renderCustomVoiceList() {
  if (!elements.customVoiceList) {
    return;
  }

  const customVoices = normalizeCustomVoices(desktopSettings?.customVoices);
  if (desktopSettings) {
    desktopSettings.customVoices = customVoices;
  }
  const entries = [
    ...customVoices.elevenlabs.map((voice) => ({ provider: "elevenlabs", voice })),
    ...customVoices.cartesia.map((voice) => ({ provider: "cartesia", voice }))
  ];

  elements.customVoiceList.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("li");
    empty.textContent = "No custom voice IDs yet.";
    elements.customVoiceList.append(empty);
    return;
  }

  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "queue-item custom-voice-item";

    const summary = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = entry.voice.name;
    const provider = document.createElement("p");
    provider.className = "queue-meta";
    provider.textContent = entry.provider === "cartesia" ? "Cartesia" : "ElevenLabs";
    summary.append(title, provider);

    const idWrap = document.createElement("div");
    const code = document.createElement("code");
    code.textContent = entry.voice.voiceId;
    idWrap.append(code);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteCustomVoice(entry.provider, entry.voice.voiceId));

    item.append(summary, idWrap, deleteButton);
    elements.customVoiceList.append(item);
  }
}

async function addCustomVoice() {
  const provider = normalizeProviderValue(elements.customVoiceProvider.value);
  const voiceId = String(elements.customVoiceId.value || "").trim();
  const providerLabel = provider === "cartesia" ? "Cartesia" : "ElevenLabs";
  if (!voiceId) {
    setFeedback("Paste a voice ID before adding it.", true);
    elements.customVoiceId.focus();
    return;
  }

  const customVoices = normalizeCustomVoices(desktopSettings?.customVoices);
  const builtInProviderVoices = provider === "cartesia" ? CARTESIA_VOICE_PRESETS : builtInVoices;
  if (customVoices[provider].some((voice) => voice.voiceId === voiceId) || builtInProviderVoices.some((voice) => voice.voiceId === voiceId)) {
    setFeedback(`${providerLabel} already has that voice ID.`, true);
    return;
  }

  const name = String(elements.customVoiceName.value || "").trim().slice(0, 40) || getDefaultCustomVoiceName(provider, voiceId);
  customVoices[provider].push({ name, voiceId: voiceId.slice(0, 120) });
  desktopSettings = {
    ...(desktopSettings || {}),
    customVoices
  };
  renderCustomVoiceList();
  refreshVoiceLibraryConsumers();

  const saved = await saveDesktopSettings({ silent: true });
  if (saved) {
    elements.customVoiceName.value = "";
    elements.customVoiceId.value = "";
    setFeedback(`${providerLabel} voice ID saved.`, false, true);
  }
}

async function deleteCustomVoice(provider, voiceId) {
  const normalizedProvider = normalizeProviderValue(provider);
  const customVoices = normalizeCustomVoices(desktopSettings?.customVoices);
  const nextList = customVoices[normalizedProvider].filter((voice) => voice.voiceId !== voiceId);
  if (nextList.length === customVoices[normalizedProvider].length) {
    return;
  }

  customVoices[normalizedProvider] = nextList;
  desktopSettings = {
    ...(desktopSettings || {}),
    customVoices
  };
  pruneSpeakerAssignmentsForVoice(normalizedProvider, voiceId);
  renderCustomVoiceList();
  refreshVoiceLibraryConsumers();

  const saved = await saveDesktopSettings({ silent: true });
  if (saved) {
    setFeedback("Voice ID deleted.", false, true);
  }
}

function pruneSpeakerAssignmentsForVoice(provider, voiceId) {
  let changed = false;
  for (const [user, assignment] of Object.entries(speakerAssignments)) {
    if (normalizeProviderValue(assignment.ttsProvider) === provider && assignment.voiceId === voiceId) {
      delete speakerAssignments[user];
      changed = true;
    }
  }
  if (changed) {
    void persistVoiceMap();
  }
}

function refreshVoiceLibraryConsumers() {
  populateVoiceVolumeSelect();
  syncVoiceModeControls(getLiveSettings());
  renderAssignments();
}

function applyCartesiaVoiceToForm(voiceId) {
  const normalizedVoiceId = String(voiceId || CARTESIA_VOICE_PRESETS[0].voiceId).trim();
  const preset = CARTESIA_VOICE_PRESETS.find((voice) => voice.voiceId === normalizedVoiceId);
  elements.desktopCartesiaVoicePreset.value = preset ? preset.voiceId : "custom";
  elements.desktopCartesiaVoiceId.value = normalizedVoiceId;
  elements.desktopCartesiaVoiceId.disabled = Boolean(preset);
}

function handleCartesiaVoicePresetChange() {
  if (elements.desktopCartesiaVoicePreset.value === "custom") {
    elements.desktopCartesiaVoiceId.disabled = false;
    elements.desktopCartesiaVoiceId.focus();
    syncVoiceModeControls();
    return;
  }
  elements.desktopCartesiaVoiceId.value = elements.desktopCartesiaVoicePreset.value;
  elements.desktopCartesiaVoiceId.disabled = true;
  syncVoiceModeControls();
}

function getSelectedCartesiaVoiceId() {
  if (elements.desktopCartesiaVoicePreset.value !== "custom") {
    return elements.desktopCartesiaVoicePreset.value;
  }
  return elements.desktopCartesiaVoiceId.value;
}

function renderSetupState() {
  const liveSettings = getLiveSettings();
  elements.setupAccountStep.classList.toggle("is-complete", Boolean(currentUser?.channelName));
  elements.setupSourcesStep.classList.toggle("is-complete", Boolean(
    liveSettings.twitchSourceEnabled ||
    liveSettings.tiktokSourceEnabled ||
    liveSettings.kickSourceEnabled ||
    liveSettings.youtubeSourceEnabled ||
    liveSettings.rumbleSourceEnabled
  ));
  elements.setupObsStep.classList.toggle("is-complete", true);
}

function setStatusTone(element, isActive, isEnabled) {
  element.classList.toggle("success", Boolean(isActive));
  element.classList.toggle("muted", !isEnabled);
}

function updateSaveButton() {
  elements.saveModerationButton.disabled = !currentUser || !moderationDirty;
  elements.saveSettingsButton.disabled = !currentUser || !moderationDirty;
}

function updateSliderLabels() {
  elements.stabilityValue.textContent = Number(elements.stability.value).toFixed(2);
  elements.similarityValue.textContent = Number(elements.similarityBoost.value).toFixed(2);
  elements.speedValue.textContent = Number(elements.speed.value).toFixed(2);
}

function renderModelOptions(provider, selectedModelId) {
  const options = provider === "cartesia"
    ? [
        ["sonic-3", "Sonic 3"],
        ["sonic-3-2026-01-12", "Sonic 3 stable snapshot"],
        ["sonic-3-latest", "Sonic 3 latest"]
      ]
    : [
        ["eleven_flash_v2_5", "Flash v2.5"],
        ["eleven_turbo_v2_5", "Turbo v2.5"],
        ["eleven_multilingual_v2", "Multilingual v2"]
      ];
  const fallbackModel = options[0][0];
  elements.modelId.innerHTML = "";
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === selectedModelId;
    elements.modelId.append(option);
  }
  if (!options.some(([value]) => value === selectedModelId)) {
    elements.modelId.value = fallbackModel;
  }
}

function setProviderFromCheckbox(provider) {
  const nextMode = provider === "both" && elements.bothProvidersEnabled.checked ? "both" : "single";
  const nextProvider = nextMode === "both"
    ? elements.ttsProvider.value || "elevenlabs"
    : provider === "cartesia" && elements.cartesiaProviderEnabled.checked
      ? "cartesia"
      : "elevenlabs";
  elements.ttsProviderMode.value = nextMode;
  elements.ttsProvider.value = nextProvider;
  syncProviderControls({ ttsProvider: nextProvider, ttsProviderMode: nextMode });
  handleSettingsInputChange();
}

function syncProviderControls(settings) {
  const liveSettings = normalizeLiveSettings(settings);
  const both = liveSettings.ttsProviderMode === "both";
  elements.ttsProviderMode.value = liveSettings.ttsProviderMode;
  elements.elevenLabsProviderEnabled.checked = !both && liveSettings.ttsProvider === "elevenlabs";
  elements.cartesiaProviderEnabled.checked = !both && liveSettings.ttsProvider === "cartesia";
  elements.bothProvidersEnabled.checked = both;
  elements.providerRoutingPanel.classList.toggle("hidden", !both);
}

function syncVoiceModeControls(settings = getLiveSettings()) {
  const liveSettings = normalizeLiveSettings(settings);
  elements.fixedVoicePanel.classList.toggle("hidden", liveSettings.voiceMode !== "fixed_all");
  elements.fixedVoiceProvider.value = liveSettings.fixedVoiceProvider;
  populateFixedVoiceSelect(liveSettings.fixedVoiceProvider, liveSettings.fixedVoiceId);
}

function populateFixedVoiceSelect(provider = elements.fixedVoiceProvider.value, selectedVoiceId = elements.fixedVoiceId.value) {
  const normalizedProvider = normalizeProviderValue(provider);
  const voices = normalizedProvider === "cartesia" ? getCartesiaAssignmentVoices() : getElevenLabsVoices();
  elements.fixedVoiceId.innerHTML = "";
  for (const voice of voices) {
    const option = document.createElement("option");
    option.value = voice.voiceId;
    option.textContent = voice.name;
    option.selected = voice.voiceId === selectedVoiceId;
    elements.fixedVoiceId.append(option);
  }
}

function populateVoiceVolumeSelect() {
  const selectedVoiceId = elements.voiceVolumeVoice.value;
  elements.voiceVolumeVoice.innerHTML = "";
  for (const voice of getElevenLabsVoices()) {
    const option = document.createElement("option");
    option.value = voice.voiceId;
    option.textContent = voice.name;
    elements.voiceVolumeVoice.append(option);
  }
  if (selectedVoiceId && getElevenLabsVoices().some((voice) => voice.voiceId === selectedVoiceId)) {
    elements.voiceVolumeVoice.value = selectedVoiceId;
  }
  renderSelectedVoiceVolume();
}

function syncVoiceVolumes(source) {
  voiceVolumes = normalizeVoiceVolumes(source);
  draftVoiceVolumes = { ...voiceVolumes };
  renderSelectedVoiceVolume();
}

function handleVoiceVolumeInput() {
  const voiceId = elements.voiceVolumeVoice.value;
  const volume = clampDecimal(elements.voiceVolumeValue.value, 0, 1, 1);
  if (voiceId) {
    if (volume === 1) {
      delete draftVoiceVolumes[voiceId];
    } else {
      draftVoiceVolumes[voiceId] = Number(volume.toFixed(2));
    }
  }
  elements.voiceVolumeLabel.textContent = `${Math.round(volume * 100)}%`;
  moderationDirty = true;
  updateSaveButton();
}

function renderSelectedVoiceVolume() {
  const voiceId = elements.voiceVolumeVoice.value;
  const volume = getDraftVoiceVolume(voiceId);
  elements.voiceVolumeValue.value = String(volume);
  elements.voiceVolumeLabel.textContent = `${Math.round(volume * 100)}%`;
}

async function handleLogout() {
  livePausedManually = true;
  clearReconnectTimer();
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  disconnectChat(false);
  window.location.href = "/";
}

async function handleManageBilling() {
  if (!currentUser) {
    setFeedback("Log in before managing billing.", true);
    return;
  }
  elements.manageBillingButton.disabled = true;
  try {
    const response = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to open billing portal.");
    }
    window.location.href = data.portalUrl;
  } catch (error) {
    setFeedback(error.message, true);
    elements.manageBillingButton.disabled = false;
  }
}

async function copyField(input, message) {
  if (!input.value) {
    setFeedback("Nothing to copy yet.", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(input.value);
  } catch {
    input.select();
    document.execCommand("copy");
  }
  setFeedback(message, false, true);
}

function renderObsPepeSourceUrl() {
  if (!elements.obsPepeSourceUrl) {
    return;
  }
  elements.obsPepeSourceUrl.value = `${window.location.origin}/obs-pepe.html`;
}

function syncObsPepeSpeakingState() {
  const isSpeaking = Boolean(
    currentPlayingClip &&
    isPlayingQueuedClip &&
    elements.audioPlayer.src &&
    !elements.audioPlayer.paused &&
    !elements.audioPlayer.ended &&
    !ttsMuted
  );
  setObsPepeSpeaking(isSpeaking, currentPlayingClip);
}

function setObsPepeSpeaking(isSpeaking, clip = currentPlayingClip) {
  const payload = {
    speaking: Boolean(isSpeaking),
    title: clip?.title || "",
    source: clip?.source || "",
    text: clip?.text || ""
  };
  const signature = JSON.stringify(payload);
  if (signature === obsPepeStatusSignature) {
    return;
  }
  obsPepeStatusSignature = signature;
  fetch("/api/obs-pepe/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: signature
  }).catch(() => {
    // The avatar source is optional; local TTS should keep working if OBS is not open.
  });
}

async function refreshCurrentUser() {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  const data = await response.json();
  if (!response.ok) {
    return null;
  }

  desktopMode = Boolean(data.desktopMode || desktopMode);
  desktopSettings = data.desktopSettings || desktopSettings;
  currentUser = data.user;
  return currentUser;
}

async function loadRecentSpoken() {
  if (!currentUser) {
    return;
  }

  try {
    const response = await fetch("/api/account/recent-spoken", { credentials: "include" });
    const data = await response.json();
    if (!response.ok) {
      return;
    }
    mergeRecentSpokenMessages(data.items || []);
  } catch {
    // Recent spoken history is helpful, but live controls should keep working if it fails.
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

function mergeRecentSpokenMessages(items) {
  const existingById = new Map(queue.map((clip) => [clip.id, clip]));

  for (const item of items) {
    if (!item?.id) {
      continue;
    }

    const existing = existingById.get(item.id);
    const nextClip = {
      ...(existing || {}),
      id: item.id,
      title: item.title || "Chat",
      text: item.text || "",
      voiceId: item.voiceId || existing?.voiceId || "",
      voiceName: item.voiceName || existing?.voiceName || "Voice",
      modelId: item.modelId || existing?.modelId || "",
      source: item.source || existing?.source || "Live",
      createdAt: item.createdAt ? new Date(item.createdAt) : existing?.createdAt || new Date()
    };
    existingById.set(item.id, nextClip);
  }

  queue.length = 0;
  queue.push(...Array.from(existingById.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 25));
  renderQueue();
}

async function handleConnect(event) {
  event.preventDefault();

  if (!currentUser) {
    setFeedback("Log in on the account page before using live TTS.", true);
    return;
  }

  livePausedManually = false;
  await saveEverything(true);
  await ensureDesiredLiveState();
}

function connectToTwitch(channel) {
  saveChannel(channel);
  currentChannel = channel;
  clearReconnectTimer();
  const socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
  twitchSocket = socket;
  updateLiveStatusStrip();

  socket.addEventListener("open", () => {
    socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");
    socket.send("PASS SCHMOOPIIE");
    socket.send(`NICK justinfan${Math.floor(Math.random() * 80000 + 1000)}`);
    socket.send(`JOIN #${channel}`);
  });

  socket.addEventListener("message", (event) => {
    const rawLines = String(event.data).split("\r\n").filter(Boolean);
    for (const line of rawLines) {
      if (line.startsWith("PING")) {
        socket.send(line.replace("PING", "PONG"));
        continue;
      }
      if (line.includes(" PRIVMSG ")) {
        const parsed = parsePrivmsg(line);
        if (parsed) {
          enqueueIncomingMessage(parsed);
        }
      }
      if (line.includes(" JOIN ")) {
        setFeedback(`Connected to #${channel}. Waiting for chat messages...`, false, true);
        updateLiveStatusStrip();
        refreshConnectionControls();
      }
    }
  });

  socket.addEventListener("close", () => {
    if (twitchSocket === socket) {
      twitchSocket = null;
    }
    updateLiveStatusStrip();
    refreshConnectionControls();
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    setFeedback("Unable to connect to Twitch chat. Check the channel name and try again.", true);
    updateLiveStatusStrip();
    refreshConnectionControls();
    scheduleReconnect();
  });
}

async function connectToTikTokLive() {
  if (!getLiveSettings().tiktokSourceEnabled) {
    return;
  }
  if (tiktokConnectInFlight || tiktokSocket?.readyState === WebSocket.OPEN || tiktokSocket?.readyState === WebSocket.CONNECTING) {
    return;
  }

  const handle = normalizeTikTokHandle(elements.tiktokUsername.value || desktopSettings?.tiktokUsername || "");
  if (!handle) {
    setFeedback("Enter a TikTok handle before connecting TikTok Live.", true);
    return;
  }

  clearReconnectTimer();
  tiktokConnectInFlight = true;
  updateLiveStatusStrip();
  refreshConnectionControls();

  let wsUrl = "ws://127.0.0.1:21213/";
  try {
    const response = await fetch("/api/tiktok-live/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({ handle })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Unable to start TikTok Live.");
    }
    wsUrl = data.wsUrl || wsUrl;
  } catch (error) {
    tiktokConnectInFlight = false;
    setFeedback(error.message || "Unable to start TikTok Live.", true);
    updateLiveStatusStrip();
    refreshConnectionControls();
    scheduleReconnect();
    return;
  }

  const socket = new WebSocket(wsUrl);
  tiktokSocket = socket;
  updateLiveStatusStrip();

  socket.addEventListener("open", () => {
    tiktokConnectInFlight = false;
    setFeedback("Connected to TikTok Live. Waiting for chat messages...", false, true);
    updateLiveStatusStrip();
    refreshConnectionControls();
  });

  socket.addEventListener("message", (event) => {
    const payload = safeJsonParse(event.data);
    if (!payload) {
      return;
    }
    if (payload.event === "status") {
      handleTikTokStatusEvent(payload);
      return;
    }
    if (payload.event !== "chat") {
      return;
    }
    const parsed = parseTikTokLiveChatEvent(payload);
    if (parsed) {
      enqueueIncomingMessage(parsed);
    }
  });

  socket.addEventListener("close", () => {
    if (tiktokSocket === socket) {
      tiktokSocket = null;
    }
    tiktokConnectInFlight = false;
    updateLiveStatusStrip();
    refreshConnectionControls();
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    tiktokConnectInFlight = false;
    setFeedback("Unable to connect to TikTok Live. Try logging in again if TikTok asks.", true);
    updateLiveStatusStrip();
    refreshConnectionControls();
    scheduleReconnect();
  });
}

function handleTikTokStatusEvent(payload) {
  const status = String(payload.status || "").toLowerCase();
  const details = payload.details && typeof payload.details === "object" ? payload.details : {};
  if (status === "auth_required" || status === "session_expired") {
    setFeedback("TikTok login is required. Turn TikTok Live off and on again to log in.", true);
  } else if (status === "live_not_found") {
    setFeedback("TikTok LIVE was not found for this handle.", true);
  } else if (status === "error") {
    setFeedback(details.message || details.lastError || "TikTok Live reported an error.", true);
  }
}

async function stopTikTokLiveHelper() {
  if (!desktopMode) {
    return;
  }
  try {
    await fetch("/api/tiktok-live/stop", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" }
    });
  } catch {}
}

async function handleTikTokSourceToggle(event) {
  handleSettingsInputChange();
  if (!event.currentTarget.checked || !desktopMode || tiktokAuthInFlight) {
    return;
  }
  tiktokAuthInFlight = true;
  try {
    setFeedback("Opening TikTok login. Complete the login in the browser window if TikTok asks.", false);
    const response = await fetch("/api/tiktok-live/auth", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "TikTok login did not complete.");
    }
    setFeedback("TikTok login is ready. Click Connect live chat when you are ready to start.", false, true);
  } catch (error) {
    setFeedback(error.message || "TikTok login did not complete.", true);
  } finally {
    tiktokAuthInFlight = false;
  }
}

function parseTikTokLiveChatEvent(payload) {
  const userData = payload.user && typeof payload.user === "object" ? payload.user : {};
  const user = coerceTikTokText(userData.displayName || userData.nickname || userData.uniqueId || userData.id) || "TikTok viewer";
  const message = coerceTikTokText(payload.message || payload.text || payload.content);
  if (!message) {
    return null;
  }
  return {
    id: String(payload.id || createClientId()),
    user,
    message,
    source: "TikTok",
    isFollower: false,
    roles: []
  };
}

async function connectToKick() {
  if (kickConnectInFlight || kickSocket?.readyState === WebSocket.OPEN || kickSocket?.readyState === WebSocket.CONNECTING) {
    return;
  }
  const channel = normalizeChannel(elements.desktopKickChannel.value || desktopSettings?.kickChannel || currentUser?.channelName);
  if (!channel) {
    setFeedback("Enter a Kick channel in Desktop Settings.", true);
    return;
  }

  try {
    kickConnectInFlight = true;
    elements.kickStatus.textContent = "Resolving";
    const response = await fetch(`/api/kick/chatroom?channel=${encodeURIComponent(channel)}`, { credentials: "include" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to connect Kick chat.");
    }
    clearReconnectTimer();
    const socket = new WebSocket("wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false");
    kickSocket = socket;
    updateLiveStatusStrip();

    socket.addEventListener("open", () => {
      kickConnectInFlight = false;
      socket.send(JSON.stringify({
        event: "pusher:subscribe",
        data: { auth: "", channel: `chatrooms.${data.chatroomId}.v2` }
      }));
      setFeedback(`Connected to Kick chat for ${channel}.`, false, true);
      updateLiveStatusStrip();
      refreshConnectionControls();
    });
    socket.addEventListener("message", (event) => {
      const parsed = parseKickMessage(event.data);
      if (parsed) {
        enqueueIncomingMessage(parsed);
      }
    });
    socket.addEventListener("close", () => {
      kickConnectInFlight = false;
      if (kickSocket === socket) {
        kickSocket = null;
      }
      updateLiveStatusStrip();
      refreshConnectionControls();
      scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      kickConnectInFlight = false;
      setFeedback("Kick chat connection failed.", true);
      updateLiveStatusStrip();
      refreshConnectionControls();
      scheduleReconnect();
    });
  } catch (error) {
    kickConnectInFlight = false;
    setFeedback(error.message, true);
  }
}

function connectToStreamerbot() {
  if (streamerbotConnectInFlight || streamerbotSocket?.readyState === WebSocket.OPEN || streamerbotSocket?.readyState === WebSocket.CONNECTING) {
    return;
  }

  const endpoint = normalizeStreamerbotEndpoint(elements.streamerbotEndpoint?.value || desktopSettings?.streamerbotEndpoint);
  try {
    streamerbotConnectInFlight = true;
    elements.streamerbotStatus.textContent = "Connecting";
    updateLiveStatusStrip();

    const socket = new WebSocket(endpoint);
    streamerbotSocket = socket;

    socket.addEventListener("open", () => {
      streamerbotConnectInFlight = false;
      socket.send(JSON.stringify({
        request: "Subscribe",
        id: `streamlabs-donation-${Date.now()}`,
        events: {
          Streamlabs: ["Donation"]
        }
      }));
      setFeedback("Connected to Streamer.bot. Listening for Streamlabs donations.", false, true);
      updateLiveStatusStrip();
      refreshConnectionControls();
    });

    socket.addEventListener("message", (event) => {
      const parsed = parseStreamerbotDonationEvent(event.data);
      if (parsed) {
        addGiftDonoEvent(parsed);
      }
    });

    socket.addEventListener("close", () => {
      streamerbotConnectInFlight = false;
      if (streamerbotSocket === socket) {
        streamerbotSocket = null;
      }
      updateLiveStatusStrip();
      refreshConnectionControls();
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      streamerbotConnectInFlight = false;
      setFeedback(`Streamer.bot connection failed. Check that WebSocket Server is running at ${endpoint}.`, true);
      updateLiveStatusStrip();
      refreshConnectionControls();
      scheduleReconnect();
    });
  } catch (error) {
    streamerbotConnectInFlight = false;
    setFeedback(error.message, true);
  }
}

function parseKickMessage(rawMessage) {
  const payload = safeJsonParse(rawMessage);
  if (!payload || String(payload.event || "").includes("pusher:")) {
    return null;
  }
  const eventName = String(payload.event || "").toLowerCase();
  const data = typeof payload.data === "string" ? safeJsonParse(payload.data) : payload.data;
  if (!data || !eventName.includes("chat")) {
    return null;
  }
  const messageData = data.message && typeof data.message === "object" ? data.message : data;
  const message = coerceTikTokText(messageData.content || messageData.message || messageData.text || messageData.body || data.content);
  const sender = messageData.sender || messageData.user || data.sender || data.user || {};
  const user = coerceTikTokText(sender.username || sender.slug || sender.name || data.username || data.userName);
  if (!message || !user) {
    return null;
  }
  return {
    id: String(messageData.id || messageData.message_id || data.id || data.message_id || `kick:${normalizeViewerId(user)}:${normalizeMessageFingerprint(message)}`),
    user,
    message,
    source: "Kick",
    roles: extractKickRoles(sender, messageData, data),
    badges: extractKickBadges(sender, messageData, data)
  };
}

function startYoutubePolling() {
  const apiKey = getUnmaskedFieldValue(elements.desktopYoutubeApiKey);
  const liveChatId = elements.desktopYoutubeLiveChatId.value || desktopSettings?.youtubeLiveChatId || "";
  if (!apiKey && !desktopSettings?.youtubeApiKeyConfigured) {
    setFeedback("Enter and save a YouTube API key in API Keys.", true);
    return;
  }
  if (!liveChatId) {
    setFeedback("Enter a YouTube live chat ID in Desktop Settings.", true);
    return;
  }
  pollYoutubeChat(0);
}

async function pollYoutubeChat(delayMs = 3000) {
  if (youtubePollTimer) {
    window.clearTimeout(youtubePollTimer);
  }
  youtubePollTimer = window.setTimeout(async () => {
    try {
      const params = new URLSearchParams({
        apiKey: getUnmaskedFieldValue(elements.desktopYoutubeApiKey),
        liveChatId: elements.desktopYoutubeLiveChatId.value || desktopSettings?.youtubeLiveChatId || ""
      });
      if (youtubeNextPageToken) {
        params.set("pageToken", youtubeNextPageToken);
      }
      const response = await fetch(`/api/youtube/live-chat?${params}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to read YouTube chat.");
      }
      youtubeNextPageToken = data.nextPageToken || youtubeNextPageToken;
      for (const item of data.items || []) {
        const parsed = parseYoutubeMessage(item);
        if (parsed) {
          enqueueIncomingMessage(parsed);
        }
      }
      updateLiveStatusStrip();
      refreshConnectionControls();
      pollYoutubeChat(Number(data.pollingIntervalMillis) || 5000);
    } catch (error) {
      setFeedback(error.message, true);
      updateLiveStatusStrip();
      pollYoutubeChat(10000);
    }
  }, delayMs);
}

function parseYoutubeMessage(item) {
  const message = item?.snippet?.textMessageDetails?.messageText || item?.snippet?.displayMessage || "";
  const user = item?.authorDetails?.displayName || "YouTube";
  if (!message) {
    return null;
  }
  return {
    id: String(item.id || createClientId()),
    user,
    message,
    source: "YouTube",
    roles: extractYoutubeRoles(item?.authorDetails || {})
  };
}

function startRumblePolling() {
  const apiUrl = getUnmaskedFieldValue(elements.desktopRumbleApiUrl);
  if (!apiUrl && !desktopSettings?.rumbleApiUrlConfigured) {
    setFeedback("Enter and save your Rumble Live Stream API URL in API Keys.", true);
    return;
  }
  pollRumbleChat(0);
}

async function pollRumbleChat(delayMs = 4000) {
  if (rumblePollTimer) {
    window.clearTimeout(rumblePollTimer);
  }
  rumblePollTimer = window.setTimeout(async () => {
    try {
      const apiUrl = getUnmaskedFieldValue(elements.desktopRumbleApiUrl);
      const response = await fetch(`/api/rumble/live-chat?url=${encodeURIComponent(apiUrl)}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to read Rumble chat.");
      }
      for (const parsed of parseRumbleMessages(data)) {
        if (!rumbleSeenMessages.has(parsed.id)) {
          rumbleSeenMessages.add(parsed.id);
          enqueueIncomingMessage(parsed);
        }
      }
      while (rumbleSeenMessages.size > 500) {
        rumbleSeenMessages.delete(rumbleSeenMessages.values().next().value);
      }
      updateLiveStatusStrip();
      refreshConnectionControls();
      pollRumbleChat(4000);
    } catch (error) {
      setFeedback(error.message, true);
      updateLiveStatusStrip();
      pollRumbleChat(10000);
    }
  }, delayMs);
}

function parseRumbleMessages(data) {
  const streams = Array.isArray(data?.livestreams) ? data.livestreams : [data];
  const messages = [];
  for (const stream of streams) {
    const recent = stream?.chat?.recent_messages || stream?.recent_messages || [];
    for (const item of recent) {
      const message = coerceTikTokText(item.text || item.message || item.content);
      const user = coerceTikTokText(item.username || item.user || item.name);
      if (message && user) {
        messages.push({
          id: String(item.id || item.created_on || `${user}:${message}`),
          user,
          message,
          source: "Rumble",
          roles: normalizeRoleList(item.roles || item.badges || item.user_badges)
        });
      }
    }
  }
  return messages;
}

function disconnectChat(showMessage = true) {
  suppressReconnect = true;
  if (suppressReconnectTimer) {
    window.clearTimeout(suppressReconnectTimer);
  }
  suppressReconnectTimer = window.setTimeout(() => {
    suppressReconnect = false;
    suppressReconnectTimer = null;
  }, 1000);

  if (twitchSocket) {
    twitchSocket.close();
    twitchSocket = null;
  }
  if (tiktokSocket) {
    tiktokSocket.close();
    tiktokSocket = null;
  }
  tiktokConnectInFlight = false;
  void stopTikTokLiveHelper();
  if (kickSocket) {
    kickSocket.close();
    kickSocket = null;
  }
  kickConnectInFlight = false;
  if (youtubePollTimer) {
    window.clearTimeout(youtubePollTimer);
    youtubePollTimer = null;
  }
  youtubeNextPageToken = "";
  if (rumblePollTimer) {
    window.clearTimeout(rumblePollTimer);
    rumblePollTimer = null;
  }
  if (streamerbotSocket) {
    streamerbotSocket.close();
    streamerbotSocket = null;
  }
  streamerbotConnectInFlight = false;
  rumbleSeenMessages.clear();
  recentIncomingMessages.clear();
  refreshConnectionControls();
  if (showMessage) {
    setFeedback("Disconnected from dashboard live sources.", false, true);
  }
  updateLiveStatusStrip();
}

function handleManualDisconnect() {
  livePausedManually = true;
  clearReconnectTimer();
  browserSourceOwnsPlayback = false;
  disconnectChat(false);
  updateLiveStatusStrip();
  setFeedback("Live chat paused. Turn sources back on or click Connect live chat to resume.", false, true);
}

function stopLocalPlayback(clearNowPlaying = true) {
  pendingMessages.length = 0;
  playbackQueue.length = 0;
  queue.length = 0;
  recentMessageTimestamps.length = 0;
  if (playbackDelayTimer) {
    window.clearTimeout(playbackDelayTimer);
    playbackDelayTimer = null;
  }
  currentPlayingClip = null;
  isPlayingQueuedClip = false;
  setObsPepeSpeaking(false);
  elements.audioPlayer.pause();
  elements.audioPlayer.removeAttribute("src");
  elements.audioPlayer.load();
  renderQueue();
  if (clearNowPlaying) {
    elements.nowPlayingTitle.textContent = "Idle";
    elements.nowPlayingText.textContent = "Local playback is idle.";
  }
  updateLiveStatusStrip();
}

function parsePrivmsg(line) {
  const match = line.match(/^(?:@([^ ]+) )?:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :([\s\S]*)$/);
  if (!match) {
    return null;
  }

  const [, rawTags = "", prefixUser = "", message = ""] = match;
  const tags = parseTags(rawTags ? `@${rawTags}` : "");
  const user = tags["display-name"] || prefixUser || "unknown";
  if (!message.trim()) {
    return null;
  }

  return {
    id: tags.id || createClientId(),
    user,
    message: message.trim(),
    source: "Twitch",
    roles: extractTwitchRoles(tags, user),
    badges: parseTwitchBadges(tags.badges),
    color: normalizeChatColor(tags.color)
  };
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

function parseTwitchBadges(value) {
  return String(value || "")
    .split(",")
    .map((badge) => badge.split("/")[0].trim())
    .filter(Boolean);
}

function extractTwitchRoles(tags, user) {
  const badges = parseTwitchBadges(tags.badges);
  const roles = [];
  if (badges.includes("broadcaster") || normalizeViewerId(user) === normalizeViewerId(currentChannel)) roles.push("broadcaster");
  if (tags.mod === "1" || badges.includes("moderator")) roles.push("moderator");
  if (tags.subscriber === "1" || badges.includes("subscriber") || badges.includes("founder")) roles.push("subscriber");
  if (badges.includes("vip")) roles.push("vip");
  return roles;
}

function extractTikTokRoles(data, messageType, user) {
  const roles = [];
  if (inferTikTokModeratorState(data)) roles.push("moderator");
  if (inferTikTokFollowerState(data, messageType, user)) roles.push("follower");
  if (inferTikTokGifterState(data, messageType, user)) roles.push("gifter");
  return roles;
}

function extractYoutubeRoles(authorDetails) {
  const roles = [];
  if (authorDetails.isChatOwner) roles.push("owner");
  if (authorDetails.isChatModerator) roles.push("moderator");
  if (authorDetails.isChatSponsor) roles.push("member");
  if (authorDetails.isVerified) roles.push("verified");
  return roles;
}

function extractKickRoles(...sources) {
  const roles = [];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    if (source.is_broadcaster || source.isBroadcaster) roles.push("broadcaster");
    if (source.is_moderator || source.isModerator || source.moderator) roles.push("moderator");
    if (source.is_subscriber || source.isSubscriber || source.subscriber) roles.push("subscriber");
    if (source.is_vip || source.isVip || source.vip) roles.push("vip");
  }
  return [...new Set([...roles, ...extractKickBadges(...sources).filter((badge) => ["broadcaster", "moderator", "subscriber", "vip"].includes(badge))])];
}

function extractKickBadges(...sources) {
  const badges = [];
  for (const source of sources) {
    collectRoleLikeValues(source?.badges, badges);
    collectRoleLikeValues(source?.identity?.badges, badges);
    collectRoleLikeValues(source?.sender_badges, badges);
  }
  return [...new Set(badges)];
}

function collectRoleLikeValues(value, output) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        output.push(item.toLowerCase());
      } else if (item && typeof item === "object") {
        collectRoleLikeValues(item.type || item.name || item.text || item.title, output);
      }
    }
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectRoleLikeValues(item, output);
    return;
  }
  output.push(String(value).toLowerCase());
}

function normalizeRoleList(value) {
  const roles = [];
  collectRoleLikeValues(value, roles);
  return [...new Set(roles)];
}

function parseStreamerbotDonationEvent(rawMessage) {
  const payload = safeJsonParse(rawMessage);
  if (!payload) {
    return null;
  }
  const eventSource = String(payload.event?.source || payload.source || "").toLowerCase();
  const eventType = String(payload.event?.type || payload.type || "").toLowerCase();
  if (eventSource !== "streamlabs" || eventType !== "donation") {
    return null;
  }

  const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
  const user = coerceTikTokText(data.donationFrom || data.from || data.name || data.username || data.user || data.displayName) || "Streamlabs donor";
  const formattedAmount = coerceTikTokText(data.donationFormattedAmount || data.formattedAmount || data.formatted_amount);
  const amount = formattedAmount || formatDonationAmount(data.donationAmount ?? data.amount, data.donationCurrency || data.currency);
  return {
    id: String(data.id || data.messageId || data.donationId || `${normalizeViewerId(user)}:${amount}:${Date.now()}`),
    source: "Streamlabs",
    type: "Donation",
    user,
    title: "Streamlabs donation",
    amount,
    message: coerceTikTokText(data.donationMessage || data.message || data.comment)
  };
}

function formatDonationAmount(amount, currency) {
  const numericAmount = Number(amount);
  const currencyCode = String(currency || "").trim().toUpperCase();
  if (!Number.isFinite(numericAmount)) {
    return coerceTikTokText(amount);
  }
  return currencyCode ? `${currencyCode} ${numericAmount.toFixed(2)}` : numericAmount.toFixed(2);
}

function extractTikTokComment(data) {
  const candidates = [
    data.comment,
    data.message,
    data.text,
    data.content,
    data.commentText,
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
  const userDetails = data.userDetails && typeof data.userDetails === "object" ? data.userDetails : {};
  const userInfo = data.userInfo && typeof data.userInfo === "object" ? data.userInfo : {};
  const author = data.author && typeof data.author === "object" ? data.author : {};
  const candidates = [
    userData.nickname,
    userData.uniqueId,
    userData.displayName,
    userData.userId,
    userData.secUid,
    userDetails.nickname,
    userDetails.uniqueId,
    userDetails.displayName,
    userDetails.userId,
    userInfo.nickname,
    userInfo.uniqueId,
    userInfo.displayName,
    userInfo.userId,
    author.nickname,
    author.uniqueId,
    author.displayName,
    author.userId,
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

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function enqueueIncomingMessage(entry) {
  if (isDuplicateIncomingMessage(entry)) {
    return;
  }

  addCombinedChatMessage(entry);

  if (browserSourceOwnsPlayback) {
    return;
  }

  if (!shouldSpeakMessage(entry)) {
    return;
  }

  const antiSpamResult = applyTtsAntiSpam(entry.message, getModerationSettings());
  if (antiSpamResult.blocked && antiSpamResult.action === "skip") {
    logAntiSpamSkip(entry, antiSpamResult);
    return;
  }

  if (!prepareBacklogForMessage()) {
    return;
  }

  const liveSettings = getLiveSettings();
  const sourceName = entry.source || "Live";
  const assignment = getVoiceAssignment(entry.user, sourceName);
  const messageForSpeech = antiSpamResult.blocked ? antiSpamResult.text : entry.message;
  const cleanedMessage = sanitizeMessage(messageForSpeech);
  if (!cleanedMessage) {
    if (antiSpamResult.blocked) {
      logAntiSpamSkip(entry, { ...antiSpamResult, reason: `${antiSpamResult.reason}; no readable text remained` });
    }
    return;
  }
  if (antiSpamResult.blocked) {
    logAntiSpamSkip(entry, antiSpamResult);
  }
  if (isSpeakerOnCooldown(entry)) {
    return;
  }

  pendingMessages.push({
    id: entry.id,
    title: entry.user,
    text: cleanedMessage,
    voiceId: assignment.voiceId,
    voiceName: assignment.name,
    modelId: getModelIdForProvider(assignment.ttsProvider, liveSettings),
    ttsProvider: assignment.ttsProvider,
    source: sourceName
  });

  enforceMaxQueueSize();

  processSpeechQueue();
}

function isDuplicateIncomingMessage(entry) {
  const source = String(entry?.source || "Live").trim() || "Live";
  const id = String(entry?.id || "").trim();
  const user = normalizeViewerId(entry?.user);
  const message = normalizeMessageFingerprint(entry?.message);
  const now = Date.now();
  let duplicate = false;

  for (const [key, seenAt] of recentIncomingMessages) {
    if (now - seenAt > INCOMING_DUPLICATE_WINDOW_MS) {
      recentIncomingMessages.delete(key);
    }
  }

  const keys = [];
  if (id && !id.startsWith("client_")) {
    keys.push(`${source}:id:${id}`);
  }
  if (source === "Kick" && user && message) {
    keys.push(`${source}:fingerprint:${user}:${message}`);
  }

  for (const key of keys) {
    if (recentIncomingMessages.has(key)) {
      duplicate = true;
    }
  }
  for (const key of keys) {
    recentIncomingMessages.set(key, now);
  }
  trimClientHistory();
  return duplicate;
}

function normalizeMessageFingerprint(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function prepareBacklogForMessage() {
  const moderation = getModerationSettings();
  const now = Date.now();
  const windowMs = moderation.fastChatWindowSeconds * 1000;
  recentMessageTimestamps.push(now);
  while (recentMessageTimestamps.length && now - recentMessageTimestamps[0] > windowMs) {
    recentMessageTimestamps.shift();
  }
  trimClientHistory();

  const isFastChat = recentMessageTimestamps.length >= moderation.fastChatMessageThreshold;
  const isAtLimit = getBacklogSize() >= moderation.maxQueueSize;
  if (!isFastChat && !isAtLimit) {
    return true;
  }

  return applySkipBehavior(moderation.fastChatSkipBehavior);
}

function applySkipBehavior(skipBehavior) {
  if (skipBehavior === "drop_newest") {
    return false;
  }

  if (skipBehavior === "latest_only") {
    pendingMessages.length = 0;
    playbackQueue.length = 0;
    return true;
  }

  if (pendingMessages.length) {
    pendingMessages.shift();
  } else if (playbackQueue.length) {
    playbackQueue.shift();
  }
  return true;
}

function enforceMaxQueueSize() {
  const maxQueueSize = getModerationSettings().maxQueueSize;
  while (getBacklogSize() > maxQueueSize) {
    if (pendingMessages.length) {
      pendingMessages.shift();
    } else if (playbackQueue.length) {
      playbackQueue.shift();
    } else {
      break;
    }
  }
}

function getBacklogSize() {
  return pendingMessages.length + playbackQueue.length + (isGenerating ? 1 : 0);
}

function trimClientHistory() {
  if (recentMessageTimestamps.length > MAX_CLIENT_CHAT_HISTORY) {
    recentMessageTimestamps.splice(0, recentMessageTimestamps.length - MAX_CLIENT_CHAT_HISTORY);
  }
  while (tiktokFollowers.size > MAX_CLIENT_CHAT_HISTORY) {
    const oldestKey = tiktokFollowers.keys().next().value;
    tiktokFollowers.delete(oldestKey);
  }
  while (tiktokGifters.size > MAX_CLIENT_CHAT_HISTORY) {
    const oldestKey = tiktokGifters.keys().next().value;
    tiktokGifters.delete(oldestKey);
  }
  while (recentSpeakerActivity.size > MAX_CLIENT_CHAT_HISTORY) {
    const oldestKey = recentSpeakerActivity.keys().next().value;
    recentSpeakerActivity.delete(oldestKey);
  }
  while (recentIncomingMessages.size > MAX_CLIENT_CHAT_HISTORY) {
    const oldestKey = recentIncomingMessages.keys().next().value;
    recentIncomingMessages.delete(oldestKey);
  }
}

function applyTtsAntiSpam(message, moderation) {
  if (containsHardBlockedTtsTerm(message)) {
    return { blocked: true, action: "skip", text: "", reason: "matched hard-blocked slur pattern" };
  }

  if (!moderation.ttsAntiSpamEnabled) {
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

  const repeated = findRepeatedToken(tokens, moderation.ttsAntiSpamMaxRepeatedWordCount, () => true);
  if (repeated) {
    return buildAntiSpamResult(message, normalized, tokens, moderation, `repeated token "${repeated.token}" appeared ${repeated.count} times`, new Set([repeated.token]));
  }

  const repeatedShort = findRepeatedToken(tokens, moderation.ttsAntiSpamMaxRepeatedShortTokenCount, isShortSoundToken);
  if (repeatedShort) {
    return buildAntiSpamResult(message, normalized, tokens, moderation, `short sound "${repeatedShort.token}" appeared ${repeatedShort.count} times`, new Set([repeatedShort.token]));
  }

  const alternating = findAlternatingPattern(tokens, moderation.ttsAntiSpamMaxAlternatingPatternCount);
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
    const cleanedTokens = tokens.filter((token) => !spamTokens.has(token));
    return { blocked: true, action, text: cleanedTokens.join(" "), reason };
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
  if (tokens.length < 4) {
    return null;
  }
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

function logAntiSpamSkip(entry, result) {
  const item = {
    source: entry.source || "Live",
    user: entry.user || "Chat",
    reason: result.reason,
    action: result.action,
    createdAt: new Date()
  };
  antiSpamEvents.unshift(item);
  if (antiSpamEvents.length > 10) {
    antiSpamEvents.length = 10;
  }
  console.info(`[TTS anti-spam] ${item.user}: ${item.reason}`);
  renderAntiSpamLog();
}

function renderAntiSpamLog() {
  if (!antiSpamEvents.length) {
    elements.antiSpamLog.innerHTML = "<li>No anti-spam skips yet.</li>";
    return;
  }
  elements.antiSpamLog.innerHTML = "";
  for (const event of antiSpamEvents.slice(0, 5)) {
    const item = document.createElement("li");
    const createdAt = event.createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    item.textContent = `${createdAt} - ${event.action}: ${event.user} skipped because ${event.reason}`;
    elements.antiSpamLog.append(item);
  }
}

function shouldSpeakMessage(entry) {
  const moderation = getModerationSettings();
  const text = entry.message.trim();
  if (containsHardBlockedTtsTerm(text)) {
    logAntiSpamSkip(entry, { action: "skip", reason: "matched hard-blocked slur pattern" });
    return false;
  }
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
  if (moderation.followersOnly && !isFollowerMessage(entry)) {
    return false;
  }
  if (moderation.speakMentionsOnly && currentChannel && entry.source === "Twitch") {
    return text.toLowerCase().includes(currentChannel.toLowerCase());
  }
  return true;
}

function isBannedChatter(user, moderation) {
  const normalizedUser = normalizeViewerId(user);
  return Boolean(normalizedUser && moderation.bannedChatters.includes(normalizedUser));
}

function sanitizeMessage(message) {
  if (containsHardBlockedTtsTerm(message)) {
    return "";
  }
  const moderation = getModerationSettings();
  const bannedWords = new Set(moderation.bannedWords);
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
  const cooldownMs = Math.max(0, Number(getModerationSettings().userCooldownSeconds) || 0) * 1000;
  if (!cooldownMs) {
    return false;
  }

  const key = `${entry.source || "Live"}:${normalizeViewerId(entry.user)}`;
  const now = Date.now();
  const lastSpokenAt = recentSpeakerActivity.get(key) || 0;
  if (now - lastSpokenAt < cooldownMs) {
    return true;
  }

  recentSpeakerActivity.set(key, now);
  trimClientHistory();
  return false;
}

function looksLikeEmoteOnly(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return true;
  }
  return tokens.every((token) => /^[A-Z0-9_]+$/.test(token));
}

async function processSpeechQueue() {
  if (browserSourceOwnsPlayback) {
    stopLocalPlayback();
    return;
  }

  if (isGenerating || !pendingMessages.length || !currentUser) {
    return;
  }

  isGenerating = true;
  const nextClip = pendingMessages.shift();
  const liveSettings = getLiveSettings();

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({
        text: nextClip.text,
        ttsProvider: nextClip.ttsProvider,
        voiceId: nextClip.voiceId,
        modelId: nextClip.modelId,
        stability: liveSettings.stability,
        similarityBoost: liveSettings.similarityBoost,
        speed: liveSettings.speed,
        source: nextClip.source,
        speakerName: nextClip.title,
        voiceName: nextClip.voiceName,
        metadata: nextClip.metadata || null
      })
    });
    const data = await readTtsResponseJson(response, "Unable to generate speech");
    if (!response.ok) {
      throw new Error(data.error || "Unable to generate speech.");
    }

    nextClip.audioUrl = `data:${data.mimeType};base64,${data.audioBase64}`;
    nextClip.createdAt = new Date();
    if (isBannedChatter(nextClip.title, getModerationSettings())) {
      setFeedback(`${nextClip.title} is banned from TTS. Generated clip skipped.`, false, true);
      return;
    }
    mergeRecentSpokenMessages([{
      id: nextClip.id,
      title: nextClip.title,
      text: nextClip.text,
      voiceId: nextClip.voiceId,
      voiceName: nextClip.voiceName,
      modelId: nextClip.modelId,
      ttsProvider: nextClip.ttsProvider,
      source: nextClip.source,
      createdAt: nextClip.createdAt.toISOString()
    }]);

    currentUser.remainingCharacters = Number(data.meta?.remainingCharacters ?? currentUser.remainingCharacters);
    currentUser.monthlyUsed += Number(data.meta?.chargedCharacters || 0);
    renderAccount();
    enqueuePlayback(nextClip);
    setFeedback(`Live TTS active on ${nextClip.source}. Charged ${data.meta?.chargedCharacters || nextClip.text.length} characters.`, false, true);
  } catch (error) {
    setFeedback(error.message, true);
  } finally {
    isGenerating = false;
    if (pendingMessages.length > 0) {
      processSpeechQueue();
    }
  }
}

function renderQueue() {
  if (!queue.length) {
    elements.queueList.innerHTML = '<li class="queue-empty">No spoken messages yet.</li>';
    elements.toggleRecentButton.classList.add("hidden");
    return;
  }

  const visibleQueue = recentExpanded ? queue : queue.slice(0, 5);
  elements.toggleRecentButton.classList.toggle("hidden", queue.length <= 5);
  elements.toggleRecentButton.textContent = recentExpanded ? "Show 5" : `Show all (${queue.length})`;
  elements.toggleRecentButton.setAttribute("aria-expanded", String(recentExpanded));
  elements.queueList.innerHTML = "";
  for (const clip of visibleQueue) {
    const item = document.createElement("li");
    item.className = "queue-item";
    const createdAt = clip.createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    item.innerHTML = `
      <div class="queue-item-top">
        <div>
          <strong>${escapeHtml(clip.title)} - ${escapeHtml(clip.voiceName)}</strong>
          <p>${escapeHtml(clip.text)}</p>
          <p class="queue-meta">${escapeHtml(clip.source)} - ${escapeHtml(clip.modelId)} - ${createdAt}</p>
        </div>
        <button type="button"${clip.audioUrl ? "" : " disabled"}>${clip.audioUrl ? "Play" : "Queued"}</button>
      </div>
    `;
    if (clip.audioUrl) {
      item.querySelector("button").addEventListener("click", () => playClip(clip));
    }
    elements.queueList.append(item);
  }
}

function addCombinedChatMessage(entry) {
  const message = normalizeCombinedChatMessage(entry);
  combinedChatMessages.push(message);
  while (combinedChatMessages.length > MAX_CLIENT_CHAT_HISTORY) {
    combinedChatMessages.shift();
  }
  renderCombinedChat();
  broadcastCombinedChatMessage(message);
}

function normalizeCombinedChatMessage(entry) {
  return {
    id: String(entry?.id || createClientId()),
    user: String(entry?.user || "Chat").trim() || "Chat",
    message: String(entry?.message || "").trim(),
    source: String(entry?.source || "Live").trim() || "Live",
    roles: Array.isArray(entry?.roles) ? [...new Set(entry.roles.map((role) => String(role).trim()).filter(Boolean))] : [],
    badges: Array.isArray(entry?.badges) ? [...new Set(entry.badges.map((badge) => String(badge).trim()).filter(Boolean))] : [],
    color: normalizeChatColor(entry?.color),
    createdAt: entry?.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
  };
}

function renderCombinedChat() {
  if (!elements.combinedChatList) {
    return;
  }
  elements.combinedChatCount.textContent = `${combinedChatMessages.length} ${combinedChatMessages.length === 1 ? "message" : "messages"}`;
  if (!combinedChatMessages.length) {
    elements.combinedChatList.innerHTML = '<li class="combined-chat-empty">Connect live chat sources to see every platform in one feed.</li>';
    return;
  }

  elements.combinedChatList.innerHTML = "";
  for (const message of combinedChatMessages.slice(-200)) {
    elements.combinedChatList.append(createCombinedChatItem(message));
  }
  elements.combinedChatList.scrollTop = elements.combinedChatList.scrollHeight;
}

function createCombinedChatItem(message) {
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
  meta.append(source);

  const time = document.createElement("time");
  time.dateTime = message.createdAt;
  time.textContent = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  meta.append(time);

  const body = document.createElement("div");
  body.className = "combined-chat-body";
  const username = document.createElement("strong");
  username.className = "combined-chat-user";
  username.textContent = message.user;
  if (message.color) {
    username.style.color = message.color;
  }
  body.append(username);

  const badges = getDisplayChatBadges(message).slice(0, 2);
  for (const badge of badges) {
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

function clearCombinedChat() {
  combinedChatMessages.length = 0;
  renderCombinedChat();
  broadcastCombinedChatState();
}

function broadcastCombinedChatMessage(message) {
  combinedChatChannel?.postMessage({ type: "chat-message", message });
}

function broadcastCombinedChatState() {
  combinedChatChannel?.postMessage({ type: "chat-state", messages: combinedChatMessages.slice(-MAX_CLIENT_CHAT_HISTORY) });
}

function formatChatBadge(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "moderator" || normalized === "mod") {
    return "MOD";
  }
  if (normalized === "subscriber" || normalized === "sub") {
    return "SUB";
  }
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 18);
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

function getPlatformLogo(source) {
  const key = String(source || "").toLowerCase();
  if (key === "twitch") return "/platform-twitch.webp";
  if (key === "tiktok") return "/platform-tiktok.png";
  if (key === "kick") return "/platform-kick.webp";
  if (key === "youtube") return "/platform-youtube.webp";
  if (key === "rumble") return "/platform-rumble.webp";
  return "";
}

function normalizeChatColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "";
}

function normalizeStreamerbotEndpoint(value) {
  const endpoint = String(value || "ws://127.0.0.1:8080/").trim();
  if (!endpoint) {
    return "ws://127.0.0.1:8080/";
  }
  if (/^wss?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  return `ws://${endpoint.replace(/^\/+/, "")}`;
}

function addGiftDonoEvent(entry) {
  const event = normalizeGiftDonoEvent(entry);
  if (!event.id || giftDonoEvents.some((item) => item.id === event.id)) {
    return;
  }
  giftDonoEvents.push(event);
  while (giftDonoEvents.length > MAX_CLIENT_CHAT_HISTORY) {
    giftDonoEvents.shift();
  }
  renderGiftDonoEvents();
  broadcastGiftDonoEvent(event);
}

function normalizeGiftDonoEvent(entry) {
  return {
    id: String(entry?.id || createClientId()),
    source: String(entry?.source || "Live").trim() || "Live",
    type: String(entry?.type || "Gift").trim() || "Gift",
    user: String(entry?.user || "Someone").trim() || "Someone",
    title: String(entry?.title || entry?.giftName || entry?.type || "Support").trim() || "Support",
    amount: String(entry?.amount || "").trim(),
    quantity: Math.max(1, Number(entry?.quantity) || 1),
    message: String(entry?.message || "").trim(),
    createdAt: entry?.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
  };
}

function renderGiftDonoEvents() {
  if (!elements.giftDonoList) {
    return;
  }
  elements.giftDonoCount.textContent = `${giftDonoEvents.length} ${giftDonoEvents.length === 1 ? "event" : "events"}`;
  if (!giftDonoEvents.length) {
    elements.giftDonoList.innerHTML = '<li class="gift-dono-empty">Streamlabs donations will appear here.</li>';
    return;
  }
  elements.giftDonoList.innerHTML = "";
  for (const event of giftDonoEvents.slice(-200).reverse()) {
    elements.giftDonoList.append(createGiftDonoItem(event));
  }
}

function createGiftDonoItem(event) {
  const item = document.createElement("li");
  item.className = `gift-dono-item source-${event.source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const source = document.createElement("span");
  source.className = "gift-dono-source";
  source.title = event.source;
  const sourceLogo = getPlatformLogo(event.source === "Streamlabs" ? "Streamerbot" : event.source) || getPlatformLogo(event.source);
  if (sourceLogo) {
    const image = document.createElement("img");
    image.src = sourceLogo;
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

function clearGiftDonoEvents() {
  giftDonoEvents.length = 0;
  renderGiftDonoEvents();
  broadcastGiftDonoState();
}

function broadcastGiftDonoEvent(event) {
  giftDonoChannel?.postMessage({ type: "gift-dono-event", event });
}

function broadcastGiftDonoState() {
  giftDonoChannel?.postMessage({ type: "gift-dono-state", events: giftDonoEvents.slice(-MAX_CLIENT_CHAT_HISTORY) });
}

function toggleRecentMessages() {
  recentExpanded = !recentExpanded;
  renderQueue();
}

function playClip(clip) {
  isPlayingQueuedClip = true;
  if (playbackDelayTimer) {
    window.clearTimeout(playbackDelayTimer);
    playbackDelayTimer = null;
  }
  elements.audioPlayer.volume = getVoiceVolume(clip.voiceId);
  const audioUrl = clip.audioUrl;
  elements.audioPlayer.src = audioUrl;
  clip.audioUrl = "";
  currentPlayingClip = clip;
  renderQueue();
  setObsPepeSpeaking(!ttsMuted, clip);
  elements.audioPlayer.play().catch(() => {
    clip.audioUrl = audioUrl;
    renderQueue();
    setFeedback("Clip generated. Press play if your browser blocks autoplay.", false);
    isPlayingQueuedClip = false;
    setObsPepeSpeaking(false, clip);
  });
  elements.nowPlayingTitle.textContent = `${clip.title} on ${clip.source}`;
  elements.nowPlayingText.textContent = clip.text;
}

function clearQueue() {
  queue.length = 0;
  pendingMessages.length = 0;
  playbackQueue.length = 0;
  recentMessageTimestamps.length = 0;
  if (playbackDelayTimer) {
    window.clearTimeout(playbackDelayTimer);
    playbackDelayTimer = null;
  }
  currentPlayingClip = null;
  isPlayingQueuedClip = false;
  setObsPepeSpeaking(false);
  elements.audioPlayer.removeAttribute("src");
  elements.audioPlayer.load();
  elements.nowPlayingTitle.textContent = "Nothing queued yet";
  elements.nowPlayingText.textContent = "Connect Twitch chat or TikTok Live to begin.";
  renderQueue();
  setFeedback("Queue cleared.", false, true);
}

function enqueuePlayback(clip) {
  playbackQueue.push(clip);
  if (!getModerationSettings().neverSkipMidSpeech) {
    const latestClip = playbackQueue.pop();
    playbackQueue.length = 0;
    playClip(latestClip);
    return;
  }
  if (!isPlayingQueuedClip && (elements.audioPlayer.paused || elements.audioPlayer.ended || !elements.audioPlayer.src)) {
    playNextQueuedClip();
  }
}

function playNextQueuedClip() {
  if (!playbackQueue.length) {
    isPlayingQueuedClip = false;
    return;
  }
  playClip(playbackQueue.shift());
}

function handleAudioPlaybackFinished() {
  isPlayingQueuedClip = false;
  setObsPepeSpeaking(false, currentPlayingClip);
  currentPlayingClip = null;
  elements.audioPlayer.removeAttribute("src");
  elements.audioPlayer.load();
  if (getModerationSettings().neverSkipMidSpeech) {
    scheduleNextQueuedClip();
  }
}

function scheduleNextQueuedClip() {
  if (!playbackQueue.length) {
    return;
  }
  const pauseMs = Math.max(0, Number(getModerationSettings().messagePauseSeconds) || 0) * 1000;
  if (!pauseMs) {
    playNextQueuedClip();
    return;
  }
  if (playbackDelayTimer) {
    window.clearTimeout(playbackDelayTimer);
  }
  playbackDelayTimer = window.setTimeout(() => {
    playbackDelayTimer = null;
    playNextQueuedClip();
  }, pauseMs);
}

function getVoiceAssignment(user, sourceName = "Live") {
  const key = user.toLowerCase();
  const liveSettings = getLiveSettings();
  if (speakerAssignments[key]?.isOverride) {
    return normalizeSpeakerAssignment(speakerAssignments[key], getProviderForSource(sourceName, liveSettings));
  }

  const routedAssignment = getRoutedVoiceAssignment(liveSettings, sourceName);
  if (routedAssignment) {
    if (liveSettings.voiceMode !== "fixed_all") {
      speakerAssignments[key] = { ...routedAssignment, isOverride: false };
      void persistVoiceMap();
      renderAssignments();
    }
    return routedAssignment;
  }

  const provider = getProviderForSource(sourceName, liveSettings);
  if (provider === "cartesia") {
    const cartesiaVoice = getCartesiaVoice();
    speakerAssignments[key] = { ...cartesiaVoice, ttsProvider: "cartesia", isOverride: false };
    void persistVoiceMap();
    renderAssignments();
    return speakerAssignments[key];
  }

  let voice = speakerAssignments[key]?.ttsProvider === "elevenlabs"
    ? getElevenLabsVoices().find((item) => item.voiceId === speakerAssignments[key].voiceId)
    : null;
  if (voice) {
    return { ...voice, ttsProvider: "elevenlabs", isOverride: false };
  }
  if (liveSettings.voiceMode === "fixed") {
    voice = getElevenLabsVoices().find((item) => item.voiceId === liveSettings.fallbackVoiceId) || getElevenLabsVoices()[0];
  } else if (liveSettings.voiceMode === "random") {
    const voices = getElevenLabsVoices();
    voice = voices[Math.floor(Math.random() * voices.length)];
  } else {
    const voices = getElevenLabsVoices();
    voice = voices[rotateIndex % voices.length];
    rotateIndex += 1;
  }

  speakerAssignments[key] = { ...voice, ttsProvider: "elevenlabs", isOverride: false };
  void persistVoiceMap();
  renderAssignments();
  return speakerAssignments[key];
}

function getRoutedVoiceAssignment(liveSettings, sourceName) {
  if (liveSettings.voiceMode === "fixed_all") {
    const fixedVoice = getAssignmentVoice(liveSettings.fixedVoiceProvider, liveSettings.fixedVoiceId);
    return fixedVoice ? { ...fixedVoice, ttsProvider: liveSettings.fixedVoiceProvider, isOverride: false } : null;
  }
  if (liveSettings.voiceMode === "rotate_all") {
    return getNextVoiceFromPool([...getProviderVoicePool("elevenlabs"), ...getProviderVoicePool("cartesia")]);
  }
  if (liveSettings.voiceMode === "rotate_cartesia") {
    return getNextVoiceFromPool(getProviderVoicePool("cartesia"));
  }
  if (liveSettings.voiceMode === "rotate_elevenlabs") {
    return getNextVoiceFromPool(getProviderVoicePool("elevenlabs"));
  }
  if (liveSettings.voiceMode === "source") {
    const provider = getProviderForSource(sourceName, liveSettings);
    if (provider === "both") {
      return getNextVoiceFromPool([...getProviderVoicePool("elevenlabs"), ...getProviderVoicePool("cartesia")]);
    }
    if (provider === "cartesia") {
      return getNextVoiceFromPool(getProviderVoicePool("cartesia"));
    }
  }
  return null;
}

function getProviderVoicePool(provider) {
  if (provider === "cartesia") {
    return getCartesiaAssignmentVoices().map((voice) => ({ ...voice, ttsProvider: "cartesia" }));
  }
  return getElevenLabsVoices().map((voice) => ({ ...voice, ttsProvider: "elevenlabs" }));
}

function getNextVoiceFromPool(pool) {
  const voices = pool.filter((voice) => voice?.voiceId);
  if (!voices.length) {
    return null;
  }
  const voice = voices[rotateIndex % voices.length];
  rotateIndex += 1;
  return { ...voice, isOverride: false };
}

function getProviderForSource(sourceName, liveSettings = getLiveSettings()) {
  if (liveSettings.ttsProviderMode !== "both") {
    return liveSettings.ttsProvider;
  }
  return liveSettings.sourceTtsProviders[sourceName] || liveSettings.ttsProvider;
}

function getModelIdForProvider(provider, liveSettings = getLiveSettings()) {
  return provider === "cartesia"
    ? normalizeProviderModelId("cartesia", liveSettings.cartesiaModelId)
    : normalizeProviderModelId("elevenlabs", liveSettings.elevenLabsModelId);
}

function normalizeSpeakerAssignment(assignment, fallbackProvider = "elevenlabs") {
  const raw = assignment && typeof assignment === "object" ? assignment : {};
  const provider = normalizeProviderValue(raw.ttsProvider || fallbackProvider);
  if (provider === "cartesia") {
    const cartesiaVoice = getAssignmentVoice("cartesia", raw.voiceId);
    return { ...cartesiaVoice, ttsProvider: "cartesia", isOverride: Boolean(raw.isOverride) };
  }
  const voice = getElevenLabsVoices().find((entry) => entry.voiceId === raw.voiceId) || getElevenLabsVoices()[0];
  return { ...voice, ttsProvider: "elevenlabs", isOverride: Boolean(raw.isOverride) };
}

function getCartesiaVoice() {
  return getCartesiaAssignmentVoices()[0] || { name: "Cartesia", voiceId: CARTESIA_VOICE_PRESETS[0].voiceId };
}

function getCartesiaAssignmentVoices() {
  const voices = mergeVoiceLists(CARTESIA_VOICE_PRESETS, getCustomVoices("cartesia"));
  const legacyVoiceId = String(desktopSettings?.cartesiaVoiceId || "").trim();
  if (legacyVoiceId && !voices.some((voice) => voice.voiceId === legacyVoiceId)) {
    voices.push({ name: "Cartesia", voiceId: legacyVoiceId });
  }
  return voices;
}

function populateAssignmentVoiceSelect(select, provider, selectedVoiceId) {
  select.innerHTML = "";
  const voices = provider === "cartesia" ? getCartesiaAssignmentVoices() : getElevenLabsVoices();
  for (const optionVoice of voices) {
    const option = document.createElement("option");
    option.value = optionVoice.voiceId;
    option.textContent = provider === "cartesia" ? `Cartesia - ${optionVoice.name}` : optionVoice.name;
    option.selected = optionVoice.voiceId === selectedVoiceId;
    select.append(option);
  }
}

function getAssignmentVoice(provider, voiceId) {
  if (provider === "cartesia") {
    return getCartesiaAssignmentVoices().find((entry) => entry.voiceId === voiceId) || getCartesiaVoice();
  }
  return getElevenLabsVoices().find((entry) => entry.voiceId === voiceId) || getElevenLabsVoices()[0];
}

function renderAssignments() {
  const rawEntries = Object.entries(speakerAssignments).sort((a, b) => a[0].localeCompare(b[0]));
  const query = String(elements.assignmentSearch.value || "").trim().toLowerCase();
  const entries = query
    ? rawEntries.filter(([user]) => user.includes(query))
    : rawEntries;

  elements.assignmentCount.textContent = `${rawEntries.length.toLocaleString()} ${rawEntries.length === 1 ? "chatter" : "chatters"}`;

  if (!rawEntries.length) {
    elements.assignmentList.innerHTML = '<li class="queue-empty">No chatters assigned yet.</li>';
    return;
  }

  if (!entries.length) {
    elements.assignmentList.innerHTML = '<li class="queue-empty">No matching chatters found.</li>';
    return;
  }
  elements.assignmentList.innerHTML = "";
  for (const [user, voice] of entries) {
    const assignment = normalizeSpeakerAssignment(voice);
    const item = document.createElement("li");
    item.className = "queue-item";
    const providerSelect = document.createElement("select");
    for (const [value, label] of [["elevenlabs", "ElevenLabs"], ["cartesia", "Cartesia"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = assignment.ttsProvider === value;
      providerSelect.append(option);
    }
    const select = document.createElement("select");
    populateAssignmentVoiceSelect(select, assignment.ttsProvider, assignment.voiceId);
    providerSelect.addEventListener("change", () => {
      const nextProvider = normalizeProviderValue(providerSelect.value);
      const nextVoice = getAssignmentVoice(nextProvider, select.value);
      speakerAssignments[user] = { ...nextVoice, ttsProvider: nextProvider, isOverride: true };
      void persistVoiceMap();
      renderAssignments();
    });
    select.addEventListener("change", () => {
      const provider = normalizeProviderValue(providerSelect.value);
      const nextVoice = getAssignmentVoice(provider, select.value);
      speakerAssignments[user] = { ...nextVoice, ttsProvider: provider, isOverride: true };
      void persistVoiceMap();
      renderAssignments();
    });
    const banButton = document.createElement("button");
    banButton.type = "button";
    banButton.textContent = "Ban from TTS";
    banButton.addEventListener("click", () => banChatterFromTts(user));
    item.innerHTML = `<div><strong>${escapeHtml(user)}</strong><p class="queue-meta">${escapeHtml(assignment.ttsProvider === "cartesia" ? "Cartesia" : "ElevenLabs")} - ${escapeHtml(assignment.name)}${assignment.isOverride ? " - user override" : ""}</p></div>`;
    item.append(providerSelect);
    item.append(select);
    item.append(banButton);
    elements.assignmentList.append(item);
  }
}

async function banChatterFromTts(user) {
  const normalizedUser = normalizeViewerId(user);
  if (!normalizedUser) {
    return;
  }
  const moderation = collectModerationFromForm();
  const bannedChatters = new Set(moderation.bannedChatters);
  bannedChatters.add(normalizedUser);
  elements.bannedChatters.value = [...bannedChatters].sort((a, b) => a.localeCompare(b)).join("\n");
  handleSettingsInputChange();
  purgeChatterFromTts(normalizedUser);
  const saved = await saveModerationSettings(true);
  if (saved) {
    setFeedback(`${normalizedUser} is banned from TTS and removed from the active queue.`, false, true);
  } else {
    setFeedback(`${normalizedUser} is banned locally, but the account save failed. Click Save settings to retry.`, true);
  }
}

function renderBannedChattersList(bannedChatters = collectModerationFromForm().bannedChatters) {
  const chatters = [...bannedChatters].sort((a, b) => a.localeCompare(b));
  elements.bannedChattersList.innerHTML = "";
  if (!chatters.length) {
    elements.bannedChattersList.innerHTML = "<li>No chatters banned from TTS.</li>";
    return;
  }
  for (const chatter of chatters) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const button = document.createElement("button");
    name.textContent = chatter;
    button.type = "button";
    button.textContent = "Unban";
    button.addEventListener("click", () => unbanChatterFromTts(chatter));
    item.append(name, button);
    elements.bannedChattersList.append(item);
  }
}

async function unbanChatterFromTts(user) {
  const normalizedUser = normalizeViewerId(user);
  const moderation = collectModerationFromForm();
  const nextChatters = moderation.bannedChatters.filter((entry) => entry !== normalizedUser);
  elements.bannedChatters.value = nextChatters.join("\n");
  handleSettingsInputChange();
  const saved = await saveModerationSettings(true);
  if (saved) {
    setFeedback(`${normalizedUser} is unbanned from TTS.`, false, true);
  } else {
    setFeedback(`${normalizedUser} is unbanned locally, but the account save failed. Click Save settings to retry.`, true);
  }
}

function purgeChatterFromTts(normalizedUser) {
  removeClipsByUser(pendingMessages, normalizedUser);
  removeClipsByUser(playbackQueue, normalizedUser);
  if (currentPlayingClip && normalizeViewerId(currentPlayingClip.title) === normalizedUser) {
    elements.audioPlayer.pause();
    elements.audioPlayer.removeAttribute("src");
    elements.audioPlayer.load();
    currentPlayingClip = null;
    isPlayingQueuedClip = false;
    setObsPepeSpeaking(false);
    elements.nowPlayingTitle.textContent = "Nothing queued yet";
    elements.nowPlayingText.textContent = `${normalizedUser} was banned from TTS.`;
    scheduleNextQueuedClip();
  }
}

function removeClipsByUser(clips, normalizedUser) {
  for (let index = clips.length - 1; index >= 0; index -= 1) {
    if (normalizeViewerId(clips[index]?.title) === normalizedUser) {
      clips.splice(index, 1);
    }
  }
}

function resetAssignments() {
  for (const key of Object.keys(speakerAssignments)) {
    delete speakerAssignments[key];
  }
  void persistVoiceMap();
  renderAssignments();
  setFeedback("Chatter voice assignments reset.", false, true);
}

async function saveVoiceAssignments() {
  elements.saveAssignmentsButton.disabled = true;
  try {
    await persistVoiceMap();
    setFeedback("Voice assignments saved.", false, true);
  } finally {
    elements.saveAssignmentsButton.disabled = !currentUser;
  }
}

function applySavedChannel() {
  const preferred = currentUser?.channelName || elements.desktopChannelName.value || currentChannel;
  if (preferred) {
    elements.channelName.value = preferred;
    elements.desktopChannelName.value = preferred;
  }
}

function applyModerationToForm(moderation) {
  const next = normalizeModeration(moderation);
  elements.skipCommands.checked = next.skipCommands;
  elements.skipLinks.checked = next.skipLinks;
  elements.skipEmotesOnly.checked = next.skipEmotesOnly;
  elements.speakMentionsOnly.checked = next.speakMentionsOnly;
  elements.neverSkipMidSpeech.checked = next.neverSkipMidSpeech;
  elements.followersOnly.checked = next.followersOnly;
  elements.minLength.value = next.minMessageLength;
  elements.maxMessageCharacters.value = next.maxMessageCharacters;
  elements.userCooldownSeconds.value = next.userCooldownSeconds;
  elements.maxQueueSize.value = next.maxQueueSize;
  elements.fastChatMessageThreshold.value = next.fastChatMessageThreshold;
  elements.fastChatWindowSeconds.value = next.fastChatWindowSeconds;
  elements.fastChatSkipBehavior.value = next.fastChatSkipBehavior;
  elements.messagePauseSeconds.value = next.messagePauseSeconds;
  elements.ttsAntiSpamEnabled.checked = next.ttsAntiSpamEnabled;
  elements.ttsAntiSpamMaxRepeatedWordCount.value = next.ttsAntiSpamMaxRepeatedWordCount;
  elements.ttsAntiSpamMaxRepeatedShortTokenCount.value = next.ttsAntiSpamMaxRepeatedShortTokenCount;
  elements.ttsAntiSpamMaxAlternatingPatternCount.value = next.ttsAntiSpamMaxAlternatingPatternCount;
  elements.ttsAntiSpamAction.value = next.ttsAntiSpamAction;
  elements.bannedChatters.value = next.bannedChatters.join("\n");
  elements.bannedWords.value = next.bannedWords.join("\n");
  renderBannedChattersList(next.bannedChatters);
}

function applyLiveSettingsToForm(settings) {
  const next = normalizeLiveSettings(settings);
  elements.browserSourceEnabled.checked = false;
  elements.twitchSourceEnabled.checked = next.twitchSourceEnabled;
  elements.tiktokSourceEnabled.checked = next.tiktokSourceEnabled;
  elements.kickSourceEnabled.checked = next.kickSourceEnabled;
  elements.youtubeSourceEnabled.checked = next.youtubeSourceEnabled;
  elements.rumbleSourceEnabled.checked = next.rumbleSourceEnabled;
  elements.streamerbotSourceEnabled.checked = next.streamerbotSourceEnabled;
  elements.ttsProvider.value = next.ttsProvider;
  elements.ttsProviderMode.value = next.ttsProviderMode;
  elements.twitchTtsProvider.value = next.sourceTtsProviders.Twitch;
  elements.tiktokTtsProvider.value = next.sourceTtsProviders.TikTok;
  elements.kickTtsProvider.value = next.sourceTtsProviders.Kick;
  elements.youtubeTtsProvider.value = next.sourceTtsProviders.YouTube;
  elements.rumbleTtsProvider.value = next.sourceTtsProviders.Rumble;
  syncProviderControls(next);
  elements.ttsProviderLabel.textContent = next.ttsProviderMode === "both"
    ? "Both"
    : next.ttsProvider === "cartesia" ? "Cartesia" : "ElevenLabs";
  elements.voiceMode.value = next.voiceMode;
  elements.fixedVoiceProvider.value = next.fixedVoiceProvider;
  populateFixedVoiceSelect(next.fixedVoiceProvider, next.fixedVoiceId);
  renderModelOptions(next.ttsProvider, next.modelId);
  elements.modelId.value = next.modelId;
  elements.elevenLabsModelId.value = next.elevenLabsModelId;
  elements.cartesiaModelId.value = next.cartesiaModelId;
  elements.stability.value = next.stability;
  elements.similarityBoost.value = next.similarityBoost;
  elements.speed.value = next.speed;
  updateSliderLabels();
  syncVoiceModeControls(next);
  syncSourceSections(next);
}

function collectModerationFromForm() {
  const bannedWordList = collectBannedWordList();
  return normalizeModeration({
    skipCommands: elements.skipCommands.checked,
    skipLinks: elements.skipLinks.checked,
    skipEmotesOnly: elements.skipEmotesOnly.checked,
    speakMentionsOnly: elements.speakMentionsOnly.checked,
    neverSkipMidSpeech: elements.neverSkipMidSpeech.checked,
    followersOnly: elements.followersOnly.checked,
    minMessageLength: Number(elements.minLength.value),
    maxMessageCharacters: Number(elements.maxMessageCharacters.value),
    userCooldownSeconds: Number(elements.userCooldownSeconds.value),
    maxQueueSize: Number(elements.maxQueueSize.value),
    fastChatMessageThreshold: Number(elements.fastChatMessageThreshold.value),
    fastChatWindowSeconds: Number(elements.fastChatWindowSeconds.value),
    fastChatSkipBehavior: elements.fastChatSkipBehavior.value,
    messagePauseSeconds: Number(elements.messagePauseSeconds.value),
    ttsAntiSpamEnabled: elements.ttsAntiSpamEnabled.checked,
    ttsAntiSpamMaxRepeatedWordCount: Number(elements.ttsAntiSpamMaxRepeatedWordCount.value),
    ttsAntiSpamMaxRepeatedShortTokenCount: Number(elements.ttsAntiSpamMaxRepeatedShortTokenCount.value),
    ttsAntiSpamMaxAlternatingPatternCount: Number(elements.ttsAntiSpamMaxAlternatingPatternCount.value),
    ttsAntiSpamAction: elements.ttsAntiSpamAction.value,
    bannedChatters: splitTextareaList(elements.bannedChatters.value),
    bannedWords: bannedWordList,
    ttsAntiSpamBlockedPhrases: bannedWordList,
    ttsAntiSpamBlockedSounds: bannedWordList
  });
}

function collectBannedWordList() {
  return splitTextareaList(elements.bannedWords?.value || "")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

async function handleBannedWordsFileUpload(event) {
  const input = event.currentTarget;
  const files = Array.from(input.files || []);
  if (!files.length) {
    return;
  }

  try {
    const importedTerms = [];
    for (const file of files) {
      const text = await readTextFile(file);
      importedTerms.push(...parseBannedWordDocument(text));
    }

    const existingTerms = collectBannedWordList();
    const mergedTerms = [...new Set([...existingTerms, ...importedTerms])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    elements.bannedWords.value = mergedTerms.join("\n");
    handleSettingsInputChange();
    const addedCount = Math.max(0, mergedTerms.length - existingTerms.length);
    setBannedWordsUploadStatus(`Imported ${importedTerms.length} entries from ${files.length} file(s). ${addedCount} new entries added.`);
    setFeedback("Banned word list imported. Click Save moderation to store it.", false, true);
  } catch (error) {
    setBannedWordsUploadStatus(error.message || "Unable to import banned word list.");
    setFeedback(error.message || "Unable to import banned word list.", true);
  } finally {
    input.value = "";
  }
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/\.txt$/i.test(file.name || "")) {
      reject(new Error("Only .txt banned word lists are supported."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Unable to read ${file.name || "file"}.`));
    reader.readAsText(file);
  });
}

function parseBannedWordDocument(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith("#"));
}

function setBannedWordsUploadStatus(message) {
  if (elements.bannedWordsUploadStatus) {
    elements.bannedWordsUploadStatus.textContent = message;
  }
}

function collectLiveSettingsFromForm() {
  return normalizeLiveSettings({
    browserSourceEnabled: false,
    twitchSourceEnabled: elements.twitchSourceEnabled.checked,
    tiktokSourceEnabled: elements.tiktokSourceEnabled.checked,
    kickSourceEnabled: elements.kickSourceEnabled.checked,
    youtubeSourceEnabled: elements.youtubeSourceEnabled.checked,
    rumbleSourceEnabled: elements.rumbleSourceEnabled.checked,
    streamerbotSourceEnabled: elements.streamerbotSourceEnabled.checked,
    ttsProvider: elements.ttsProvider.value,
    ttsProviderMode: elements.ttsProviderMode.value,
    sourceTtsProviders: {
      Twitch: elements.twitchTtsProvider.value,
      TikTok: elements.tiktokTtsProvider.value,
      Kick: elements.kickTtsProvider.value,
      YouTube: elements.youtubeTtsProvider.value,
      Rumble: elements.rumbleTtsProvider.value
    },
    voiceMode: elements.voiceMode.value,
    fallbackVoiceId: currentUser?.liveSettings?.fallbackVoiceId || getElevenLabsVoices()[0]?.voiceId || DEFAULT_LIVE_SETTINGS.fallbackVoiceId,
    fixedVoiceProvider: elements.fixedVoiceProvider.value,
    fixedVoiceId: elements.fixedVoiceId.value,
    modelId: elements.modelId.value,
    elevenLabsModelId: elements.elevenLabsModelId.value,
    cartesiaModelId: elements.cartesiaModelId.value,
    stability: Number(elements.stability.value),
    similarityBoost: Number(elements.similarityBoost.value),
    speed: Number(elements.speed.value)
  });
}

function normalizeModeration(moderation) {
  const source = moderation && typeof moderation === "object" ? moderation : {};
  const bannedWords = mergeModerationWordLists(
    source.bannedWords,
    source.ttsAntiSpamBlockedPhrases,
    source.ttsAntiSpamBlockedSounds
  );
  const bannedChatters = Array.isArray(source.bannedChatters) ? source.bannedChatters : [];
  return {
    skipCommands: source.skipCommands ?? DEFAULT_MODERATION.skipCommands,
    skipLinks: source.skipLinks ?? DEFAULT_MODERATION.skipLinks,
    skipEmotesOnly: source.skipEmotesOnly ?? DEFAULT_MODERATION.skipEmotesOnly,
    speakMentionsOnly: source.speakMentionsOnly ?? DEFAULT_MODERATION.speakMentionsOnly,
    neverSkipMidSpeech: source.neverSkipMidSpeech ?? DEFAULT_MODERATION.neverSkipMidSpeech,
    followersOnly: source.followersOnly ?? DEFAULT_MODERATION.followersOnly,
    minMessageLength: clampNumber(source.minMessageLength, 1, 200, DEFAULT_MODERATION.minMessageLength),
    maxMessageCharacters: clampNumber(source.maxMessageCharacters, 1, 100, DEFAULT_MODERATION.maxMessageCharacters),
    userCooldownSeconds: clampNumber(source.userCooldownSeconds, 0, 3600, DEFAULT_MODERATION.userCooldownSeconds),
    maxQueueSize: clampNumber(source.maxQueueSize, 1, 50, DEFAULT_MODERATION.maxQueueSize),
    fastChatMessageThreshold: clampNumber(source.fastChatMessageThreshold, 2, 200, DEFAULT_MODERATION.fastChatMessageThreshold),
    fastChatWindowSeconds: clampNumber(source.fastChatWindowSeconds, 2, 120, DEFAULT_MODERATION.fastChatWindowSeconds),
    fastChatSkipBehavior: ["drop_oldest", "drop_newest", "latest_only"].includes(source.fastChatSkipBehavior)
      ? source.fastChatSkipBehavior
      : DEFAULT_MODERATION.fastChatSkipBehavior,
    messagePauseSeconds: clampDecimal(source.messagePauseSeconds, 0, 10, DEFAULT_MODERATION.messagePauseSeconds),
    ttsAntiSpamEnabled: source.ttsAntiSpamEnabled ?? DEFAULT_MODERATION.ttsAntiSpamEnabled,
    ttsAntiSpamMaxRepeatedWordCount: clampNumber(source.ttsAntiSpamMaxRepeatedWordCount, 2, 50, DEFAULT_MODERATION.ttsAntiSpamMaxRepeatedWordCount),
    ttsAntiSpamMaxRepeatedShortTokenCount: clampNumber(source.ttsAntiSpamMaxRepeatedShortTokenCount, 2, 50, DEFAULT_MODERATION.ttsAntiSpamMaxRepeatedShortTokenCount),
    ttsAntiSpamMaxAlternatingPatternCount: clampNumber(source.ttsAntiSpamMaxAlternatingPatternCount, 2, 50, DEFAULT_MODERATION.ttsAntiSpamMaxAlternatingPatternCount),
    ttsAntiSpamAction: ["skip", "remove", "placeholder"].includes(source.ttsAntiSpamAction)
      ? source.ttsAntiSpamAction
      : DEFAULT_MODERATION.ttsAntiSpamAction,
    ttsAntiSpamBlockedPhrases: normalizeAntiSpamList(bannedWords),
    ttsAntiSpamBlockedSounds: normalizeAntiSpamList(bannedWords),
    bannedChatters: [...new Set(bannedChatters.map((entry) => normalizeViewerId(String(entry).replace(/^@/, ""))).filter(Boolean))].slice(0, 500),
    bannedWords: [...new Set(bannedWords.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean))]
  };
}

function mergeModerationWordLists(...lists) {
  const merged = [];
  let hasExplicitList = false;
  for (const list of lists) {
    if (Array.isArray(list) || typeof list === "string") {
      hasExplicitList = true;
    }
    const values = Array.isArray(list)
      ? list
      : String(list || "").split(/\r?\n|,/);
    for (const value of values) {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized) {
        merged.push(normalized);
      }
    }
  }
  if (!merged.length && !hasExplicitList) {
    merged.push(...DEFAULT_MODERATION.bannedWords);
  }
  return [...new Set(merged)];
}

function splitTextareaList(value) {
  return String(value || "").split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean);
}

function normalizeAntiSpamList(value) {
  const source = Array.isArray(value) ? value : [];
  return [...new Set(source.map((entry) => normalizeAntiSpamText(entry)).filter(Boolean))];
}

function normalizeLiveSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const fallbackVoiceId = source.fallbackVoiceId || getElevenLabsVoices()[0]?.voiceId || DEFAULT_LIVE_SETTINGS.fallbackVoiceId;
  const ttsProvider = source.ttsProvider === "cartesia" ? "cartesia" : "elevenlabs";
  const ttsProviderMode = source.ttsProviderMode === "both" ? "both" : "single";
  const voiceMode = normalizeVoiceMode(source.voiceMode);
  const fixedVoiceProvider = normalizeProviderValue(source.fixedVoiceProvider || DEFAULT_LIVE_SETTINGS.fixedVoiceProvider);
  const fixedVoice = getAssignmentVoice(fixedVoiceProvider, source.fixedVoiceId);
  const sourceTtsProviders = normalizeSourceTtsProviders(source.sourceTtsProviders);
  const elevenLabsModelId = normalizeProviderModelId("elevenlabs", source.elevenLabsModelId || source.modelId);
  const cartesiaModelId = normalizeProviderModelId("cartesia", source.cartesiaModelId || source.modelId);
  const modelId = ttsProvider === "cartesia" ? cartesiaModelId : elevenLabsModelId;
  return {
    browserSourceEnabled: desktopMode ? false : Boolean(source.browserSourceEnabled ?? DEFAULT_LIVE_SETTINGS.browserSourceEnabled),
    twitchSourceEnabled: Boolean(source.twitchSourceEnabled ?? DEFAULT_LIVE_SETTINGS.twitchSourceEnabled),
    tiktokSourceEnabled: Boolean(source.tiktokSourceEnabled ?? DEFAULT_LIVE_SETTINGS.tiktokSourceEnabled),
    kickSourceEnabled: Boolean(source.kickSourceEnabled ?? DEFAULT_LIVE_SETTINGS.kickSourceEnabled),
    youtubeSourceEnabled: Boolean(source.youtubeSourceEnabled ?? DEFAULT_LIVE_SETTINGS.youtubeSourceEnabled),
    rumbleSourceEnabled: Boolean(source.rumbleSourceEnabled ?? DEFAULT_LIVE_SETTINGS.rumbleSourceEnabled),
    streamerbotSourceEnabled: Boolean(source.streamerbotSourceEnabled ?? DEFAULT_LIVE_SETTINGS.streamerbotSourceEnabled),
    ttsProvider,
    ttsProviderMode,
    sourceTtsProviders,
    voiceMode,
    fallbackVoiceId,
    fixedVoiceProvider,
    fixedVoiceId: fixedVoice?.voiceId || "",
    modelId,
    elevenLabsModelId,
    cartesiaModelId,
    stability: clampDecimal(source.stability, 0, 1, DEFAULT_LIVE_SETTINGS.stability),
    similarityBoost: clampDecimal(source.similarityBoost, 0, 1, DEFAULT_LIVE_SETTINGS.similarityBoost),
    speed: clampDecimal(source.speed, 0.7, 1.2, DEFAULT_LIVE_SETTINGS.speed)
  };
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

function normalizeSourceTtsProviders(source) {
  const raw = source && typeof source === "object" ? source : {};
  return {
    Twitch: normalizeRoutingProviderValue(raw.Twitch ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.Twitch),
    TikTok: normalizeRoutingProviderValue(raw.TikTok ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.TikTok),
    Kick: normalizeRoutingProviderValue(raw.Kick ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.Kick),
    YouTube: normalizeRoutingProviderValue(raw.YouTube ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.YouTube),
    Rumble: normalizeRoutingProviderValue(raw.Rumble ?? DEFAULT_LIVE_SETTINGS.sourceTtsProviders.Rumble)
  };
}

function normalizeRoutingProviderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "both" || normalized === "cartesia" ? normalized : "elevenlabs";
}

function normalizeProviderValue(value) {
  return String(value || "").trim().toLowerCase() === "cartesia" ? "cartesia" : "elevenlabs";
}

function normalizeProviderModelId(provider, modelId) {
  const value = String(modelId || "").trim();
  if (provider === "cartesia") {
    return ["sonic-3", "sonic-3-2026-01-12", "sonic-3-latest"].includes(value) ? value : "sonic-3";
  }
  return ["eleven_flash_v2_5", "eleven_turbo_v2_5", "eleven_multilingual_v2"].includes(value)
    ? value
    : DEFAULT_LIVE_SETTINGS.modelId;
}

function normalizeVoiceVolumes(source) {
  const rawVolumes = source && typeof source === "object" ? source : {};
  const knownVoiceIds = new Set(getElevenLabsVoices().map((voice) => voice.voiceId));
  const normalized = {};

  for (const [voiceId, rawVolume] of Object.entries(rawVolumes)) {
    if (knownVoiceIds.size && !knownVoiceIds.has(voiceId)) {
      continue;
    }
    const volume = clampDecimal(rawVolume, 0, 1, 1);
    if (volume !== 1) {
      normalized[voiceId] = Number(volume.toFixed(2));
    }
  }

  return normalized;
}

function getVoiceVolume(voiceId) {
  const volume = voiceVolumes[String(voiceId || "")];
  return clampDecimal(volume, 0, 1, 1);
}

function getDraftVoiceVolume(voiceId) {
  const volume = draftVoiceVolumes[String(voiceId || "")];
  return clampDecimal(volume, 0, 1, 1);
}

function getModerationSettings() {
  return normalizeModeration(currentUser?.moderation || collectModerationFromForm());
}

function getLiveSettings() {
  return normalizeLiveSettings(currentUser?.liveSettings || collectLiveSettingsFromForm());
}

function handleSettingsInputChange() {
  const liveSettings = collectLiveSettingsFromForm();
  if (currentUser) {
    currentUser.moderation = collectModerationFromForm();
    currentUser.liveSettings = liveSettings;
  }
  renderModelOptions(liveSettings.ttsProvider, getModelIdForProvider(liveSettings.ttsProvider, liveSettings));
  syncProviderControls(liveSettings);
  syncVoiceModeControls(liveSettings);
  elements.ttsProviderLabel.textContent = liveSettings.ttsProviderMode === "both"
    ? "Both"
    : liveSettings.ttsProvider === "cartesia" ? "Cartesia" : "ElevenLabs";
  syncSourceSections(liveSettings);
  reconcileDisabledSources(liveSettings);
  renderBannedChattersList(collectModerationFromForm().bannedChatters);
  moderationDirty = true;
  updateSaveButton();
  renderSetupState();
  runWordTester();

  if (!getModerationSettings().neverSkipMidSpeech && playbackQueue.length) {
    const latestClip = playbackQueue[playbackQueue.length - 1];
    playbackQueue.length = 0;
    playClip(latestClip);
  }
  updateLiveStatusStrip();
}

function reconcileDisabledSources(liveSettings) {
  clearReconnectTimer();
  if (!liveSettings.twitchSourceEnabled && twitchSocket) {
    twitchSocket.close();
    twitchSocket = null;
  }
  if (!liveSettings.tiktokSourceEnabled && tiktokSocket) {
    tiktokSocket.close();
    tiktokSocket = null;
    tiktokConnectInFlight = false;
    void stopTikTokLiveHelper();
  }
  if (!liveSettings.kickSourceEnabled && kickSocket) {
    kickSocket.close();
    kickSocket = null;
  }
  if (!liveSettings.youtubeSourceEnabled && youtubePollTimer) {
    window.clearTimeout(youtubePollTimer);
    youtubePollTimer = null;
    youtubeNextPageToken = "";
  }
  if (!liveSettings.rumbleSourceEnabled && rumblePollTimer) {
    window.clearTimeout(rumblePollTimer);
    rumblePollTimer = null;
  }
  if (!liveSettings.streamerbotSourceEnabled && streamerbotSocket) {
    streamerbotSocket.close();
    streamerbotSocket = null;
    streamerbotConnectInFlight = false;
  }
}

async function saveModerationSettings(silent = false) {
  if (!currentUser) {
    return false;
  }

  const moderation = collectModerationFromForm();
  const response = await fetch("/api/account/moderation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(moderation)
  });
  const data = await response.json();
  if (!response.ok) {
    if (!silent) {
      setFeedback(data.error || "Unable to save moderation settings.", true);
    }
    return false;
  }

  currentUser = {
    ...data.user,
    liveSettings: currentUser.liveSettings,
    voiceMap: currentUser.voiceMap,
    voiceVolumes: currentUser.voiceVolumes
  };
  applyModerationToForm(getModerationSettings());
  moderationDirty = false;
  updateSaveButton();
  runWordTester();
  return true;
}

async function saveAllSettings(silent = false) {
  if (!currentUser) {
    if (!silent) {
      setFeedback("Log in on the account page before saving settings.", true);
    }
    return false;
  }

  const moderation = collectModerationFromForm();
  const liveSettings = collectLiveSettingsFromForm();
  const nextVoiceVolumes = normalizeVoiceVolumes(draftVoiceVolumes);

  const moderationResponse = await fetch("/api/account/moderation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(moderation)
  });
  const liveSettingsResponse = await fetch("/api/account/live-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(liveSettings)
  });
  const voiceVolumesResponse = await fetch("/api/account/voice-volumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ voiceVolumes: nextVoiceVolumes })
  });

  const moderationData = await moderationResponse.json();
  const liveSettingsData = await liveSettingsResponse.json();
  const voiceVolumesData = await voiceVolumesResponse.json();

  if (!moderationResponse.ok) {
    if (!silent) {
      setFeedback(moderationData.error || "Unable to save moderation settings.", true);
    }
    return false;
  }
  if (!liveSettingsResponse.ok) {
    if (!silent) {
      setFeedback(liveSettingsData.error || "Unable to save live settings.", true);
    }
    return false;
  }
  if (!voiceVolumesResponse.ok) {
    if (!silent) {
      setFeedback(voiceVolumesData.error || "Unable to save voice volumes.", true);
    }
    return false;
  }

  currentUser = {
    ...voiceVolumesData.user,
    liveSettings: liveSettingsData.user.liveSettings,
    moderation: moderationData.user.moderation
  };
  renderAccount();
  syncSpeakerAssignments(currentUser.voiceMap);
  syncVoiceVolumes(currentUser.voiceVolumes);
  applyModerationToForm(getModerationSettings());
  applyLiveSettingsToForm(getLiveSettings());
  renderSetupState();
  livePausedManually = false;
  moderationDirty = false;
  updateSaveButton();
  runWordTester();
  await ensureDesiredLiveState({ silent });
  if (!silent) {
    setFeedback("Settings saved.", false, true);
  }
  return true;
}

async function saveEverything(silent = false) {
  const desktopSaved = await saveDesktopSettings({ silent, preserveTypedKeys: true });
  if (!desktopSaved) {
    return false;
  }
  return saveAllSettings(silent);
}

async function resetApp() {
  const confirmed = window.confirm("Reset TTS Everything? This deletes saved API keys, settings, voices, moderation lists, and chat history.");
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch("/api/desktop/reset", {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to reset app.");
    }
    setFeedback("App reset. Restarting local profile...", false, true);
    window.setTimeout(() => window.location.reload(), 350);
  } catch (error) {
    setFeedback(error.message, true);
  }
}

async function ensureDesiredLiveState({ silent = false, forceRefresh = false } = {}) {
  clearReconnectTimer();

  if (!currentUser) {
    disconnectChat(false);
    return false;
  }

  let user = currentUser;
  if (forceRefresh && !moderationDirty) {
    const refreshedUser = await refreshCurrentUser();
    if (!refreshedUser) {
      setGuestState();
      if (!silent) {
        setFeedback("Your session expired. Log in again to continue.", true);
      }
      return false;
    }
    user = refreshedUser;
    renderAccount();
    syncSpeakerAssignments(user.voiceMap);
    syncVoiceVolumes(user.voiceVolumes);
    applyLiveSettingsToForm(getLiveSettings());
    applyModerationToForm(getModerationSettings());
  }

  const liveSettings = getLiveSettings();
  const wantsAnyLiveSource = liveSettings.twitchSourceEnabled ||
    liveSettings.tiktokSourceEnabled ||
    liveSettings.kickSourceEnabled ||
    liveSettings.youtubeSourceEnabled ||
    liveSettings.rumbleSourceEnabled ||
    liveSettings.streamerbotSourceEnabled;
  if (!wantsAnyLiveSource) {
    disconnectChat(false);
    if (!silent) {
      setFeedback("Live chat is turned off.", false, true);
    }
    return false;
  }

  if (livePausedManually) {
    disconnectChat(false);
    if (!silent) {
      setFeedback("Live chat is paused.", false, true);
    }
    return false;
  }

  if (user.remainingCharacters <= 0) {
    disconnectChat(false);
    if (!silent) {
      setFeedback("You have used your monthly quota.", true);
    }
    return false;
  }

  browserSourceOwnsPlayback = false;
  updateLiveStatusStrip();

  const channel = normalizeChannel(elements.desktopChannelName.value || user.channelName || elements.channelName.value);
  if (liveSettings.twitchSourceEnabled && !channel) {
    disconnectChat(false);
    if (!silent) {
      setFeedback("Enter a Twitch channel before connecting Twitch chat.", true);
    }
    return false;
  }

  const needsTwitch = liveSettings.twitchSourceEnabled;
  const needsTikTok = liveSettings.tiktokSourceEnabled;
  const needsKick = liveSettings.kickSourceEnabled;
  const needsYoutube = liveSettings.youtubeSourceEnabled;
  const needsRumble = liveSettings.rumbleSourceEnabled;
  const needsStreamerbot = liveSettings.streamerbotSourceEnabled;
  const twitchMatches = !needsTwitch || (twitchSocket && currentChannel === channel);
  const tiktokMatches = !needsTikTok || Boolean(tiktokSocket) || tiktokConnectInFlight;
  const kickMatches = !needsKick || Boolean(kickSocket) || kickConnectInFlight;
  const youtubeMatches = !needsYoutube || Boolean(youtubePollTimer);
  const rumbleMatches = !needsRumble || Boolean(rumblePollTimer);
  const streamerbotMatches = !needsStreamerbot || Boolean(streamerbotSocket) || streamerbotConnectInFlight;
  const hasUnexpectedSources = (!needsTwitch && twitchSocket) ||
    (!needsTikTok && tiktokSocket) ||
    (!needsKick && kickSocket) ||
    (!needsYoutube && youtubePollTimer) ||
    (!needsRumble && rumblePollTimer) ||
    (!needsStreamerbot && streamerbotSocket);

  if (!twitchMatches || !tiktokMatches || !kickMatches || !youtubeMatches || !rumbleMatches || !streamerbotMatches || hasUnexpectedSources) {
    disconnectChat(false);
    elements.connectButton.disabled = true;

    if (needsTwitch) {
      connectToTwitch(channel);
    }
    if (needsTikTok) {
      void connectToTikTokLive();
    }
    if (needsKick) {
      void connectToKick();
    }
    if (needsYoutube) {
      startYoutubePolling();
    }
    if (needsRumble) {
      startRumblePolling();
    }
    if (needsStreamerbot) {
      connectToStreamerbot();
    }

    if (!silent) {
      setFeedback("Connecting live chat...", false);
    }
  }

  refreshConnectionControls();
  updateLiveStatusStrip();
  return true;
}

function shouldAutoReconnect() {
  if (!currentUser || livePausedManually || suppressReconnect) {
    return false;
  }

  const liveSettings = getLiveSettings();
  return Boolean(liveSettings.twitchSourceEnabled ||
    liveSettings.tiktokSourceEnabled ||
    liveSettings.kickSourceEnabled ||
    liveSettings.youtubeSourceEnabled ||
    liveSettings.rumbleSourceEnabled ||
    liveSettings.streamerbotSourceEnabled);
}

function scheduleReconnect() {
  if (!shouldAutoReconnect() || reconnectTimer) {
    return;
  }

  reconnectTimer = window.setTimeout(async () => {
    reconnectTimer = null;
    await ensureDesiredLiveState({ silent: true });
  }, 3000);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function startSessionSync() {
  if (sessionSyncTimer) {
    window.clearInterval(sessionSyncTimer);
  }

  sessionSyncTimer = window.setInterval(async () => {
    if (!currentUser || livePausedManually || moderationDirty) {
      return;
    }
    const refreshedUser = await refreshCurrentUser();
    if (!refreshedUser) {
      setGuestState();
      return;
    }
    renderAccount();
    syncSpeakerAssignments(currentUser.voiceMap);
    syncVoiceVolumes(currentUser.voiceVolumes);
    refreshConnectionControls();
    await loadRecentSpoken();
  }, 4000);
}

function runWordTester() {
  const evaluation = evaluateTestWord();
  elements.wordTesterResult.textContent = evaluation.message;
}

function evaluateTestWord() {
  const testWord = String(elements.wordTesterInput.value || "").trim();
  if (!testWord) {
    return { normalizedWord: "", blocked: false, message: "Test a word to see whether your current rules would block it." };
  }
  const moderation = collectModerationFromForm();
  const normalizedWord = testWord.toLowerCase();
  if (!normalizedWord) {
    return { normalizedWord: "", blocked: true, message: "Blocked: enter a word or phrase to test." };
  }
  if (moderation.bannedWords.includes(normalizedWord)) {
    return { normalizedWord, blocked: true, message: `Blocked: "${normalizedWord}" is already in your banned word list.` };
  }
  if (normalizedWord.length > Number(elements.maxMessageCharacters.value || DEFAULT_MODERATION.maxMessageCharacters)) {
    return {
      normalizedWord,
      blocked: true,
      message: `Blocked: "${normalizedWord}" is longer than your current max character limit.`
    };
  }
  if (hasWordWithFourSameLetters(normalizedWord)) {
    return { normalizedWord, blocked: true, message: `Blocked: "${normalizedWord}" contains a letter 4 times.` };
  }
  return { normalizedWord, blocked: false, message: `Allowed: "${normalizedWord}" would pass your current custom moderation rules.` };
}

async function previewTestWord() {
  if (!currentUser) {
    setFeedback("Log in on the account page before previewing a word.", true);
    return;
  }
  const evaluation = evaluateTestWord();
  if (!evaluation.normalizedWord) {
    elements.wordTesterResult.textContent = evaluation.message;
    return;
  }
  if (currentUser.remainingCharacters <= 0) {
    setFeedback("You have used your monthly quota.", true);
    return;
  }

  const liveSettings = getLiveSettings();
  const previewText = evaluation.normalizedWord;
  const fallbackVoice = liveSettings.ttsProvider === "cartesia"
    ? getCartesiaVoice()
    : getElevenLabsVoices().find((item) => item.voiceId === liveSettings.fallbackVoiceId) || getElevenLabsVoices()[0];
  const previewProvider = liveSettings.ttsProvider;
  const previewModelId = getModelIdForProvider(previewProvider, liveSettings);
  if (!fallbackVoice) {
    setFeedback("No voices are available for preview.", true);
    return;
  }

  elements.previewWordButton.disabled = true;
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({
        text: previewText,
        ttsProvider: previewProvider,
        voiceId: fallbackVoice.voiceId,
        modelId: previewModelId,
        stability: liveSettings.stability,
        similarityBoost: liveSettings.similarityBoost,
        speed: liveSettings.speed
      })
    });
    const data = await readTtsResponseJson(response, "Unable to preview this word");
    if (!response.ok) {
      throw new Error(data.error || "Unable to preview this word.");
    }
    const previewClip = {
      id: createClientId(),
      title: "Word Tester",
      text: previewText,
      voiceId: fallbackVoice.voiceId,
      voiceName: fallbackVoice.name,
      modelId: previewModelId,
      ttsProvider: previewProvider,
      source: "Preview",
      audioUrl: `data:${data.mimeType};base64,${data.audioBase64}`,
      createdAt: new Date()
    };
    queue.unshift(previewClip);
    if (queue.length > 25) {
      queue.length = 25;
    }
    currentUser.remainingCharacters = Number(data.meta?.remainingCharacters ?? currentUser.remainingCharacters);
    currentUser.monthlyUsed += Number(data.meta?.chargedCharacters || previewText.length);
    renderAccount();
    renderQueue();
    playClip(previewClip);
    setFeedback(`Previewed "${previewText}". Charged ${data.meta?.chargedCharacters || previewText.length} characters.`, false, true);
  } catch (error) {
    setFeedback(error.message, true);
  } finally {
    elements.previewWordButton.disabled = false;
  }
}

function banTestWord() {
  const evaluation = evaluateTestWord();
  if (!evaluation.normalizedWord) {
    elements.wordTesterResult.textContent = evaluation.message;
    return;
  }
  const existingWords = collectModerationFromForm().bannedWords;
  if (existingWords.includes(evaluation.normalizedWord)) {
    elements.wordTesterResult.textContent = `Blocked: "${evaluation.normalizedWord}" is already in your banned word list.`;
    return;
  }
  const nextWords = [...existingWords, evaluation.normalizedWord].sort((a, b) => a.localeCompare(b));
  elements.bannedWords.value = nextWords.join("\n");
  handleSettingsInputChange();
  elements.wordTesterResult.textContent = `Blocked: "${evaluation.normalizedWord}" has been added to your banned word list. Click Save moderation to store it on your account.`;
}

function syncSpeakerAssignments(voiceMap) {
  for (const key of Object.keys(speakerAssignments)) {
    delete speakerAssignments[key];
  }

  const source = voiceMap && typeof voiceMap === "object" ? voiceMap : {};
  for (const [user, rawAssignment] of Object.entries(source)) {
    const normalizedUser = String(user || "").trim().toLowerCase();
    const assignment = normalizeSpeakerAssignment(typeof rawAssignment === "string" ? { voiceId: rawAssignment } : rawAssignment);
    if (normalizedUser && assignment?.voiceId) {
      speakerAssignments[normalizedUser] = assignment;
    }
  }

  renderAssignments();
}

function serializeVoiceMap() {
  const voiceMap = {};
  for (const [user, voice] of Object.entries(speakerAssignments)) {
    if (user && voice?.voiceId) {
      voiceMap[user] = {
        ttsProvider: normalizeProviderValue(voice.ttsProvider),
        voiceId: voice.voiceId,
        isOverride: Boolean(voice.isOverride)
      };
    }
  }
  return voiceMap;
}

function persistVoiceMap() {
  if (!currentUser) {
    return Promise.resolve();
  }

  const payload = { voiceMap: serializeVoiceMap() };
  voiceMapSavePromise = voiceMapSavePromise
    .catch(() => {})
    .then(async () => {
      const response = await fetch("/api/account/voice-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save chatter voice map.");
      }
      currentUser = data.user;
      syncSpeakerAssignments(currentUser.voiceMap);
      syncVoiceVolumes(currentUser.voiceVolumes);
      renderAccount();
    })
    .catch((error) => {
      setFeedback(error.message || "Unable to save chatter voice map.", true);
    });

  return voiceMapSavePromise;
}

function loadSavedChannel() {
  return localStorage.getItem("twitch-tts-channel") || "";
}

function saveChannel(channel) {
  localStorage.setItem("twitch-tts-channel", channel);
}

function hasActiveConnection() {
  return Boolean(twitchSocket || tiktokSocket || kickSocket || youtubePollTimer || rumblePollTimer || streamerbotSocket);
}

function isFollowerMessage(entry) {
  if (entry.source === "TikTok") {
    return Boolean(entry.isFollower);
  }
  return true;
}

function inferTikTokFollowerState(data, messageType, user) {
  const normalizedUser = normalizeViewerId(user);
  if (normalizedUser && tiktokFollowers.has(normalizedUser)) {
    return true;
  }
  const userData = data.user && typeof data.user === "object" ? data.user : {};
  const userDetails = data.userDetails && typeof data.userDetails === "object" ? data.userDetails : {};
  const userInfo = data.userInfo && typeof data.userInfo === "object" ? data.userInfo : {};
  const author = data.author && typeof data.author === "object" ? data.author : {};
  const candidates = [
    data.isFollower,
    data.following,
    data.followRole,
    data.isFollowingHost,
    userData.isFollower,
    userData.following,
    userData.followRole,
    userData.isFollowingHost,
    userDetails.isFollower,
    userDetails.following,
    userDetails.followRole,
    userDetails.isFollowingHost,
    userInfo.isFollower,
    userInfo.following,
    userInfo.followRole,
    userInfo.isFollowingHost,
    author.isFollower,
    author.following,
    author.followRole,
    author.isFollowingHost
  ];
  for (const value of candidates) {
    if (value === true || value === 1 || value === "1" || value === "true" || value === "follower") {
      return true;
    }
  }
  return messageType.includes("follow");
}

function inferTikTokModeratorState(data) {
  const userData = data.user && typeof data.user === "object" ? data.user : {};
  const userDetails = data.userDetails && typeof data.userDetails === "object" ? data.userDetails : {};
  const userInfo = data.userInfo && typeof data.userInfo === "object" ? data.userInfo : {};
  const author = data.author && typeof data.author === "object" ? data.author : {};
  const candidates = [
    data.isModerator,
    data.isMod,
    data.moderator,
    data.role,
    data.userRole,
    userData.isModerator,
    userData.isMod,
    userData.moderator,
    userData.role,
    userData.userRole,
    userDetails.isModerator,
    userDetails.isMod,
    userDetails.moderator,
    userDetails.role,
    userDetails.userRole,
    userInfo.isModerator,
    userInfo.isMod,
    userInfo.moderator,
    userInfo.role,
    userInfo.userRole,
    author.isModerator,
    author.isMod,
    author.moderator,
    author.role,
    author.userRole
  ];
  return candidates.some(isTikTokModeratorValue);
}

function isTikTokModeratorValue(value) {
  if (value === true || value === 1 || value === "1") {
    return true;
  }
  const normalizedValue = String(value || "").trim().toLowerCase();
  return normalizedValue === "true" || normalizedValue === "moderator" || normalizedValue === "mod" || normalizedValue === "admin";
}

function inferTikTokGifterState(data, messageType, user) {
  const normalizedUser = normalizeViewerId(user);
  if (normalizedUser && tiktokGifters.has(normalizedUser)) {
    return true;
  }

  const userData = data.user && typeof data.user === "object" ? data.user : {};
  const userDetails = data.userDetails && typeof data.userDetails === "object" ? data.userDetails : {};
  const userInfo = data.userInfo && typeof data.userInfo === "object" ? data.userInfo : {};
  const author = data.author && typeof data.author === "object" ? data.author : {};
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
    userData.subscriberLevel,
    userDetails.isGifter,
    userDetails.gifter,
    userDetails.isTopGifter,
    userDetails.topGifter,
    userDetails.gifterLevel,
    userDetails.giftLevel,
    userDetails.topGifterRank,
    userDetails.totalGiftCount,
    userDetails.diamondCount,
    userDetails.isMember,
    userDetails.member,
    userDetails.isTeamMember,
    userDetails.teamMember,
    userDetails.memberLevel,
    userDetails.isSubscriber,
    userDetails.subscriber,
    userDetails.subscriberLevel,
    userInfo.isGifter,
    userInfo.gifter,
    userInfo.isTopGifter,
    userInfo.topGifter,
    userInfo.gifterLevel,
    userInfo.giftLevel,
    userInfo.topGifterRank,
    userInfo.totalGiftCount,
    userInfo.diamondCount,
    userInfo.isMember,
    userInfo.member,
    userInfo.isTeamMember,
    userInfo.teamMember,
    userInfo.memberLevel,
    userInfo.isSubscriber,
    userInfo.subscriber,
    userInfo.subscriberLevel,
    author.isGifter,
    author.gifter,
    author.isTopGifter,
    author.topGifter,
    author.gifterLevel,
    author.giftLevel,
    author.topGifterRank,
    author.totalGiftCount,
    author.diamondCount,
    author.isMember,
    author.member,
    author.isTeamMember,
    author.teamMember,
    author.memberLevel,
    author.isSubscriber,
    author.subscriber,
    author.subscriberLevel
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
    data.user?.userBadges,
    data.userDetails?.badges,
    data.userDetails?.badgeList,
    data.userDetails?.userBadges,
    data.userInfo?.badges,
    data.userInfo?.badgeList,
    data.userInfo?.userBadges,
    data.author?.badges,
    data.author?.badgeList,
    data.author?.userBadges
  ]).toLowerCase();
  return text.includes("gifter") ||
    text.includes("gift_rank") ||
    text.includes("ranklist_top_gifter") ||
    text.includes("member") ||
    text.includes("subscriber");
}

function extractTikTokFollowerEventUser(data, messageType) {
  if (!messageType.includes("follow")) {
    return "";
  }
  return normalizeViewerId(extractTikTokUser(data));
}

function extractTikTokGifterEventUser(data, messageType) {
  if (!messageType.includes("gift") && !data.giftId && !data.giftName) {
    return "";
  }
  return normalizeViewerId(extractTikTokUser(data));
}

function normalizeViewerId(value) {
  return String(value || "").trim().toLowerCase();
}

function setFeedback(message, isError, isSuccess = false) {
  elements.feedback.textContent = message;
  elements.feedback.className = "feedback";
  if (isError) {
    elements.feedback.classList.add("error");
  } else if (isSuccess) {
    elements.feedback.classList.add("success");
  }
}

function createClientId() {
  return `client_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function normalizeChannel(value) {
  return String(value || "").trim().toLowerCase().replace(/^#/, "");
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(numericValue)));
}

function clampDecimal(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, numericValue));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
