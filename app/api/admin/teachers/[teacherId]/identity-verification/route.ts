// Admin → Manual teacher identity verification
//
//   POST /api/admin/teachers/:teacherId/identity-verification
//     Body: { action: "verify_manually" | "clear_manual_verification", note?: string }
//
// What this endpoint does NOT do:
//   - It never reads, writes, or imports Stripe SDKs.
//   - It never sets stripe_identity_status / stripe_identity_session_id.
//   - It never accepts a client-supplied admin user id.
//   - It never exposes the internal note on public teacher projections.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { insertAdminAuditLog } from "@/lib/admin/auditLog";
import {
  sanitizeManualIdentityVerificationNote,
} from "@/lib/teachers/identity";
import { isUuidString } from "@/lib/uuid";

export const runtime = "nodejs";

type Params = { params: Promise<{ teacherId: string }> };

type IdentityAction = "verify_manually" | "clear_manual_verification";

type TeacherIdentityRow = {
  id: string;
  user_id: string | null;
  identity_verified_manually: boolean | null;
  identity_verified_manually_at: string | null;
  identity_verified_manually_by: string | null;
  stripe_identity_status: string | null;
};

function isIdentityAction(value: unknown): value is IdentityAction {
  return value === "verify_manually" || value === "clear_manual_verification";
}

export async function POST(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { teacherId } = await ctx.params;
  if (!teacherId?.trim() || !isUuidString(teacherId)) {
    return NextResponse.json({ error: "Identifiant professeur invalide." }, { status: 400 });
  }

  let body: { action?: unknown; note?: unknown; actorId?: unknown; adminId?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (!isIdentityAction(body.action)) {
    return NextResponse.json(
      { error: "Action inconnue.", allowedActions: ["verify_manually", "clear_manual_verification"] },
      { status: 400 },
    );
  }

  // Client-supplied actor ids are ignored. The authenticated admin is the source of truth.
  void body.actorId;
  void body.adminId;

  const { data: teacherData, error: teacherErr } = await admin
    .from("teachers")
    .select(
      "id, user_id, identity_verified_manually, identity_verified_manually_at, identity_verified_manually_by, stripe_identity_status",
    )
    .eq("id", teacherId)
    .maybeSingle();

  if (teacherErr) {
    console.error("[admin/identity-verification] load failed", teacherErr.message);
    return NextResponse.json({ error: teacherErr.message }, { status: 500 });
  }
  const teacher = teacherData as TeacherIdentityRow | null;
  if (!teacher) {
    return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
  }

  const note = sanitizeManualIdentityVerificationNote(body.note);
  const nowIso = new Date().toISOString();
  const previousManual = Boolean(teacher.identity_verified_manually);
  const verifying = body.action === "verify_manually";

  const { error: updateErr } = await admin
    .from("teachers")
    .update({
      identity_verified_manually: verifying,
      identity_verified_manually_at: verifying ? nowIso : null,
      identity_verified_manually_by: verifying ? actor.id : null,
      identity_manual_verification_note: note,
      updated_at: nowIso,
    })
    .eq("id", teacherId);

  if (updateErr) {
    console.error("[admin/identity-verification] update failed", updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await insertAdminAuditLog(admin, {
    actorProfileId: actor.id,
    action: verifying ? "admin_manual_identity_verify" : "admin_manual_identity_clear",
    targetType: "teacher",
    targetId: teacherId,
    metadata: {
      teacher_id: teacherId,
      teacher_user_id: teacher.user_id,
      previous_manual_verified: previousManual,
      new_manual_verified: verifying,
      stripe_identity_status: teacher.stripe_identity_status,
      note_present: Boolean(note),
    },
  });

  console.log(
    `[admin/identity-verification] ${body.action} actor=${actor.id} teacher=${teacherId}`,
  );

  return NextResponse.json({
    ok: true,
    action: body.action,
    identity_verified_manually: verifying,
    identity_verified_manually_at: verifying ? nowIso : null,
    identity_verified_manually_by: verifying ? actor.id : null,
    stripe_identity_status: teacher.stripe_identity_status,
  });
}
