import { NextResponse } from "next/server";
import { authenticateCafeRequest } from "@/lib/cafe/serverAuth";
import { isCafeRoomProviderEnabled } from "@/lib/cafe/roomFeatureFlag";
import { getDailyRoomProviderFromEnv } from "@/lib/cafe/providers/daily";
import { CafeRoomProviderError } from "@/lib/cafe/roomProvider";
import {
  CafeRoomBindingRejectedError,
  authorizeBeforeSharedSessionLimit,
  executeCafeRoomJoinFlow,
  type CafeJoinDecision,
  type CafeJoinDenied,
  type CafeJoinRole,
} from "@/lib/cafe/roomJoinFlow";
import { logCafeRoomAudit } from "@/lib/cafe/roomAudit";
import { rateLimitByIp, type RateLimitResult } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function disabledResponse() {
  return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
}

function noStoreJson(body: unknown, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      ...headers,
    },
  });
}

function parseAuthorizedDecision(raw: unknown): CafeJoinDecision | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.ok === false && typeof value.code === "string") {
    return {
      ok: false,
      code: value.code,
      ...(typeof value.opensAt === "string" ? { opensAt: value.opensAt } : {}),
    };
  }
  if (
    value.ok !== true ||
    value.code !== "join_authorized" ||
    typeof value.sessionId !== "string" ||
    typeof value.profileId !== "string" ||
    (value.role !== "participant" && value.role !== "host") ||
    typeof value.displayName !== "string" ||
    typeof value.startsAt !== "string" ||
    typeof value.endsAt !== "string" ||
    typeof value.opensAt !== "string" ||
    typeof value.closesAt !== "string" ||
    typeof value.roomNbf !== "number" ||
    typeof value.roomExp !== "number" ||
    typeof value.tokenNbf !== "number" ||
    typeof value.tokenExp !== "number" ||
    typeof value.maxParticipants !== "number"
  ) return null;

  return {
    ok: true,
    code: "join_authorized",
    sessionId: value.sessionId,
    profileId: value.profileId,
    role: value.role,
    displayName: value.displayName,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    opensAt: value.opensAt,
    closesAt: value.closesAt,
    roomNbf: value.roomNbf,
    roomExp: value.roomExp,
    tokenNbf: value.tokenNbf,
    tokenExp: value.tokenExp,
    maxParticipants: value.maxParticipants,
    provider: typeof value.provider === "string" ? value.provider : null,
    providerRoomId: typeof value.providerRoomId === "string" ? value.providerRoomId : null,
  };
}

function deniedResponse(decision: CafeJoinDenied): NextResponse {
  const payload = {
    ok: false,
    code: decision.code,
    ...(decision.opensAt ? { opensAt: decision.opensAt } : {}),
  };
  switch (decision.code) {
    case "session_not_found":
      return noStoreJson(payload, 404);
    case "too_early":
    case "not_reserved":
    case "adult_rules_required":
    case "account_unavailable":
    case "access_denied":
      return noStoreJson(payload, 403);
    case "ended":
    case "session_cancelled":
      return noStoreJson(payload, 410);
    case "invalid_request":
      return noStoreJson(payload, 400);
    default:
      return noStoreJson({ ok: false, code: "cafe_unavailable" }, 503);
  }
}

