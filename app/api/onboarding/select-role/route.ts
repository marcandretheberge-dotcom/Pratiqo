import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mergeOnboardingRoleConfirmedDashboard } from "@/lib/auth/onboardingRoleChoice";

export const runtime = "nodejs";

type SelectableRole = "student" | "teacher";

function parseRole(value: unknown): SelectableRole | null {
  if (value === "student" || value === "teacher") return value;
  return null;
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
  const role = parseRole(body.role);
  if (!role) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role, dashboard")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  if (profile?.role === "admin") {
    return NextResponse.json({ error: "Admin profiles cannot be changed through role selection." }, { status: 403 });
  }

  if (profile?.role === "teacher" && role === "student") {
    return NextResponse.json(
      { error: "Existing teacher accounts cannot switch to learner through this screen." },
      { status: 403 },
    );
  }

  const dashboard = mergeOnboardingRoleConfirmedDashboard(
    (profile as { dashboard?: unknown } | null)?.dashboard,
  );

  if (profile) {
    const { error: updateErr } = await admin
      .from("profiles")
      .update({ role, dashboard })
      .eq("id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  } else {
    const { error: insertErr } = await admin.from("profiles").insert({
      id: user.id,
      email: user.email ?? "",
      role,
      dashboard,
      companion_chosen: false,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, role });
}
