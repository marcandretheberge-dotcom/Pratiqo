import type {
  CafeCallInvitation,
  CafeCallStatus,
  CafeChatMessage,
  CafeCommunityCallJoin,
  CafeCommunityRoom,
  CafeCommunityRoomState,
  CafeCommunityRoomView,
  CafeCommunitySnapshot,
  CafeMember,
  CafeModerationReport,
  CafePerson,
  CafeReportReason,
} from "./communityTypes";
import { communityLanguages, communityRecord, communityTimestamp, communityUuid } from "./communityValidation";

const ROOM_STATES = new Set<CafeCommunityRoomState>(["scheduled", "waiting", "live", "ended", "cancelled"]);
const CALL_STATES = new Set<CafeCallStatus>(["pending", "accepted", "declined", "cancelled", "ended", "expired"]);
const REASONS = new Set<CafeReportReason>(["sexual_harassment", "harassment", "spam", "other"]);

function boundedText(raw: unknown, max: number): string | null {
  return typeof raw === "string" && raw.length <= max ? raw : null;
}

function projectArray<T>(raw: unknown, max: number, project: (value: unknown) => T | null): T[] | null {
  if (!Array.isArray(raw) || raw.length > max) return null;
  const values: T[] = [];
  for (const item of raw) {
    const value = project(item);
    if (value === null) return null;
    values.push(value);
  }
  return values;
}

/** Field-by-field projection keeps future private schema fields out of browser responses. */
export function projectCafeMember(raw: unknown): CafeMember | null {
  const value = communityRecord(raw);
  if (!value) return null;
  const id = communityUuid(value.id);
  const displayName = boundedText(value.displayName, 40);
  const nativeLanguages = communityLanguages(value.nativeLanguages, true);
  const learningLanguages = communityLanguages(value.learningLanguages, true);
  return id && displayName && nativeLanguages && learningLanguages
    ? { id, displayName, nativeLanguages, learningLanguages }
    : null;
}

function projectPerson(raw: unknown): CafePerson | null {
  const value = communityRecord(raw);
  const member = projectCafeMember(raw);
  if (!value || !member || typeof value.online !== "boolean") return null;
  const roomId = value.roomId === null ? null : communityUuid(value.roomId);
  if (value.roomId !== null && !roomId) return null;
  return { ...member, online: value.online, roomId };
}

function projectRoom(raw: unknown): CafeCommunityRoom | null {
  const value = communityRecord(raw);
  if (!value) return null;
  const id = communityUuid(value.id);
  const title = boundedText(value.title, 120);
  const languages = communityLanguages(value.languages);
  const creator = projectCafeMember(value.creator);
  const participants = projectArray(value.participants, 8, projectCafeMember);
  const mode = value.mode === "now" || value.mode === "scheduled" ? value.mode : null;
  const state = typeof value.state === "string" && ROOM_STATES.has(value.state as CafeCommunityRoomState) ? value.state as CafeCommunityRoomState : null;
  const startsAt = value.startsAt === null ? null : communityTimestamp(value.startsAt);
  const capacity = value.capacity;
  const rsvpCount = value.rsvpCount;
  if (!id || !title || !languages || !creator || !participants || !mode || !state
    || (value.startsAt !== null && !startsAt)
    || typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 2 || capacity > 8
    || typeof rsvpCount !== "number" || !Number.isInteger(rsvpCount) || rsvpCount < 0
    || typeof value.myRsvp !== "boolean") return null;
  return { id, title, languages, creator, mode, state, startsAt, capacity, participants, rsvpCount, myRsvp: value.myRsvp };
}

function projectMessage(raw: unknown): CafeChatMessage | null {
  const value = communityRecord(raw);
  if (!value) return null;
  const id = communityUuid(value.id);
  const roomId = communityUuid(value.roomId);
  const sender = projectCafeMember(value.sender);
  const body = boundedText(value.body, 2_000);
  const createdAt = communityTimestamp(value.createdAt);
  return id && roomId && sender && body !== null && createdAt ? { id, roomId, sender, body, createdAt } : null;
}

function projectRoomView(raw: unknown): CafeCommunityRoomView | null {
  const value = communityRecord(raw);
  const room = projectRoom(raw);
  if (!value || !room) return null;
  const messages = projectArray(value.messages, 100, projectMessage);
  if (!messages || messages.some(message => message.roomId !== room.id)) return null;
  return { ...room, messages };
}

