import type { CafeRoomRole } from "@/lib/cafe/roomProvider";

type CafeRoomAuditEvent =
  | "join_authorized"
  | "join_denied"
  | "room_created"
  | "provider_error"
  | "removal";

type CafeRoomAuditFields = {
  sessionId?: string | null;
  opaqueParticipantId?: string | null;
  role?: CafeRoomRole | null;
  outcome?: string | null;
  providerStatus?: number | null;
};

/**
 * Deliberately excludes tokens, room URLs, names, email addresses, canonical
 * profile IDs, provider response bodies, and Authorization headers.
 */
export function logCafeRoomAudit(event: CafeRoomAuditEvent, fields: CafeRoomAuditFields = {}) {
  console.info("[cafe-room]", {
    event,
    sessionId: fields.sessionId ?? undefined,
    opaqueParticipantId: fields.opaqueParticipantId ?? undefined,
    role: fields.role ?? undefined,
    outcome: fields.outcome ?? undefined,
    providerStatus: fields.providerStatus ?? undefined,
  });
}