function rateLimitResponse(result: RateLimitResult): NextResponse | null {
  if (result.infrastructureUnavailable) {
    return noStoreJson(
      { ok: false, code: "rate_limit_unavailable", retryAfter: result.retryAfterSeconds ?? 60 },
      503,
      { "Retry-After": String(result.retryAfterSeconds ?? 60) },
    );
  }
  if (!result.allowed) {
    const retryAfter = result.retryAfterSeconds ?? 60;
    return noStoreJson(
      { ok: false, code: "rate_limited", retryAfter },
      429,
      {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    );
  }
  return null;
}

async function enforcePreAuthRateLimit(req: Request) {
  return rateLimitResponse(await rateLimitByIp(req, "cafe-room-auth-ip", {
    limit: 30,
    windowSeconds: 60,
  }));
}

async function enforceUserJoinRateLimit(req: Request, userId: string, role: CafeJoinRole) {
  return rateLimitResponse(await rateLimitByIp(req, `cafe-room-${role}-user`, {
    limit: role === "host" ? 10 : 6,
    windowSeconds: 60,
    identifier: userId,
  }));
}

async function enforceAuthorizedSessionRateLimit(
  req: Request,
  sessionId: string,
  role: CafeJoinRole,
) {
  // This counter runs only after DB authorization succeeds. Unreserved or
  // unrelated accounts cannot consume a real session's shared allowance.
  return rateLimitResponse(await rateLimitByIp(req, `cafe-room-${role}-session`, {
    limit: 80,
    windowSeconds: 60,
    identifier: sessionId,
  }));
}

async function authorize(
  admin: ReturnType<typeof getSupabaseAdmin>,
  actorId: string,
  slug: string,
  role: CafeJoinRole,
): Promise<CafeJoinDecision> {
  const { data, error } = await admin.rpc("cafe_authorize_join_server", {
    p_actor_id: actorId,
    p_slug: slug,
    p_join_role: role,
  });
  if (error) throw new Error(`authorize:${error.code ?? "unknown"}`);
  const parsed = parseAuthorizedDecision(data);
  if (!parsed) throw new Error("authorize:invalid-response");
  return parsed;
}

export async function handleCafeRoomJoin(
  req: Request,
  rawSlug: string,
  role: CafeJoinRole,
): Promise<Response> {
  if (!isCafeRoomProviderEnabled()) return disabledResponse();

  const slug = rawSlug.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) return noStoreJson({ ok: false, code: "session_not_found" }, 404);

  const preAuthLimited = await enforcePreAuthRateLimit(req);
  if (preAuthLimited) return preAuthLimited;

  const auth = await authenticateCafeRequest(req);
  if (!auth.ok) {
    return noStoreJson({ ok: false, code: auth.error }, auth.status);
  }

  const userLimited = await enforceUserJoinRateLimit(req, auth.id, role);
  if (userLimited) return userLimited;

  try {
    const admin = getSupabaseAdmin();
    const authorizationGate = await authorizeBeforeSharedSessionLimit({
      authorize: () => authorize(admin, auth.id, slug, role),
      applyLimit: (sessionId) => enforceAuthorizedSessionRateLimit(req, sessionId, role),
    });
    const firstDecision = authorizationGate.decision;
    if (!firstDecision.ok) {
      logCafeRoomAudit("join_denied", { role, outcome: firstDecision.code });
      return deniedResponse(firstDecision);
    }
    if (authorizationGate.limitResult) return authorizationGate.limitResult;

    const provider = getDailyRoomProviderFromEnv();
    const result = await executeCafeRoomJoinFlow({
      firstDecision,
      actorId: auth.id,
      role,
      provider,
      bindRoom: async (sessionId, providerName, roomId) => {
        const { data, error } = await admin.rpc("cafe_bind_room_server", {
          p_session_id: sessionId,
          p_provider: providerName,
          p_provider_room_id: roomId,
        });
        if (error) {
          throw new Error(`binding_failed:${error.code ?? "unknown"}`);
        }
        const binding = (data ?? {}) as { ok?: boolean; code?: string };
        if (binding.ok !== true) {
          throw new CafeRoomBindingRejectedError(
            `binding_rejected:${binding.code ?? "unknown"}`,
            binding.code === "session_unavailable",
          );
        }
      },
      reauthorize: () => authorize(admin, auth.id, slug, role),
    });

    if (!result.ok) {
      logCafeRoomAudit("join_denied", {
        sessionId: firstDecision.sessionId,
        role,
        outcome: result.decision.code,
      });
      return deniedResponse(result.decision);
    }

    logCafeRoomAudit("join_authorized", {
      sessionId: result.sessionId,
      opaqueParticipantId: result.opaqueParticipantId,
      role,
      outcome: "token_issued",
    });

    return noStoreJson({
      ok: true,
      role,
      roomUrl: result.roomUrl,
      token: result.token,
      expiresAt: result.expiresAt,
    }, 200);
  } catch (error) {
    if (error instanceof CafeRoomProviderError) {
      logCafeRoomAudit("provider_error", { role, outcome: error.code });
      if (error.code === "provider_unavailable") {
        const retryAfter = error.retryAfterSeconds ?? 15;
        return noStoreJson(
          { ok: false, code: "provider_unavailable", retryAfter },
          503,
          { "Retry-After": String(retryAfter) },
        );
      }
      return noStoreJson({ ok: false, code: "internal_error" }, 500);
    }

    console.error("[cafe-room] join service failed", {
      role,
      errorClass: error instanceof Error ? error.name : "unknown",
    });
    return noStoreJson({ ok: false, code: "cafe_unavailable" }, 503);
  }
}
