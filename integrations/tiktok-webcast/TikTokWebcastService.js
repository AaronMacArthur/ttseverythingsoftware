"use strict";

const { EventEmitter } = require("events");
const fs = require("fs");
const path = require("path");
const { TikTokBrowserTransport } = require("./TikTokBrowserTransport");
const { createDefaultStatus } = require("./TikTokEventTypes");
const { WebcastFrameRecorder } = require("./WebcastFrameRecorder");
const { routeRawFrameToPayloadCandidates } = require("./WebcastFrameRouter");
const { WebcastGenericProtoInspector } = require("./WebcastGenericProtoInspector");
const { WebcastSchemaDecoder } = require("./WebcastSchemaDecoder");
const { WebcastEventNormalizer, normalizeHandle } = require("./WebcastEventNormalizer");
const { TikTokRawEventStore } = require("./WebcastRawEventStore");

class TikTokWebcastService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.appDataDir = options.appDataDir || process.cwd();
    this.profileDir = options.profileDir || path.join(this.appDataDir, "tiktok-browser-profile");
    this.diagnosticsDir = options.diagnosticsDir || path.join(this.appDataDir, "diagnostics", "tiktok-webcast");
    this.transport = null;
    this.recorder = null;
    this.inspector = new WebcastGenericProtoInspector();
    this.schemaDecoder = new WebcastSchemaDecoder({
      protoDirs: [
        path.join(__dirname, "proto"),
        path.join(this.diagnosticsDir, "proto")
      ]
    });
    this.store = new TikTokRawEventStore(500);
    this.status = createDefaultStatus();
    this.normalizer = new WebcastEventNormalizer();
    this.started = false;
    this.options = {};
  }

  async start(options = {}) {
    const username = normalizeHandle(options.username);
    if (!username) {
      throw new Error("Enter a TikTok handle before connecting.");
    }
    await this.stop();
    this.options = {
      username,
      headless: Boolean(options.headless),
      captureRawFrames: options.captureRawFrames !== false,
      saveRawFrameLog: Boolean(options.saveRawFrameLog),
      decodeKnownEvents: options.decodeKnownEvents !== false,
      diagnosticsEnabled: Boolean(options.diagnosticsEnabled),
      profileDir: options.profileDir || this.profileDir
    };
    this.normalizer = new WebcastEventNormalizer({ streamer: username });
    this.recorder = new WebcastFrameRecorder({
      enabled: this.options.saveRawFrameLog && this.options.diagnosticsEnabled,
      diagnosticsDir: this.diagnosticsDir
    });
    this.transport = new TikTokBrowserTransport({ profileDir: this.options.profileDir });
    this.transport.on("status", (patch) => this.patchStatus(patch));
    this.transport.on("error", (error) => this.handleError(error));
    this.transport.on("frame", (frame) => this.handleRawFrame(frame));
    this.patchStatus({
      enabled: true,
      username,
      browserState: "starting",
      websocketState: "waiting",
      decodeState: this.options.decodeKnownEvents ? "generic" : "raw_only",
      lastError: null,
      userMessage: "Starting built-in TikTok Live browser session."
    });
    this.started = true;
    await this.transport.start({
      username,
      profileDir: this.options.profileDir,
      headless: this.options.headless
    });
  }

  async stop() {
    this.started = false;
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    if (this.transport) {
      await this.transport.stop();
      this.transport = null;
    }
    this.patchStatus({
      enabled: false,
      browserState: "stopped",
      websocketState: "none",
      userMessage: ""
    });
  }

  async restart() {
    const options = { ...this.options };
    await this.stop();
    return this.start(options);
  }

  handleRawFrame(frame) {
    if (!this.options.captureRawFrames) {
      return;
    }
    if (frame.direction === "received") {
      this.status.framesReceived += 1;
    } else {
      this.status.framesSent += 1;
    }
    this.status.lastFrameAt = frame.timestamp;
    this.store.addFrame(frame);
    this.recorder?.record(frame);
    this.emit("rawFrame", frame);
    if (frame.direction !== "received") {
      this.emitStatus();
      return;
    }
    this.decodeFrame(frame);
  }

  decodeFrame(frame) {
    if (!this.options.decodeKnownEvents) {
      this.emitStatus();
      return;
    }
    const candidates = routeRawFrameToPayloadCandidates(frame).filter((candidate) => candidate.buffer.length);
    let emitted = false;
    for (const candidate of candidates) {
      const genericInspection = this.inspector.inspect(candidate.buffer);
      const decodedEnvelope = this.schemaDecoder.decodeEnvelope(candidate.buffer, { frameId: frame.id, timestamp: frame.timestamp });
      const events = this.normalizer.normalize({ frame, candidate, genericInspection, decodedEnvelope });
      for (const event of events) {
        this.handleNormalizedEvent(event);
        emitted = true;
      }
      if (emitted) {
        break;
      }
      if (genericInspection.visibleStrings.length) {
        this.emit("inspection", {
          frameId: frame.id,
          timestamp: frame.timestamp,
          visibleStrings: genericInspection.visibleStrings.slice(0, 20),
          parseErrors: genericInspection.parseErrors
        });
      }
    }
    if (!emitted) {
      this.status.rawEventsDecoded += 1;
    }
    this.emitStatus();
  }

  handleNormalizedEvent(event) {
    this.status.eventsDecoded += 1;
    this.status.lastEventAt = event.timestamp;
    if (event.eventType === "chat") {
      this.status.chatEventsDecoded += 1;
    } else if (event.eventType === "gift") {
      this.status.giftEventsDecoded += 1;
    } else if (event.eventType === "raw" || event.eventType === "unknown") {
      this.status.rawEventsDecoded += 1;
    }
    this.store.addEvent(event);
    this.emit("event", event);
  }

  handleError(error) {
    this.patchStatus({
      browserState: "error",
      websocketState: "error",
      lastError: error.message,
      userMessage: error.message
    });
    this.emit("error", error);
  }

  patchStatus(patch) {
    this.status = {
      ...this.status,
      ...patch
    };
    this.emitStatus();
  }

  emitStatus() {
    this.emit("status", this.getStatus());
  }

  getStatus() {
    return { ...this.status };
  }

  getRecentEvents(limit = 100) {
    return this.store.getRecentEvents(limit);
  }

  getRecentFrames(limit = 50) {
    return this.options.diagnosticsEnabled ? this.store.getRecentFrames(limit) : [];
  }

  getStats() {
    return {
      framesReceived: this.status.framesReceived,
      framesSent: this.status.framesSent,
      eventsDecoded: this.status.eventsDecoded,
      chatEventsDecoded: this.status.chatEventsDecoded,
      giftEventsDecoded: this.status.giftEventsDecoded,
      rawEventsDecoded: this.status.rawEventsDecoded,
      rawLogPath: this.recorder?.getFilePath() || null,
      diagnosticsDir: this.diagnosticsDir
    };
  }

  clearRawLogs() {
    if (!fs.existsSync(this.diagnosticsDir)) {
      return;
    }
    for (const entry of fs.readdirSync(this.diagnosticsDir)) {
      if (entry.endsWith(".jsonl")) {
        fs.rmSync(path.join(this.diagnosticsDir, entry), { force: true });
      }
    }
  }
}

module.exports = {
  TikTokWebcastService
};
