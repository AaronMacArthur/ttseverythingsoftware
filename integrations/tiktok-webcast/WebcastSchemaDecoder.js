"use strict";

const fs = require("fs");
const path = require("path");

class WebcastSchemaDecoder {
  constructor(options = {}) {
    this.protoDirs = (options.protoDirs || []).filter(Boolean);
    this.protobuf = null;
    this.root = null;
    this.loaded = false;
    this.errors = [];
  }

  load() {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    let protobuf;
    try {
      protobuf = require("protobufjs");
    } catch (error) {
      this.errors.push(`protobufjs unavailable: ${error.message}`);
      return;
    }
    this.protobuf = protobuf;
    const protoFiles = [];
    for (const dir of this.protoDirs) {
      if (!fs.existsSync(dir)) {
        continue;
      }
      collectProtoFiles(dir, protoFiles);
    }
    if (!protoFiles.length) {
      return;
    }
    try {
      this.root = protobuf.loadSync(protoFiles);
    } catch (error) {
      this.errors.push(`Unable to load proto files: ${error.message}`);
    }
  }

  decodeEnvelope(buffer, meta = {}) {
    this.load();
    if (!this.root) {
      return null;
    }
    const candidates = [
      "WebcastResponse",
      "tiktok.webcast.WebcastResponse",
      "webcast.WebcastResponse",
      "Response"
    ];
    for (const name of candidates) {
      const decoded = this.decodeType(name, buffer);
      if (decoded) {
        return normalizeDecodedEnvelope(decoded, meta);
      }
    }
    return null;
  }

  decodeMessage(method, payload) {
    this.load();
    if (!this.root || !method) {
      return null;
    }
    const methodName = String(method).replace(/^Webcast/, "").replace(/Message$/, "");
    const candidates = [
      method,
      `${method}Message`,
      `Webcast${methodName}Message`,
      `tiktok.webcast.${method}`,
      `webcast.${method}`
    ];
    for (const name of candidates) {
      const decoded = this.decodeType(name, payload);
      if (decoded) {
        return { method, payloadDecoded: decoded };
      }
    }
    return null;
  }

  decodeType(typeName, buffer) {
    try {
      const type = this.root.lookupType(typeName);
      const message = type.decode(buffer);
      return type.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: false,
        arrays: true,
        objects: true
      });
    } catch {
      return null;
    }
  }
}

function collectProtoFiles(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectProtoFiles(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith(".proto")) {
      out.push(fullPath);
    }
  }
}

function normalizeDecodedEnvelope(decoded, meta) {
  const messages = [];
  const rawMessages = decoded.messages || decoded.messageList || decoded.payloads || [];
  for (const message of rawMessages) {
    const method = message.method || message.type || message.name || null;
    const payloadBase64 = message.payload || message.binary || message.bytes || "";
    messages.push({ method, payloadBase64 });
  }
  return {
    frameId: meta.frameId,
    timestamp: meta.timestamp,
    messages,
    cursor: decoded.cursor || decoded.internalExt || null,
    fetchIntervalMs: decoded.fetchInterval || decoded.fetchIntervalMs || null,
    serverTimestamp: decoded.serverTimestamp || decoded.now || null
  };
}

module.exports = {
  WebcastSchemaDecoder
};
