// Admin → Users management API
//
//   GET  /api/admin/users           → paginated list of profiles for the admin UI
//   PATCH /api/admin/users          → server-side, admin-only role change
//
// Security model (defense in depth):
//   1. Caller must present a valid Supabase JWT (Authorization: Bearer …).
//   2. requireAdminApi() looks up profiles.role with the service-role client
//      and rejects anyone whose role is not "admin".
//   3. PATCH additionally:
//        - validates target role against ADMIN_ASSIGNABLE_ROLES,
//        - forbids the acting admin from changing their OWN role
//          (prevents self-demotion + accidental self-promotion drift),
//        - writes an append-only row to public.admin_role_change_audit
//          BEFORE returning success.
//   4. Migration 061 (profiles_guard_role_escalation_trigger) is the
//      database-side backstop: any non-service-role JWT that somehow
//      reaches this table directly cannot escalate to admin.

import { NextResponse } from "next/server";
import {
  ADMIN_ASSIGNABLE_ROLES,
  insertAdminRoleChangeAudit,
  isAssignableRole,
  requireAdminApi,
  type ProfileRole,
} from "@/lib/auth/admin";
import {
  diagnoseTeacherSearchVisibility,
  type TeacherSearchVisibilityBlockerCode,
  type TeacherSearchVisibilityReasonCode,
  type TeacherSearchVisibilityWarningCode,
} from "@/lib/teachers/searchVisibilityDiagnostics";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 250;

type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: ProfileRole;
  created_at: string | null;
  updated_at: string | null;
  teacher_onboarding_complete: boolean | null;
  teacher_id: string | null;
  teacher_is_public: boolean | null;
  teacher_search_visible: boolean | null;
  teacher_search_visibility_reasons: TeacherSearchVisibilityReasonCode[];
  teacher_search_visibility_blockers: TeacherSearchVisibilityBlockerCode[];
  teacher_search_visibility_warnings: TeacherSearchVisibilityWarningCode[];
  companion_chosen: boolean | null;
  deletion_requested_at: string | null;
  is_self: boolean;
};

type AdminProfileRow = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  teacher_onboarding_complete?: boolean | null;
  companion_chosen?: boolean | null;
  deletion_requested_at?: string | null;
  is_active?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  anonymized_at?: string | null;
};

type AdminTeacherVisibilityRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  discipline: string | null;
  category: string | null;
  bio: string | null;
  availability: unknown;
  price_per_lesson: number | string | null;
  teaching_mode: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  location: unknown;
  is_public: boolean | null;
  is_demo: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  identity_verified: boolean | null;
  intro_session_enabled: boolean | null;
  intro_session_price_cents: number | string | null;
};

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: adminUser } = auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.trunc(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  // We deliberately do NOT support arbitrary order params from the client;
  // newest-first is the only mode the UI exposes today and the column has
  // an index. Locking it down here means an admin can't accidentally write
  // a query that scans the whole table from the URL bar.
  let query = admin
    .from("profiles")
    .select(
      "id, email, name, role, created_at, updated_at, teacher_onboarding_complete, companion_chosen, deletion_requested_at, is_active, deactivated_at, deleted_at, anonymized_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search) {
    // Case-insensitive partial match on email + display name. We escape `%`
    // and `,` because the PostgREST `or` filter is comma-separated and uses
    // them as wildcards. Without this, an admin pasting an email like
    // "foo,bar@x" would silently fan out into two filters.
    const safe = search.replace(/[%,]/g, " ").replace(/\s+/g, " ").trim();
    query = query.or(`email.ilike.%${safe}%,name.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/users] GET failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profileRows = (data ?? []) as AdminProfileRow[];
  const teacherProfileIds = profileRows
    .filter((row) => row.role === "teacher")
    .map((row) => row.id);

  const teacherByUserId = new Map<string, AdminTeacherVisibilityRow>();
  const publicTeacherIds = new Set<string>();
  const disciplineCountByTeacherId = new Map<string, number>();

  if (teacherProfileIds.length > 0) {
    const [teachersResult, publicResult] = await Promise.all([
      admin
        .from("teachers")
        .select(
          "id, user_id, name, discipline, category, bio, availability, price_per_lesson, teaching_mode, city, region, country_code, location, is_public, is_demo, deactivated_at, deleted_at, identity_verified, intro_session_enabled, intro_session_price_cents",
        )
        .in("user_id", teacherProfileIds),
      admin.from("teachers_public").select("id, user_id").in("user_id", teacherProfileIds),
    ]);

    if (teachersResult.error) {
      console.error("[admin/users] teacher visibility load failed", teachersResult.error.message);
    }
    if (publicResult.error) {
      console.error("[admin/users] teachers_public visibility load failed", publicResult.error.message);
    }

    const teacherRows = (teachersResult.data ?? []) as AdminTeacherVisibilityRow[];
    for (const teacher of teacherRows) {
      if (teacher.user_id) teacherByUserId.set(teacher.user_id, teacher);
    }
    for (const row of (publicResult.data ?? []) as Array<{ id?: string | null }>) {
      if (row.id) publicTeacherIds.add(row.id);
    }

    const teacherIds = teacherRows.map((row) => row.id).filter(Boolean);
    if (teacherIds.length > 0) {
      const { data: disciplineRows, error: disciplineErr } = await admin
        .from("teacher_disciplines")
        .select("teacher_id")
        .in("teacher_id", teacherIds);

      if (disciplineErr) {
        console.error("[admin/users] teacher discipline count load failed", disciplineErr.message);
      }
      for (const row of (disciplineRows ?? []) as Array<{ teacher_id?: string | null }>) {
        if (!row.teacher_id) continue;
        disciplineCountByTeacherId.set(row.teacher_id, (disciplineCountByTeacherId.get(row.teacher_id) ?? 0) + 1);
      }
    }
  }

  const rows: AdminUserRow[] = profileRows.map((r) => {
    const role = (isAssignableRole(r.role) ? r.role : "student") as ProfileRole;
    const teacher = role === "teacher" ? teacherByUserId.get(r.id) ?? null : null;
    const searchDiagnosis =
      role === "teacher"
        ? diagnoseTeacherSearchVisibility({
            profile: {
              id: r.id,
              role,
              teacher_onboarding_complete: r.teacher_onboarding_complete,
              is_active: r.is_active,
              deactivated_at: r.deactivated_at,
              deleted_at: r.deleted_at,
              anonymized_at: r.anonymized_at,
            },
            teacher,
            disciplineCount: teacher?.id ? disciplineCountByTeacherId.get(teacher.id) ?? 0 : 0,
            inTeachersPublicView: teacher?.id ? publicTeacherIds.has(teacher.id) : false,
          })
        : null;

    return {
      id: r.id,
      email: r.email ?? null,
      name: r.name ?? null,
      role,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
      teacher_onboarding_complete: r.teacher_onboarding_complete ?? null,
      teacher_id: teacher?.id ?? null,
      teacher_is_public: teacher?.is_public ?? null,
      teacher_search_visible: searchDiagnosis?.visibleInSearch ?? null,
      teacher_search_visibility_reasons: searchDiagnosis?.reasonCodes ?? [],
      teacher_search_visibility_blockers: searchDiagnosis?.blockingReasonCodes ?? [],
      teacher_search_visibility_warnings: searchDiagnosis?.warningReasonCodes ?? [],
      companion_chosen: r.companion_chosen ?? null,
      deletion_requested_at: r.deletion_requested_at ?? null,
      is_self: r.id === adminUser.id,
    };
  });

  return NextResponse.json({
    users: rows,
    limit,
    allowedRoles: Array.from(ADMIN_ASSIGNABLE_ROLES),
  });
}

type PatchBody = {
  targetId?: string;
  role?: string;
  reason?: string;
};

export async function PATCH(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: adminUser } = auth;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const targetId = body.targetId?.trim();
  if (!targetId) {
    return NextResponse.json({ error: "targetId requis." }, { status: 400 });
  }

  if (!isAssignableRole(body.role)) {
    return NextResponse.json(
      {
        error: "Rôle invalide.",
        allowedRoles: Array.from(ADMIN_ASSIGNABLE_ROLES),
      },
      { status: 400 },
    );
  }
  const nextRole = body.role;

  // Hard self-mutation guard: an admin cannot change their own role through
  // this surface. This blocks BOTH self-demotion (the brief's named risk)
  // AND any accidental "let me try this on myself first" promotion attempt.
  // Removing one's own admin role through Supabase Studio remains possible
  // for emergency recovery; the database-side trigger from migration 061
  // continues to apply there.
  if (targetId === adminUser.id) {
    return NextResponse.json(
      { error: "Un admin ne peut pas modifier son propre rôle ici. Utilise un autre admin." },
      { status: 400 },
    );
  }

  const { data: target, error: readErr } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", targetId)
    .maybeSingle();

  if (readErr) {
    console.error("[admin/users] PATCH target read failed", readErr.message);
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  const targetRow = target as { id: string; email: string | null; role: string | null };
  const previousRole = targetRow.role;

  if (previousRole === nextRole) {
    return NextResponse.json({
      ok: true,
      unchanged: true,
      role: nextRole,
    });
  }

  const { error: updateErr } = await admin
    .from("profiles")
    .update({ role: nextRole, updated_at: new Date().toISOString() })
    .eq("id", targetId);

  if (updateErr) {
    console.error("[admin/users] PATCH update failed", updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await insertAdminRoleChangeAudit(admin, {
    actorId: adminUser.id,
    actorEmail: adminUser.email,
    targetId: targetRow.id,
    targetEmail: targetRow.email,
    previousRole,
    newRole: nextRole,
    reason: body.reason ?? null,
    source: "admin/users",
  });

  console.log(
    `[admin/users] role change actor=${adminUser.id} target=${targetRow.id} ${previousRole ?? "?"}->${nextRole}`,
  );

  return NextResponse.json({ ok: true, role: nextRole, previousRole });
}
