import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  STUDENT_CANCEL_STATUSES,
  TEACHER_CANCEL_SCHEDULE_STATUSES,
  computeRefundPlan,
  interpolateBookingCancelledMessage,
  isBookingLessonDateOnOrAfterToday,
  isLateCancellation,
  type BookingDateFields,
  type CancellerRole,
} from "@/lib/bookingCancellation";
import { executeBookingRefund } from "@/lib/payments/refunds";
import { t as translate } from "@/lib/translations";
import type { Locale } from "@/lib/i18n/types";

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
  };
  const reason = clampString(body.reason, 200);
  const message = clampString(body.message, 2000);

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
  const bookingPrice =
    typeof booking.price === "number"
      ? booking.price
      : booking.price != null
      ? Number(booking.price)
      : null;
  const stripePI =
    typeof booking.stripe_payment_intent_id === "string" && booking.stripe_payment_intent_id.trim().length > 0;

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

  // Execute the refund whenever the plan calls for an automatic action. The
  // helper handles three cases: Pratiqo credit award, full Stripe refund of
  // the original payment, and transfer reversal + Stripe refund when the
  // teacher payout already went out. `pending_review` (student late cancel)
  // is left untouched for the resolution center.
  let finalRefundStatus = refundPlan.refund_status;
  let finalRefundMethod = refundPlan.refund_method;
  if (refundPlan.refund_status === "pending") {
    const refundOutcome = await executeBookingRefund({
      admin,
      bookingId,
      studentId: booking.student_id as string,
      plan: refundPlan,
      lessonDate:
        String((booking.slot_date as string | null) ?? (booking.date as string | null) ?? "").trim() ||
        null,
      bookingStripePaymentIntentId:
        typeof booking.stripe_payment_intent_id === "string"
          ? booking.stripe_payment_intent_id
          : null,
    });

    finalRefundStatus = refundOutcome.finalStatus;
    finalRefundMethod = refundOutcome.method;

    if (refundOutcome.finalStatus !== refundPlan.refund_status || refundOutcome.method !== refundPlan.refund_method) {
      const { error: refundUpdateErr } = await admin
        .from("bookings")
        .update({
          refund_status: refundOutcome.finalStatus,
          refund_method: refundOutcome.method,
        })
        .eq("id", bookingId);
      if (refundUpdateErr) {
        // Soft-fail: cancellation succeeded; surfacing the refund status is best-effort.
        console.error("[bookings/cancel] failed to persist refund outcome", refundUpdateErr);
      }
    }

    if (refundOutcome.finalStatus === "pending" && refundOutcome.reason) {
      console.warn("[bookings/cancel] refund deferred", {
        bookingId,
        method: refundOutcome.method,
        reason: refundOutcome.reason,
      });
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

  return NextResponse.json({
    ok: true,
    refund_status: finalRefundStatus,
    refund_method: finalRefundMethod,
    refund_amount: refundPlan.refund_amount,
  });
}
