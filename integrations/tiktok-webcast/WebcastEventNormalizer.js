"use strict";

const crypto = require("crypto");
const { SOURCE_VERSION } = require("./TikTokEventTypes");

class WebcastEventNormalizer {
  constructor(options = {}) {
    this.streamer = normalizeHandle(options.streamer || "");
    this.dedupeTtlMs = Math.max(1000, Number(options.dedupeTtlMs) || 5000);
    this.seen = new Map();
  }

  normalize({ frame, candidate, genericInspection, decodedEnvelope }) {
    const events = [];
    if (decodedEnvelope?.messages?.length) {
      decodedEnvelope.messages.forEach((message, index) => {
        const event = this.normalizeDecodedMessage(frame, candidate, genericInspection, message, index);
        if (event) {
          events.push(event);
        }
      });
    } else {
      const event = this.normalizeGenericFrame(frame, candidate, genericInspection);
      if (event) {
        events.push(event);
      }
    }

    return events.filter((event) => this.shouldEmit(event));
  }

  normalizeDecodedMessage(frame, candidate, genericInspection, message, index) {
    const method = String(message.method || "").toLowerCase();
    const decoded = message.payloadDecoded || {};
    const visibleStrings = collectVisibleStrings(genericInspection, candidate);
    if (method.includes("chat")) {
      const text = pickText(decoded, ["content", "comment", "text", "message"]) || pickLikelyChatMessage(visibleStrings);
      const user = pickUser(decoded) || pickLikelyUser(visibleStrings, text);
      if (text && user) {
        return this.makeEvent(frame, "chat", 0.9, {
          message: text,
          user,
          raw: { messageMethod: message.method || "chat", visibleStrings }
        }, index);
      }
    }
    if (method.includes("gift")) {
      const giftName = pickText(decoded, ["giftName", "name", "gift.name", "giftInfo.giftName"]) || pickLikelyGiftName(visibleStrings);
      const user = pickUser(decoded) || pickLikelyUser(visibleStrings, giftName);
      if (giftName && user) {
        return this.makeEvent(frame, "gift", 0.88, {
          user,
          gift: {
            id: pickText(decoded, ["giftId", "id", "gift.id"]) || null,
            name: giftName,
            repeatCount: pickNumber(decoded, ["repeatCount", "comboCount", "count"]) || null,
            diamondCount: pickNumber(decoded, ["diamondCount", "gift.diamondCount", "giftInfo.diamondCount"]) || null,
            repeatEnd: pickBoolean(decoded, ["repeatEnd", "repeat_end", "isFinal"]) ?? null
          },
          message: pickText(decoded, ["message", "comment"]) || null,
          raw: { messageMethod: message.method || "gift", visibleStrings }
        }, index);
      }
    }
    return this.makeEvent(frame, inferEventType(method), 0.35, {
      raw: { messageMethod: message.method || null, visibleStrings }
    }, index);
  }

  normalizeGenericFrame(frame, candidate, genericInspection) {
    const visibleStrings = collectVisibleStrings(genericInspection, candidate);
    const method = visibleStrings.find((text) => /webcast.*message/i.test(text) || /chat|gift|member|like|follow|share/i.test(text)) || null;
    const lowerMethod = String(method || "").toLowerCase();
    if (lowerMethod.includes("chat")) {
      const text = pickLikelyChatMessage(visibleStrings);
      const user = pickLikelyUser(visibleStrings, text);
      if (text && user) {
        return this.makeEvent(frame, "chat", 0.68, {
          user,
          message: text,
          raw: { messageMethod: method, visibleStrings }
        }, 0);
      }
    }
    if (lowerMethod.includes("gift")) {
      const giftName = pickLikelyGiftName(visibleStrings);
      const user = pickLikelyUser(visibleStrings, giftName);
      if (giftName && user) {
        return this.makeEvent(frame, "gift", 0.66, {
          user,
          gift: {
            id: null,
            name: giftName,
            repeatCount: null,
            diamondCount: null,
            repeatEnd: null
          },
          raw: { messageMethod: method, visibleStrings }
        }, 0);
      }
    }
    if (visibleStrings.length) {
      return this.makeEvent(frame, "raw", 0.2, {
        raw: { messageMethod: method, visibleStrings }
      }, 0);
    }
    return null;
  }

  makeEvent(frame, eventType, confidence, patch, index) {
    const visibleStrings = patch.raw?.visibleStrings || [];
    const base = {
      id: createEventId(frame, index, eventType),
      platform: "tiktok",
      source: "builtin-webcast",
      sourceVersion: SOURCE_VERSION,
      timestamp: frame.timestamp,
      streamer: this.streamer,
      eventType,
      confidence,
      user: patch.user,
      message: patch.message ?? null,
      gift: patch.gift,
      counts: patch.counts,
      raw: {
        frameId: frame.id,
        messageMethod: patch.raw?.messageMethod || null,
        payloadSha256: frame.sha256,
        visibleStrings,
        genericFieldsSummary: patch.raw?.genericFieldsSummary || null
      }
    };
    return base;
  }

