import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "edge";

function normalizePlan(p: string | null | undefined): string {
  const raw = String(p || "free").toLowerCase();
  if (raw === "enterprise") return "enterprise";
  if (raw === "pro") return "pro";
  return "free";
}

/** Batch lookup of teacher marketplace plans (admin). Used by Explore — only exposes plan tier. */
export async function GET(req: Request) {
  const idsParam = new URL(req.url).searchParams.get("ids");
  const ids = idsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (!ids.length) {
    return NextResponse.json({ plans: {} as Record<string, string> });
  }

  const admin = getSupabaseAdmin();
  const { data: teachers, error } = await admin.from("teachers").select("id, user_id").in("id", ids);
  if (error || !teachers?.length) {
    return NextResponse.json({ plans: Object.fromEntries(ids.map((id) => [id, "free"])) });
  }

  const userIds = [...new Set(teachers.map((t) => (t as { user_id?: string | null }).user_id).filter(Boolean))] as string[];
  let planByUserId: Record<string, string> = {};
  if (userIds.length) {
    const { data: profiles } = await admin.from("profiles").select("id, plan").in("id", userIds);
    for (const row of profiles ?? []) {
      const id = (row as { id: string }).id;
      planByUserId[id] = normalizePlan((row as { plan?: string | null }).plan);
    }
  }

  const plans: Record<string, string> = {};
  for (const id of ids) {
    plans[id] = "free";
  }
  for (const t of teachers) {
    const row = t as { id: string; user_id?: string | null };
    const uid = row.user_id;
    plans[row.id] = uid ? (planByUserId[uid] ?? "free") : "free";
  }

  return NextResponse.json({ plans });
}
