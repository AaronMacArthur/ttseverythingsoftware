"use strict";

const fs = require("fs");
const path = require("path");

class WebcastFrameRecorder {
  constructor(options = {}) {
    this.enabled = Boolean(options.enabled);
    this.diagnosticsDir = options.diagnosticsDir || "";
    this.stream = null;
    this.filePath = "";
  }

  start() {
    if (!this.enabled || this.stream) {
      return;
    }
    fs.mkdirSync(this.diagnosticsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.filePath = path.join(this.diagnosticsDir, `tiktok-webcast-raw-${stamp}.jsonl`);
    this.stream = fs.createWriteStream(this.filePath, { flags: "a", encoding: "utf8" });
  }

  record(frame) {
    if (!this.enabled) {
      return;
    }
    this.start();
    if (!this.stream) {
      return;
    }
    this.stream.write(`${JSON.stringify(frame)}\n`);
  }

  stop() {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }

  getFilePath() {
    return this.filePath;
  }
}

module.exports = {
  WebcastFrameRecorder
};
