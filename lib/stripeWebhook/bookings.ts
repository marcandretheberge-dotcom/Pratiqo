import * as Sentry from "@sentry/nextjs";
import { COMPANIONS, getCompanionStage } from "@/lib/companions";
import { awardCredit, deductCredits, COMPANION_MILESTONE_AMOUNTS } from "@/lib/credits";
import { sendBookingConfirmedStudent, sendBookingConfirmedTeacher, sendCompanionEvolution } from "@/lib/email";
import { getPlatformFeeRate } from "@/lib/payments/amounts";
import { retrievePaymentIntentChargeId, upsertPaidBookingPayment } from "@/lib/payments/ledger";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type ConfirmBookingOptions = {
  checkoutSessionId?: string | null;
  stripeChargeId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
};

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type BookingWebhookDeps = {
  getSupabaseAdmin: () => AdminClient;
  refundPaymentIntent: (paymentIntentId: string) => Promise<unknown>;
  retrievePaymentIntentChargeId: (paymentIntentId: string) => Promise<string | null>;
  upsertPaidBookingPayment: typeof upsertPaidBookingPayment;
  captureException: typeof Sentry.captureException;
  getPlatformFeeRate: typeof getPlatformFeeRate;
  deductCredits: typeof deductCredits;
  awardCredit: typeof awardCredit;
  sendBookingConfirmedStudent: typeof sendBookingConfirmedStudent;
  sendBookingConfirmedTeacher: typeof sendBookingConfirmedTeacher;
  sendCompanionEvolution: typeof sendCompanionEvolution;
  getCompanionStage: typeof getCompanionStage;
};

const defaultDeps: BookingWebhookDeps = {
  getSupabaseAdmin,
  refundPaymentIntent: (paymentIntentId) => stripe.refunds.create({ payment_intent: paymentIntentId }),
  retrievePaymentIntentChargeId,
  upsertPaidBookingPayment,
  captureException: Sentry.captureException,
  getPlatformFeeRate,
  deductCredits,
  awardCredit,
  sendBookingConfirmedStudent,
  sendBookingConfirmedTeacher,
  sendCompanionEvolution,
  getCompanionStage,
};

