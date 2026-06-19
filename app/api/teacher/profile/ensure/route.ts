import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureTeacherProfileRow } from "@/lib/teachers/ensureTeacherProfileRow";

export const runtime = "nodejs";

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

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role, name, photo_url, country_code")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const role = (profile as { role?: string | null } | null)?.role;
  if (role !== "teacher") {
    return NextResponse.json({ error: "Teacher profile setup requires role=teacher." }, { status: 403 });
  }

  const { result, error } = await ensureTeacherProfileRow(admin, user.id, {
    name: (profile as { name?: string | null } | null)?.name,
    photo_url: (profile as { photo_url?: string | null } | null)?.photo_url,
    country_code: (profile as { country_code?: string | null } | null)?.country_code,
  });

  if (error || !result) {
    console.error("[api/teacher/profile/ensure] ensureTeacherProfileRow failed", error);
    return NextResponse.json({ error: "teacher_profile_ensure_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, teacherId: result.teacherId, created: result.created });
}
