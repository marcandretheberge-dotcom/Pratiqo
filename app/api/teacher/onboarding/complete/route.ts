import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";

export const runtime = "nodejs";

function requireAck(value: unknown): boolean {
  return value === true;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function POST(req: Request) {
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

  const admin = getSupabaseAdmin();

  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id,country_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr) {
    return NextResponse.json({ error: teacherErr.message }, { status: 500 });
  }

  let teacherRow = teacher;

  if (!teacherRow?.id) {
    const { data: profileForTeacher, error: profileLookupErr } = await admin
      .from("profiles")
      .select("name, photo_url, country_code")
      .eq("id", user.id)
      .maybeSingle();

    if (profileLookupErr) {
      return NextResponse.json({ error: profileLookupErr.message }, { status: 500 });
    }

    const teacherName =
      typeof profileForTeacher?.name === "string" && profileForTeacher.name.trim()
        ? profileForTeacher.name.trim()
        : "Professeur";
    const imageUrl =
      typeof profileForTeacher?.photo_url === "string" && profileForTeacher.photo_url.trim()
        ? profileForTeacher.photo_url.trim()
        : "https://picsum.photos/seed/teacher/400/400";

    const { data: createdTeacher, error: createErr } = await admin
      .from("teachers")
      .insert({
        id: user.id,
        user_id: user.id,
        name: teacherName,
        discipline: "—",
        category: "music",
        rating: 0,
        reviews: 0,
        price_per_lesson: 0,
        bio: "",
        image_url: imageUrl,
        availability: [],
        location: {},
        is_verified: false,
        teaching_mode: "both",
        languages: [],
        levels: [],
        country_code:
          typeof profileForTeacher?.country_code === "string" ? profileForTeacher.country_code : null,
      })
      .select("id, country_code")
      .single();

    if (createErr || !createdTeacher?.id) {
      return NextResponse.json(
        { error: createErr?.message ?? "Unable to create teacher profile." },
        { status: 500 },
      );
    }
    teacherRow = createdTeacher;
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role,dashboard,country_code")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  if (profile?.role === "admin") {
    return NextResponse.json({ error: "Admin profiles cannot complete teacher onboarding here." }, { status: 403 });
  }

  const teacherCountryCode =
    (teacherRow as { country_code?: string | null } | null)?.country_code ??
    (profile as { country_code?: string | null } | null)?.country_code ??
    "";
  if (!isTeacherMarketSupported(teacherCountryCode)) {
    return NextResponse.json(marketNotSupportedPayload(teacherCountryCode), { status: 403 });
  }

  const now = new Date().toISOString();
  const currentDashboard = asObject(profile?.dashboard);
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
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
