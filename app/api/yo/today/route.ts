import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { DAILY_EXERCISE_TARGET, dailyStreak } from "@/lib/yo/daily/today";
import { authenticateSrsRequest } from "@/lib/yo/srs/srsRouteAuth";

export const runtime = "nodejs";
const noStore = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: Request) {
  const auth = await authenticateSrsRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { ...noStore, status: auth.status });
  const admin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("timezone").eq("id", auth.user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Progress unavailable" }, { ...noStore, status: 503 });
  const { data: raw, error } = await admin.rpc("yo_daily_read", {
    p_user_id: auth.user.id,
    p_timezone: profile?.timezone ?? "America/Toronto",
  });
  const data: unknown = raw;
  if (error || !data || typeof data !== "object" ||
      !("today" in data) || typeof data.today !== "string" ||
      !("exercises" in data) || typeof data.exercises !== "number" ||
      !("activeDays" in data) || !Array.isArray(data.activeDays) ||
      !data.activeDays.every(day => typeof day === "string")) {
    return NextResponse.json({ error: "Progress unavailable" }, { ...noStore, status: 503 });
  }
  return NextResponse.json({
    exercises: data.exercises,
    target: DAILY_EXERCISE_TARGET,
    streak: dailyStreak(data.activeDays, data.today),
  }, noStore);
}
