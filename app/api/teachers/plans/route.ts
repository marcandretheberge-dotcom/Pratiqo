import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabaseAnon";

export const runtime = "edge";

/**
 * Batch lookup of teacher marketplace plan tiers.
 * Reads from teacher_public_marketplace_metadata via anon client (no service role).
 * Kept for backwards compatibility; marketplace pages now read public_plan_tier
 * directly from teachers_public and no longer call this endpoint.
 */
export async function GET(req: Request) {
  const idsParam = new URL(req.url).searchParams.get("ids");
  const ids = idsParam
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  if (!ids.length) {
    return NextResponse.json({ plans: {} as Record<string, string> });
  }

  const db = getSupabaseAnon();
  const { data, error } = await db
    .from("teacher_public_marketplace_metadata")
    .select("teacher_id, public_plan_tier")
    .in("teacher_id", ids);

  const plans: Record<string, string> = Object.fromEntries(ids.map((id) => [id, "free"]));

  if (!error && data) {
    for (const row of data as { teacher_id: string; public_plan_tier: string }[]) {
      plans[row.teacher_id] = row.public_plan_tier ?? "free";
    }
  }

  return NextResponse.json({ plans });
}
