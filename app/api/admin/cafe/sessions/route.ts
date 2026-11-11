import { NextResponse } from "next/server";
import { isCafeV1Enabled } from "@/lib/cafe/featureFlag";
import { isCafeRoomProviderEnabled } from "@/lib/cafe/roomFeatureFlag";
import {
  CafeRoomCancellationMigrationUnavailableError,
  cancelCafeSessionAndDeleteRoom,
} from "@/lib/cafe/adminRoomCancellation";
import { CafeRoomProviderError } from "@/lib/cafe/roomProvider";
import { requireAdminApi } from "@/lib/auth/admin";
import { parseCafeStartsAt } from "@/lib/cafe/sessionInput";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cafeDisabled() {
  return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
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

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().replace(/\s+/g, " ");
  return v && v.length <= max ? v : null;
}

export async function POST(req: Request) {
  if (!isCafeV1Enabled()) return cafeDisabled();
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return noStoreJson({ ok: false, error: "invalid_request" }, 400);

  const action = body.action;
  const slug = clean(body.slug, 120)?.toLowerCase() ?? "";
  if (!SLUG_RE.test(slug)) {
    return noStoreJson({ ok: false, error: "invalid_slug" }, 400);
  }

  if (action === "cancel") {
    try {
      // Always use the provider-aware path once the migration exists, even if
      // room token issuance has been emergency-disabled. This closes any room
      // created before the rollback flag was switched off.
      const result = await cancelCafeSessionAndDeleteRoom({
        admin: auth.admin,
        actorId: auth.user.id,
        slug,
      });
      return noStoreJson(result, 200);
    } catch (error) {
      if (
        error instanceof CafeRoomCancellationMigrationUnavailableError &&
        !isCafeRoomProviderEnabled()
      ) {
        // Additive deploy compatibility only: before PR3a's migration exists,
        // the provider gate is OFF and no Daily room can have been issued.
      } else if (error instanceof CafeRoomProviderError) {
        const retryAfter = error.retryAfterSeconds ?? 15;
        return noStoreJson(
          {
            ok: false,
            error: error.code === "provider_unavailable"
              ? "provider_cleanup_pending"
              : "cafe_admin_unavailable",
            retryAfter,
          },
          error.code === "provider_unavailable" ? 503 : 500,
          { "Retry-After": String(retryAfter) },
        );
      } else {
        console.error("[admin/cafe] provider cancellation failed", {
          action,
          errorClass: error instanceof Error ? error.name : "unknown",
        });
        return noStoreJson({ ok: false, error: "cafe_admin_unavailable" }, 503);
      }
    }
  }

  let rpcName: string;
  let args: Record<string, unknown>;

  if (action === "create") {
    const title = clean(body.title, 120);
    const primaryLanguage = clean(body.primaryLanguage, 40);
    const practiceLanguage = body.practiceLanguage == null ? null : clean(body.practiceLanguage, 40);
    const level = body.level == null ? null : clean(body.level, 40);
    const startsAt = parseCafeStartsAt(body.startsAt);
    const durationMinutes = Number(body.durationMinutes);
    const maxParticipants = Number(body.maxParticipants);
    const hostProfileId = body.hostProfileId == null ? null : clean(body.hostProfileId, 80);

    if (
      !title || !primaryLanguage || !startsAt ||
      !Number.isSafeInteger(durationMinutes) ||
      !Number.isSafeInteger(maxParticipants) ||
      (hostProfileId !== null && !UUID_RE.test(hostProfileId))
    ) {
      return noStoreJson({ ok: false, error: "invalid_request" }, 400);
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
    // Pre-migration fallback reached only when the provider feature is disabled.
    rpcName = "cafe_admin_cancel_server";
    args = { p_actor_id: auth.user.id, p_slug: slug };
  } else if (action === "reassign_host") {
    const hostProfileId = clean(body.hostProfileId, 80);
    if (!hostProfileId || !UUID_RE.test(hostProfileId)) {
      return noStoreJson({ ok: false, error: "invalid_host" }, 400);
    }
    rpcName = "cafe_admin_reassign_host_server";
    args = {
      p_actor_id: auth.user.id,
      p_slug: slug,
      p_host_profile_id: hostProfileId,
    };
  } else {
    return noStoreJson({ ok: false, error: "invalid_action" }, 400);
  }

  try {
    const { data, error } = await auth.admin.rpc(rpcName, args);
    if (error) {
      console.error("[admin/cafe] rpc failed", { action, code: error.code });
      return noStoreJson({ ok: false, error: "cafe_admin_unavailable" }, 503);
    }
    const result = (data ?? {}) as { ok?: boolean; code?: string };
    return noStoreJson(result, result.ok === false ? 409 : 200);
  } catch (error) {
    console.error("[admin/cafe] unexpected failure", {
      action,
      errorClass: error instanceof Error ? error.name : "unknown",
    });
    return noStoreJson({ ok: false, error: "cafe_admin_unavailable" }, 503);
  }
}
