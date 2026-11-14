import { isCafeCommunityEnabled } from "./communityFeatureFlag";
import { isCafeRoomProviderEnabled } from "./roomFeatureFlag";
import { authenticateCafeRequest, type CafeAuthenticatedUser } from "./serverAuth";
import { getSupabaseAdmin } from "../supabaseAdmin";
import type { CafeCommunityCallJoin, CafeCommunityCommand, CafeCommunityFailure } from "./communityTypes";
import { projectCallJoin, projectCommunitySnapshot, projectModerationReports } from "./communityProjection";
import {
  communityRecord,
  communityTimestamp,
  communityUuid,
  isCommunitySameOrigin,
  parseCommunityCommand,
  readCommunityJson,
} from "./communityValidation";

export type CafeCommunityRpcReply = { data: unknown; error: { code?: string } | null };
export type CafeCommunityLimit = { status: 429 | 503; retryAfter: number } | null;
export type CafeCommunityServerDependencies = {
  enabled: () => boolean;
  videoEnabled: () => boolean;
  authenticate: (request: Request) => Promise<CafeAuthenticatedUser>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<CafeCommunityRpcReply>;
  limit: (request: Request, actorId: string, operation: string) => Promise<CafeCommunityLimit>;
  joinCall: (input: { actorId: string; callId: string }) => Promise<CafeCommunityCallJoin>;
  cleanupCalls: (input: { actorId: string; callIds?: string[] }) => Promise<{ pending: boolean }>;
  now?: () => number;
  onError?: (operation: string, databaseCode?: string) => void;
};

const SAFE_FAILURES = new Set([
  "not_found", "unauthorized", "permanent_account_required", "profile_required", "profile_incomplete",
  "account_unavailable", "account_inactive", "adult_agreement_required", "rules_agreement_required", "agreement_required",
  "invalid_request", "invalid_action", "invalid_language", "invalid_date", "room_not_found", "room_unavailable", "room_closed", "room_not_started",
  "not_room_member", "capacity_full", "room_limit", "reservation_limit", "blocked", "member_blocked", "not_allowed",
  "access_denied", "forbidden", "host_required", "not_room_owner", "member_not_found", "message_too_long", "message_not_found",
  "report_unavailable", "report_limit", "call_not_found", "call_unavailable", "call_expired", "call_conflict", "call_pending",
  "call_declined", "call_ended", "call_limit", "invitation_cooldown", "already_in_call", "not_call_recipient",
  "room_access_denied", "call_access_denied", "report_access_denied", "report_not_found", "already_in_room", "call_busy",
  "rate_limited", "too_many_requests", "operation_conflict", "conflict", "cafe_unavailable", "provider_unavailable",
]);
const FORBIDDEN = new Set([
  "profile_required", "profile_incomplete", "account_unavailable", "account_inactive", "adult_agreement_required",
  "rules_agreement_required", "agreement_required", "not_room_member", "blocked", "member_blocked", "not_allowed",
  "access_denied", "forbidden", "host_required", "not_room_owner", "not_call_recipient",
  "room_access_denied", "call_access_denied", "report_access_denied",
]);

export function communityJson(body: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  headers.set("Vary", "Authorization, Cookie");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { status, headers });
}

function failure(code: string, status = 503, retryAfter?: number): Response {
  const body: CafeCommunityFailure = { ok: false, code };
  if (retryAfter !== undefined) body.retryAfter = retryAfter;
  return communityJson(body, status, retryAfter === undefined ? undefined : { "Retry-After": String(retryAfter) });
}

