// Admin → teacher SEO profile publication
//
//   GET  /api/admin/users/:id/teacher-seo-publish
//   POST /api/admin/users/:id/teacher-seo-publish  { action: publish | unpublish | hide_marketplace | request_corrections }

import { NextResponse } from "next/server";
import { requireAdminApi, insertAdminRoleChangeAudit } from "@/lib/auth/admin";
import {
  collectTeacherSeoAdminPublishBlockers,
  evaluateTeacherSeoPublication,
} from "@/lib/seo/teacherSeoPublication";
import {
  fetchTeacherSeoPublicationRowByUserId,
} from "@/lib/seo/teacherPublicProfileData";
import { isTeacherPublicProfileIndexable } from "@/lib/seo/teacherPublicProfile";
import { resolveEmailLocaleForTeacher } from "@/lib/email/locale";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type AdminSeoAction = "publish" | "unpublish" | "hide_marketplace" | "request_corrections";

const ALLOWED_ACTIONS = new Set<AdminSeoAction>([
  "publish",
  "unpublish",
  "hide_marketplace",
  "request_corrections",
]);

function parseAction(value: unknown): AdminSeoAction | null {
  return typeof value === "string" && ALLOWED_ACTIONS.has(value as AdminSeoAction)
    ? (value as AdminSeoAction)
    : null;
}

export async function GET(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;

  const { id: targetUserId } = await ctx.params;
  if (!targetUserId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  const row = await fetchTeacherSeoPublicationRowByUserId(targetUserId);
  if (!row) {
    return NextResponse.json({ error: "Profil enseignant introuvable." }, { status: 404 });
  }

  const locale = await resolveEmailLocaleForTeacher(admin, targetUserId);
  const evaluation = evaluateTeacherSeoPublication(row, locale);

  return NextResponse.json({ evaluation, teacherId: row.id });
}

export async function POST(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id: targetUserId } = await ctx.params;
  if (!targetUserId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  let body: { action?: unknown } | null;
  try {
    body = (await req.json()) as { action?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const action = parseAction(body?.action);
  if (!action) {
    return NextResponse.json(
      { error: "Action invalide.", allowedActions: Array.from(ALLOWED_ACTIONS) },
      { status: 400 },
    );
  }

  const row = await fetchTeacherSeoPublicationRowByUserId(targetUserId);
  if (!row) {
    return NextResponse.json({ error: "Profil enseignant introuvable." }, { status: 404 });
  }

  const locale = await resolveEmailLocaleForTeacher(admin, targetUserId);

  if (action === "publish") {
    const blockers = collectTeacherSeoAdminPublishBlockers(row);
    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error: "publish_blocked",
          adminPublishBlockers: blockers,
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("teachers")
      .update({
        is_public: true,
        public_profile_enabled: true,
        search_indexing_consent: true,
        public_profile_last_indexable_at: now,
      })
      .eq("id", row.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (action === "unpublish") {
    const { error } = await admin
      .from("teachers")
      .update({
        public_profile_last_indexable_at: null,
      })
      .eq("id", row.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (action === "hide_marketplace") {
    const { error } = await admin
      .from("teachers")
      .update({
        is_public: false,
      })
      .eq("id", row.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("teachers")
      .update({
        is_public: false,
        public_profile_enabled: false,
        search_indexing_consent: false,
        public_profile_last_indexable_at: null,
      })
      .eq("id", row.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: profileEmailRow } = await admin
    .from("profiles")
    .select("email, role")
    .eq("id", targetUserId)
    .maybeSingle();

  const targetRole = (profileEmailRow as { role?: string } | null)?.role ?? "teacher";

  await insertAdminRoleChangeAudit(admin, {
    actorId: actor.id,
    actorEmail: actor.email,
    targetId: targetUserId,
    targetEmail: (profileEmailRow as { email?: string | null } | null)?.email ?? null,
    previousRole: targetRole === "admin" || targetRole === "teacher" || targetRole === "student" ? targetRole : "teacher",
    newRole: targetRole === "admin" || targetRole === "teacher" || targetRole === "student" ? targetRole : "teacher",
    reason: `teacher_seo_${action}`,
    source: "admin/users/teacher-seo-publish",
  });

  const refreshed = await fetchTeacherSeoPublicationRowByUserId(targetUserId);
  const evaluation = refreshed ? evaluateTeacherSeoPublication(refreshed, locale) : null;
  const indexable = refreshed ? isTeacherPublicProfileIndexable(refreshed) : false;

  return NextResponse.json({
    ok: true,
    action,
    evaluation,
    indexable,
  });
}
