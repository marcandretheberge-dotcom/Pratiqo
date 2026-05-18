import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { bookingEndAt, type BookingTimingInput } from "@/lib/bookingLifecycle";
import { sendPostClassReviewRequest } from "@/lib/email";
import { resolveEmailLocaleForUser } from "@/lib/email/locale";
import { transferGroupForBooking } from "@/lib/payments/amounts";
import {
  getBookingPaymentForTransfer,
  markBookingPaymentTransferred,
  markBookingPaymentTransferFailed,
  type BookingPaymentRowForTransfer,
} from "@/lib/payments/ledger";
import { paymentTaxBlocksPayout } from "@/lib/payments/tax";

export const AUTO_COMPLETE_GRACE_MS = 2 * 60 * 60 * 1000;

export type CompletionOutcome = "held" | "absent" | "technical_issue";

export type PayoutStatus =
  | "not_required"
  | "legacy_no_payment_ledger"
  | "transferred"
  | "already_transferred"
  | "held_for_support_case"
  | "skipped_unpaid"
  | "skipped_connect_not_ready";

export type BookingRowForCompletion = BookingTimingInput & {
  id: string;
  teacher_id: string;
  student_id: string;
  status?: string | null;
};

export type TeacherRowForCompletion = {
  id: string;
  user_id: string;
  name?: string | null;
  stripe_account_id?: string | null;
  stripe_connect_payouts_enabled?: boolean | null;
};

export type CompleteBookingResult =
  | {
      ok: true;
      bookingId: string;
      completed_at: string;
      completion_outcome: CompletionOutcome;
      payout_status: PayoutStatus;
      stripe_transfer_id: string | null;
      review_email_sent: boolean;
    }
  | {
      ok: false;
      bookingId: string;
      error: string;
      code:
        | "not_found"
        | "not_confirmed"
        | "incomplete_timing"
        | "lesson_not_ended"
        | "payment_not_paid"
        | "payout_hold"
        | "tax_not_ready"
        | "missing_charge"
        | "connect_not_ready"
        | "invalid_payout_amount"
        | "transfer_failed"
        | "status_race";
    };

function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function bookingEligibleForAutoComplete(
  booking: BookingTimingInput & { status?: string | null },
  now = new Date(),
  graceMs = AUTO_COMPLETE_GRACE_MS,
): boolean {
  if (String(booking.status ?? "").toLowerCase() !== "confirmed") return false;
  const end = bookingEndAt(booking);
  if (!end) return false;
  return end.getTime() + graceMs <= now.getTime();
}

export function paymentBlocksAutoComplete(payment: BookingPaymentRowForTransfer | null): boolean {
  if (!payment) return false;
  const status = String(payment.payment_status ?? "").toLowerCase();
  if (status === "disputed") return true;
  if (status !== "paid") return true;
  const transferStatus = String(payment.transfer_status ?? "").toLowerCase();
  return transferStatus === "reversed";
}

export async function hasOpenPayoutHold(admin: SupabaseClient, bookingId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("support_cases")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("payout_hold", true)
    .in("status", ["new", "waiting_other_party", "under_review"])
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}

type PayoutReleaseFailureCode =
  | "payment_not_paid"
  | "payout_hold"
  | "tax_not_ready"
  | "missing_charge"
  | "connect_not_ready"
  | "invalid_payout_amount"
  | "transfer_failed";

async function releaseTeacherPayout(
  admin: SupabaseClient,
  bookingId: string,
  teacher: TeacherRowForCompletion,
  payment: BookingPaymentRowForTransfer,
): Promise<
  | { ok: true; payout_status: "transferred" | "already_transferred"; stripe_transfer_id: string | null }
  | { ok: false; code: PayoutReleaseFailureCode; error: string }
