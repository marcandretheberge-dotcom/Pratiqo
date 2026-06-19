import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";
import { ensureTeacherProfileRow } from "@/lib/teachers/ensureTeacherProfileRow";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";
import { buildTeacherOnboardingUpdate } from "@/lib/teachers/onboardingCompletePayload";

export const runtime = "nodejs";

function requireAck(value: unknown): boolean {
  return value === true;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function trimStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

type ProfileMeta = {
  role?: string | null;
  dashboard?: unknown;
} | null;

export async function POST(req: Request) {
  let stage = "auth";
  try {
    return await handlePost(req, (next) => {
      stage = next;
    });
  } catch (err) {
    console.error("[api/teacher/onboarding/complete] unexpected error", {
      stage,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "teacher_onboarding_unexpected_error" }, { status: 500 });
  }
}

async function handlePost(req: Request, setStage: (stage: string) => void) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Missing Supabase env." }, { status: 500 });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authErr,
  } = await supabaseUser.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (
    !requireAck(body.tax_status_acknowledged) ||
    !requireAck(body.no_exclusivity_acknowledged) ||
    !requireAck(body.no_income_guarantee_acknowledged)
  ) {
    return NextResponse.json({ error: "Missing required teacher acknowledgements." }, { status: 400 });
  }

  // Validate price if provided (null/undefined is allowed for drafts, but if set must be >= minimum)
  const priceRaw = body.price_per_lesson;
  const price = priceRaw != null ? Number(priceRaw) : null;
  if (price !== null && (isNaN(price) || price < MIN_LESSON_PRICE_DOLLARS)) {
    return NextResponse.json(
      { error: `Le tarif minimum par leçon est de ${MIN_LESSON_PRICE_DOLLARS} $.` },
      { status: 400 },
    );
  }

  setStage("load-profile-meta");
  const admin = getSupabaseAdmin();

  // Block admin profiles
  const { data: profileMetaRow, error: profileMetaErr } = await admin
    .from("profiles")
    .select("role, dashboard")
    .eq("id", user.id)
    .maybeSingle();

  if (profileMetaErr) {
    console.error("[api/teacher/onboarding/complete] load-profile-meta failed", {
      userIdPresent: Boolean(user.id),
      code: profileMetaErr.code,
      message: profileMetaErr.message,
    });
    return NextResponse.json({ error: "teacher_onboarding_profile_load_failed" }, { status: 500 });
  }
  let profileMeta = profileMetaRow as ProfileMeta;

  if (!profileMeta) {
    setStage("teacher_onboarding_profile_repair_failed");
    const nameHint = trimStr(body.name) ?? trimStr(user.user_metadata?.full_name) ?? "Professeur";
    const { data: repairedProfile, error: repairErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          name: nameHint,
          role: "teacher",
          teacher_onboarding_complete: false,
          companion_chosen: false,
          dashboard: { teacher_onboarding_complete: false },
        },
        { onConflict: "id" },
      )
      .select("role, dashboard")
      .single();

    if (repairErr || !repairedProfile) {
      console.error("[api/teacher/onboarding/complete] profile repair failed", {
        userIdPresent: Boolean(user.id),
        code: repairErr?.code ?? null,
        message: repairErr?.message ?? null,
        details: repairErr?.details ?? null,
        hint: repairErr?.hint ?? null,
      });
      return NextResponse.json({ error: "teacher_onboarding_profile_repair_failed" }, { status: 500 });
    }
    profileMeta = repairedProfile as ProfileMeta;
  }

  const profileRole = typeof profileMeta?.role === "string" ? profileMeta.role : null;
  if (profileRole === "admin") {
    return NextResponse.json({ error: "Admin profiles cannot complete teacher onboarding here." }, { status: 403 });
  }
  if (profileRole !== "teacher") {
    return NextResponse.json({ error: "teacher_onboarding_requires_teacher_role" }, { status: 403 });
  }

  // Market check
  const countryCode = trimStr(body.country_code);
  if (countryCode && !isTeacherMarketSupported(countryCode)) {
    return NextResponse.json(marketNotSupportedPayload(countryCode), { status: 403 });
  }

  // Ensure teacher draft row exists (idempotent, admin-only)
  setStage("teacher_profile_ensure_failed");
  const nameHint = trimStr(body.name);
  const ensured = await ensureTeacherProfileRow(admin, user.id, {
    name: nameHint,
    photo_url: null,
  });
  if (ensured.error || !ensured.result) {
    console.error("[api/teacher/onboarding/complete] ensureTeacherProfileRow failed", {
      userIdPresent: Boolean(user.id),
      message: ensured.error,
    });
    return NextResponse.json({ error: "teacher_profile_ensure_failed" }, { status: 500 });
  }
  const teacherId = ensured.result.teacherId;

  setStage("teacher_onboarding_update_failed");
  const teacherUpdate = buildTeacherOnboardingUpdate(body);

  if (Object.keys(teacherUpdate).length > 0) {
    const { error: teacherUpdateErr } = await admin
      .from("teachers")
      .update(teacherUpdate)
      .eq("id", teacherId);
    if (teacherUpdateErr) {
      console.error("[api/teacher/onboarding/complete] teacher row update failed", {
        userIdPresent: Boolean(user.id),
        teacherIdPresent: Boolean(teacherId),
        code: teacherUpdateErr.code,
        message: teacherUpdateErr.message,
        details: teacherUpdateErr.details,
        hint: teacherUpdateErr.hint,
        payloadKeys: Object.keys(teacherUpdate),
        pricePerLesson: teacherUpdate.price_per_lesson ?? null,
        homeLessonPrice: teacherUpdate.home_lesson_price ?? null,
      });
      return NextResponse.json({ error: "teacher_onboarding_update_failed" }, { status: 500 });
    }
  }

  // Mark profile as onboarding-complete. The teachers row already exists by
  // this point (ensure + update above), so this failure must use its own
  // error code rather than the earlier stage's. Retrying is safe — ensure
  // and the teacher update above are idempotent.
  setStage("teacher_profile_completion_failed");
  const now = new Date().toISOString();
  const currentDashboard = asObject(profileMeta?.dashboard);
  const nextDashboard = { ...currentDashboard, teacher_onboarding_complete: true };

  const { data: updatedRows, error: updateErr } = await admin
    .from("profiles")
    .update({
      role: "teacher",
      teacher_onboarding_complete: true,
      tax_status_acknowledged: true,
      tax_status_acknowledged_at: now,
      no_exclusivity_acknowledged: true,
      no_income_guarantee_acknowledged: true,
      dashboard: nextDashboard,
    })
    .eq("id", user.id)
    .select("id");

  if (updateErr) {
    console.error("[api/teacher/onboarding/complete] profile completion update failed", {
      userIdPresent: Boolean(user.id),
      teacherIdPresent: Boolean(teacherId),
      code: updateErr.code,
      message: updateErr.message,
      details: updateErr.details,
      hint: updateErr.hint,
    });
    return NextResponse.json({ error: "teacher_profile_completion_failed" }, { status: 500 });
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[api/teacher/onboarding/complete] profile completion found no matching row", {
      userIdPresent: Boolean(user.id),
      teacherIdPresent: Boolean(teacherId),
    });
    return NextResponse.json({ error: "teacher_profile_completion_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
