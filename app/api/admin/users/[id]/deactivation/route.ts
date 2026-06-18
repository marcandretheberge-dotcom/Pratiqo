// Admin → profile deactivation / visibility API
//
//   GET  /api/admin/users/:id/deactivation
//     Returns a safe snapshot of profile + teacher visibility state.
//
//   POST /api/admin/users/:id/deactivation
//     Body: { action, reason? }
//       - deactivate                 — hide from public surfaces + deactivate account
//       - remove_public_teacher      — teacher-only marketplace/SEO removal (login kept)
//       - mark_deletion_requested    — deactivate + set deletion_requested_at
//       - reactivate                 — reverse deactivation when safe
//
// Guardrails:
//   - requireAdminApi() mandatory
//   - never deletes bookings, payments, Stripe records, or auth users
//   - never writes profiles.role, plan, subscription_status, or Stripe columns
//   - audits every mutation via admin_role_change_audit

import { NextResponse } from "next/server";
import { requireAdminApi, insertAdminRoleChangeAudit } from "@/lib/auth/admin";
import {
  adminDeactivateProfile,
  adminReactivateProfile,
  adminRemovePublicTeacherProfile,
  auditReasonForAction,
  isProfileReactivationAllowed,
  loadProfileDeactivationSnapshot,
  type ProfileDeactivationAction,
} from "@/lib/admin/profileDeactivation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_ACTIONS = new Set<ProfileDeactivationAction>([
  "deactivate",
  "reactivate",
  "mark_deletion_requested",
  "remove_public_teacher",
]);

function parseAction(value: unknown): ProfileDeactivationAction | null {
  return typeof value === "string" && ALLOWED_ACTIONS.has(value as ProfileDeactivationAction)
    ? (value as ProfileDeactivationAction)
    : null;
}

export async function GET(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  const snapshot = await loadProfileDeactivationSnapshot(admin, targetId);
  if (!snapshot) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    snapshot,
    canReactivate: isProfileReactivationAllowed(snapshot),
  });
}

export async function POST(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  if (targetId === actor.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas modifier votre propre compte depuis cette page." },
      { status: 400 },
    );
  }

  let body: { action?: unknown; reason?: unknown } | null;
  try {
    body = (await req.json()) as { action?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const action = parseAction(body?.action);
  if (!action) {
    return NextResponse.json(
      {
        error: "Action invalide.",
        allowedActions: Array.from(ALLOWED_ACTIONS),
      },
      { status: 400 },
    );
  }

  const reason = typeof body?.reason === "string" ? body.reason : null;

  const snapshot = await loadProfileDeactivationSnapshot(admin, targetId);
  if (!snapshot) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  }

  if (snapshot.role === "admin") {
    return NextResponse.json(
      { error: "Les comptes administrateur ne peuvent pas être désactivés depuis cette interface." },
      { status: 403 },
    );
  }

  if (action === "remove_public_teacher" && snapshot.role !== "teacher") {
    return NextResponse.json(
      { error: "Cette action ne s'applique qu'aux comptes enseignants." },
      { status: 400 },
    );
  }

  if (action === "reactivate") {
    if (!isProfileReactivationAllowed(snapshot)) {
      return NextResponse.json(
        { error: "Ce profil ne peut pas être réactivé (supprimé ou anonymisé)." },
        { status: 400 },
      );
    }
    await adminReactivateProfile(admin, targetId);
  } else if (action === "deactivate") {
    await adminDeactivateProfile(admin, targetId);
  } else if (action === "mark_deletion_requested") {
    await adminDeactivateProfile(admin, targetId, { markDeletionRequested: true });
  } else if (action === "remove_public_teacher") {
    await adminRemovePublicTeacherProfile(admin, targetId);
  }

  const { data: profileEmailRow } = await admin
    .from("profiles")
    .select("email, role")
    .eq("id", targetId)
    .maybeSingle();

  const targetRole = (profileEmailRow as { role?: string } | null)?.role ?? snapshot.role;

  await insertAdminRoleChangeAudit(admin, {
    actorId: actor.id,
    actorEmail: actor.email,
    targetId,
    targetEmail: (profileEmailRow as { email?: string | null } | null)?.email ?? null,
    previousRole: targetRole === "admin" || targetRole === "teacher" || targetRole === "student" ? targetRole : "student",
    newRole: targetRole === "admin" || targetRole === "teacher" || targetRole === "student" ? targetRole : "student",
    reason: auditReasonForAction(action, reason),
    source: "admin/users/deactivation",
  });

  const updated = await loadProfileDeactivationSnapshot(admin, targetId);

  return NextResponse.json({
    ok: true,
    action,
    snapshot: updated,
    canReactivate: updated ? isProfileReactivationAllowed(updated) : false,
  });
}
