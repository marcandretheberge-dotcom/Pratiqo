import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  completeConfirmedBooking,
  type BookingRowForCompletion,
  type CompletionOutcome,
  type TeacherRowForCompletion,
} from "@/lib/bookings/completeBooking";

export const runtime = "nodejs";

function isCompletionOutcome(value: unknown): value is CompletionOutcome {
  return value === "held" || value === "absent" || value === "technical_issue";
}

function httpStatusForCode(code: string): number {
  switch (code) {
    case "not_found":
      return 404;
    case "not_confirmed":
    case "lesson_not_ended":
    case "payment_not_paid":
    case "payout_hold":
    case "missing_charge":
    case "connect_not_ready":
    case "invalid_payout_amount":
    case "status_race":
      return 409;
    case "incomplete_timing":
      return 400;
    case "transfer_failed":
      return 502;
    default:
      return 500;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const {
    data: { user },
    error: authErr,
  } = await supabaseUser.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { outcome?: unknown };
  const outcome = isCompletionOutcome(body.outcome) ? body.outcome : "held";
  const admin = getSupabaseAdmin();

  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, slot_date, date, time_slot, time, duration_minutes")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, user_id, name, stripe_account_id, stripe_connect_payouts_enabled")
    .eq("id", booking.teacher_id as string)
    .maybeSingle();

  if (!teacher || teacher.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await completeConfirmedBooking(
    admin,
    booking as BookingRowForCompletion,
    teacher as TeacherRowForCompletion,
    { outcome, graceAfterEndMs: 0, sendReviewEmail: true },
  );

  if (!result.ok) {
    const status = httpStatusForCode(result.code);
    return NextResponse.json(
      {
        error: result.error,
        ...(result.code === "payout_hold" ? { payout_status: "held_for_support_case" } : {}),
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    completed_at: result.completed_at,
    completion_outcome: result.completion_outcome,
    payout_status: result.payout_status,
    stripe_transfer_id: result.stripe_transfer_id,
    review_email_sent: result.review_email_sent,
    review_email_skipped_reason: result.review_email_sent
      ? null
      : outcome !== "held"
        ? "completion_outcome_not_held"
        : "student_email_missing",
  });
}
