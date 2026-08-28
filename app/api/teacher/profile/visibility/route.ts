import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";
import { evaluateTeacherProfilePublishEligibility } from "@/lib/teachers/profilePublishEligibility";
import { isIdentityVerificationFailed } from "@/lib/teachers/identityPublishGate";
import { t as translate } from "@/lib/i18n/server";
import { resolveEmailLocaleForUser } from "@/lib/email/locale";

export const runtime = "nodejs";

type VisibilityAction = "publish" | "unpublish";

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { user: null, error: "Missing Authorization bearer token." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { user: null, error: "Missing Supabase env." };

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(token);
  if (error || !user) return { user: null, error: "Invalid or expired session." };
  return { user, error: null };
}

type TeacherVisibilityRow = {
  id: string;
  user_id: string;
  name: string | null;
  bio: string | null;
  price_per_lesson: number | null;
  availability: unknown[] | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  is_public: boolean | null;
  marketplace_discovery_opt_out: boolean | null;
  is_demo: boolean | null;
  deactivated_at: string | null;
  deleted_at: string | null;
  identity_verified: boolean | null;
  stripe_identity_failed_reason: string | null;
};

async function loadTeacherVisibilityContext(admin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const [{ data: teacher, error: teacherErr }, { data: profile }] = await Promise.all([
    admin
      .from("teachers")
      .select(
        "id, user_id, name, bio, price_per_lesson, availability, city, region, country_code, is_public, marketplace_discovery_opt_out, is_demo, deactivated_at, deleted_at, identity_verified, stripe_identity_failed_reason",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("role, country_code, is_active, deactivated_at, deleted_at, anonymized_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (teacherErr || !teacher?.id) {
    return { error: "teacher_not_found" as const, teacher: null, profile: null, disciplineCount: 0 };
  }

  const { count } = await admin
    .from("teacher_disciplines")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacher.id);

  return {
    error: null,
    teacher: teacher as TeacherVisibilityRow,
    profile: profile as {
      role?: string | null;
      country_code?: string | null;
      is_active?: boolean | null;
      deactivated_at?: string | null;
      deleted_at?: string | null;
      anonymized_at?: string | null;
    } | null,
    disciplineCount: count ?? 0,
  };
}

function buildEvaluation(
  teacher: TeacherVisibilityRow,
  profile: {
    country_code?: string | null;
    is_active?: boolean | null;
    deactivated_at?: string | null;
    deleted_at?: string | null;
    anonymized_at?: string | null;
  } | null,
  disciplineCount: number,
) {
  const countryCode = teacher.country_code ?? profile?.country_code ?? "";
  return evaluateTeacherProfilePublishEligibility({
    id: teacher.id,
    user_id: teacher.user_id,
    name: teacher.name,
    bio: teacher.bio,
    disciplineCount,
    price_per_lesson: teacher.price_per_lesson,
    availability: teacher.availability,
    city: teacher.city,
    region: teacher.region,
    country_code: countryCode,
    is_public: teacher.is_public,
    marketplace_discovery_opt_out: teacher.marketplace_discovery_opt_out,
    is_demo: teacher.is_demo,
    deactivated_at: teacher.deactivated_at,
    deleted_at: teacher.deleted_at,
    identity_verification_failed: isIdentityVerificationFailed({
      identity_verified: teacher.identity_verified,
      stripe_identity_failed_reason: teacher.stripe_identity_failed_reason,
    }),
    profile_is_active: profile?.is_active,
    profile_deactivated_at: profile?.deactivated_at,
    profile_deleted_at: profile?.deleted_at,
    profile_anonymized_at: profile?.anonymized_at,
  });
}

export async function GET(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const loaded = await loadTeacherVisibilityContext(admin, user.id);
  if (loaded.error || !loaded.teacher) {
    return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  }

  if (loaded.profile?.role === "admin") {
    return NextResponse.json({ error: "Admin profiles cannot manage teacher visibility here." }, { status: 403 });
  }
  if (loaded.profile?.role !== "teacher") {
    return NextResponse.json({ error: "Teacher role required." }, { status: 403 });
  }

  const evaluation = buildEvaluation(loaded.teacher, loaded.profile, loaded.disciplineCount);
  return NextResponse.json({
    ok: true,
    is_public: loaded.teacher.is_public === true,
    marketplace_discovery_opt_out: loaded.teacher.marketplace_discovery_opt_out === true,
    ...evaluation,
  });
}

export async function PATCH(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: unknown;
    is_public?: unknown;
  };

  let action: VisibilityAction | null = null;
  if (body.action === "publish" || body.action === "unpublish") {
    action = body.action;
  } else if (typeof body.is_public === "boolean") {
    action = body.is_public ? "publish" : "unpublish";
  }

  if (!action) {
    return NextResponse.json(
      { error: "action must be publish or unpublish.", code: "invalid_action" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const loaded = await loadTeacherVisibilityContext(admin, user.id);
  if (loaded.error || !loaded.teacher) {
    return NextResponse.json({ error: "Teacher profile not found.", code: "teacher_not_found" }, { status: 404 });
  }

  const teacher = loaded.teacher;
  if (loaded.profile?.role === "admin") {
    return NextResponse.json({ error: "Admin profiles cannot manage teacher visibility here." }, { status: 403 });
  }
  if (loaded.profile?.role !== "teacher") {
    return NextResponse.json({ error: "Teacher role required.", code: "forbidden_role" }, { status: 403 });
  }

  const locale = await resolveEmailLocaleForUser(admin, user.id).catch(() => "fr");
  const evaluation = buildEvaluation(teacher, loaded.profile, loaded.disciplineCount);

  if (action === "unpublish") {
    if (!evaluation.canUnpublish) {
      return NextResponse.json(
        {
          error: translate(locale, "teacherProfileUnpublishError"),
          code: "cannot_unpublish",
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("teachers")
      .update({
        is_public: false,
        marketplace_discovery_opt_out: true,
        marketplace_discovery_opt_out_at: now,
        updated_at: now,
      })
      .eq("id", teacher.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[teacher/profile/visibility] unpublish failed", {
        teacherId: teacher.id,
        userId: user.id,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { error: translate(locale, "teacherProfileUnpublishError"), code: "update_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      is_public: false,
      marketplace_discovery_opt_out: true,
      action: "unpublish",
    });
  }

  const countryCode = teacher.country_code ?? loaded.profile?.country_code ?? "";
  if (!isTeacherMarketSupported(countryCode)) {
    return NextResponse.json(marketNotSupportedPayload(countryCode), { status: 403 });
  }

  if (!evaluation.canPublish) {
    console.warn("[teacher/profile/visibility] publish blocked", {
      teacherId: teacher.id,
      userId: user.id,
      status: evaluation.status,
      blockers: evaluation.blockers,
      missingSectionIds: evaluation.missingSectionIds,
    });
    return NextResponse.json(
      {
        error: translate(locale, "teacherProfilePublishBlocked"),
        code: "publish_not_eligible",
        status: evaluation.status,
        missingSectionIds: evaluation.missingSectionIds,
        blockers: evaluation.blockers,
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("teachers")
    .update({
      is_public: true,
      marketplace_discovery_opt_out: false,
      marketplace_discovery_opt_out_at: null,
      updated_at: now,
    })
    .eq("id", teacher.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[teacher/profile/visibility] publish failed", {
      teacherId: teacher.id,
      userId: user.id,
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: translate(locale, "teacherProfilePublishError"), code: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    is_public: true,
    marketplace_discovery_opt_out: false,
    action: "publish",
  });
}
