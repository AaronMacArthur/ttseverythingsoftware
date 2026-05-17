"use strict";

const zlib = require("zlib");

function routeRawFrameToPayloadCandidates(frame) {
  const original = Buffer.from(String(frame.payloadBase64 || ""), "base64");
  const candidates = [{
    frameId: frame.id,
    timestamp: frame.timestamp,
    direction: frame.direction,
    encodingGuess: "raw",
    buffer: original,
    utf8Strings: extractVisibleUtf8Strings(original),
    errors: []
  }];

  if (original.length >= 2 && original[0] === 0x1f && original[1] === 0x8b) {
    candidates.push(tryDecode(frame, original, "gzip", (buffer) => zlib.gunzipSync(buffer)));
  }
  candidates.push(tryDecode(frame, original, "brotli", (buffer) => zlib.brotliDecompressSync(buffer)));
  candidates.push(tryDecode(frame, original, "deflate", (buffer) => zlib.inflateSync(buffer)));
  return candidates.filter(Boolean);
}

function tryDecode(frame, buffer, encodingGuess, decoder) {
  try {
    const decoded = decoder(buffer);
    if (!decoded || !decoded.length || decoded.equals(buffer)) {
      return null;
    }
    return {
      frameId: frame.id,
      timestamp: frame.timestamp,
      direction: frame.direction,
      encodingGuess,
      buffer: decoded,
      utf8Strings: extractVisibleUtf8Strings(decoded),
      errors: []
    };
  } catch (error) {
    return {
      frameId: frame.id,
      timestamp: frame.timestamp,
      direction: frame.direction,
      encodingGuess,
      buffer: Buffer.alloc(0),
      utf8Strings: [],
      errors: [error.message]
    };
  }
}

function extractVisibleUtf8Strings(buffer, options = {}) {
  const minLength = Math.max(3, Number(options.minLength) || 3);
  const maxStrings = Math.max(1, Number(options.maxStrings) || 60);
  const found = [];
  let current = [];

  for (const byte of buffer) {
    if (byte >= 0x20 && byte <= 0x7e) {
      current.push(byte);
      continue;
    }
    flush();
  }
  flush();

  return [...new Set(found)].slice(0, maxStrings);

  function flush() {
    if (current.length >= minLength) {
      const text = Buffer.from(current).toString("utf8").trim();
      if (text && /[A-Za-z0-9]/.test(text)) {
        found.push(text);
      }
    }
    current = [];
  }
}

module.exports = {
  extractVisibleUtf8Strings,
  routeRawFrameToPayloadCandidates
};
