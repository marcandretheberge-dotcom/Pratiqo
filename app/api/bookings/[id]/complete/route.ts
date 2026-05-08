import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingEndAt } from "@/lib/bookingLifecycle";
import { sendPostClassReviewRequest } from "@/lib/email";
import { transferGroupForBooking } from "@/lib/payments/amounts";
import {
  getBookingPaymentForTransfer,
  markBookingPaymentTransferred,
  markBookingPaymentTransferFailed,
} from "@/lib/payments/ledger";

export const runtime = "nodejs";

type CompletionOutcome = "held" | "absent" | "technical_issue";

function isCompletionOutcome(value: unknown): value is CompletionOutcome {
  return value === "held" || value === "absent" || value === "technical_issue";
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
    .select("id, teacher_id, student_id, status, slot_date, date, time_slot, time, duration_minutes, stripe_payment_intent_id")
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

  if (String(booking.status) !== "confirmed") {
    return NextResponse.json({ error: "Only confirmed bookings can be completed" }, { status: 409 });
  }

  const lessonEnd = bookingEndAt(booking);
  if (!lessonEnd) {
    return NextResponse.json({ error: "Booking time is incomplete" }, { status: 400 });
  }

  if (lessonEnd > new Date()) {
    return NextResponse.json({ error: "The lesson has not ended yet" }, { status: 409 });
  }

  let payoutStatus: "not_required" | "legacy_no_payment_ledger" | "transferred" | "already_transferred" = "not_required";
  let stripeTransferId: string | null = null;

  if (outcome === "held") {
    const payment = await getBookingPaymentForTransfer(admin, bookingId);

    if (!payment) {
      // Legacy bookings created before the payment ledger may already have used the previous payout path.
      payoutStatus = "legacy_no_payment_ledger";
    } else if (payment.transfer_status === "transferred" && payment.stripe_transfer_id) {
      payoutStatus = "already_transferred";
      stripeTransferId = payment.stripe_transfer_id;
    } else {
      if (payment.payment_status !== "paid") {
        return NextResponse.json({ error: "Payment is not confirmed for this booking" }, { status: 409 });
      }

      const { data: openPayoutHoldCases, error: holdErr } = await admin
        .from("support_cases")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("payout_hold", true)
        .in("status", ["new", "waiting_other_party", "under_review"])
        .limit(1);
      if (holdErr) {
        return NextResponse.json({ error: holdErr.message }, { status: 500 });
      }
      if (openPayoutHoldCases?.length) {
        return NextResponse.json(
          {
            error:
              "Un problème est en cours de révision pour ce cours. Le versement sera traité après résolution.",
            payout_status: "held_for_support_case",
          },
          { status: 409 },
        );
      }

      if (!payment.stripe_charge_id) {
        return NextResponse.json({ error: "Missing Stripe charge for teacher payout" }, { status: 409 });
      }

      const destination = (teacher as { stripe_account_id?: string | null }).stripe_account_id?.trim();
      const payoutsEnabled = Boolean(
        (teacher as { stripe_connect_payouts_enabled?: boolean | null }).stripe_connect_payouts_enabled,
      );
      if (!destination || !payoutsEnabled) {
        await markBookingPaymentTransferFailed(
          admin,
          bookingId,
          "Teacher Stripe Connect account is not payout-ready.",
        );
        return NextResponse.json(
          { error: "Teacher Stripe Connect account is not ready for payouts" },
          { status: 409 },
        );
      }

      if (payment.teacher_net_cents <= 0) {
        return NextResponse.json({ error: "Teacher payout amount is invalid" }, { status: 409 });
      }

      let transfer: Stripe.Transfer;
      try {
        transfer = await stripe.transfers.create(
          {
            amount: payment.teacher_net_cents,
            currency: payment.currency,
            destination,
            source_transaction: payment.stripe_charge_id,
            transfer_group: transferGroupForBooking(bookingId),
            metadata: { booking_id: bookingId },
          },
          { idempotencyKey: `booking_transfer_${bookingId}` },
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "Stripe transfer failed";
        await markBookingPaymentTransferFailed(admin, bookingId, message).catch((err) =>
          console.error("[bookings/complete] failed to mark transfer failed", err),
        );
        return NextResponse.json({ error: message }, { status: 502 });
      }

      await markBookingPaymentTransferred(admin, bookingId, transfer);
      payoutStatus = "transferred";
      stripeTransferId = transfer.id;
    }
  }

  const completedAt = new Date().toISOString();
  const { data: updatedRows, error: updateErr } = await admin
    .from("bookings")
    .update({
      status: "completed",
      completion_outcome: outcome,
      completed_at: completedAt,
    })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .select("id");

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: "Booking status changed - try refreshing" }, { status: 409 });
  }

  const { data: student } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", booking.student_id as string)
    .maybeSingle();

  const profileEmail = typeof student?.email === "string" ? student.email.trim() : "";
  const { data: authStudent } = profileEmail
    ? { data: null }
    : await admin.auth.admin.getUserById(booking.student_id as string);
  const authEmail = authStudent?.user?.email?.trim() ?? "";
  const studentEmail = profileEmail || authEmail;
  let reviewEmailSent = false;

  if (outcome === "held" && studentEmail) {
    await sendPostClassReviewRequest({
      email: studentEmail,
      studentName: typeof student?.name === "string" && student.name.trim() ? student.name.trim() : "élève",
      teacherName: typeof teacher.name === "string" && teacher.name.trim() ? teacher.name.trim() : "votre professeur",
      bookingId,
    });
    reviewEmailSent = true;
  }

  return NextResponse.json({
    ok: true,
    completed_at: completedAt,
    completion_outcome: outcome,
    payout_status: payoutStatus,
    stripe_transfer_id: stripeTransferId,
    review_email_sent: reviewEmailSent,
    review_email_skipped_reason: reviewEmailSent
      ? null
      : outcome !== "held"
        ? "completion_outcome_not_held"
        : "student_email_missing",
  });
}