function databaseFailure(raw: unknown): Response | null {
  const value = communityRecord(raw);
  if (!value || value.ok !== false) return null;
  const code = typeof value.code === "string" && SAFE_FAILURES.has(value.code) ? value.code : "cafe_unavailable";
  const status = code === "unauthorized" || code === "permanent_account_required" ? 401
    : code === "not_found" || code.endsWith("_not_found") ? 404
    : FORBIDDEN.has(code) ? 403
    : code.startsWith("invalid_") || code === "message_too_long" ? 400
    : code === "rate_limited" || code === "too_many_requests" ? 429
    : code === "cafe_unavailable" || code === "provider_unavailable" ? 503
    : 409;
  const retryAfter = typeof value.retryAfter === "number" && Number.isSafeInteger(value.retryAfter)
    && value.retryAfter > 0 && value.retryAfter <= 3_600 ? value.retryAfter : undefined;
  return failure(code, status, retryAfter);
}

function publicCommandResult(raw: unknown, action: CafeCommunityCommand["action"]): Record<string, unknown> | null {
  const value = communityRecord(raw);
  if (!value || value.ok !== true) return null;
  const result: Record<string, unknown> = { ok: true };
  for (const key of ["roomId", "callId", "reportId"] as const) {
    if (value[key] !== undefined) {
      const id = communityUuid(value[key]);
      if (!id) return null;
      result[key] = id;
    }
  }
  if ((action === "room.create" && !result.roomId) || (action === "call.invite" && !result.callId)
    || (action === "report.submit" && !result.reportId)) return null;
  return result;
}

