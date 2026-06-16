// Admin → Teacher onboarding support API
//
//   GET   /api/admin/users/:id/teacher-onboarding
//     Returns the safe support snapshot:
//       - the teacher row's price/duration/home-lesson fields
//       - the effective hourly rate for the current configuration
//       - whether the 20 $ minimum check currently passes
//       - the list of missing/blocking fields
//
//   PATCH /api/admin/users/:id/teacher-onboarding
//     Allows an admin to repair a stuck onboarding by setting ONLY the
//     three safe fields involved in the minimum-rate blocker:
//       - price_per_lesson           (CAD/hour)
//       - home_lesson_price          (CAD/hour; null clears it)
//       - default_lesson_duration_minutes
//     (`home_lesson_enabled` is intentionally NOT editable here — the
//     teacher decides whether they offer at-home lessons. Admins
//     repair stuck data, they don't change the teacher's offer.)
//
// Hard guardrails enforced by this route:
//   1. requireAdminApi() — admin JWT mandatory; non-admins get 403.
//   2. Server-side `validateTeacherLessonOffers` on the merged row
//      so a correction can NEVER persist a teacher below the 20 $
//      minimum, even from an admin.
//   3. Never writes profiles.role, profiles.plan,
//      profiles.subscription_status, profiles.teacher_onboarding_complete,
//      teachers.is_verified, teachers.stripe_*, or any payment-related
//      column. Only the three safe support fields above.
//   4. Never writes Stripe / payment / founder-promo data.
//   5. Logs to admin_role_change_audit with source="admin/users/teacher-onboarding"
//      so the support action is traceable alongside role changes.

import { NextResponse } from "next/server";
import { requireAdminApi, insertAdminRoleChangeAudit } from "@/lib/auth/admin";
import {
  validateTeacherLessonOffers,
  type TeacherLessonOfferInput,
} from "@/lib/pricing/lessonOffer";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";
import {
  LESSON_DURATION_OPTIONS,
  normalizeLessonDurationMinutes,
} from "@/lib/pricing/lessonDuration";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type TeacherSupportRow = {
  id: string;
  user_id: string;
  price_per_lesson: number | string | null;
  home_lesson_enabled: boolean | null;
  home_lesson_price: number | string | null;
  home_lesson_min_duration: number | null;
  default_lesson_duration_minutes: number | null;
  intro_session_enabled: boolean | null;
  intro_session_price_cents: number | string | null;
  intro_session_duration_minutes: number | string | null;
  intro_session_discount_percent: number | string | null;
};

const HOME_LESSON_HOURLY_RATE_MAX_CAD = 500;

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function computeEffectiveRate(row: TeacherSupportRow) {
  const standardHourly = toPositiveNumber(row.price_per_lesson);
  const standardCents = standardHourly ? Math.round(standardHourly * 100) : 0;

  const homeHourly =
    row.home_lesson_enabled === true
      ? toPositiveNumber(row.home_lesson_price) ?? standardHourly
      : null;
  const minHomeMinutes = Number(row.home_lesson_min_duration ?? 60);
  const safeMinutes =
    Number.isFinite(minHomeMinutes) && minHomeMinutes > 0 ? minHomeMinutes : 60;
  const homeCents = homeHourly ? Math.round(homeHourly * 100 * (safeMinutes / 60)) : 0;

  return {
    standardHourly,
    standardCents,
    homeHourly,
    homeCents,
    defaultDurationMinutes: row.default_lesson_duration_minutes ?? 60,
  };
}

function diagnose(row: TeacherSupportRow) {
  const eff = computeEffectiveRate(row);
  const offer: TeacherLessonOfferInput = {
    price_per_lesson: row.price_per_lesson,
    home_lesson_enabled: row.home_lesson_enabled,
    home_lesson_price: row.home_lesson_price,
    home_lesson_min_duration: row.home_lesson_min_duration,
    intro_session_enabled: row.intro_session_enabled,
    intro_session_price_cents: row.intro_session_price_cents,
    intro_session_duration_minutes: row.intro_session_duration_minutes,
    intro_session_discount_percent: row.intro_session_discount_percent,
  };
  const check = validateTeacherLessonOffers(offer);

  const missing: string[] = [];
  if (!eff.standardHourly) missing.push("price_per_lesson");
  if (row.home_lesson_enabled === true && !toPositiveNumber(row.home_lesson_price)) {
    // Wizard now defaults this; legacy/incomplete rows may still miss it.
    missing.push("home_lesson_price");
  }
  if (!row.default_lesson_duration_minutes) missing.push("default_lesson_duration_minutes");

  return {
    minimumPassed: check.ok,
    minimumDollars: MIN_LESSON_PRICE_DOLLARS,
    effective: eff,
    missingFields: missing,
  };
}

