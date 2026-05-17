"use strict";

const SENSITIVE_QUERY_KEY_REGEX = /(token|session|cookie|csrf|verify|signature|bogus|fp|msToken|X-Bogus|verifyFp|s_v_web_id|sessionid|sid_tt|uid_tt|passport_csrf_token)/i;

function redactWebSocketUrl(value) {
  const raw = String(value || "");
  if (!raw) {
    return "";
  }
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY_REGEX.test(key)) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return raw.replace(/([?&][^=]*(?:token|session|cookie|csrf|verify|signature|bogus|fp)[^=]*=)[^&\s]+/gi, "$1[REDACTED]");
  }
}

function isLikelySensitiveKey(key) {
  return SENSITIVE_QUERY_KEY_REGEX.test(String(key || ""));
}

function sanitizeDiagnosticEvent(event, options = {}) {
  const includeUserText = Boolean(options.includeUserText);
  return {
    id: event.id,
    platform: event.platform,
    source: event.source,
    timestamp: event.timestamp,
    eventType: event.eventType,
    confidence: event.confidence,
    user: includeUserText ? event.user : sanitizeUser(event.user),
    message: includeUserText ? event.message : event.message ? "[REDACTED_MESSAGE]" : event.message,
    gift: event.gift,
    counts: event.counts,
    raw: {
      frameId: event.raw?.frameId,
      messageMethod: event.raw?.messageMethod || null,
      payloadSha256: event.raw?.payloadSha256,
      visibleStringCount: Array.isArray(event.raw?.visibleStrings) ? event.raw.visibleStrings.length : 0,
      genericFieldsSummary: event.raw?.genericFieldsSummary || null
    }
  };
}

function sanitizeUser(user) {
  if (!user) {
    return user;
  }
  return {
    id: user.id ? "[REDACTED_USER_ID]" : user.id,
    uniqueId: user.uniqueId ? "[REDACTED_UNIQUE_ID]" : user.uniqueId,
    nickname: user.nickname ? "[REDACTED_NICKNAME]" : user.nickname,
    displayName: user.displayName ? "[REDACTED_DISPLAY_NAME]" : user.displayName,
    avatarUrl: user.avatarUrl ? "[REDACTED_AVATAR]" : user.avatarUrl,
    isModerator: user.isModerator ?? null,
    isSubscriber: user.isSubscriber ?? null
  };
}

module.exports = {
  isLikelySensitiveKey,
  redactWebSocketUrl,
  sanitizeDiagnosticEvent
};
