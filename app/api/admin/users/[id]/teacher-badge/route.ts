// Admin → Teacher trust badge API
//
//   POST   /api/admin/users/:id/teacher-badge
//     Body: { badge: "verified_experience" }
//     Activates the admin-controlled trust badge for the target teacher.
//
//   DELETE /api/admin/users/:id/teacher-badge
//     Body or query: { badge: "verified_experience" }
//     Deactivates the badge.
//
// What this endpoint does NOT do (intentional):
//   - It never reads, writes, or imports Stripe SDKs.
//   - It never touches `profiles.plan`, `profiles.subscription_status`,
//     `profiles.role`, `teachers.is_verified`, `teachers.identity_verified`,
//     `teachers.diploma_verified`, or any payment/Stripe column.
//   - It never grants the badge automatically from uploaded diplomas or
//     CVs — the product rule is "admin controls public trust badges".
//   - It does not change teacher search ranking; only the badge boolean
//     flips.
//
// Guardrails:
//   1. requireAdminApi() — admin JWT mandatory; non-admins get 403.
//   2. The badge key is matched against a strict ALLOWED_BADGES set;
//      anything else returns 400 without touching the DB.
//   3. Writes go through the service-role client so the
//      `teachers_preserve_sensitive_client_fields` trigger (migrations
//      069 + 081) does NOT pin the value back to OLD — but a
//      compromised teacher session still can't flip it themselves.
//   4. Every toggle inserts a row in `admin_role_change_audit` with
//      `source = "admin/users/teacher-badge"`. The teacher's `profiles.role`
//      is unchanged (previous_role === new_role === "teacher").

import { NextResponse } from "next/server";
import { requireAdminApi, insertAdminRoleChangeAudit } from "@/lib/auth/admin";
import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };
type AdminClient = ReturnType<typeof getSupabaseAdmin>;

// The admin-controlled badge taxonomy. Add a new entry here when the
// founder wants a new admin-toggled trust badge. Every entry maps a
// stable badge key to the boolean column on public.teachers and to the
// audit metadata column pair. Keep this list narrow — any column added
// here is admin-mutable from this route.
type BadgeKey = "verified_experience";

type BadgeBinding = {
  activeColumn: string;
  setAtColumn: string;
  setByColumn: string;
};

const ALLOWED_BADGES: Record<BadgeKey, BadgeBinding> = {
  verified_experience: {
    activeColumn: "verified_experience_active",
    setAtColumn: "verified_experience_set_at",
    setByColumn: "verified_experience_set_by",
  },
};

function isAllowedBadge(value: unknown): value is BadgeKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ALLOWED_BADGES, value);
}

async function readBadgeKey(req: Request): Promise<BadgeKey | null> {
  // Accept the badge key from either the JSON body (POST/DELETE) or the
  // `?badge=` query param (DELETE convenience). Anything else is a 400.
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("badge");
  if (isAllowedBadge(fromQuery)) return fromQuery;

  try {
    const body = (await req.json()) as { badge?: unknown } | null;
    if (body && isAllowedBadge(body.badge)) return body.badge;
  } catch {
    // empty / invalid JSON body is acceptable for DELETE with query.
  }
  return null;
}

async function loadTargetTeacher(admin: AdminClient, targetId: string) {
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("id", targetId)
    .maybeSingle();
  if (profileErr) {
    return { ok: false as const, status: 500, error: profileErr.message };
  }
  const row = profile as { id: string; role: string | null; email: string | null } | null;
  if (!row) return { ok: false as const, status: 404, error: "Utilisateur introuvable." };
  if (row.role !== "teacher") {
    return {
      ok: false as const,
      status: 400,
      error: "Les badges professeur ne s'appliquent qu'aux comptes enseignants.",
    };
  }
  return { ok: true as const, profile: row };
}

export async function POST(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  const badge = await readBadgeKey(req);
  if (!badge) {
    return NextResponse.json(
      {
        error: "Badge inconnu.",
        allowedBadges: Object.keys(ALLOWED_BADGES),
      },
      { status: 400 },
    );
  }
  const binding = ALLOWED_BADGES[badge];

  const target = await loadTargetTeacher(admin, targetId);
  if (!target.ok) return NextResponse.json({ error: target.error }, { status: target.status });

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("teachers")
    .update({
      [binding.activeColumn]: true,
      [binding.setAtColumn]: nowIso,
      [binding.setByColumn]: actor.id,
      updated_at: nowIso,
    })
    .eq("user_id", targetId);

  if (updateErr) {
    console.error("[admin/teacher-badge] activate failed", updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await insertAdminRoleChangeAudit(admin, {
    actorId: actor.id,
    actorEmail: actor.email,
    targetId,
    targetEmail: target.profile.email,
    previousRole: "teacher",
    newRole: "teacher",
    reason: `teacher-badge:${badge}:activate`,
    source: "admin/users/teacher-badge",
  });

  console.log(
    `[admin/teacher-badge] activate actor=${actor.id} target=${targetId} badge=${badge}`,
  );

  return NextResponse.json({
    ok: true,
    badge,
    active: true,
    set_at: nowIso,
    set_by: actor.id,
  });
}

export async function DELETE(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  const badge = await readBadgeKey(req);
  if (!badge) {
    return NextResponse.json(
      {
        error: "Badge inconnu.",
        allowedBadges: Object.keys(ALLOWED_BADGES),
      },
      { status: 400 },
    );
  }
  const binding = ALLOWED_BADGES[badge];

  const target = await loadTargetTeacher(admin, targetId);
  if (!target.ok) return NextResponse.json({ error: target.error }, { status: target.status });

  const nowIso = new Date().toISOString();
  // We intentionally clear the audit metadata back to NULL on revocation
  // so the public boolean is the only thing the public can ever see, and
  // the historical actor/timestamp lives in admin_role_change_audit.
  const { error: updateErr } = await admin
    .from("teachers")
    .update({
      [binding.activeColumn]: false,
      [binding.setAtColumn]: null,
      [binding.setByColumn]: null,
      updated_at: nowIso,
    })
    .eq("user_id", targetId);

  if (updateErr) {
    console.error("[admin/teacher-badge] deactivate failed", updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await insertAdminRoleChangeAudit(admin, {
    actorId: actor.id,
    actorEmail: actor.email,
    targetId,
    targetEmail: target.profile.email,
    previousRole: "teacher",
    newRole: "teacher",
    reason: `teacher-badge:${badge}:deactivate`,
    source: "admin/users/teacher-badge",
  });

  console.log(
    `[admin/teacher-badge] deactivate actor=${actor.id} target=${targetId} badge=${badge}`,
  );

  return NextResponse.json({
    ok: true,
    badge,
    active: false,
  });
}
