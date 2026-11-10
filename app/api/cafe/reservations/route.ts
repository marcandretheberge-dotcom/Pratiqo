import { NextResponse } from "next/server";
import { authenticateCafeRequest } from "@/lib/cafe/serverAuth";
import { rateLimitByIp, rateLimitGuardResponse } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ReservationAction = "reserve" | "cancel";

function parseMutation(raw: unknown):
  | { ok: true; slug: string; action: ReservationAction; expectedVersion: number; requestId: string }
  | { ok: false } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
  const body = raw as Record<string, unknown>;
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const action = body.action === "reserve" || body.action === "cancel" ? body.action : null;
  const expectedVersion =
    typeof body.expectedVersion === "number" && Number.isSafeInteger(body.expectedVersion)
      ? body.expectedVersion
      : -1;
  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";

  if (!SLUG_RE.test(slug) || !action || expectedVersion < 0 || !UUID_RE.test(requestId)) {
    return { ok: false };
  }
  return { ok: true, slug, action, expectedVersion, requestId };
}

async function enforceRateLimits(req: Request, userId: string, action: ReservationAction) {
  const minuteLimit = action === "reserve" ? 6 : 10;
  const hourLimit = action === "reserve" ? 30 : 60;
  for (const [suffix, limit, windowSeconds] of [
    ["minute", minuteLimit, 60],
    ["hour", hourLimit, 3600],
  ] as const) {
    const result = await rateLimitByIp(req, `cafe-${action}-${suffix}`, {
      limit,
      windowSeconds,
      identifier: userId,
    });
    const blocked = rateLimitGuardResponse(result);
    if (blocked) return blocked;
  }

  const ipResult = await rateLimitByIp(req, `cafe-${action}-ip`, {
    limit: action === "reserve" ? 60 : 120,
    windowSeconds: 60,
  });
  return rateLimitGuardResponse(ipResult);
}

export async function GET(req: Request) {
  const auth = await authenticateCafeRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("cafe_my_reservations_server", {
      p_actor_id: auth.id,
    });
    if (error) {
      console.error("[cafe/reservations] read failed", { code: error.code });
      return NextResponse.json({ ok: false, error: "cafe_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, reservations: data ?? [] });
  } catch (error) {
    console.error("[cafe/reservations] unexpected read failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "cafe_unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const auth = await authenticateCafeRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const input = parseMutation(body);
  if (!input.ok) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const limited = await enforceRateLimits(req, auth.id, input.action);
  if (limited) return limited;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("cafe_set_reservation_server", {
      p_actor_id: auth.id,
      p_slug: input.slug,
      p_action: input.action,
      p_expected_version: input.expectedVersion,
      p_request_id: input.requestId,
    });

    if (error) {
      console.error("[cafe/reservations] mutation failed", { code: error.code });
      return NextResponse.json({ ok: false, error: "cafe_unavailable" }, { status: 503 });
    }

    const result = (data ?? {}) as { ok?: boolean; code?: string };
    if (result.ok === false) {
      const status =
        result.code === "version_conflict" ? 409 :
        result.code === "capacity_full" || result.code === "reservation_limit" ? 409 :
        result.code === "session_unavailable" ? 409 :
        result.code === "invalid_request" ? 400 : 409;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[cafe/reservations] unexpected mutation failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "cafe_unavailable" }, { status: 503 });
  }
}