export function createConfirmBookingAndNotify(deps: BookingWebhookDeps) {
  return async function confirmBookingAndNotify(
  bookingId: string,
  paymentIntentId: string,
  piMetadata?: Record<string, string> | null,
  opts: ConfirmBookingOptions = {},
  ) {
  const admin = deps.getSupabaseAdmin();

  const { data: booking, error: fetchErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, date, time, slot_date, time_slot, credits_applied, price, duration_minutes, teaching_mode, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    console.error("[stripe/webhook] booking fetch", fetchErr);
    return;
  }

  const bookingStatus = String(booking.status ?? "");
  const alreadyConfirmed = bookingStatus === "confirmed" || bookingStatus === "completed";
  const existingBookingPaymentIntent =
    typeof (booking as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id === "string"
      ? (booking as { stripe_payment_intent_id: string }).stripe_payment_intent_id
      : null;

  if (alreadyConfirmed && existingBookingPaymentIntent && existingBookingPaymentIntent !== paymentIntentId) {
    console.warn("[stripe/webhook] confirmed booking has a different payment intent; refunding incoming payment", {
      bookingId,
      existingPaymentIntent: existingBookingPaymentIntent,
      incomingPaymentIntent: paymentIntentId,
    });
    try {
      await deps.refundPaymentIntent(paymentIntentId);
    } catch (re) {
      console.error("[stripe/webhook] refund failed", re);
    }
    return;
  }

  const slotDate = (booking as { slot_date?: string | null }).slot_date;
  const timeSlot = (booking as { time_slot?: string | null }).time_slot;

  if (!alreadyConfirmed && slotDate && timeSlot) {
    const { data: otherConfirmed } = await admin
      .from("bookings")
      .select("id")
      .eq("teacher_id", booking.teacher_id)
      .eq("slot_date", slotDate)
      .eq("time_slot", timeSlot)
      .eq("status", "confirmed")
      .neq("id", bookingId)
      .maybeSingle();

    if (otherConfirmed) {
      console.warn("[stripe/webhook] slot conflict after payment, refunding", bookingId);
      try {
        await deps.refundPaymentIntent(paymentIntentId);
      } catch (re) {
        console.error("[stripe/webhook] refund failed", re);
      }
      await admin.from("bookings").update({ status: "cancelled_conflict" }).eq("id", bookingId);
      return;
    }
  }

  let shouldSendConfirmation = false;
  if (!alreadyConfirmed) {
    const { data: updatedRows, error: updErr } = await admin
      .from("bookings")
      .update({ status: "confirmed", stripe_payment_intent_id: paymentIntentId })
      .eq("id", bookingId)
      .eq("status", "pending_payment")
      .select("id");

    if (updErr) {
      console.error("[stripe/webhook] booking update", updErr);
      return;
    }

    if (!updatedRows?.length) {
      const { data: currentBooking, error: currentErr } = await admin
        .from("bookings")
        .select("status, stripe_payment_intent_id")
        .eq("id", bookingId)
        .maybeSingle();
      const currentStatus = String((currentBooking as { status?: string | null } | null)?.status ?? "");
      const currentPaymentIntent =
        (currentBooking as { stripe_payment_intent_id?: string | null } | null)?.stripe_payment_intent_id ?? null;
      const wasConfirmedByConcurrentWebhook =
        !currentErr &&
        (currentStatus === "confirmed" || currentStatus === "completed") &&
        (!currentPaymentIntent || currentPaymentIntent === paymentIntentId);

      if (wasConfirmedByConcurrentWebhook) {
        if (!currentPaymentIntent) {
          await admin
            .from("bookings")
            .update({ stripe_payment_intent_id: paymentIntentId })
            .eq("id", bookingId)
            .is("stripe_payment_intent_id", null);
        }
        console.info("[stripe/webhook] booking already confirmed by another webhook delivery", bookingId);
      } else {
        console.warn("[stripe/webhook] booking not payable at confirm; refunding", {
          bookingId,
          currentStatus,
          currentPaymentIntent,
        });
        try {
          await deps.refundPaymentIntent(paymentIntentId);
        } catch (re) {
          console.error("[stripe/webhook] refund failed", re);
        }
        return;
      }
    }

    if (updatedRows?.length) {
      shouldSendConfirmation = true;
    }
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("user_id, name, discipline")
    .eq("id", booking.teacher_id)
    .maybeSingle();

  const { data: studentProfile } = await admin
    .from("profiles")
    .select("name, email, companion_type")
    .eq("id", booking.student_id)
    .maybeSingle();

  const studentName = (studentProfile?.name as string) || "Élève";
  const studentEmail = (studentProfile as { email?: string | null } | null)?.email ?? null;
  const companionType = (studentProfile as { companion_type?: string | null } | null)?.companion_type ?? null;
  const teacherName = (teacher?.name as string) || "Professeur";
  const teacherDiscipline = (teacher as { discipline?: string | null } | null)?.discipline ?? "Cours privé";
  const when = [booking.date, booking.time].filter(Boolean).join(" · ");

  // Fetch teacher email and commission plan
  let teacherEmail: string | null = null;
  let commissionRate = 0.1;
  if (teacher?.user_id) {
    const { data: teacherProf } = await admin
      .from("profiles")
      .select("email, plan")
      .eq("id", teacher.user_id as string)
      .maybeSingle();
    teacherEmail = (teacherProf as { email?: string | null } | null)?.email ?? null;
    const plan = (teacherProf as { plan?: string | null } | null)?.plan ?? "free";
    commissionRate = deps.getPlatformFeeRate(plan, "individual");
  }

  const amountFromMetadata = Number(piMetadata?.amount_cents ?? piMetadata?.payment_amount_cents ?? NaN);
  const amountCents =
    typeof opts.amountCents === "number" && Number.isFinite(opts.amountCents)
      ? opts.amountCents
      : Number.isFinite(amountFromMetadata)
        ? amountFromMetadata
        : Math.max(0, Math.round(Number((booking as { price?: number | string | null }).price ?? 0) * 100));
  const platformFeeFromMetadata = Number(piMetadata?.platform_fee_cents ?? NaN);
  const platformFeeCents = Number.isFinite(platformFeeFromMetadata)
    ? Math.max(0, Math.round(platformFeeFromMetadata))
    : Math.max(0, Math.round(amountCents * commissionRate));
  const teacherNetFromMetadata = Number(piMetadata?.teacher_net_cents ?? NaN);
  const teacherNetCents = Number.isFinite(teacherNetFromMetadata)
    ? Math.max(0, Math.round(teacherNetFromMetadata))
    : Math.max(0, amountCents - platformFeeCents);
  const stripeChargeId = opts.stripeChargeId ?? (await deps.retrievePaymentIntentChargeId(paymentIntentId).catch(() => null));

  try {
    await deps.upsertPaidBookingPayment(admin, {
      bookingId,
      teacherId: booking.teacher_id as string,
      studentId: booking.student_id as string,
      stripeCheckoutSessionId: opts.checkoutSessionId ?? null,
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId,
      amountCents,
      platformFeeCents,
      teacherNetCents,
      currency: opts.currency ?? "cad",
      transferGroup: piMetadata?.transfer_group ?? `booking_${bookingId}`,
      metadata: {
        ...(piMetadata ?? {}),
        webhook_source: opts.checkoutSessionId ? "checkout.session.completed" : "payment_intent.succeeded",
      },
    });
  } catch (ledgerErr) {
    console.error("[stripe/webhook] booking payment ledger upsert failed", ledgerErr);
    deps.captureException(ledgerErr, {
      tags: { surface: "stripe.webhook", phase: "ledger_upsert" },
      contexts: {
        booking_payment: {
          bookingId,
          paymentIntentId,
          amountCents,
          platformFeeCents,
          teacherNetCents,
          stripeChargeId,
          checkoutSessionId: opts.checkoutSessionId ?? null,
        },
      },
    });
    return;
  }

  if (!shouldSendConfirmation) {
    return;
  }

  const rows = [
    teacher?.user_id
      ? {
          user_id: teacher.user_id as string,
          title: "Paiement reçu",
          message: `${studentName} a payé une réservation${when ? ` (${when})` : ""}.`,
          type: "booking",
          read: false,
        }
      : null,
    {
      user_id: booking.student_id as string,
      title: "Réservation confirmée",
      message: `Votre paiement a été accepté. Cours avec ${teacherName}${when ? ` — ${when}` : ""}.`,
      type: "booking",
      read: false,
    },
  ].filter(Boolean) as Record<string, unknown>[];

  const { error: notifErr } = await admin.from("notifications").insert(rows);
  if (notifErr) {
    console.error("[stripe/webhook] notifications insert", notifErr);
  }

  // Booking confirmation emails
  const bookingDate = (booking.date as string | null) ?? (booking as { slot_date?: string | null }).slot_date ?? "—";
  const bookingTime = (booking.time as string | null) ?? (booking as { time_slot?: string | null }).time_slot ?? "—";
  const bookingPrice = Number((booking as { price?: number | string | null }).price ?? 0);
  const bookingDuration = Number((booking as { duration_minutes?: number | null }).duration_minutes ?? 60);
  const bookingMode = (booking as { teaching_mode?: string | null }).teaching_mode ?? "person";
  const locationLabel =
    bookingMode === "online" ? "En ligne" :
    bookingMode === "domicile" ? "À domicile" :
    "En studio";
  const creditsAppliedForEmail = Math.max(
    Number((booking as { credits_applied?: number | string | null }).credits_applied ?? 0),
    Number(piMetadata?.credits_applied ?? 0),
  );

  if (studentEmail) {
    try {
      await deps.sendBookingConfirmedStudent({
        email: studentEmail,
        name: studentName,
        teacherName,
        discipline: teacherDiscipline,
        date: bookingDate,
        time: bookingTime,
        durationMinutes: bookingDuration,
        price: bookingPrice,
        creditsApplied: creditsAppliedForEmail,
        location: locationLabel,
      });
    } catch (e) {
      console.error("[stripe/webhook] student booking email failed", e);
    }
  }

  if (teacherEmail) {
    try {
      await deps.sendBookingConfirmedTeacher({
        email: teacherEmail,
        name: teacherName,
        studentName,
        discipline: teacherDiscipline,
        date: bookingDate,
        time: bookingTime,
        durationMinutes: bookingDuration,
        price: bookingPrice,
        commissionRate,
        location: locationLabel,
      });
    } catch (e) {
      console.error("[stripe/webhook] teacher booking email failed", e);
    }
  }

  // Deduct credits — prefer booking column, fall back to PI metadata
  const creditsApplied = Math.max(
    Number((booking as { credits_applied?: number | string | null }).credits_applied ?? 0),
    Number(piMetadata?.credits_applied ?? 0),
  );
  if (creditsApplied > 0) {
    const { ok } = await deps.deductCredits(booking.student_id as string, creditsApplied, bookingId);
    if (!ok) console.warn("[stripe/webhook] credit deduction failed for booking", bookingId);
    // Mirror to booking row so subsequent webhook fires are idempotent
    await admin.from("bookings").update({ credits_applied: creditsApplied }).eq("id", bookingId);
  }

  // Companion evolution email (only celebratory notification).
  if (studentEmail && companionType && (companionType === "phoenix" || companionType === "forest" || companionType === "dragon" || companionType === "star")) {
    const { count } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("student_id", booking.student_id)
      .eq("status", "confirmed");

    const total = typeof count === "number" ? count : 0;
    const prev = Math.max(0, total - 1);
    const prevStage = deps.getCompanionStage(companionType, prev);
    const newStage = deps.getCompanionStage(companionType, total);
    if (prevStage.name !== newStage.name || prevStage.emoji !== newStage.emoji) {
      const companionName = COMPANIONS[companionType].name;
      // Milestone credit: $5/$10/$15/$25 depending on stage reached
      const newStageIndex = COMPANIONS[companionType].stages.findIndex(
        (s) => s.name === newStage.name && s.emoji === newStage.emoji,
      );
      const milestoneAmount = COMPANION_MILESTONE_AMOUNTS[newStageIndex] ?? 0;
      try {
        await deps.sendCompanionEvolution(
          studentEmail,
          studentName,
          companionName,
          prevStage.emoji,
          newStage.emoji,
          prevStage.name,
          newStage.name,
          milestoneAmount,
        );
      } catch (e) {
        console.error("[stripe/webhook] evolution email failed", e);
      }
      if (milestoneAmount > 0) {
        try {
          await deps.awardCredit(
            booking.student_id as string,
            "companion_evolution",
            `${companionName} : ${newStage.name} (+${milestoneAmount} $)`,
            `evolution:${bookingId}`,
            milestoneAmount,
          );
        } catch (e) {
          console.error("[stripe/webhook] evolution credit failed", e);
        }
      }
    }
  }
  };
}

export const confirmBookingAndNotify = createConfirmBookingAndNotify(defaultDeps);