  shouldEmit(event) {
    const now = Date.now();
    for (const [key, seenAt] of this.seen) {
      if (now - seenAt > this.dedupeTtlMs) {
        this.seen.delete(key);
      }
    }
    const key = [
      event.eventType,
      event.user?.uniqueId || event.user?.displayName || "",
      event.message || "",
      event.gift?.id || "",
      event.gift?.name || "",
      event.gift?.repeatCount ?? "",
      event.gift?.repeatEnd ?? "",
      event.raw?.payloadSha256 || ""
    ].join("|").toLowerCase();
    if (this.seen.has(key)) {
      return false;
    }
    this.seen.set(key, now);
    return true;
  }
}

function collectVisibleStrings(genericInspection, candidate) {
  return [...new Set([
    ...(candidate?.utf8Strings || []),
    ...(genericInspection?.visibleStrings || [])
  ].map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 100);
}

function pickLikelyChatMessage(strings) {
  const candidates = strings.filter((text) => {
    if (/^Webcast|Message$|common|display|avatar|http|https|live|room|user|gift/i.test(text)) {
      return false;
    }
    return text.length >= 2 && text.length <= 240 && /[\p{L}\p{N}]/u.test(text);
  });
  return candidates.sort((a, b) => scoreChatText(b) - scoreChatText(a))[0] || "";
}

function pickLikelyUser(strings, exclude) {
  const normalizedExclude = String(exclude || "").trim();
  const candidate = strings.find((text) => text !== normalizedExclude && /^[\w.\-]{2,32}$/.test(text) && !/^Webcast/i.test(text)) ||
    strings.find((text) => text !== normalizedExclude && text.length >= 2 && text.length <= 40 && !/[.!?]{2,}/.test(text) && !/^Webcast/i.test(text));
  if (!candidate) {
    return null;
  }
  return { id: null, uniqueId: candidate, nickname: candidate, displayName: candidate, avatarUrl: null, isModerator: null, isSubscriber: null };
}

function pickLikelyGiftName(strings) {
  const giftStrings = strings.filter((text) => !/^Webcast/i.test(text));
  return giftStrings.find((text) => /(rose|gift|coin|heart|lion|universe|cap|hat|tiktok|finger heart)/i.test(text)) ||
    giftStrings.find((text) => text.length >= 2 && text.length <= 60) || "";
}

function scoreChatText(text) {
  let score = text.length;
  if (/\s/.test(text)) score += 40;
  if (/[!?]/.test(text)) score += 10;
  if (/^[\w.\-]+$/.test(text)) score -= 30;
  return score;
}

function pickUser(source) {
  const user = source.user || source.fromUser || source.author || source.sender || source.userInfo || {};
  const uniqueId = pickText(user, ["uniqueId", "unique_id", "username", "userId", "id"]);
  const displayName = pickText(user, ["nickname", "displayName", "name", "uniqueId", "username"]);
  if (!uniqueId && !displayName) {
    return null;
  }
  return {
    id: pickText(user, ["id", "userId"]) || null,
    uniqueId: uniqueId || displayName,
    nickname: pickText(user, ["nickname", "name"]) || displayName || uniqueId,
    displayName: displayName || uniqueId,
    avatarUrl: pickText(user, ["avatarThumb.urlList.0", "avatarUrl", "avatar"]) || null,
    isModerator: pickBoolean(user, ["isModerator", "moderator"]) ?? null,
    isSubscriber: pickBoolean(user, ["isSubscriber", "subscriber"]) ?? null
  };
}

function pickText(source, paths) {
  for (const path of paths) {
    const value = getPath(source, path);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function pickNumber(source, paths) {
  for (const path of paths) {
    const value = Number(getPath(source, path));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function pickBoolean(source, paths) {
  for (const path of paths) {
    const value = getPath(source, path);
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return null;
}

function getPath(source, path) {
  return String(path).split(".").reduce((value, key) => {
    if (value == null) return undefined;
    if (/^\d+$/.test(key) && Array.isArray(value)) return value[Number(key)];
    return value[key];
  }, source);
}

function inferEventType(method) {
  if (method.includes("member")) return "member";
  if (method.includes("follow")) return "follow";
  if (method.includes("share")) return "share";
  if (method.includes("like")) return "like";
  if (method.includes("subscribe")) return "subscribe";
  if (method.includes("control")) return "control";
  if (method.includes("room")) return "roomUser";
  return method ? "unknown" : "raw";
}

function createEventId(frame, index, eventType) {
  return `tiktok:${frame.id}:${index}:${eventType}:${frame.sha256.slice(0, 12)}`;
}

function normalizeHandle(value) {
  return String(value || "").replace(/^@+/, "").trim();
}

module.exports = {
  WebcastEventNormalizer,
  normalizeHandle,
  pickLikelyChatMessage,
  pickLikelyGiftName,
  pickLikelyUser
};
