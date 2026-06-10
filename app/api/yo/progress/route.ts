import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildSnapshotInsert,
  parseProgressSnapshotPayload,
  type ProgressSnapshotRow,
} from "@/lib/yopratiqo/progressSnapshotPersistence";

export const runtime = "nodejs";

/**
 * /api/yo/progress
 *
 * Per-user YoPratiqo module progress persistence.
 *
 *   • POST → upsert a snapshot for the authenticated user on
 *     (user_id, course_id, module_id). The user_id is taken from
 *     `auth.getUser()`; any client-provided user_id is silently dropped.
 *   • GET  → return ONLY the authenticated user's own snapshots.
 *
 * Authorization model
 * -------------------
 *   • Caller MUST present a Supabase access token in `Authorization: Bearer`.
 *   • The token must resolve to an authenticated user.
 *   • Teachers cannot read this route in any mode — the GET handler only
 *     returns rows whose user_id matches the authenticated session.
 *
 * Privacy model
 * -------------
 *   • Request body is parsed by `parseProgressSnapshotPayload`, which
 *     rejects every forbidden raw-quiz key (rawQuiz, quizAnswers,
 *     selectedOption, correctOptionId, answerLog, keystrokeHistory, …
 *     enforced by FORBIDDEN_TEACHER_BRIDGE_FIELDS) and silently strips
 *     every unknown top-level key, INCLUDING any client-provided
 *     `user_id`. The route then sets `user_id` from the authenticated
 *     session.
 *   • The progress table itself has no `summary jsonb` and no free-form
 *     metadata column (see migration 078), so smuggling is impossible
 *     even if a future caller bypasses this route.
 *
 * What this route does NOT do
 * ---------------------------
 *   • It does not create a checkout session, refund, or any payment object.
 *   • It does not touch tax logic, commission logic, or Membre Pro state.
 *   • It does not enable any paid YoPratiqo checkout — progress is free.
 *   • It does not share progress with teachers. The booking-time bridge
 *     route (/api/bookings/[id]/yopratiqo-bridge) is the only consent-gated
 *     path that turns a snapshot into a teacher-visible summary.
 */

function getUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  const userClient = getUserClient(token);
  if (!userClient) {
    return { ok: false as const, status: 500, error: "Server misconfigured" };
  }
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  return { ok: true as const, user };
}

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Parse + sanitize the client payload BEFORE doing any DB work. Note
  // that `user_id` is NOT in the allow-list, so it cannot reach the DB
  // from client input.
  const body = await req.json().catch(() => ({}));
  const parsed = parseProgressSnapshotPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }

  // user_id comes from auth.getUser() — never from the client body.
  const row = buildSnapshotInsert(parsed.value, auth.user.id);

  const admin = getSupabaseAdmin();
  const { data, error: upsertErr } = await admin
    .from("yopratiqo_progress_snapshots")
    .upsert(row, { onConflict: "user_id,course_id,module_id" })
    .select("id, course_id, module_id, progress_state, last_activity_at, summary_version")
    .maybeSingle();

  if (upsertErr) {
    return NextResponse.json(
      { error: "Failed to persist progress" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    saved: true,
    snapshot: data ?? null,
  });
}

export async function GET(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = getSupabaseAdmin();
  const { data, error: selectErr } = await admin
    .from("yopratiqo_progress_snapshots")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("last_activity_at", { ascending: false })
    .limit(64);

  if (selectErr) {
    return NextResponse.json(
      { error: "Failed to load progress" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    snapshots: (data ?? []) as ProgressSnapshotRow[],
  });
}
