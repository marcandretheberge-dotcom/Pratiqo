import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";

export const runtime = "nodejs";

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

export async function PATCH(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { is_public?: unknown };
  if (typeof body.is_public !== "boolean") {
    return NextResponse.json({ error: "is_public boolean is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const [{ data: teacher, error: teacherErr }, { data: profile }] = await Promise.all([
    admin
      .from("teachers")
      .select("id,country_code")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin.from("profiles").select("country_code").eq("id", user.id).maybeSingle(),
  ]);

  if (teacherErr || !teacher?.id) {
    return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  }

  const teacherCountryCode =
    (teacher as { country_code?: string | null }).country_code ??
    (profile as { country_code?: string | null } | null)?.country_code ??
    "";
  if (body.is_public && !isTeacherMarketSupported(teacherCountryCode)) {
    return NextResponse.json(marketNotSupportedPayload(teacherCountryCode), { status: 403 });
  }

  const { error } = await admin
    .from("teachers")
    .update({
      is_public: body.is_public,
      deactivated_at: body.is_public ? null : new Date().toISOString(),
    })
    .eq("id", (teacher as { id: string }).id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, is_public: body.is_public });
}
