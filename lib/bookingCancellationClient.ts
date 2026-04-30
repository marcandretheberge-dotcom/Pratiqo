import type { RefundMethod, RefundStatus } from "@/lib/bookingCancellation";

export type CancelBookingSuccess = {
  ok: true;
  refund_status?: RefundStatus;
  refund_method?: RefundMethod | null;
  refund_amount?: number | null;
};

/** Client helper for POST `/api/bookings/[id]/cancel`. */
export async function postCancelBooking(
  bookingId: string,
  opts: {
    reason?: string | null;
    message?: string | null;
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
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<CancelBookingSuccess> & { error?: string };
  if (!res.ok) {
    return { error: body?.error ?? "Request failed" };
  }
  return {
    ok: true,
    refund_status: body.refund_status,
    refund_method: body.refund_method,
    refund_amount: body.refund_amount,
  };
}
