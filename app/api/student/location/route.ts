import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeStudentLocation, type StudentLocationPayload } from "@/lib/studentLocation";

export const runtime = "nodejs";

// Saved student location is private. Storage lives in
// public.student_private_locations which is owner-only via RLS (migration 073).
// We deliberately do NOT use the service-role admin client for the mutation:
// the JWT-scoped client lets RLS enforce ownership as a second line of
// defense in case a future refactor weakens the .eq("user_id", user.id) clause.

export async function PATCH(req: Request) {
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

  const body = (await req.json().catch(() => ({}))) as StudentLocationPayload;

  if (body.clear === true || body.location === null) {
    const { error } = await supabaseUser
      .from("student_private_locations")
      .delete()
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, location: null });
  }

  let location;
  try {
    location = normalizeStudentLocation(body.location ?? body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid location." },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabaseUser
    .from("student_private_locations")
    .upsert(
      { user_id: user.id, location, updated_at: nowIso },
      { onConflict: "user_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, location });
}