> {
  if (payment.transfer_status === "transferred" && payment.stripe_transfer_id) {
    return { ok: true, payout_status: "already_transferred", stripe_transfer_id: payment.stripe_transfer_id };
  }

  if (payment.payment_status !== "paid") {
    return { ok: false, code: "payment_not_paid", error: "Payment is not confirmed for this booking" };
  }

  if (await hasOpenPayoutHold(admin, bookingId)) {
    return {
      ok: false,
      code: "payout_hold",
      error: "Payout is on hold while a support case is under review",
    };
  }

  const taxBlock = paymentTaxBlocksPayout(payment);
  if (taxBlock.blocked) {
    console.warn("[bookings/complete] payout blocked for tax status", {
      bookingId,
      tax_behavior: payment.tax_behavior,
      tax_status: payment.tax_status,
      reason: taxBlock.reason,
    });
    await markBookingPaymentTransferFailed(admin, bookingId, taxBlock.reason);
    return { ok: false, code: "tax_not_ready", error: taxBlock.reason };
  }

  if (!payment.stripe_charge_id) {
    return { ok: false, code: "missing_charge", error: "Missing Stripe charge for teacher payout" };
  }

  const destination = teacher.stripe_account_id?.trim();
  const payoutsEnabled = Boolean(teacher.stripe_connect_payouts_enabled);
  if (!destination || !payoutsEnabled) {
    await markBookingPaymentTransferFailed(
      admin,
      bookingId,
      "Teacher Stripe Connect account is not payout-ready.",
    );
    return {
      ok: false,
      code: "connect_not_ready",
      error: "Teacher Stripe Connect account is not ready for payouts",
    };
  }

  if (payment.teacher_net_cents <= 0) {
    return { ok: false, code: "invalid_payout_amount", error: "Teacher payout amount is invalid" };
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
    return { ok: false, code: "transfer_failed", error: message };
  }

  await markBookingPaymentTransferred(admin, bookingId, transfer);
  return { ok: true, payout_status: "transferred", stripe_transfer_id: transfer.id };
}

/**
 * Marks a confirmed booking completed and, when outcome is `held`, runs the existing
 * Stripe Connect transfer path used by the teacher completion API.
 */
