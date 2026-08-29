// Admin → Teacher primary discipline correction
//
//   PATCH /api/admin/users/:id/teacher-discipline
//     Body: { disciplineId: "langues" | "musique" | ... }
//
// Updates the public source of truth used by search/cards:
//   - teachers.discipline
//   - teachers.category
//   - primary teacher_disciplines row (upsert)
//
// Does NOT touch Stripe, visibility/opt-out, auth, schedule, or pricing.

import { NextResponse } from "next/server";
import { requireAdminApi, insertAdminRoleChangeAudit } from "@/lib/auth/admin";
import {
  isAdminTeacherDisciplineId,
  resolveAdminDisciplineUpdate,
} from "@/lib/teachers/adminDiscipline";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide.", code: "invalid_payload" }, { status: 400 });
  }

  const disciplineIdRaw =
    body && typeof body === "object" && "disciplineId" in body
      ? (body as { disciplineId?: unknown }).disciplineId
      : undefined;

  if (!isAdminTeacherDisciplineId(disciplineIdRaw)) {
    return NextResponse.json(
      { error: "Discipline invalide.", code: "invalid_discipline" },
      { status: 400 },
    );
  }

  const resolved = resolveAdminDisciplineUpdate(disciplineIdRaw);
  if (!resolved) {
    return NextResponse.json(
      { error: "Discipline invalide.", code: "invalid_discipline" },
      { status: 400 },
    );
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("id", targetId)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message, code: "server_error" }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Utilisateur introuvable.", code: "not_found" }, { status: 404 });
  }
  const profileRow = profile as { id: string; role: string | null; email: string | null };
  if (profileRow.role !== "teacher") {
    return NextResponse.json(
      { error: "La discipline ne s'applique qu'aux comptes enseignants.", code: "not_teacher" },
      { status: 400 },
    );
  }

  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id, discipline, category")
    .eq("user_id", targetId)
    .maybeSingle();
  if (teacherErr) {
    return NextResponse.json({ error: teacherErr.message, code: "server_error" }, { status: 500 });
  }
  if (!teacher?.id) {
    return NextResponse.json(
      { error: "Profil professeur introuvable.", code: "teacher_not_found" },
      { status: 404 },
    );
  }

  const previous = {
    discipline: (teacher as { discipline?: string | null }).discipline ?? null,
    category: (teacher as { category?: string | null }).category ?? null,
  };

  const { error: updateErr } = await admin
    .from("teachers")
    .update({
      discipline: resolved.disciplineLabel,
      category: resolved.category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teacher.id);
  if (updateErr) {
    console.warn("[admin/teacher-discipline] teacher_update_failed", { code: updateErr.code });
    return NextResponse.json({ error: updateErr.message, code: "server_error" }, { status: 500 });
  }

  const { data: existingDisc } = await admin
    .from("teacher_disciplines")
    .select("id, discipline_id, sort_order")
    .eq("teacher_id", teacher.id)
    .order("sort_order", { ascending: true })
    .limit(1);

  const first = Array.isArray(existingDisc) && existingDisc.length > 0 ? existingDisc[0] : null;
  if (first && typeof (first as { id?: string }).id === "string") {
    const { error: discErr } = await admin
      .from("teacher_disciplines")
      .update({
        discipline_id: resolved.disciplineId,
        specialite: null,
      })
      .eq("id", (first as { id: string }).id);
    if (discErr) {
      console.warn("[admin/teacher-discipline] discipline_row_update_failed", { code: discErr.code });
    }
  } else {
    const { error: insErr } = await admin.from("teacher_disciplines").insert({
      teacher_id: teacher.id,
      discipline_id: resolved.disciplineId,
      specialite: null,
      sort_order: 0,
    });
    if (insErr) {
      console.warn("[admin/teacher-discipline] discipline_row_insert_failed", { code: insErr.code });
    }
  }

  await insertAdminRoleChangeAudit(admin, {
    actorId: actor.id,
    actorEmail: actor.email ?? null,
    targetId,
    targetEmail: profileRow.email,
    previousRole: "teacher",
    newRole: "teacher",
    reason: `teacher-discipline:${previous.category ?? ""}:${previous.discipline ?? ""}→${resolved.category}:${resolved.disciplineId}`,
    source: "admin/users/teacher-discipline",
  });

  return NextResponse.json({
    ok: true,
    disciplineId: resolved.disciplineId,
    discipline: resolved.disciplineLabel,
    category: resolved.category,
  });
}