export async function GET(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== "teacher") {
    // We don't 404 here — admins reviewing a non-teacher should see an
    // explicit "n/a" so they don't conflate "no teacher profile" with
    // "permission denied".
    return NextResponse.json({
      isTeacher: false,
      teacher: null,
      diagnosis: null,
    });
  }

  const { data: teacher, error } = await admin
    .from("teachers")
    .select(
      "id, user_id, price_per_lesson, home_lesson_enabled, home_lesson_price, home_lesson_min_duration, default_lesson_duration_minutes, intro_session_enabled, intro_session_price_cents, intro_session_duration_minutes, intro_session_discount_percent",
    )
    .eq("user_id", targetId)
    .maybeSingle();

  if (error) {
    console.error(
      "[admin/users/:id/teacher-onboarding] GET teacher load failed",
      error.message,
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!teacher) {
    return NextResponse.json({
      isTeacher: true,
      teacher: null,
      diagnosis: null,
    });
  }

  const row = teacher as TeacherSupportRow;
  return NextResponse.json({
    isTeacher: true,
    teacher: {
      id: row.id,
      price_per_lesson: row.price_per_lesson,
      home_lesson_enabled: row.home_lesson_enabled,
      home_lesson_price: row.home_lesson_price,
      home_lesson_min_duration: row.home_lesson_min_duration,
      default_lesson_duration_minutes: row.default_lesson_duration_minutes,
    },
    diagnosis: diagnose(row),
    durationOptions: LESSON_DURATION_OPTIONS as readonly number[],
    minimumHourlyRate: MIN_LESSON_PRICE_DOLLARS,
  });
}

type PatchBody = Partial<{
  price_per_lesson: number | string | null;
  home_lesson_price: number | string | null;
  default_lesson_duration_minutes: number | string;
}>;

