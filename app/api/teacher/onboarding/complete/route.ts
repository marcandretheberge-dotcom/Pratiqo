import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";
import { ensureTeacherProfileRow } from "@/lib/teachers/ensureTeacherProfileRow";

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
    const ensured = await ensureTeacherProfileRow(admin, user.id);
    if (ensured.error || !ensured.result) {
      return NextResponse.json(
        { error: ensured.error ?? "Unable to create teacher profile." },
        { status: 500 },
      );
    }
    const { data: refetched } = await admin
      .from("teachers")
      .select("id, country_code")
      .eq("user_id", user.id)
      .maybeSingle();
    teacherRow = refetched;
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