export function createCafeCommunityHandlers(deps: CafeCommunityServerDependencies) {
  const now = deps.now ?? Date.now;
  const logFailure = (operation: string, code?: string) => {
    // SQLSTATE is the only database diagnostic allowed here. Never log RPC data or provider errors.
    try { deps.onError?.(operation, code && /^[A-Z0-9]{5}$/.test(code) ? code : undefined); } catch { /* logging cannot change an action's outcome */ }
  };
  const rpc = async (operation: string, name: string, args: Record<string, unknown>): Promise<CafeCommunityRpcReply> => {
    let result = await deps.rpc(name, args);
    if (result.error && ["40P01", "55P03", "40001"].includes(result.error.code ?? "")) result = await deps.rpc(name, args);
    if (result.error) logFailure(operation, result.error.code);
    return result;
  };
  const limited = async (request: Request, actorId: string, operation: string): Promise<Response | null> => {
    const result = await deps.limit(request, actorId, operation);
    return result ? failure(result.status === 429 ? "rate_limited" : "cafe_unavailable", result.status, result.retryAfter) : null;
  };
  const withActor = async (
    request: Request,
    method: "GET" | "POST",
    operation: string,
    work: (actorId: string) => Promise<Response>,
    requireVideo = false,
  ): Promise<Response> => {
    try {
      if (!deps.enabled() || (requireVideo && !deps.videoEnabled())) return failure("not_found", 404);
      if (request.method !== method) return communityJson({ ok: false, code: "method_not_allowed" }, 405, { Allow: method });
      if (method === "POST" && !isCommunitySameOrigin(request)) return failure("origin_not_allowed", 403);
      const auth = await deps.authenticate(request);
      if (!auth.ok) return failure(auth.error === "permanent_account_required" ? auth.error : auth.status === 401 ? "unauthorized" : "cafe_unavailable", auth.status);
      const actorId = communityUuid(auth.id);
      if (!actorId) return failure("cafe_unavailable");
      return await work(actorId);
    } catch {
      logFailure(operation);
      return failure("cafe_unavailable");
    }
  };

  return {
    methodResponse(request: Request, allowed: string, requireVideo = false): Response {
      if (!deps.enabled() || (requireVideo && !deps.videoEnabled())) return failure("not_found", 404);
      const response = communityJson({ ok: false, code: "method_not_allowed" }, 405, { Allow: allowed });
      return request.method === "OPTIONS" ? new Response(null, { status: 204, headers: response.headers }) : response;
    },

    snapshot(request: Request): Promise<Response> {
      return withActor(request, "GET", "snapshot", async actorId => {
        const query = new URL(request.url).searchParams;
        if (query.getAll("roomId").length > 1) return failure("invalid_request", 400);
        const rawRoomId = query.get("roomId");
        const roomId = rawRoomId === null ? null : communityUuid(rawRoomId);
        if (rawRoomId !== null && !roomId) return failure("invalid_request", 400);
        const limit = await limited(request, actorId, "snapshot");
        if (limit) return limit;
        const result = await rpc("snapshot", "cafe_community_snapshot_server", { p_actor_id: actorId, p_room_id: roomId });
        if (result.error) return failure("cafe_unavailable");
        const denied = databaseFailure(result.data);
        if (denied) return denied;
        const snapshot = projectCommunitySnapshot(result.data, actorId, roomId);
        return snapshot ? communityJson(snapshot) : failure("cafe_unavailable");
      });
    },

    command(request: Request): Promise<Response> {
      return withActor(request, "POST", "command", async actorId => {
        const body = await readCommunityJson(request);
        if (!body.ok) return failure(body.code, body.status);
        const command = parseCommunityCommand(body.value, now());
        if (!command) return failure("invalid_request", 400);
        if ((command.action === "call.invite" || (command.action === "call.respond" && command.accept)) && !deps.videoEnabled()) return failure("not_found", 404);
        if (("targetId" in command && command.targetId === actorId)) return failure("invalid_request", 400);
        const limit = await limited(request, actorId, command.action);
        if (limit) return limit;
        const { action, ...payload } = command;
        const result = await rpc(action, "cafe_community_command_server", { p_actor_id: actorId, p_action: action, p_payload: payload });
        if (result.error) return failure("cafe_unavailable");
        const denied = databaseFailure(result.data);
        if (denied) return denied;
        const projected = publicCommandResult(result.data, action);
        if (!projected) return failure("cafe_unavailable");
        const value = communityRecord(result.data)!;
        const cleanupIds = Array.isArray(value.cleanupCallIds)
          ? Array.from(new Set(value.cleanupCallIds.map(communityUuid).filter((id): id is string => id !== null))).slice(0, 50)
          : [];
        const tryCleanup = cleanupIds.length > 0 || action === "presence.heartbeat"
          || action === "member.block" || action === "call.end" || action === "room.leave" || action === "room.end" || action === "room.remove";
        if (tryCleanup) {
          try {
            const cleanup = await deps.cleanupCalls({ actorId, ...(cleanupIds.length ? { callIds: cleanupIds } : {}) });
            if (cleanup.pending) projected.cleanupPending = true;
          } catch {
            // The database action is already committed. Never undo or misreport a block because provider cleanup failed.
            projected.cleanupPending = true;
            logFailure("cleanup");
          }
        }
        return communityJson(projected);
      });
    },

    callStatus(request: Request, rawCallId: string): Promise<Response> {
      return withActor(request, "GET", "call.status", async actorId => {
        // Existing call pages stop their media on the next status poll when video is disabled.
        // Ending and blocking remain available so the provider outbox can still be drained.
        if (!deps.videoEnabled()) return failure("call_unavailable", 409);
        const callId = communityUuid(rawCallId);
        if (!callId) return failure("invalid_request", 400);
        const limit = await limited(request, actorId, "call.status");
        if (limit) return limit;
        const result = await rpc("call.status", "cafe_community_authorize_call_server", { p_actor_id: actorId, p_call_id: callId });
        if (result.error) return failure("cafe_unavailable");
        const denied = databaseFailure(result.data);
        if (denied) return denied;
        const value = communityRecord(result.data);
        const roomId = communityUuid(value?.roomId);
        const endsAt = communityTimestamp(value?.endsAt);
        if (value?.ok !== true || value.callId !== callId || !roomId || !endsAt
          || (value.fromId !== actorId && value.toId !== actorId)) return failure("cafe_unavailable");
        return communityJson({ ok: true, callId, roomId, endsAt });
      });
    },

    callJoin(request: Request, rawCallId: string): Promise<Response> {
      return withActor(request, "POST", "call.join", async actorId => {
        const callId = communityUuid(rawCallId);
        if (!callId) return failure("invalid_request", 400);
        const limit = await limited(request, actorId, "call.join");
        if (limit) return limit;
        const result = await deps.joinCall({ actorId, callId });
        const denied = databaseFailure(result);
        if (denied) return denied;
        const projected = projectCallJoin(result);
        return projected ? communityJson(projected) : failure("cafe_unavailable");
      }, true);
    },

    reports(request: Request): Promise<Response> {
      return withActor(request, "GET", "reports", async actorId => {
        const limit = await limited(request, actorId, "reports");
        if (limit) return limit;
        const result = await rpc("reports", "cafe_community_reports_server", { p_actor_id: actorId });
        if (result.error) return failure("cafe_unavailable");
        const denied = databaseFailure(result.data);
        if (denied) return denied;
        const projected = projectModerationReports(result.data);
        return projected ? communityJson(projected) : failure("cafe_unavailable");
      });
    },

    reviewReport(request: Request): Promise<Response> {
      return withActor(request, "POST", "report.review", async actorId => {
        const body = await readCommunityJson(request);
        if (!body.ok) return failure(body.code, body.status);
        const value = communityRecord(body.value);
        const reportId = communityUuid(value?.reportId);
        if (value?.action !== "review" || !reportId) return failure("invalid_request", 400);
        const limit = await limited(request, actorId, "report.review");
        if (limit) return limit;
        const result = await rpc("report.review", "cafe_community_review_report_server", { p_actor_id: actorId, p_report_id: reportId });
        if (result.error) return failure("cafe_unavailable");
        const denied = databaseFailure(result.data);
        if (denied) return denied;
        return communityRecord(result.data)?.ok === true ? communityJson({ ok: true }) : failure("cafe_unavailable");
      });
    },
  };
}

