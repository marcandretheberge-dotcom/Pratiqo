/** Public, authenticated Café community projection. Never include account email or provider credentials. */
export type CafeMember = {
  id: string;
  displayName: string;
  nativeLanguages: string[];
  learningLanguages: string[];
};

export type CafePerson = CafeMember & { online: boolean; roomId: string | null };
export type CafeCommunityRoomState = "scheduled" | "waiting" | "live" | "ended" | "cancelled";
export type CafeCommunityRoom = {
  id: string;
  title: string;
  languages: string[];
  creator: CafeMember;
  mode: "now" | "scheduled";
  state: CafeCommunityRoomState;
  startsAt: string | null;
  capacity: number;
  participants: CafeMember[];
  rsvpCount: number;
  myRsvp: boolean;
};
export type CafeChatMessage = {
  id: string;
  roomId: string;
  sender: CafeMember;
  body: string;
  createdAt: string;
};
export type CafeCommunityRoomView = CafeCommunityRoom & { messages: CafeChatMessage[] };
export type CafeCallStatus = "pending" | "accepted" | "declined" | "cancelled" | "ended" | "expired";
export type CafeCallInvitation = {
  id: string;
  roomId: string;
  from: CafeMember;
  to: CafeMember;
  status: CafeCallStatus;
  createdAt: string;
  expiresAt: string;
  endsAt: string | null;
};
export type CafeCommunitySnapshot = {
  ok: true;
  me: CafeMember | null;
  people: CafePerson[];
  rooms: CafeCommunityRoom[];
  room: CafeCommunityRoomView | null;
  calls: CafeCallInvitation[];
  blockedMembers: CafeMember[];
  serverTime: string;
};
export type CafeReportReason = "sexual_harassment" | "harassment" | "spam" | "other";
export type CafeCommunityCommand =
  | { action: "profile.save"; displayName: string; nativeLanguages: string[]; learningLanguages: string[]; adultAgreement: boolean; rulesAgreement: boolean }
  | { action: "presence.heartbeat"; presenceSessionId: string; roomId?: string | null }
  | { action: "presence.leave"; presenceSessionId: string }
  | { action: "room.create"; requestId: string; title: string; languages: string[]; mode: "now" | "scheduled"; startsAt?: string | null; capacity: number }
  | { action: "room.join" | "room.leave" | "room.end"; roomId: string }
  | { action: "room.rsvp"; roomId: string; attending: boolean }
  | { action: "room.remove"; roomId: string; targetId: string }
  | { action: "message.send"; roomId: string; body: string; requestId: string }
  | { action: "member.block" | "member.unblock"; targetId: string }
  | { action: "report.submit"; targetId: string; roomId?: string | null; callId?: string | null; reason: CafeReportReason; messageIds: string[]; details?: string }
  | { action: "call.invite"; roomId: string; targetId: string; requestId: string }
  | { action: "call.respond"; callId: string; accept: boolean }
  | { action: "call.end"; callId: string };

export type CafeCommunityFailure = { ok: false; code: string; retryAfter?: number };
export type CafeCommunityCommandResult =
  | { ok: true; roomId?: string; callId?: string; reportId?: string; cleanupPending?: boolean }
  | CafeCommunityFailure;

/** Private RPC result, consumed on the server and never returned wholesale to browsers. */
export type CafeCommunityInternalResult = CafeCommunityCommandResult & {
  cleanupCallIds?: string[];
};
export type CafeCommunityCallAuthorization = {
  ok: true;
  callId: string;
  roomId: string;
  fromId: string;
  toId: string;
  displayName: string;
  acceptedAt: string;
  endsAt: string;
};
export type CafeCommunityCallJoin =
  | { ok: true; roomUrl: string; token: string; expiresAt: string; endsAt: string }
  | CafeCommunityFailure;

export type CafeModerationReport = {
  id: string;
  reporter: CafeMember;
  target: CafeMember;
  reason: CafeReportReason;
  details: string;
  createdAt: string;
  status: "open" | "reviewed";
  messages: Array<{ id: string; senderId: string; body: string; createdAt: string }>;
};
