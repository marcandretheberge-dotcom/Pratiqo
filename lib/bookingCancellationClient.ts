import type { RefundMethod, RefundStatus } from "@/lib/bookingCancellation";
import type {
  CancellationOutcome,
  CancellationOutcomeCopyKey,
} from "@/lib/bookings/cancellationOutcome";

export type CancelBookingSuccess = {
  ok: true;
  /** Honest discriminator the UI uses to pick title/body copy. */
  outcome?: CancellationOutcome;
  /** i18n base key — UI reads `${copy_key}Title` / `${copy_key}Body`. */
  copy_key?: CancellationOutcomeCopyKey;
  refund_status?: RefundStatus;
  refund_method?: RefundMethod | null;
  refund_amount?: number | null;
  /** Set only when outcome === "refund_executed". */
  stripe_refund_id?: string | null;
  stripe_refund_amount_cents?: number | null;
  /** Set only when outcome === "manual_review". */
  support_case_id?: string | null;
  /** Echo of the policy window the API evaluated against. */
  policy_window?: "more_than_24h" | "less_than_24h";
};

/**
 * Client helper for POST `/api/bookings/[id]/cancel`.
 *
 * `exceptionalReview = true` is only meaningful when the lesson is within
 * the late-cancellation window. The server side opens a `support_cases`
 * row with `category=late_cancellation` and `payout_hold=true`; we don't
 * pretend the request was approved here.
 */
export async function postCancelBooking(
  bookingId: string,
  opts: {
    reason?: string | null;
    message?: string | null;
    exceptionalReview?: boolean;
    accessToken: string;
  },
): Promise<CancelBookingSuccess | { error: string }> {
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      reason: opts.reason ?? undefined,
      message: opts.message ?? undefined,
      exceptional_review: opts.exceptionalReview ? true : undefined,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<CancelBookingSuccess> & { error?: string };
  if (!res.ok) {
    return { error: body?.error ?? "Request failed" };
  }
  return {
    ok: true,
    outcome: body.outcome,
    copy_key: body.copy_key,
    refund_status: body.refund_status,
    refund_method: body.refund_method,
    refund_amount: body.refund_amount,
    stripe_refund_id: body.stripe_refund_id ?? null,
    stripe_refund_amount_cents: body.stripe_refund_amount_cents ?? null,
    support_case_id: body.support_case_id ?? null,
    policy_window: body.policy_window,
  };
}