function operationLimit(operation: string): number {
  if (operation === "snapshot" || operation === "call.status") return 180;
  if (operation === "presence.heartbeat" || operation === "presence.leave") return 120;
  if (operation === "room.create") return 6;
  if (operation === "call.invite" || operation === "report.submit") return 10;
  if (operation === "profile.save" || operation === "call.join") return 20;
  if (operation === "reports" || operation === "report.review") return 30;
  return 60;
}

/** Production dependencies stay server-side; tests inject all access and provider boundaries. */
export const cafeCommunityHandlers = createCafeCommunityHandlers({
  enabled: isCafeCommunityEnabled,
  videoEnabled: isCafeRoomProviderEnabled,
  authenticate: authenticateCafeRequest,
  rpc: async (name, args) => {
    const result = await getSupabaseAdmin().rpc(name, args);
    return { data: result.data as unknown, error: result.error ? { code: result.error.code } : null };
  },
  limit: async (request, actorId, operation) => {
    const { rateLimitByIp } = await import("../rateLimit");
    const actor = await rateLimitByIp(request, `cafe-community-${operation}`, { limit: operationLimit(operation), windowSeconds: 60, identifier: actorId });
    if (!actor.allowed) return { status: actor.infrastructureUnavailable ? 503 : 429, retryAfter: actor.retryAfterSeconds ?? 60 };
    const ip = await rateLimitByIp(request, "cafe-community-ip", { limit: 1_200, windowSeconds: 60 });
    return ip.allowed ? null : { status: ip.infrastructureUnavailable ? 503 : 429, retryAfter: ip.retryAfterSeconds ?? 60 };
  },
  joinCall: async input => {
    const { joinCommunityCall } = await import("./communityCallProvider");
    return joinCommunityCall(input);
  },
  cleanupCalls: async input => {
    const { cleanupCommunityCalls } = await import("./communityCallProvider");
    return cleanupCommunityCalls(input);
  },
  onError: (operation, code) => console.error("[cafe/community] request failed", { operation, ...(code ? { code } : {}) }),
});