function projectCall(raw: unknown): CafeCallInvitation | null {
  const value = communityRecord(raw);
  if (!value) return null;
  const id = communityUuid(value.id);
  const roomId = communityUuid(value.roomId);
  const from = projectCafeMember(value.from);
  const to = projectCafeMember(value.to);
  const status = typeof value.status === "string" && CALL_STATES.has(value.status as CafeCallStatus) ? value.status as CafeCallStatus : null;
  const createdAt = communityTimestamp(value.createdAt);
  const expiresAt = communityTimestamp(value.expiresAt);
  const endsAt = value.endsAt === null ? null : communityTimestamp(value.endsAt);
  if (!id || !roomId || !from || !to || !status || !createdAt || !expiresAt || (value.endsAt !== null && !endsAt)) return null;
  return { id, roomId, from, to, status, createdAt, expiresAt, endsAt };
}

export function projectCommunitySnapshot(raw: unknown, actorId: string, requestedRoomId: string | null): CafeCommunitySnapshot | null {
  const value = communityRecord(raw);
  if (!value || value.ok !== true) return null;
  const me = value.me === null ? null : projectCafeMember(value.me);
  const people = projectArray(value.people, 500, projectPerson);
  const rooms = projectArray(value.rooms, 500, projectRoom);
  const room = value.room === null ? null : projectRoomView(value.room);
  const calls = projectArray(value.calls, 100, projectCall);
  const blockedMembers = projectArray(value.blockedMembers, 500, projectCafeMember);
  const serverTime = communityTimestamp(value.serverTime);
  if ((value.me !== null && !me) || (me && me.id !== actorId) || !people || !rooms
    || (value.room !== null && !room) || !calls || !blockedMembers || !serverTime) return null;
  if (room && (room.id !== requestedRoomId || !room.participants.some(member => member.id === actorId))) return null;
  if (!me && (people.length || rooms.length || room || calls.length || blockedMembers.length)) return null;
  if (calls.some(call => call.from.id !== actorId && call.to.id !== actorId)) return null;
  return { ok: true, me, people, rooms, room, calls, blockedMembers, serverTime };
}

export function projectCallJoin(raw: unknown): Extract<CafeCommunityCallJoin, { ok: true }> | null {
  const value = communityRecord(raw);
  if (!value || value.ok !== true) return null;
  const token = boundedText(value.token, 16_384);
  const expiresAt = communityTimestamp(value.expiresAt);
  const endsAt = communityTimestamp(value.endsAt);
  if (typeof value.roomUrl !== "string" || value.roomUrl.length > 2_048 || !token || !expiresAt || !endsAt) return null;
  try {
    const url = new URL(value.roomUrl);
    if (url.protocol !== "https:" || !/^[a-z0-9-]+\.daily\.co$/.test(url.hostname)
      || url.username || url.password || url.port || url.search || url.hash) return null;
  } catch { return null; }
  return { ok: true, roomUrl: value.roomUrl, token, expiresAt, endsAt };
}

function projectReport(raw: unknown): CafeModerationReport | null {
  const value = communityRecord(raw);
  if (!value) return null;
  const id = communityUuid(value.id);
  const reporter = projectCafeMember(value.reporter);
  const target = projectCafeMember(value.target);
  const reason = typeof value.reason === "string" && REASONS.has(value.reason as CafeReportReason) ? value.reason as CafeReportReason : null;
  const details = boundedText(value.details, 2_000);
  const createdAt = communityTimestamp(value.createdAt);
  const status = value.status === "open" || value.status === "reviewed" ? value.status : null;
  const messages = projectArray(value.messages, 10, rawMessage => {
    const message = communityRecord(rawMessage);
    if (!message) return null;
    const messageId = communityUuid(message.id);
    const senderId = communityUuid(message.senderId);
    const body = boundedText(message.body, 2_000);
    const time = communityTimestamp(message.createdAt);
    return messageId && senderId && body !== null && time ? { id: messageId, senderId, body, createdAt: time } : null;
  });
  return id && reporter && target && reason && details !== null && createdAt && status && messages
    ? { id, reporter, target, reason, details, createdAt, status, messages }
    : null;
}

export function projectModerationReports(raw: unknown): { ok: true; reports: CafeModerationReport[] } | null {
  const value = communityRecord(raw);
  if (!value || value.ok !== true) return null;
  const reports = projectArray(value.reports, 200, projectReport);
  return reports ? { ok: true, reports } : null;
}
