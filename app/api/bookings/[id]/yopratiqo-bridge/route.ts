import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  BOOKING_BRIDGE_SUMMARY_VERSION,
  parseClientConsentPayload,
  type BookingBridgeSummaryJson,
} from "@/lib/yopratiqo/teacherBridgeBookingPersistence";
import {
  type ProgressSnapshotRow,
  summarizeSnapshotsForBridge,
} from "@/lib/yopratiqo/progressSnapshotPersistence";

export const runtime = "nodejs";

/**
 * POST /api/bookings/:id/yopratiqo-bridge
 *
 * Persist the student's YoPratiqo → teacher bridge consent (and optional
 * safe summary) for a single booking.
 *
 * Authorization model
 * -------------------
 *   • Caller MUST present a Supabase access token in `Authorization: Bearer`.
 *   • The token must resolve to an authenticated user (`supabaseUser.auth.getUser`).
 *   • The booking pointed to by `:id` must exist and belong to that user
 *     (student_id = auth uid). A teacher cannot post here, even for their
 *     own booking — only the student can consent.
 *
 * Privacy model
 * -------------
 *   • Request body is parsed by `parseClientConsentPayload`, which
 *     validates the JSON shape, rejects every name listed in the
 *     `FORBIDDEN_TEACHER_BRIDGE_FIELDS` deny-list, strips every unknown
 *     top-level key, and re-asserts the privacy contract via the runtime
 *     `assertSafeTeacherBridgeSummary` guard. The literal forbidden names
 *     live in ONE place (lib/yopratiqo/teacherBridgeSummary.ts) so the
 *     deny-list never drifts.
 *   • The server NEVER trusts a client-provided student id, teacher id,
 *     or booking id. Those come from the URL + the booking row read with
 *     service-role.
 *   • Missing or `consent_granted: false` ⇒ the row is upserted with the
 *     flag cleared and `summary = null`. We do not delete on revoke so the
 *     audit trail (created_at / updated_at) survives.
 *
 * What this route does NOT do
 * ---------------------------
 *   • It does not create a checkout session, refund, or any payment object.
 *   • It does not touch tax logic, commission logic, or Membre Pro state.
 *   • It does not enable any paid YoPratiqo checkout — the bridge is free.
 *   • It does not write to bookings or any other table.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: bookingId } = await params;
  if (!bookingId || typeof bookingId !== "string") {
    return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabaseUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authErr,
  } = await supabaseUser.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse + sanitize the client payload BEFORE doing any DB work so a
  // malformed body fails fast and never hits the service-role client.
  const body = await req.json().catch(() => ({}));
  const parsed = parseClientConsentPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }

  // Validate the booking exists and belongs to this student. Reading
  // with the service-role admin client bypasses RLS for the existence
  // check; the ownership check below is the gate.
  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, student_id, teacher_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr) {
    return NextResponse.json({ error: "Booking lookup failed" }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.student_id !== user.id) {
    // Teachers (or other users) cannot consent on behalf of a student.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const teacherId = String(booking.teacher_id ?? "").trim();
  if (!teacherId) {
    return NextResponse.json({ error: "Booking has no teacher" }, { status: 409 });
  }

  // Build the row payload. `consent_granted_at` is set when the flag is
  // true; otherwise we clear it.
  //
  // Summary source policy (PART E of feat/yopratiqo-progress-snapshots):
  //   • If the client supplied a sanitized summary, we keep it (legacy
  //     path — currently the BookingModal sends `summary: null`).
  //   • If consent is granted AND the client did NOT supply a summary,
  //     we OPPORTUNISTICALLY read the authenticated student's own
  //     `yopratiqo_progress_snapshots` rows via service-role, project
  //     them into a safe `BookingBridgeSummaryJson` server-side, and
  //     persist that snapshot. We NEVER read another user's snapshots
  //     (the WHERE clause is `user_id = user.id`).
  //   • If the student has no snapshots, the summary stays `null` and
  //     the teacher card stays locked — no fake progress is fabricated.
  const now = new Date().toISOString();
  const consentGrantedAt = parsed.value.consentGranted ? now : null;
  let summary: BookingBridgeSummaryJson | null = parsed.value.summary;
  if (parsed.value.consentGranted && summary == null) {
    const { data: snapshotRows, error: snapshotErr } = await admin
      .from("yopratiqo_progress_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("last_activity_at", { ascending: false })
      .limit(64);
    if (!snapshotErr && Array.isArray(snapshotRows) && snapshotRows.length > 0) {
      summary = summarizeSnapshotsForBridge(snapshotRows as ProgressSnapshotRow[]);
    }
  }
  const summaryVersion = summary ? (parsed.value.summaryVersion ?? BOOKING_BRIDGE_SUMMARY_VERSION) : null;

  const { error: upsertErr } = await admin
    .from("booking_yopratiqo_learning_summaries")
    .upsert(
      {
        booking_id: bookingId,
        student_id: user.id,
        teacher_id: teacherId,
        consent_granted: parsed.value.consentGranted,
        consent_granted_at: consentGrantedAt,
        summary_version: summaryVersion,
        summary,
      },
      { onConflict: "booking_id" },
    );

  if (upsertErr) {
    return NextResponse.json(
      { error: "Failed to persist consent" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    booking_id: bookingId,
    consent_granted: parsed.value.consentGranted,
    summary_present: summary != null,
    summary_version: summaryVersion,
  });
}