export async function completeConfirmedBooking(
  admin: SupabaseClient,
  booking: BookingRowForCompletion,
  teacher: TeacherRowForCompletion,
  options: {
    outcome?: CompletionOutcome;
    graceAfterEndMs?: number;
    sendReviewEmail?: boolean;
  } = {},
): Promise<CompleteBookingResult> {
  const bookingId = booking.id;
  const outcome: CompletionOutcome = options.outcome ?? "held";
  const graceAfterEndMs = options.graceAfterEndMs ?? 0;
  const sendReviewEmail = options.sendReviewEmail ?? outcome === "held";

  if (String(booking.status) !== "confirmed") {
    return { ok: false, bookingId, code: "not_confirmed", error: "Only confirmed bookings can be completed" };
  }

  const lessonEnd = bookingEndAt(booking);
  if (!lessonEnd) {
    return { ok: false, bookingId, code: "incomplete_timing", error: "Booking time is incomplete" };
  }

  const earliestCompleteAt = new Date(lessonEnd.getTime() + graceAfterEndMs);
  if (earliestCompleteAt > new Date()) {
    return { ok: false, bookingId, code: "lesson_not_ended", error: "The lesson has not ended yet" };
  }

  let payoutStatus: PayoutStatus = "not_required";
  let stripeTransferId: string | null = null;

  if (outcome === "held") {
    const payment = await getBookingPaymentForTransfer(admin, bookingId);

    if (!payment) {
      payoutStatus = "legacy_no_payment_ledger";
    } else if (paymentBlocksAutoComplete(payment)) {
      return {
        ok: false,
        bookingId,
        code: "payment_not_paid",
        error: "Payment is not eligible for automatic completion payout",
      };
    } else {
      const payout = await releaseTeacherPayout(admin, bookingId, teacher, payment);
      if (!payout.ok) {
        return { ok: false, bookingId, code: payout.code, error: payout.error };
      }
      payoutStatus = payout.payout_status;
      stripeTransferId = payout.stripe_transfer_id;
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
    return { ok: false, bookingId, code: "status_race", error: updateErr.message };
  }

  if (!updatedRows?.length) {
    return {
      ok: false,
      bookingId,
      code: "status_race",
      error: "Booking status changed - try refreshing",
    };
  }

  let reviewEmailSent = false;
  if (sendReviewEmail && outcome === "held") {
    const { data: student } = await admin
      .from("profiles")
      .select("name, email")
      .eq("id", booking.student_id)
      .maybeSingle();

    const profileEmail = typeof student?.email === "string" ? student.email.trim() : "";
    const { data: authStudent } = profileEmail
      ? { data: null }
      : await admin.auth.admin.getUserById(booking.student_id);
    const authEmail = authStudent?.user?.email?.trim() ?? "";
    const studentEmail = profileEmail || authEmail;

    if (studentEmail) {
      const studentLocale = await resolveEmailLocaleForUser(admin, booking.student_id);
      const sent = await sendPostClassReviewRequest({
        email: studentEmail,
        studentName: typeof student?.name === "string" && student.name.trim() ? student.name.trim() : "élève",
        teacherName: typeof teacher.name === "string" && teacher.name.trim() ? teacher.name.trim() : "votre professeur",
        bookingId,
        locale: studentLocale,
      });
      if (sent) {
        await admin
          .from("bookings")
          .update({ review_request_email_sent_at: completedAt })
          .eq("id", bookingId)
          .is("review_request_email_sent_at", null);
        reviewEmailSent = true;
      }
    }
  }

  return {
    ok: true,
    bookingId,
    completed_at: completedAt,
    completion_outcome: outcome,
    payout_status: payoutStatus,
    stripe_transfer_id: stripeTransferId,
    review_email_sent: reviewEmailSent,
  };
}

export type AutoCompleteBatchItem = CompleteBookingResult & { bookingId: string };

export type AutoCompleteBatchSummary = {
  scanned: number;
  eligible: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped_ineligible: number;
  results: AutoCompleteBatchItem[];
};

export async function processAutoCompleteBookings(
  admin: SupabaseClient,
  options: { limit?: number; now?: Date; lookbackDays?: number } = {},
): Promise<AutoCompleteBatchSummary> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 50;
  const lookbackDays = options.lookbackDays ?? 60;

  const lookback = new Date(now);
  lookback.setDate(lookback.getDate() - lookbackDays);
  const lookbackDate = formatDateYmd(lookback);

  const { data: bookings, error } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, slot_date, date, time_slot, time, duration_minutes")
    .eq("status", "confirmed")
    .gte("slot_date", lookbackDate)
    .order("slot_date", { ascending: true })
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (bookings ?? []) as BookingRowForCompletion[];
  const eligible = rows.filter((row) => bookingEligibleForAutoComplete(row, now));
  const toProcess = eligible.slice(0, limit);

  const teacherIds = [...new Set(toProcess.map((row) => row.teacher_id))];
  const teachersById = new Map<string, TeacherRowForCompletion>();

  if (teacherIds.length > 0) {
    const { data: teachers, error: teachersErr } = await admin
      .from("teachers")
      .select("id, user_id, name, stripe_account_id, stripe_connect_payouts_enabled")
      .in("id", teacherIds);

    if (teachersErr) {
      throw new Error(teachersErr.message);
    }

    for (const teacher of (teachers ?? []) as TeacherRowForCompletion[]) {
      teachersById.set(teacher.id, teacher);
    }
  }

  const results: AutoCompleteBatchItem[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const booking of toProcess) {
    const teacher = teachersById.get(booking.teacher_id);
    if (!teacher) {
      failed += 1;
      results.push({
        ok: false,
        bookingId: booking.id,
        code: "not_found",
        error: "Teacher not found",
      });
      continue;
    }

    try {
      const result = await completeConfirmedBooking(admin, booking, teacher, {
        outcome: "held",
        graceAfterEndMs: AUTO_COMPLETE_GRACE_MS,
        sendReviewEmail: true,
      });
      results.push(result);
      if (result.ok) succeeded += 1;
      else failed += 1;
    } catch (e) {
      failed += 1;
      results.push({
        ok: false,
        bookingId: booking.id,
        code: "status_race",
        error: e instanceof Error ? e.message : "Unexpected error",
      });
    }
  }

  return {
    scanned: rows.length,
    eligible: eligible.length,
    attempted: toProcess.length,
    succeeded,
    failed,
    skipped_ineligible: rows.length - eligible.length,
    results,
  };
}
