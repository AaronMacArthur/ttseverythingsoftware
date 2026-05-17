"use strict";

const SOURCE_VERSION = "builtin-webcast-v1";

const TIKTOK_STATUS = {
  DISABLED: "disabled",
  STARTING: "starting",
  OPENING_BROWSER: "opening_browser",
  WAITING_FOR_LOGIN: "waiting_for_login",
  WAITING_FOR_LIVE_PAGE: "waiting_for_live_page",
  WAITING_FOR_WEBCAST_SOCKET: "waiting_for_webcast_socket",
  CONNECTED: "connected",
  RECEIVING_EVENTS: "receiving_events",
  LIVE_NOT_FOUND: "live_not_found",
  LIVE_ENDED: "live_ended",
  RECONNECTING: "reconnecting",
  ERROR: "error"
};

const DEFAULT_STATUS = Object.freeze({
  enabled: false,
  username: null,
  browserState: "stopped",
  websocketState: "none",
  decodeState: "raw_only",
  framesReceived: 0,
  framesSent: 0,
  eventsDecoded: 0,
  chatEventsDecoded: 0,
  giftEventsDecoded: 0,
  rawEventsDecoded: 0,
  lastFrameAt: null,
  lastEventAt: null,
  lastError: null,
  userMessage: ""
});

function createDefaultStatus() {
  return { ...DEFAULT_STATUS };
}

module.exports = {
  SOURCE_VERSION,
  TIKTOK_STATUS,
  createDefaultStatus
};
