"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const zlib = require("node:zlib");
const {
  WebcastEventNormalizer,
  WebcastGenericProtoInspector,
  extractVisibleUtf8Strings,
  isLikelyTikTokWebcastSocket,
  payloadToBuffer,
  redactWebSocketUrl,
  routeRawFrameToPayloadCandidates
} = require("../integrations/tiktok-webcast");

test("redacts sensitive TikTok WebSocket URL values", () => {
  const redacted = redactWebSocketUrl("wss://webcast.tiktok.com/ws/?room_id=1&msToken=secret&X-Bogus=abc&safe=value&sessionid=hidden");
  assert.match(redacted, /room_id=1/);
  assert.match(redacted, /safe=value/);
  assert.doesNotMatch(redacted, /secret|abc|hidden/);
  assert.match(redacted, /msToken=%5BREDACTED%5D|msToken=\[REDACTED\]/);
});

test("detects likely TikTok LIVE Webcast sockets", () => {
  assert.equal(isLikelyTikTokWebcastSocket("wss://webcast.tiktok.com/webcast/im/push/"), true);
  assert.equal(isLikelyTikTokWebcastSocket("wss://example.com/socket"), false);
});

test("converts string and binary Playwright payloads to buffers", () => {
  assert.equal(payloadToBuffer("hello").toString("utf8"), "hello");
  assert.equal(payloadToBuffer(Uint8Array.from([1, 2, 3])).toString("hex"), "010203");
});

test("safe payload router handles raw, gzip, brotli, and deflate attempts", () => {
  const raw = Buffer.from("WebcastChatMessage viewer hello from chat", "utf8");
  const gzip = zlib.gzipSync(raw);
  const frame = makeFrame(gzip);
  const candidates = routeRawFrameToPayloadCandidates(frame);
  assert.ok(candidates.some((candidate) => candidate.encodingGuess === "gzip" && candidate.buffer.includes("hello")));
  assert.ok(candidates.some((candidate) => candidate.encodingGuess === "raw"));
});

test("generic protobuf inspector parses varint and length-delimited strings", () => {
  const buffer = Buffer.from([
    0x08, 0x96, 0x01,
    0x12, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f
  ]);
  const inspected = new WebcastGenericProtoInspector().inspect(buffer);
  assert.equal(inspected.fields.length, 2);
  assert.equal(inspected.fields[0].fieldNumber, 1);
  assert.equal(inspected.fields[0].value.value, "150");
  assert.equal(inspected.fields[1].value.utf8, "hello");
  assert.ok(inspected.visibleStrings.includes("hello"));
});

test("generic protobuf inspector honors nested depth without crashing", () => {
  const inner = Buffer.from([0x0a, 0x04, 0x6e, 0x65, 0x73, 0x74]);
  const outer = Buffer.concat([Buffer.from([0x12, inner.length]), inner]);
  const inspected = new WebcastGenericProtoInspector({ maxDepth: 1 }).inspect(outer);
  assert.equal(inspected.fields[0].value.nested.fields[0].value.utf8, "nest");
});

test("visible UTF-8 extraction ignores tiny noise and keeps readable strings", () => {
  const strings = extractVisibleUtf8Strings(Buffer.from([0, 1, 65, 66, 0, ...Buffer.from("hello viewer")]));
  assert.deepEqual(strings, ["hello viewer"]);
});

test("normalizer emits chat from generic WebcastChatMessage strings and dedupes", () => {
  const normalizer = new WebcastEventNormalizer({ streamer: "creator", dedupeTtlMs: 5000 });
  const frame = makeFrame(Buffer.from("WebcastChatMessage chatter hello there", "utf8"));
  const genericInspection = { visibleStrings: ["WebcastChatMessage", "chatter", "hello there"], parseErrors: [], fields: [] };
  const events = normalizer.normalize({ frame, candidate: { utf8Strings: [] }, genericInspection });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "chat");
  assert.equal(events[0].message, "hello there");
  const duplicate = normalizer.normalize({ frame, candidate: { utf8Strings: [] }, genericInspection });
  assert.equal(duplicate.length, 0);
});

test("normalizer emits gift from generic WebcastGiftMessage strings", () => {
  const normalizer = new WebcastEventNormalizer({ streamer: "creator" });
  const frame = makeFrame(Buffer.from("WebcastGiftMessage viewer Rose", "utf8"));
  const genericInspection = { visibleStrings: ["WebcastGiftMessage", "viewer", "Rose"], parseErrors: [], fields: [] };
  const events = normalizer.normalize({ frame, candidate: { utf8Strings: [] }, genericInspection });
  assert.equal(events[0].eventType, "gift");
  assert.equal(events[0].gift.name, "Rose");
});

test("unknown raw events remain raw and are not chat/gift", () => {
  const normalizer = new WebcastEventNormalizer({ streamer: "creator" });
  const frame = makeFrame(Buffer.from("unknown diagnostic text", "utf8"));
  const genericInspection = { visibleStrings: ["unknown diagnostic text"], parseErrors: [], fields: [] };
  const events = normalizer.normalize({ frame, candidate: { utf8Strings: [] }, genericInspection });
  assert.equal(events[0].eventType, "raw");
});

function makeFrame(buffer) {
  return {
    id: "frame-1",
    timestamp: "2026-05-17T00:00:00.000Z",
    direction: "received",
    socketId: "socket-1",
    socketUrlRedacted: "wss://webcast.tiktok.com/ws/",
    payloadKind: "binary",
    payloadBase64: buffer.toString("base64"),
    byteLength: buffer.length,
    sha256: "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd",
    sequence: 1
  };
}