export async function PATCH(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id: targetId } = await ctx.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  }

  let body: PatchBody | null;
  try {
    body = (await req.json()) as PatchBody | null;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const ALLOWED = new Set([
    "price_per_lesson",
    "home_lesson_price",
    "default_lesson_duration_minutes",
  ]);
  const rejected = Object.keys(body).filter((k) => !ALLOWED.has(k));
  if (rejected.length > 0) {
    return NextResponse.json(
      {
        error: `Champs non éditables ici: ${rejected.join(", ")}.`,
        allowedFields: Array.from(ALLOWED),
      },
      { status: 400 },
    );
  }

  const { data: teacher, error: loadErr } = await admin
    .from("teachers")
    .select(
      "id, user_id, price_per_lesson, home_lesson_enabled, home_lesson_price, home_lesson_min_duration, default_lesson_duration_minutes, intro_session_enabled, intro_session_price_cents, intro_session_duration_minutes, intro_session_discount_percent",
    )
    .eq("user_id", targetId)
    .maybeSingle();
  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!teacher) {
    return NextResponse.json({ error: "Profil enseignant introuvable." }, { status: 404 });
  }

  const current = teacher as TeacherSupportRow;
  const updates: Record<string, unknown> = {};

  if ("price_per_lesson" in body) {
    const next = toPositiveNumber(body.price_per_lesson);
    if (next == null) {
      return NextResponse.json(
        { error: "Tarif horaire invalide (doit être un nombre positif)." },
        { status: 400 },
      );
    }
    if (next > HOME_LESSON_HOURLY_RATE_MAX_CAD) {
      return NextResponse.json(
        { error: `Tarif horaire trop élevé (max ${HOME_LESSON_HOURLY_RATE_MAX_CAD} $/h).` },
        { status: 400 },
      );
    }
    updates.price_per_lesson = next;
  }

  if ("home_lesson_price" in body) {
    const raw = body.home_lesson_price;
    if (raw === null) {
      updates.home_lesson_price = null;
    } else {
      const next = toPositiveNumber(raw);
      if (next == null) {
        return NextResponse.json(
          { error: "Tarif à domicile invalide (doit être un nombre positif ou null)." },
          { status: 400 },
        );
      }
      if (next > HOME_LESSON_HOURLY_RATE_MAX_CAD) {
        return NextResponse.json(
          { error: `Tarif à domicile trop élevé (max ${HOME_LESSON_HOURLY_RATE_MAX_CAD} $/h).` },
          { status: 400 },
        );
      }
      updates.home_lesson_price = next;
    }
  }

  if ("default_lesson_duration_minutes" in body) {
    const minutes = normalizeLessonDurationMinutes(body.default_lesson_duration_minutes);
    const allowed = LESSON_DURATION_OPTIONS as readonly number[];
    if (!allowed.includes(minutes)) {
      return NextResponse.json(
        { error: `Durée invalide. Valeurs autorisées: ${allowed.join(", ")}.` },
        { status: 400 },
      );
    }
    updates.default_lesson_duration_minutes = minutes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  // Re-validate the merged row against the canonical minimum-rate
  // helper so admins cannot accidentally persist a sub-20 $ effective
  // session. This is the same helper enforced at checkout and in
  // /api/teacher/pricing; using it here guarantees the floor.
  const mergedPrice =
    "price_per_lesson" in updates
      ? (updates.price_per_lesson as number)
      : current.price_per_lesson;
  const mergedHomePrice =
    "home_lesson_price" in updates
      ? (updates.home_lesson_price as number | null)
      : current.home_lesson_price;
  const merged: TeacherLessonOfferInput = {
    price_per_lesson: mergedPrice,
    home_lesson_enabled: current.home_lesson_enabled,
    home_lesson_price: mergedHomePrice,
    home_lesson_min_duration: current.home_lesson_min_duration,
    intro_session_enabled: current.intro_session_enabled,
    intro_session_price_cents: current.intro_session_price_cents,
    intro_session_duration_minutes: current.intro_session_duration_minutes,
    intro_session_discount_percent: current.intro_session_discount_percent,
  };
  const check = validateTeacherLessonOffers(merged);
  if (!check.ok) {
    return NextResponse.json(
      {
        error: `La configuration résultante reste sous le minimum requis de ${MIN_LESSON_PRICE_DOLLARS} $.`,
        code: "minimum_lesson_price",
      },
      { status: 400 },
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await admin
    .from("teachers")
    .update(updates)
    .eq("id", current.id)
    .select(
      "id, price_per_lesson, home_lesson_enabled, home_lesson_price, home_lesson_min_duration, default_lesson_duration_minutes, intro_session_enabled, intro_session_price_cents, intro_session_duration_minutes, intro_session_discount_percent, user_id",
    )
    .maybeSingle();
  if (updateErr || !updated) {
    return NextResponse.json(
      { error: updateErr?.message ?? "Mise à jour impossible." },
      { status: 500 },
    );
  }

  // Reuse the existing admin role-change audit table for traceability.
  // We log with previous_role===new_role and source identifies this as
  // a teacher-onboarding support action (not an actual role change).
  // The reason captures which fields were touched.
  await insertAdminRoleChangeAudit(admin, {
    actorId: actor.id,
    actorEmail: actor.email,
    targetId,
    targetEmail: null,
    previousRole: "teacher",
    newRole: "teacher",
    reason: `teacher-onboarding-support: ${Object.keys(updates)
      .filter((k) => k !== "updated_at")
      .join(", ")}`,
    source: "admin/users/teacher-onboarding",
  });

  return NextResponse.json({
    ok: true,
    teacher: {
      id: (updated as TeacherSupportRow).id,
      price_per_lesson: (updated as TeacherSupportRow).price_per_lesson,
      home_lesson_enabled: (updated as TeacherSupportRow).home_lesson_enabled,
      home_lesson_price: (updated as TeacherSupportRow).home_lesson_price,
      home_lesson_min_duration: (updated as TeacherSupportRow).home_lesson_min_duration,
      default_lesson_duration_minutes: (updated as TeacherSupportRow)
        .default_lesson_duration_minutes,
    },
    diagnosis: diagnose(updated as TeacherSupportRow),
  });
}
