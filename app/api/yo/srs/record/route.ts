import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recordAttempt } from "@/lib/yo/srs/engine";
import { authenticateSrsRequest } from "@/lib/yo/srs/srsRouteAuth";
import {
  buildSrsItemRow,
  parseSrsRecordPayload,
  srsRecordFromRow,
  xpEventsForAttempt,
} from "@/lib/yo/srs/srsPersistence";

export const runtime = "nodejs";

/**
 * POST /api/yo/srs/record  { attemptId, itemId, correct, assisted, at? }
 *
 * Records one answered attempt (spec §2.4). The server is the scheduling
 * authority: it loads the caller's stored record, applies the shared
 * engine with the SERVER clock, and upserts — a client-supplied streak or
 * due date is never accepted (the payload parser does not even allow-list
 * those keys). XP events are appended to yo_learning_events in the same
 * transaction (practice 5; independent correct +5; mastery +50).
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateSrsRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseSrsRecordPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }
  const { itemId, correct, assisted, attemptId } = parsed.value;
  const admin = getSupabaseAdmin();
  for (let retry = 0; retry < 5; retry++) {
    const { data: existing, error: loadErr } = await admin
      .from("yo_srs_items")
      .select("attempts, completed, independent, last_at, next_review_at, streak, revision")
      .eq("user_id", auth.user.id)
      .eq("item_id", itemId)
      .maybeSingle();
    if (loadErr) {
      return NextResponse.json({ error: "Failed to load item state" }, { status: 500 });
    }
    const previous = existing ? srsRecordFromRow(existing) : null;
    const next = recordAttempt(previous, correct, assisted, Date.now());
    const { data, error } = await admin.rpc("yo_srs_commit_attempt", {
      p_user_id: auth.user.id,
      p_attempt_id: attemptId,
      p_expected_revision: existing?.revision ?? null,
      p_item: buildSrsItemRow(auth.user.id, itemId, next),
      p_events: xpEventsForAttempt(itemId, previous, next, correct, assisted)
        .map(event => ({ event_type: event.eventType, xp: event.xp })),
    });
    if (!error && data === "recorded") return NextResponse.json({ record: next });
    if (!error && data === "duplicate") return NextResponse.json({ duplicate: true });
    if (error || data !== "conflict") {
      return NextResponse.json({ error: "Failed to persist attempt" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Concurrent activity; retry with the same attempt ID" }, { status: 503 });
}
