import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacherId" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: tErr } = await admin
    .from("teachers")
    .select("id, user_id")
    .eq("id", teacherId)
    .maybeSingle();

  if (tErr || !teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const userId = (teacher as { user_id?: string | null }).user_id ?? null;
  if (!userId) {
    return NextResponse.json({ plan: "free" });
  }

  const { data: prof } = await admin.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const raw = String((prof as { plan?: string | null } | null)?.plan || "free").toLowerCase();
  const plan = raw === "enterprise" ? "enterprise" : raw === "pro" ? "pro" : "free";
  return NextResponse.json({ plan });
}

