import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ITALIAN_LANGUAGE } from "@/lib/yo/srs/adapters/italian";
import { authenticateSrsRequest } from "@/lib/yo/srs/srsRouteAuth";

export const runtime = "nodejs";

/**
 * GET /api/yo/srs/due?language=<lang>&limit=20
 *
 * The authenticated user's due SRS items for one language, ordered by
 * next_review_at then item_id (spec §2.4, §2.6 criterion 3). Only the
 * caller's own rows are ever read: the query is pinned to the session
 * user_id, and direct client table access is denied.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateSrsRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const language = url.searchParams.get("language") ?? ITALIAN_LANGUAGE;
  if (language !== ITALIAN_LANGUAGE) {
    return NextResponse.json(
      { error: `unsupported language: ${language}` },
      { status: 400 },
    );
  }
  const rawLimit = Number(url.searchParams.get("limit") ?? 20);
  const limit = Number.isSafeInteger(rawLimit)
    ? Math.min(100, Math.max(1, rawLimit))
    : 20;

  const now = Date.now();
  const admin = getSupabaseAdmin();
  const { data, error, count } = await admin
    .from("yo_srs_items")
    .select("item_id, next_review_at, streak", { count: "exact" })
    .eq("user_id", auth.user.id)
    .eq("language", language)
    .lte("next_review_at", now)
    .order("next_review_at", { ascending: true })
    .order("item_id", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Failed to load due items" }, { status: 500 });
  }

  return NextResponse.json({
    due: (data ?? []).map((row) => ({
      itemId: row.item_id,
      dueAt: row.next_review_at,
      streak: row.streak,
    })),
    totalDue: count ?? (data ?? []).length,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
