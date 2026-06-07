/**
 * Helper for opening a `support_cases` row when a booking cancellation
 * cannot be auto-refunded and must be handled by Pratiqo support.
 *
 * The schema (migrations/045) already supports everything we need — no
 * migrations are added here. We use:
 *   - `category = 'refund_request'` for refunds (auto-attempt failed,
 *     transfer already paid out, or missing Stripe data),
 *   - `category = 'late_cancellation'` for student-initiated exceptional
 *     reviews within the 24h window,
 *   - `payout_hold = true` so the existing `hasOpenPayoutHold()` guard in
 *     `lib/bookings/completeBooking.ts` blocks any pending teacher transfer
 *     until support closes the case.
 *
 * Description must be ≥10 chars (DB constraint). We always include a
 * structured marker prefix + booking id + canceller role + cancellation
 * reason + (optional) free-text note, so the support tool can render the
 * case without joining other tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CancellerRole } from "@/lib/bookingCancellation";

/** Prefix all cancellation-review descriptions with this so support can filter them quickly. */
export const CANCELLATION_REFUND_REVIEW_MARKER = "[CANCELLATION_REFUND_REVIEW]";

export type OpenCancellationSupportCaseInput = {
  bookingId: string;
  /** auth.users.id of the user who cancelled. */
  cancellerUserId: string;
  cancellerRole: CancellerRole;
  /** auth.users.id of the student on the booking. */
  studentUserId: string;
  /** teachers.id (NOT auth user id) of the teacher on the booking. */
  teacherId: string;
  /**
   * Why the case is being opened. `auto_refund_failed` and `transfer_already_completed`
   * mean we tried Stripe and bailed; `exceptional_review` is the student-requested
   * review path within the 24h window.
   */
  trigger:
    | "auto_refund_failed"
    | "transfer_already_completed"
    | "missing_payment_data"
    | "disputed_payment"
    | "transfer_already_reversed"
    | "exceptional_review";
  /** Cancellation reason slug ("schedule_conflict", "illness", etc.). */
  cancellationReason: string | null;
  /** Optional free-text note from the canceller. */
  cancellationMessage: string | null;
  /**
   * Lesson schedule for support traceability. We store it in the description
   * so the support tool can read it without re-querying the booking row,
   * and so it survives even if the booking is later soft-deleted.
   */
  lessonStartIso: string | null;
  /**
   * Stored on the case description so support has all the policy context.
   * `>24h` / `<24h` is the cancellation policy window evaluated at decision
   * time (not at support's open time), so it matches what the user saw.
   */
  policyWindow: "more_than_24h" | "less_than_24h" | "unknown";
  /** Stripe payment intent for traceability. May be null for legacy or free bookings. */
  stripePaymentIntentId: string | null;
  /** Pre-computed Stripe error / blocker reason, surfaced verbatim to support. */
  blockerDetail?: string | null;
};

export type OpenCancellationSupportCaseResult = {
  ok: boolean;
  supportCaseId: string | null;
  /** Internal description (admin-facing); useful for tests and email follow-up. */
  description: string;
};

const TRIGGER_TO_CATEGORY: Record<
  OpenCancellationSupportCaseInput["trigger"],
  "refund_request" | "late_cancellation"
> = {
  auto_refund_failed: "refund_request",
  transfer_already_completed: "refund_request",
  missing_payment_data: "refund_request",
  disputed_payment: "refund_request",
  transfer_already_reversed: "refund_request",
  exceptional_review: "late_cancellation",
};

const TRIGGER_TO_TITLE: Record<OpenCancellationSupportCaseInput["trigger"], string> = {
  auto_refund_failed: "Booking cancellation — automatic refund failed",
  transfer_already_completed: "Booking cancellation — teacher payout already transferred",
  missing_payment_data: "Booking cancellation — missing Stripe payment reference",
  disputed_payment: "Booking cancellation — payment is disputed at Stripe",
  transfer_already_reversed: "Booking cancellation — transfer already reversed",
  exceptional_review: "Late cancellation — student requested exceptional review",
};

const TRIGGER_TO_HOLD_REASON: Record<OpenCancellationSupportCaseInput["trigger"], string> = {
  auto_refund_failed: "Auto-refund failed — review before releasing teacher payout",
  transfer_already_completed: "Auto-refund deferred — transfer already paid out",
  missing_payment_data: "Auto-refund deferred — missing Stripe payment data",
  disputed_payment: "Auto-refund deferred — Stripe dispute is open",
  transfer_already_reversed: "Auto-refund deferred — transfer already reversed",
  exceptional_review: "Student requested exceptional review for late cancellation",
};

function clampString(value: string | null | undefined, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function buildCancellationSupportCaseDescription(input: OpenCancellationSupportCaseInput): string {
  const lines: string[] = [
    CANCELLATION_REFUND_REVIEW_MARKER,
    `Booking ID: ${input.bookingId}`,
    `Canceller role: ${input.cancellerRole}`,
    `Canceller user id: ${input.cancellerUserId}`,
    `Trigger: ${input.trigger}`,
    `Policy window: ${input.policyWindow}`,
  ];
  if (input.lessonStartIso) lines.push(`Lesson start: ${input.lessonStartIso}`);
  if (input.stripePaymentIntentId) lines.push(`Stripe payment_intent: ${input.stripePaymentIntentId}`);
  if (input.cancellationReason) lines.push(`Reason: ${clampString(input.cancellationReason, 200)}`);
  if (input.cancellationMessage) lines.push(`Message: ${clampString(input.cancellationMessage, 1000)}`);
  if (input.blockerDetail) lines.push(`Blocker detail: ${clampString(input.blockerDetail, 500)}`);
  return lines.join("\n");
}

/**
 * Insert a `support_cases` row. Returns the new case id on success, or
 * `null` on failure — the caller is expected to surface the user-facing
 * outcome regardless and log the persistence failure (do NOT throw, since
 * the booking row update has already committed at the call site and we
 * never want an audit-log failure to roll back a successful cancellation).
 */
export async function openCancellationSupportCase(
  admin: SupabaseClient,
  input: OpenCancellationSupportCaseInput,
): Promise<OpenCancellationSupportCaseResult> {
  const description = buildCancellationSupportCaseDescription(input);
  const category = TRIGGER_TO_CATEGORY[input.trigger];
  const title = TRIGGER_TO_TITLE[input.trigger];
  const holdReason = TRIGGER_TO_HOLD_REASON[input.trigger];

  try {
    const { data, error } = await admin
      .from("support_cases")
      .insert({
        booking_id: input.bookingId,
        opened_by_user_id: input.cancellerUserId,
        student_id: input.studentUserId,
        teacher_id: input.teacherId,
        role: input.cancellerRole,
        category,
        status: "new",
        priority: "high",
        title,
        description,
        requested_resolution: "refund",
        evidence_urls: [],
        payout_hold: true,
        payout_hold_reason: holdReason,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[bookings/cancel] support_case insert failed", error);
      return { ok: false, supportCaseId: null, description };
    }

    const id = String((data as { id: string }).id);
    return { ok: true, supportCaseId: id, description };
  } catch (e) {
    console.error("[bookings/cancel] support_case insert threw", e);
    return { ok: false, supportCaseId: null, description };
  }
}
