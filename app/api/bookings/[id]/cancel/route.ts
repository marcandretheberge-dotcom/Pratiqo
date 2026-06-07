import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  STUDENT_CANCEL_STATUSES,
  TEACHER_CANCEL_SCHEDULE_STATUSES,
  bookingLessonStartDate,
  computeRefundPlan,
  interpolateBookingCancelledMessage,
  isBookingLessonDateOnOrAfterToday,
  isLateCancellation,
  type BookingDateFields,
  type CancellerRole,
} from "@/lib/bookingCancellation";
import {
  copyKeyForOutcome,
  decideCancellationAction,
  type CancellationOutcome,
  type CancellationOutcomeCopyKey,
} from "@/lib/bookings/cancellationOutcome";
import { attemptStripeBookingRefund } from "@/lib/payments/refunds";
import {
  openCancellationSupportCase,
  type OpenCancellationSupportCaseInput,
} from "@/lib/bookings/cancellationSupportCase";
import { t as translate } from "@/lib/translations";
import type { Locale } from "@/lib/i18n/types";
import { notifyBookingCancelled } from "@/lib/bookings/cancellationNotifications";

export const runtime = "nodejs";

function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  const h = (header ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (h.startsWith("fr")) return "fr";
  if (h.startsWith("es")) return "es";
  return "en";
}

function clampString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

