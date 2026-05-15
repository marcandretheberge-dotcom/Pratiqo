import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseAnon";

export const runtime = "edge";

/**
 * Single teacher marketplace plan tier lookup.
 * Reads from teacher_public_marketplace_metadata via anon client (no service role).
 * Kept for backwards compatibility; the public teacher profile page now reads
 * public_plan_tier directly from teachers_public and no longer calls this endpoint.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacherId" }, { status: 400 });
  }

  const db = getSupabaseAnon();
  const { data } = await db
    .from("teacher_public_marketplace_metadata")
    .select("public_plan_tier")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  const tier = (data as { public_plan_tier?: string } | null)?.public_plan_tier ?? "free";
  return NextResponse.json({ plan: tier });
}
