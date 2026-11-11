import { NextResponse } from "next/server";
import { isCafeV1Enabled } from "@/lib/cafe/featureFlag";
import { requireAdminApi } from "@/lib/auth/admin";

export const runtime = "nodejs";

function cafeDisabled() {
  return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RFC3339_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().replace(/\s+/g, " ");
  return v && v.length <= max ? v : null;
}

function finiteIsoTimestamp(value: unknown): string | null {
  const v = clean(value, 80);
  if (!v) return null;
  if (!RFC3339_RE.test(v)) return null;
  const parsed = Date.parse(v);
  if (!Number.isFinite(parsed)) return null;
  return v;
}

export async function POST(req: Request) {
  if (!isCafeV1Enabled()) return cafeDisabled();
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const action = body.action;
  const slug = clean(body.slug, 120)?.toLowerCase() ?? "";
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
  }

  let rpcName: string;
  let args: Record<string, unknown>;

  if (action === "create") {
    const title = clean(body.title, 120);
    const primaryLanguage = clean(body.primaryLanguage, 40);
    const practiceLanguage = body.practiceLanguage == null ? null : clean(body.practiceLanguage, 40);
    const level = body.level == null ? null : clean(body.level, 40);
    const startsAt = finiteIsoTimestamp(body.startsAt);
    const durationMinutes = Number(body.durationMinutes);
    const maxParticipants = Number(body.maxParticipants);
    const hostProfileId = body.hostProfileId == null ? null : clean(body.hostProfileId, 80);

    if (
      !title || !primaryLanguage || !startsAt ||
      !Number.isSafeInteger(durationMinutes) ||
      !Number.isSafeInteger(maxParticipants) ||
      (hostProfileId !== null && !UUID_RE.test(hostProfileId))
    ) {
      return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
    }

    rpcName = "cafe_admin_create_draft_server";
    args = {
      p_actor_id: auth.user.id,
      p_slug: slug,
      p_title: title,
      p_primary_language: primaryLanguage,
      p_practice_language: practiceLanguage,
      p_level: level,
      p_starts_at: startsAt,
      p_duration_minutes: durationMinutes,
      p_max_participants: maxParticipants,
      p_host_profile_id: hostProfileId,
    };
  } else if (action === "publish") {
    rpcName = "cafe_admin_publish_server";
    args = { p_actor_id: auth.user.id, p_slug: slug };
  } else if (action === "cancel") {
    rpcName = "cafe_admin_cancel_server";
    args = { p_actor_id: auth.user.id, p_slug: slug };
  } else if (action === "reassign_host") {
    const hostProfileId = clean(body.hostProfileId, 80);
    if (!hostProfileId || !UUID_RE.test(hostProfileId)) {
      return NextResponse.json({ ok: false, error: "invalid_host" }, { status: 400 });
    }
    rpcName = "cafe_admin_reassign_host_server";
    args = {
      p_actor_id: auth.user.id,
      p_slug: slug,
      p_host_profile_id: hostProfileId,
    };
  } else {
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  try {
    const { data, error } = await auth.admin.rpc(rpcName, args);
    if (error) {
      console.error("[admin/cafe] rpc failed", { action, code: error.code });
      return NextResponse.json({ ok: false, error: "cafe_admin_unavailable" }, { status: 503 });
    }
    const result = (data ?? {}) as { ok?: boolean; code?: string };
    return NextResponse.json(result, { status: result.ok === false ? 409 : 200 });
  } catch (error) {
    console.error("[admin/cafe] unexpected failure", {
      action,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "cafe_admin_unavailable" }, { status: 503 });
  }
}