function parseBoolean(v: unknown): boolean {
  return v === true || v === "true";
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

  const body = (await req.json().catch(() => ({}))) as {
    reason?: string | null;
    message?: string | null;
    exceptional_review?: boolean | string | null;
  };
  const reason = clampString(body.reason, 200);
  const message = clampString(body.message, 2000);
  const exceptionalReviewRequested = parseBoolean(body.exceptional_review);

  const admin = getSupabaseAdmin();

  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .select(
      "id, teacher_id, student_id, status, slot_date, date, time_slot, time, price, stripe_payment_intent_id",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const status = String(booking.status ?? "");
  if (status === "cancelled" || status === "cancelled_conflict" || status === "declined") {
    return NextResponse.json({ error: "Booking is not cancellable" }, { status: 409 });
  }

  const rowFields: BookingDateFields = booking;
  if (!isBookingLessonDateOnOrAfterToday(rowFields)) {
    return NextResponse.json({ error: "Past bookings cannot be cancelled" }, { status: 409 });
  }

  const isStudent = booking.student_id === user.id;
  const cancellerRole: CancellerRole = isStudent ? "student" : "teacher";

  let allowedStatuses: readonly string[];

  if (isStudent) {
    allowedStatuses = STUDENT_CANCEL_STATUSES as unknown as string[];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "This booking cannot be cancelled as a student" }, { status: 409 });
    }
  } else {
    const { data: teacherRow } = await admin.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
    if (!teacherRow || teacherRow.id !== booking.teacher_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    allowedStatuses = TEACHER_CANCEL_SCHEDULE_STATUSES as unknown as string[];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Pending requests — use decline on the dashboard" }, { status: 409 });
    }
    // Teacher cancellation reason is required by policy.
    if (!reason) {
      return NextResponse.json({ error: "Teacher cancellation reason is required" }, { status: 400 });
    }
  }

  const isLate = isLateCancellation(rowFields);
  const decision = decideCancellationAction({
    cancellerRole,
    isLate,
    exceptionalReviewRequested: isStudent ? exceptionalReviewRequested : false,
  });
  const lessonStart = bookingLessonStartDate(rowFields);

  const bookingPrice =
    typeof booking.price === "number"
      ? booking.price
      : booking.price != null
      ? Number(booking.price)
      : null;
  const stripePI =
    typeof booking.stripe_payment_intent_id === "string" && booking.stripe_payment_intent_id.trim().length > 0;
  const bookingLooksPaidOrAmbiguous = status === "confirmed" || stripePI || (bookingPrice ?? 0) > 0;

  // Legacy refund-plan write (kept for the dashboard UI / metadata audit trail).
  // The authoritative refund execution + state now lives in booking_payments.
  const refundPlan = computeRefundPlan({
    cancellerRole,
    isLate,
    hasStripePaymentIntent: stripePI,
    bookingPrice,
  });

  const cancelledAtIso = new Date().toISOString();
  const { data: updatedRows, error: updateErr } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAtIso,
      cancelled_by: user.id,
      cancelled_by_role: cancellerRole,
      cancellation_reason: reason,
      cancellation_message: message,
      refund_status: refundPlan.refund_status,
      refund_method: refundPlan.refund_method,
      refund_amount: refundPlan.refund_amount,
    })
    .eq("id", bookingId)
    .in("status", [...allowedStatuses])
    .select("id");

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: "Booking status changed — try refreshing" }, { status: 409 });
  }

  // The booking is now committed as `cancelled`. From here on, every error
  // path must return a successful HTTP response (the cancellation already
  // happened) but surface the right honest outcome so the UI never claims
  // a refund that didn't run.
  let outcome: CancellationOutcome = "no_payment";
  let stripeRefundId: string | null = null;
  let stripeRefundAmountCents: number | null = null;
  let supportCaseId: string | null = null;
  let bookingRefundStatus = refundPlan.refund_status;

  const supportCaseBase = {
    bookingId,
    cancellerUserId: user.id,
    cancellerRole,
    studentUserId: booking.student_id as string,
    teacherId: booking.teacher_id as string,
    cancellationReason: reason,
    cancellationMessage: message,
    lessonStartIso: lessonStart ? lessonStart.toISOString() : null,
    policyWindow: isLate ? "less_than_24h" : "more_than_24h",
    stripePaymentIntentId:
      typeof booking.stripe_payment_intent_id === "string" && booking.stripe_payment_intent_id.trim().length > 0
        ? booking.stripe_payment_intent_id
        : null,
  } satisfies Omit<OpenCancellationSupportCaseInput, "trigger" | "blockerDetail">;

  async function escalateToManualReview(
    trigger: OpenCancellationSupportCaseInput["trigger"],
    blockerDetail: string | null,
  ): Promise<void> {
    outcome = "manual_review";
    bookingRefundStatus = "pending_review";
    const result = await openCancellationSupportCase(admin, {
      ...supportCaseBase,
      trigger,
      blockerDetail,
    });
    supportCaseId = result.supportCaseId;
    // Mirror the manual-review state onto the booking row so the dashboard's
    // existing refund_status badge stays in sync with the support case.
    await admin
      .from("bookings")
      .update({
        refund_status: "pending_review",
        // refund_method left untouched so we don't claim "original_payment"
        // in case the only path forward is a Pratiqo credit.
      })
      .eq("id", bookingId);
  }

  if (decision.kind === "open_manual_review") {
    await escalateToManualReview("exceptional_review", null);
  } else if (decision.kind === "late_no_refund") {
    outcome = "late_no_refund";
    bookingRefundStatus = "rejected";
    await admin
      .from("bookings")
      .update({ refund_status: "rejected", refund_method: null, refund_amount: null })
      .eq("id", bookingId);
  } else {
    // attempt_auto_refund: try Stripe; degrade to manual review if needed.
    try {
      const refundOutcome = await attemptStripeBookingRefund(admin, {
        bookingId,
        actor: cancellerRole,
        cancellationReason: reason,
        stripeReason: "requested_by_customer",
      });
      switch (refundOutcome.kind) {
        case "refunded":
          outcome = "refund_executed";
          bookingRefundStatus = "refunded";
          stripeRefundId = refundOutcome.stripeRefundId;
          stripeRefundAmountCents = refundOutcome.amountCents;
          await admin
            .from("bookings")
            .update({
              refund_status: "refunded",
              refund_method: "original_payment",
            })
            .eq("id", bookingId);
          break;
        case "already_refunded":
          outcome = "refund_executed";
          bookingRefundStatus = "refunded";
          stripeRefundId = refundOutcome.stripeRefundId;
          stripeRefundAmountCents = refundOutcome.amountCents;
          await admin
            .from("bookings")
            .update({
              refund_status: "refunded",
              refund_method: "original_payment",
            })
            .eq("id", bookingId);
          break;
        case "no_payment":
          if (bookingLooksPaidOrAmbiguous) {
            await escalateToManualReview(
              "missing_payment_data",
              `no_payment:${refundOutcome.reason}; booking_status:${status}; booking_has_stripe_pi:${stripePI}`,
            );
          } else {
            outcome = "no_payment";
            bookingRefundStatus = "not_required";
            await admin
              .from("bookings")
              .update({
                refund_status: "not_required",
                refund_method: null,
                refund_amount: null,
              })
              .eq("id", bookingId);
          }
          break;
        case "manual_review_required":
          await escalateToManualReview(
            refundOutcome.reason === "transfer_already_completed"
              ? "transfer_already_completed"
              : refundOutcome.reason === "disputed"
              ? "disputed_payment"
              : refundOutcome.reason === "transfer_status_reversed"
              ? "transfer_already_reversed"
              : "missing_payment_data",
            `manual_review_required:${refundOutcome.reason}`,
          );
          break;
        case "failed":
          await escalateToManualReview("auto_refund_failed", refundOutcome.reason);
          break;
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : "unknown refund error";
      console.error("[bookings/cancel] refund attempt threw", e);
      await escalateToManualReview("missing_payment_data", detail);
    }
  }

  const uiLocale = localeFromAcceptLanguage(req.headers.get("accept-language"));
  const lessonDate =
    String((booking.slot_date as string | null) ?? (booking.date as string | null) ?? "").trim() ||
    String(booking.date ?? "");
  const lessonTime = String((booking.time_slot as string | null) ?? (booking.time as string | null) ?? "").trim();

  const tmpl = translate("bookingCancelledSystemMessage", uiLocale);
  const systemLine = interpolateBookingCancelledMessage(tmpl, lessonDate || "—", lessonTime || "—");

  const peerId =
    isStudent ?
      (
        await admin.from("teachers").select("user_id").eq("id", booking.teacher_id as string).maybeSingle()
      ).data?.user_id ?? null
    : booking.student_id;

  if (typeof peerId === "string" && peerId.trim().length > 0) {
    try {
      const pid = peerId.trim();
      const conversationId = [user.id, pid].sort().join("_");
      await admin.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: pid,
        content: systemLine,
        read: false,
      });
    } catch {
      /* Non-fatal: booking is cancelled; inbox line is best-effort. */
    }
  }

  // Send cancellation email to the OPPOSITE participant. The status
  // transition is already committed above; helper handles its own errors
  // so an email failure cannot reverse a successful cancellation.
  //
  // TODO(emails): the email currently uses neutral wording that does not
  // promise a refund (see lib/bookings/cancellationNotifications.ts). Once
  // the new outcome surface is exercised in production, plumb the
  // {outcome, supportCaseId, stripeRefundId} triple into the email helper
  // so the receiver can see the same honest status without checking the
  // dashboard.
  await notifyBookingCancelled(
    admin,
    {
      id: bookingId,
      teacher_id: booking.teacher_id as string,
      student_id: booking.student_id as string,
      slot_date: booking.slot_date as string | null,
      date: booking.date as string | null,
      time_slot: booking.time_slot as string | null,
      time: booking.time as string | null,
    },
    cancellerRole,
  );

  const copyKey: CancellationOutcomeCopyKey = copyKeyForOutcome(
    outcome,
    decision.kind === "open_manual_review",
  );

  return NextResponse.json({
    ok: true,
    outcome,
    copy_key: copyKey,
    refund_status: bookingRefundStatus,
    refund_method: outcome === "refund_executed" ? "original_payment" : null,
    refund_amount: outcome === "refund_executed" ? refundPlan.refund_amount : null,
    stripe_refund_id: stripeRefundId,
    stripe_refund_amount_cents: stripeRefundAmountCents,
    support_case_id: supportCaseId,
    policy_window: isLate ? "less_than_24h" : "more_than_24h",
  });
}
