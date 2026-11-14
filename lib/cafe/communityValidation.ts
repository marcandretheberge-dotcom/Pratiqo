import type { CafeCommunityCommand, CafeReportReason } from "./communityTypes";

export const CAFE_COMMUNITY_MAX_BODY_BYTES = 16_384;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LANGUAGE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;
const SINGLE_LINE_CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const MESSAGE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
const REPORT_REASONS = new Set<CafeReportReason>(["sexual_harassment", "harassment", "spam", "other"]);

export function communityRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function communityUuid(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null;
}

export function communityText(value: unknown, maxLength: number, allowEmpty = false, multiline = false): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  if ((!allowEmpty && !result) || result.length > maxLength) return null;
  if ((multiline ? MESSAGE_CONTROL : SINGLE_LINE_CONTROL).test(result)) return null;
  return result;
}

/** Language selection is independent of the Yo course catalogue. BCP47 tags are case-insensitive. */
export function communityLanguages(value: unknown, allowEmpty = false): string[] | null {
  if (!Array.isArray(value) || value.length > 10 || (!allowEmpty && value.length === 0)) return null;
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length > 35 || !LANGUAGE.test(item)) return null;
    const tag = item.toLowerCase();
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

/** Require an explicit UTC offset. datetime-local values must be converted by the client first. */
export function communityTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (y < 2000 || m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second ?? 0) > 59) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export type CommunityJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; code: "invalid_request" | "payload_too_large" | "unsupported_media_type"; status: number };

/** Count actual UTF-8 bytes, including when Content-Length is absent or dishonest. */
export async function readCommunityJson(request: Request): Promise<CommunityJsonResult> {
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    return { ok: false, code: "unsupported_media_type", status: 415 };
  }
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) return { ok: false, code: "invalid_request", status: 400 };
    if (Number(declared) > CAFE_COMMUNITY_MAX_BODY_BYTES) return { ok: false, code: "payload_too_large", status: 413 };
  }
  if (!request.body) return { ok: false, code: "invalid_request", status: 400 };
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > CAFE_COMMUNITY_MAX_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        return { ok: false, code: "payload_too_large", status: 413 };
      }
      chunks.push(value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, code: "invalid_request", status: 400 };
  } finally {
    reader.releaseLock();
  }
}

export function isCommunitySameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Bearer-authenticated CLI requests do not have an Origin header.
  if (origin === null) return true;
  try {
    const parsed = new URL(origin);
    return parsed.origin === origin && parsed.origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/** Build a new allowlisted object: an injected actorId/role/provider field never reaches the RPC. */
export function parseCommunityCommand(raw: unknown, now = Date.now()): CafeCommunityCommand | null {
  const body = communityRecord(raw);
  if (!body || typeof body.action !== "string") return null;
  const roomId = communityUuid(body.roomId);
  const targetId = communityUuid(body.targetId);
  const callId = communityUuid(body.callId);
  const requestId = communityUuid(body.requestId);
  switch (body.action) {
    case "profile.save": {
      const displayName = communityText(body.displayName, 40);
      const nativeLanguages = communityLanguages(body.nativeLanguages);
      const learningLanguages = communityLanguages(body.learningLanguages);
      if (!displayName || !nativeLanguages || !learningLanguages || body.adultAgreement !== true || body.rulesAgreement !== true) return null;
      return { action: body.action, displayName, nativeLanguages, learningLanguages, adultAgreement: true, rulesAgreement: true };
    }
    case "presence.heartbeat": {
      const presenceSessionId = communityUuid(body.presenceSessionId);
      if (!presenceSessionId || (body.roomId != null && !roomId)) return null;
      return { action: body.action, presenceSessionId, roomId };
    }
    case "presence.leave": {
      const presenceSessionId = communityUuid(body.presenceSessionId);
      return presenceSessionId ? { action: body.action, presenceSessionId } : null;
    }
    case "room.create": {
      const title = communityText(body.title, 120);
      const languages = communityLanguages(body.languages);
      const capacity = body.capacity;
      const mode = body.mode;
      if (!requestId || !title || !languages || (mode !== "now" && mode !== "scheduled")
        || typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 2 || capacity > 8) return null;
      const startsAt = mode === "scheduled" ? communityTimestamp(body.startsAt) : null;
      if (mode === "scheduled" && (!startsAt || Date.parse(startsAt) <= now || Date.parse(startsAt) > now + 90 * 24 * 60 * 60 * 1_000)) return null;
      if (mode === "now" && body.startsAt != null) return null;
      return { action: body.action, requestId, title, languages, mode, startsAt, capacity };
    }
    case "room.join":
    case "room.leave":
    case "room.end":
      return roomId ? { action: body.action, roomId } : null;
    case "room.rsvp":
      return roomId && typeof body.attending === "boolean" ? { action: body.action, roomId, attending: body.attending } : null;
    case "room.remove":
      return roomId && targetId ? { action: body.action, roomId, targetId } : null;
    case "message.send": {
      const text = communityText(body.body, 2_000, false, true);
      return roomId && requestId && text ? { action: body.action, roomId, body: text, requestId } : null;
    }
    case "member.block":
    case "member.unblock":
      return targetId ? { action: body.action, targetId } : null;
    case "report.submit": {
      const reason = typeof body.reason === "string" && REPORT_REASONS.has(body.reason as CafeReportReason) ? body.reason as CafeReportReason : null;
      if (!targetId || !reason || (!roomId && !callId) || (body.roomId != null && !roomId) || (body.callId != null && !callId)
        || !Array.isArray(body.messageIds) || body.messageIds.length > 10) return null;
      const messageIds: string[] = [];
      for (const value of body.messageIds) {
        const id = communityUuid(value);
        if (!id) return null;
        if (!messageIds.includes(id)) messageIds.push(id);
      }
      const details = communityText(body.details ?? "", 2_000, true, true);
      if (details === null || (messageIds.length > 0 && !roomId)) return null;
      return { action: body.action, targetId, roomId, callId, reason, messageIds, details };
    }
    case "call.invite":
      return roomId && targetId && requestId ? { action: body.action, roomId, targetId, requestId } : null;
    case "call.respond":
      return callId && typeof body.accept === "boolean" ? { action: body.action, callId, accept: body.accept } : null;
    case "call.end":
      return callId ? { action: body.action, callId } : null;
    default:
      return null;
  }
}
