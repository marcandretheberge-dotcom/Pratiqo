import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { authenticateSrsRequest } from "@/lib/yo/srs/srsRouteAuth";

export const dailyResponse = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function dailyAccount(req: Request) {
  if (process.env.YO_DAILY_SERVER_ENABLED !== "true") {
    return { ok: false, response: dailyResponse({ error: "Not found" }, 404) } as const;
  }
  const auth = await authenticateSrsRequest(req);
  if (!auth.ok) return { ok: false, response: dailyResponse({ error: auth.error }, auth.status) } as const;
  let admin: ReturnType<typeof getSupabaseAdmin>;
  try { admin = getSupabaseAdmin(); }
  catch { return { ok: false, response: dailyResponse({ error: "Daily activity unavailable" }, 503) } as const; }
  const { data: profile, error } = await admin.from("profiles").select("timezone").eq("id", auth.user.id).maybeSingle();
  if (error) return { ok: false, response: dailyResponse({ error: "Daily activity unavailable" }, 503) } as const;
  return { ok: true, admin, account: { p_user_id: auth.user.id, p_timezone: profile?.timezone ?? "America/Toronto" } } as const;
}

export async function readDaily({ admin, account }: Extract<Awaited<ReturnType<typeof dailyAccount>>, { ok: true }>) {
  const { data, error } = await admin.rpc("yo_daily_read", account);
  if (error || !data || typeof data.today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.today)
    || !Number.isSafeInteger(data.exercises) || data.exercises < 0
    || !Number.isSafeInteger(data.xpToday) || data.xpToday < 0
    || (data.goal !== null && (!Number.isInteger(data.goal) || data.goal < 1 || data.goal > 50))
    || !data.completed || typeof data.completed !== "object" || Array.isArray(data.completed)
    || !Array.isArray(data.earned) || !data.earned.every((id: unknown) => typeof id === "string")) return null;
  return data as { today: string; exercises: number; xpToday: number; goal: number | null;
    completed: Partial<Record<"mission" | "trivia", string>>; earned: string[] };

}
