import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTeacherListingCapabilities } from "@/lib/teachers/listingBookability";
import { guidedBookingState } from "@/lib/teachers/guidedSetup";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error } = await auth.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const admin = getSupabaseAdmin();
    const own = await admin.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
    if (own.error) throw new Error("teacher_lookup_failed");
    if (!own.data) return NextResponse.json({ error: "teacher_required" }, { status: 404 });
    const visible = await admin.from("teachers_public").select("id").eq("id", own.data.id).maybeSingle();
    if (visible.error) throw new Error("visibility_lookup_failed");
    const capabilities = visible.data ? await getTeacherListingCapabilities(admin, [own.data.id]) : {};
    return NextResponse.json({ state: guidedBookingState(capabilities[own.data.id] ?? null, Boolean(visible.data)) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "setup_status_unavailable" }, { status: 503 });
  }
}
