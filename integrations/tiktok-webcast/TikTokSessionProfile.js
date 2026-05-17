"use strict";

const path = require("path");

function resolveTikTokProfileDir(appDataDir, override) {
  if (override) {
    return path.resolve(String(override));
  }
  return path.join(appDataDir, "tiktok-browser-profile");
}

function resolveTikTokDiagnosticsDir(appDataDir) {
  return path.join(appDataDir, "diagnostics", "tiktok-webcast");
}

module.exports = {
  resolveTikTokDiagnosticsDir,
  resolveTikTokProfileDir
};
