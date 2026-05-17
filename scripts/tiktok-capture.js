"use strict";

const path = require("path");
const { TikTokWebcastService, resolveTikTokDiagnosticsDir, resolveTikTokProfileDir } = require("../integrations/tiktok-webcast");

const args = parseArgs(process.argv.slice(2));
const handle = args.handle || args.username;
if (!handle) {
  console.error("Usage: npm run tiktok:dev -- --handle <handle> [--save-raw] [--headless]");
  process.exit(1);
}

const appDataDir = path.join(process.cwd(), ".tiktok-dev-data");
const service = new TikTokWebcastService({
  appDataDir,
  profileDir: resolveTikTokProfileDir(appDataDir),
  diagnosticsDir: resolveTikTokDiagnosticsDir(appDataDir)
});

service.on("status", (status) => {
  console.log("[status]", JSON.stringify({
    username: status.username,
    browserState: status.browserState,
    websocketState: status.websocketState,
    decodeState: status.decodeState,
    framesReceived: status.framesReceived,
    eventsDecoded: status.eventsDecoded,
    lastError: status.lastError,
    userMessage: status.userMessage
  }));
});

service.on("event", (event) => {
  console.log("[event]", JSON.stringify({
    eventType: event.eventType,
    confidence: event.confidence,
    user: event.user?.displayName || event.user?.uniqueId || null,
    message: event.message ? "[MESSAGE]" : null,
    gift: event.gift?.name || null,
    frameId: event.raw?.frameId
  }));
});

service.on("inspection", (inspection) => {
  console.log("[inspection]", JSON.stringify({
    frameId: inspection.frameId,
    visibleStrings: inspection.visibleStrings?.slice(0, 5) || [],
    parseErrors: inspection.parseErrors?.slice(0, 3) || []
  }));
});

service.on("error", (error) => {
  console.error("[error]", error.message);
});

process.on("SIGINT", async () => {
  await service.stop();
  process.exit(0);
});

service.start({
  username: handle,
  headless: Boolean(args.headless),
  diagnosticsEnabled: Boolean(args.saveRaw || args.diagnostics),
  saveRawFrameLog: Boolean(args.saveRaw),
  captureRawFrames: true,
  decodeKnownEvents: true
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});

function parseArgs(items) {
  const result = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    const next = items[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}
