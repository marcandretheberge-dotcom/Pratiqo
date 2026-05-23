import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { deductCredits } from "@/lib/credits";
import {
  sendBookingConfirmedStudent,
  sendBookingConfirmedTeacher,
  sendProUpgrade,
  sendIdentityVerified,
  sendIdentityFailed,
} from "@/lib/email";
import { EMAIL_FALLBACK_LOCALE, resolveEmailLocaleForUser } from "@/lib/email/locale";
import { formatEmailLessonScheduleLabels } from "@/lib/email/formatSchedule";
import { formatEmailTeachingLocation } from "@/lib/email/messages/booking";
import { syncTeacherConnectStatus } from "@/lib/payments/connect";
import {
  chargeIdFromPaymentIntent,
  retrievePaymentIntentChargeId,
  upsertPaidBookingPayment,
} from "@/lib/payments/ledger";
import {
  finalizeLessonPaymentLedger,
  shouldDeferPaymentIntentLedgerFinalizationFromMetadata,
  shouldFinalizeStripeTaxFromCheckoutSessionMetadata,
} from "@/lib/payments/tax";
import {
  handleStripeChargeDisputeCreated,
  handleStripeTransferFailed,
} from "@/lib/payments/webhookRiskEvents";
import { issueLessonPaymentReceipt } from "@/lib/payments/receipts";

export const runtime = "nodejs";

async function confirmGroupSessionCheckout(
  metadata: Record<string, string> | null | undefined,
  paymentIntentId: string,
) {
  if (!metadata || metadata.checkout_kind !== "group_session") return;

  const groupSessionId = metadata.group_session_id;
  const studentId = metadata.student_id;
  if (!groupSessionId || !studentId) {
    console.warn("[stripe/webhook] group session missing ids", metadata);
    return;
  }

  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("group_registrations")
    .select("id")
    .eq("session_id", groupSessionId)
    .eq("student_id", studentId)
    .eq("status", "confirmed")
    .maybeSingle();

  if (existing) {
    return;
  }

  const { data: gs, error: gErr } = await admin.from("group_sessions").select("*").eq("id", groupSessionId).maybeSingle();
  if (gErr || !gs) {
    console.error("[stripe/webhook] group session fetch", gErr);
    return;
  }

  const session = gs as {
    id: string;
    teacher_id: string;
    max_participants: number;
    current_participants: number;
    status: string;
    title: string;
    date: string | null;
    time: string | null;
    price_per_person: number | string;
  };

  if (session.status !== "open" && session.status !== "full") {
    return;
  }

  const current = Number(session.current_participants);
  const max = Number(session.max_participants);
  if (current >= max) {
    console.warn("[stripe/webhook] group session already full", groupSessionId);
    return;
  }

  const pricePaid = Number(metadata.price_paid_dollars ?? session.price_per_person);
  const { error: insErr } = await admin.from("group_registrations").insert({
    session_id: groupSessionId,
    student_id: studentId,
    status: "confirmed",
    stripe_payment_intent_id: paymentIntentId,
    price_paid: pricePaid,
  });

  if (insErr) {
    if (insErr.code === "23505") return;
    console.error("[stripe/webhook] group registration insert", insErr);
    return;
  }

  const nextCount = current + 1;
  const nextStatus = nextCount >= max ? "full" : "open";
  await admin
    .from("group_sessions")
    .update({ current_participants: nextCount, status: nextStatus })
    .eq("id", groupSessionId);

  const { data: teacher } = await admin.from("teachers").select("user_id, name").eq("id", session.teacher_id).maybeSingle();
  const { data: studentProfile } = await admin.from("profiles").select("name").eq("id", studentId).maybeSingle();
  const studentName = (studentProfile?.name as string) || "Élève";
  const teacherName = (teacher?.name as string) || "Professeur";
  const when = [session.date, session.time].filter(Boolean).join(" · ");

  const rows = [
    teacher?.user_id
      ? {
          user_id: teacher.user_id as string,
          title: "Inscription cours de groupe",
          message: `${studentName} s'est inscrit(e) à « ${session.title} »${when ? ` (${when})` : ""}.`,
          type: "booking",
          read: false,
        }
      : null,
    {
      user_id: studentId,
      title: "Paiement confirmé",
      message: `Ta place pour le cours de groupe « ${session.title} » avec ${teacherName} est confirmée${when ? ` — ${when}` : ""}.`,
      type: "booking",
      read: false,
    },
  ].filter(Boolean) as Record<string, unknown>[];

  const { error: notifErr } = await admin.from("notifications").insert(rows);
  if (notifErr) {
    console.error("[stripe/webhook] group notifications", notifErr);
  }
}

async function confirmBookingAndNotify(
  bookingId: string,
  paymentIntentId: string,
  piMetadata?: Record<string, string> | null,
  opts: {
    checkoutSessionId?: string | null;
    stripeChargeId?: string | null;
    amountCents?: number | null;
    currency?: string | null;
    checkoutSession?: Stripe.Checkout.Session | null;
    checkoutLineItems?: Stripe.LineItem[] | null;
    deferPaymentLedger?: boolean;
  } = {},
) {
  const admin = getSupabaseAdmin();

  const { data: booking, error: fetchErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, date, time, slot_date, time_slot, credits_applied, price, duration_minutes, teaching_mode")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    console.error("[stripe/webhook] booking fetch", fetchErr);
    return;
  }

  const bookingStatus = String(booking.status ?? "");
  const alreadyConfirmed = bookingStatus === "confirmed" || bookingStatus === "completed";

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
        await stripe.refunds.create({ payment_intent: paymentIntentId });
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
      console.warn("[stripe/webhook] booking not pending_payment at confirm; refunding", bookingId);
      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
      } catch (re) {
        console.error("[stripe/webhook] refund failed", re);
      }
      return;
    }

    shouldSendConfirmation = true;
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("user_id, name, discipline")
    .eq("id", booking.teacher_id)
    .maybeSingle();

  const { data: studentProfile } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", booking.student_id)
    .maybeSingle();

  const studentName = (studentProfile?.name as string) || "Élève";
  const studentEmail = (studentProfile as { email?: string | null } | null)?.email ?? null;
  const teacherName = (teacher?.name as string) || "Professeur";
  const teacherDiscipline = (teacher as { discipline?: string | null } | null)?.discipline ?? "Cours privé";
  const when = [booking.date, booking.time].filter(Boolean).join(" · ");

  // Fetch teacher email and commission plan
  let teacherEmail: string | null = null;
  type TeacherCommissionProfile = {
    email?: string | null;
    plan?: string | null;
    loyalty_tier?: string | null;
    loyalty_annual_volume?: number | string | null;
  };
  let teacherProfile: TeacherCommissionProfile | null = null;
  if (teacher?.user_id) {
    const { data: teacherProf } = await admin
      .from("profiles")
      .select("email, plan, loyalty_tier, loyalty_annual_volume")
      .eq("id", teacher.user_id as string)
      .maybeSingle();
    teacherProfile = (teacherProf as TeacherCommissionProfile | null) ?? null;
    teacherEmail = teacherProfile?.email ?? null;
  }

  const stripeChargeId = opts.stripeChargeId ?? (await retrievePaymentIntentChargeId(paymentIntentId).catch(() => null));

  if (!opts.deferPaymentLedger) {
    const ledger = finalizeLessonPaymentLedger({
      checkoutSession: opts.checkoutSession ?? null,
      lineItems: opts.checkoutLineItems ?? null,
      piMetadata: piMetadata ?? null,
      amountCentsFromStripe: opts.amountCents ?? null,
      bookingPriceDollars: (booking as { price?: number | string | null }).price,
      teacherPlan: teacherProfile?.plan ?? "free",
      loyaltyTier: piMetadata?.loyalty_tier ?? teacherProfile?.loyalty_tier ?? null,
      annualVolumeCents: Math.round(Math.max(0, Number(teacherProfile?.loyalty_annual_volume ?? 0)) * 100),
    });

    if (!ledger.ok) {
      console.error("[stripe/webhook] lesson payment tax finalization failed:", ledger.reason);
    }

    try {
      await upsertPaidBookingPayment(admin, {
        bookingId,
        teacherId: booking.teacher_id as string,
        studentId: booking.student_id as string,
        stripeCheckoutSessionId: opts.checkoutSessionId ?? null,
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId,
        amountCents: ledger.amountCents,
        subtotalCents: ledger.subtotalCents,
        taxTotalCents: ledger.taxTotalCents,
        platformFeeCents: ledger.platformFeeCents,
        teacherNetCents: ledger.teacherNetCents,
        taxBehavior: ledger.taxBehavior,
        taxStatus: ledger.taxStatus,
        taxSnapshot: ledger.taxSnapshot,
        gstCents: ledger.gstCents,
        qstCents: ledger.qstCents,
        currency: opts.currency ?? "cad",
        transferGroup: piMetadata?.transfer_group ?? `booking_${bookingId}`,
        metadata: {
          ...(piMetadata ?? {}),
          webhook_source: opts.checkoutSessionId ? "checkout.session.completed" : "payment_intent.succeeded",
          tax_finalize_ok: String(ledger.ok),
          ...(ledger.ok ? {} : { tax_finalize_error: ledger.reason }),
        },
      });
    } catch (ledgerErr) {
      console.error("[stripe/webhook] booking payment ledger upsert failed", ledgerErr);
      return;
    }

    if (ledger.ok) {
      try {
        await issueLessonPaymentReceipt(admin, {
          bookingId,
          stripeChargeId,
          sendEmail: true,
        });
      } catch (receiptErr) {
        console.error("[stripe/webhook] lesson receipt issue failed", receiptErr);
      }
    }
  }

  const commissionRateFromMetadata = Number(piMetadata?.commission_rate ?? NaN);
  const commissionRate = Number.isFinite(commissionRateFromMetadata) ? commissionRateFromMetadata : 0.1;

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
  const bookingTiming = {
    slot_date: (booking as { slot_date?: string | null }).slot_date,
    date: booking.date as string | null,
    time_slot: (booking as { time_slot?: string | null }).time_slot,
    time: booking.time as string | null,
  };
  const bookingPrice = Number((booking as { price?: number | string | null }).price ?? 0);
  const bookingDuration = Number((booking as { duration_minutes?: number | null }).duration_minutes ?? 60);
  const bookingMode = (booking as { teaching_mode?: string | null }).teaching_mode ?? "person";
  const meetingUrl = (booking as { meeting_url?: string | null }).meeting_url ?? null;
  const [studentLocale, teacherLocale] = await Promise.all([
    resolveEmailLocaleForUser(admin, booking.student_id as string),
    teacher?.user_id
      ? resolveEmailLocaleForUser(admin, teacher.user_id as string)
      : Promise.resolve(EMAIL_FALLBACK_LOCALE),
  ]);
  const studentLocationLabel = formatEmailTeachingLocation(studentLocale, bookingMode, meetingUrl);
  const teacherLocationLabel = formatEmailTeachingLocation(teacherLocale, bookingMode, meetingUrl);
  const studentSchedule = formatEmailLessonScheduleLabels(bookingTiming, studentLocale);
  const teacherSchedule = formatEmailLessonScheduleLabels(bookingTiming, teacherLocale);
  const creditsAppliedForEmail = Math.max(
    Number((booking as { credits_applied?: number | string | null }).credits_applied ?? 0),
    Number(piMetadata?.credits_applied ?? 0),
  );

  if (studentEmail) {
    try {
      await sendBookingConfirmedStudent({
        email: studentEmail,
        name: studentName,
        teacherName,
        discipline: teacherDiscipline,
        date: studentSchedule.dateLabel,
        time: studentSchedule.timeLabel,
        durationMinutes: bookingDuration,
        price: bookingPrice,
        creditsApplied: creditsAppliedForEmail,
        location: studentLocationLabel,
        locale: studentLocale,
      });
    } catch (e) {
      console.error("[stripe/webhook] student booking email failed", e);
    }
  }

  if (teacherEmail) {
    try {
      await sendBookingConfirmedTeacher({
        email: teacherEmail,
        name: teacherName,
        studentName,
        discipline: teacherDiscipline,
        date: teacherSchedule.dateLabel,
        time: teacherSchedule.timeLabel,
        durationMinutes: bookingDuration,
        price: bookingPrice,
        commissionRate,
        location: teacherLocationLabel,
        locale: teacherLocale,
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
    const { ok } = await deductCredits(booking.student_id as string, creditsApplied, bookingId);
    if (!ok) console.warn("[stripe/webhook] credit deduction failed for booking", bookingId);
    // Mirror to booking row so subsequent webhook fires are idempotent
    await admin.from("bookings").update({ credits_applied: creditsApplied }).eq("id", bookingId);
  }
}

function stripeId(value: string | { id?: string } | null | undefined): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value.id === "string") return value.id;
  return null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (typeof itemEnd === "number") return new Date(itemEnd * 1000).toISOString();
  const rootEnd = (subscription as unknown as { current_period_end?: number | null }).current_period_end;
  return typeof rootEnd === "number" ? new Date(rootEnd * 1000).toISOString() : null;
}

async function resolveSubscriptionUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const metadataUserId = subscription.metadata?.user_id;
  if (metadataUserId) return metadataUserId;

  const admin = getSupabaseAdmin();
  const subscriptionId = subscription.id;
  const customerId = stripeId(subscription.customer);
  const query = admin.from("profiles").select("id").limit(1);
  const { data } = subscriptionId
    ? await query.eq("stripe_subscription_id", subscriptionId).maybeSingle()
    : customerId
      ? await query.eq("stripe_customer_id", customerId).maybeSingle()
      : { data: null };
  return (data as { id?: string } | null)?.id ?? null;
}

async function setUserPlanFromSubscription(subscription: Stripe.Subscription, fallback?: { userId?: string | null; customerId?: string | null }) {
  const userId = fallback?.userId ?? (await resolveSubscriptionUserId(subscription));
  if (!userId) {
    console.warn("[stripe/webhook] subscription missing user id", subscription.id);
    return;
  }

  const admin = getSupabaseAdmin();
  const customerId = fallback?.customerId ?? stripeId(subscription.customer);
  const status = String(subscription.status);
  const plan = status === "active" || status === "trialing" ? "pro" : "free";
  const periodEnd = subscriptionPeriodEnd(subscription);
  const startedAt = plan === "pro" ? new Date().toISOString() : null;

  const { data: previous } = await admin
    .from("profiles")
    .select("plan, pro_started_at")
    .eq("id", userId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    plan,
    subscription_status: status,
    stripe_subscription_id: subscription.id,
    pro_current_period_end: periodEnd,
    pro_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    plan_expires_at: subscription.cancel_at_period_end ? periodEnd : null,
  };
  if (customerId) patch.stripe_customer_id = customerId;
  if (plan === "pro" && !(previous as { pro_started_at?: string | null } | null)?.pro_started_at) {
    patch.pro_started_at = startedAt;
  }

  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) console.error("[stripe/webhook] plan update failed", error);

  const wasPro = String((previous as { plan?: string | null } | null)?.plan ?? "free").toLowerCase() === "pro";
  if (!wasPro && plan === "pro") {
    try {
      const { data: prof } = await admin
        .from("profiles")
        .select("name, email")
        .eq("id", userId)
        .maybeSingle();
      const profName = (prof as { name?: string | null } | null)?.name ?? "Professeur";
      const profEmail = (prof as { email?: string | null } | null)?.email ?? null;
      if (profEmail) {
        const locale = await resolveEmailLocaleForUser(admin, userId);
        await sendProUpgrade(profEmail, profName, locale);
      }
    } catch (e) {
      console.error("[stripe/webhook] pro upgrade email failed", e);
    }
  }
}

async function syncSubscriptionFromInvoice(invoice: Stripe.Invoice) {
  const parent = (invoice as unknown as {
    subscription?: string | Stripe.Subscription | null;
    parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  }).subscription ?? (invoice as unknown as { parent?: { subscription_details?: { subscription?: string | null } | null } | null }).parent?.subscription_details?.subscription;
  const subscriptionId = stripeId(parent);
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await setUserPlanFromSubscription(subscription);
}

async function handleConnectAccountUpdated(account: Stripe.Account) {
  const admin = getSupabaseAdmin();
  try {
    await syncTeacherConnectStatus(admin, account);
  } catch (e) {
    console.error("[stripe/webhook] connect account sync failed", e);
  }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verify failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.checkout_kind === "group_session") {
        await confirmGroupSessionCheckout(pi.metadata as Record<string, string>, pi.id);
      } else {
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await confirmBookingAndNotify(bookingId, pi.id, pi.metadata as Record<string, string>, {
            stripeChargeId: chargeIdFromPaymentIntent(pi),
            amountCents: pi.amount_received || pi.amount,
            currency: pi.currency,
            deferPaymentLedger: shouldDeferPaymentIntentLedgerFinalizationFromMetadata(pi.metadata),
          });
        }
      }
    }

    if (event.type === "checkout.session.completed") {
      const sess = event.data.object as Stripe.Checkout.Session;
      const md = sess.metadata as Record<string, string> | undefined;
      const piField = sess.payment_intent;
      const piId =
        typeof piField === "string"
          ? piField
          : piField && typeof piField === "object" && "id" in piField
            ? (piField as Stripe.PaymentIntent).id
            : null;

      if (md?.checkout_kind === "group_session" && piId) {
        await confirmGroupSessionCheckout(md, piId);
      } else {
        const bookingId = sess.metadata?.booking_id;
        if (bookingId && piId) {
          const stripeChargeId = await retrievePaymentIntentChargeId(piId).catch(() => null);
          let checkoutSession: Stripe.Checkout.Session = sess;
          let checkoutLineItems: Stripe.LineItem[] | undefined;
          if (shouldFinalizeStripeTaxFromCheckoutSessionMetadata(md ?? sess.metadata)) {
            const expanded = await stripe.checkout.sessions.retrieve(sess.id, {
              expand: ["line_items.data.taxes", "line_items.data.price.product"],
            });
            checkoutSession = expanded;
            checkoutLineItems = expanded.line_items?.data ?? undefined;
          }
          await confirmBookingAndNotify(bookingId, piId, md, {
            checkoutSessionId: sess.id,
            stripeChargeId,
            amountCents: sess.amount_total ?? null,
            currency: sess.currency,
            checkoutSession,
            checkoutLineItems,
            deferPaymentLedger: false,
          });
        }
      }

      // Pro plan: subscription checkout completion
      if (sess.mode === "subscription") {
        const subId = typeof sess.subscription === "string" ? sess.subscription : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await setUserPlanFromSubscription(sub, {
            userId: sess.metadata?.user_id ?? sess.client_reference_id ?? null,
            customerId: stripeId(sess.customer),
          });
        }
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      await setUserPlanFromSubscription(sub);
    }

    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
      await syncSubscriptionFromInvoice(event.data.object as Stripe.Invoice);
    }

    if (event.type === "account.updated") {
      await handleConnectAccountUpdated(event.data.object as Stripe.Account);
    }

    const eventType = event.type as string;
    if (eventType === "transfer.failed") {
      await handleStripeTransferFailed(
        getSupabaseAdmin(),
        event.data.object as Stripe.Transfer,
        event.id,
      );
    }

    if (eventType === "charge.dispute.created") {
      await handleStripeChargeDisputeCreated(
        getSupabaseAdmin(),
        event.data.object as Stripe.Dispute,
        event.id,
      );
    }

    // ── Stripe Identity ────────────────────────────────────────────────────
    if (event.type === "identity.verification_session.verified") {
      console.log("[stripe/webhook] ← identity.verification_session.verified received | event:", event.id);
      await handleIdentityVerified(event.data.object as Stripe.Identity.VerificationSession);
    }

    if (event.type === "identity.verification_session.requires_input") {
      console.log("[stripe/webhook] ← identity.verification_session.requires_input received | event:", event.id);
      await handleIdentityFailed(event.data.object as Stripe.Identity.VerificationSession);
    }

    if (event.type === "identity.verification_session.canceled") {
      console.log("[stripe/webhook] ← identity.verification_session.canceled received | event:", event.id);
      await handleIdentityCanceled(event.data.object as Stripe.Identity.VerificationSession);
    }
  } catch (e) {
    console.error("[stripe/webhook] handler error", e);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Stripe Identity handlers ──────────────────────────────────────────────────

async function handleIdentityVerified(session: Stripe.Identity.VerificationSession) {
  console.log("[identity/verified] session.id:", session.id, "| status:", session.status);
  console.log("[identity/verified] metadata:", JSON.stringify(session.metadata));

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[identity/verified] ABORT — user_id missing from metadata. Full metadata:", session.metadata);
    return;
  }

  // Verify the admin client is using the service role key (not anon key).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(
    "[identity/verified] admin key check — present:", Boolean(serviceKey),
    "| length:", serviceKey?.length ?? 0,
    "| looks like JWT:", serviceKey?.startsWith("eyJ") ?? false,
  );

  const admin = getSupabaseAdmin();

  // Idempotency check
  console.log("[identity/verified] checking existing record for user_id:", userId);
  const { data: existing, error: fetchErr } = await admin
    .from("teachers")
    .select("identity_verified")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[identity/verified] fetch existing failed:", fetchErr);
    return;
  }
  console.log("[identity/verified] existing row:", JSON.stringify(existing));

  if ((existing as { identity_verified?: boolean } | null)?.identity_verified) {
    console.log("[identity/verified] already verified — skipping update");
    return;
  }

  // DB update
  const updatePayload = {
    stripe_identity_status: "verified",
    stripe_identity_verified_at: new Date().toISOString(),
    identity_verified: true,
    identity_status: "verified",
    verification_level: 2,
  };
  console.log("[identity/verified] updating teachers row with:", JSON.stringify(updatePayload));

  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("id, identity_verified, stripe_identity_status");

  if (updateErr) {
    console.error("[identity/verified] DB UPDATE FAILED:", JSON.stringify(updateErr));
    return;
  }
  console.log("[identity/verified] DB update succeeded. Rows affected:", updateData?.length ?? 0, "| data:", JSON.stringify(updateData));

  if (!updateData?.length) {
    console.warn("[identity/verified] UPDATE matched 0 rows — no teacher row with user_id:", userId);
  }

  // In-app notification
  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: userId,
    title: "Identité vérifiée ✓",
    message: "Votre identité a été confirmée par Stripe. Votre badge « Identité vérifiée » est maintenant visible sur votre profil.",
    type: "system",
    read: false,
  });
  if (notifErr) console.warn("[identity/verified] notification insert failed:", notifErr);
  else console.log("[identity/verified] notification inserted for user:", userId);

  // Email
  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();
    const profEmail = (prof as { email?: string | null } | null)?.email ?? null;
    const profName = (prof as { name?: string | null } | null)?.name ?? "Professeur";
    console.log("[identity/verified] sending email to:", profEmail ?? "(no email found)");
    if (profEmail) {
      const locale = await resolveEmailLocaleForUser(admin, userId);
      await sendIdentityVerified(profEmail, profName, locale);
      console.log("[identity/verified] email sent");
    }
  } catch (e) {
    console.error("[identity/verified] email send failed:", e);
  }
}

async function handleIdentityFailed(session: Stripe.Identity.VerificationSession) {
  console.log("[identity/failed] session.id:", session.id, "| status:", session.status);
  console.log("[identity/failed] metadata:", JSON.stringify(session.metadata));

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[identity/failed] ABORT — user_id missing from metadata");
    return;
  }

  const reason =
    (session as unknown as { last_error?: { reason?: string } }).last_error?.reason ||
    "Vérification échouée";
  console.log("[identity/failed] failure reason:", reason);

  const admin = getSupabaseAdmin();

  const updatePayload = {
    stripe_identity_status: "failed",
    stripe_identity_failed_reason: reason,
    identity_status: "failed",
  };
  console.log("[identity/failed] updating teachers row with:", JSON.stringify(updatePayload));

  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("id, stripe_identity_status");

  if (updateErr) {
    console.error("[identity/failed] DB UPDATE FAILED:", JSON.stringify(updateErr));
  } else {
    console.log("[identity/failed] DB update succeeded. Rows affected:", updateData?.length ?? 0);
    if (!updateData?.length) {
      console.warn("[identity/failed] UPDATE matched 0 rows — no teacher row with user_id:", userId);
    }
  }

  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: userId,
    title: "Vérification d'identité échouée",
    message: "Votre vérification d'identité n'a pas abouti. Vous pouvez réessayer depuis la page Vérification.",
    type: "system",
    read: false,
  });
  if (notifErr) console.warn("[identity/failed] notification insert failed:", notifErr);

  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();
    const profEmail = (prof as { email?: string | null } | null)?.email ?? null;
    const profName = (prof as { name?: string | null } | null)?.name ?? "Professeur";
    console.log("[identity/failed] sending email to:", profEmail ?? "(no email found)");
    if (profEmail) {
      const locale = await resolveEmailLocaleForUser(admin, userId);
      await sendIdentityFailed(profEmail, profName, reason, locale);
      console.log("[identity/failed] email sent");
    }
  } catch (e) {
    console.error("[identity/failed] email send failed:", e);
  }
}

async function handleIdentityCanceled(session: Stripe.Identity.VerificationSession) {
  console.log("[identity/canceled] session.id:", session.id, "| status:", session.status);
  console.log("[identity/canceled] metadata:", JSON.stringify(session.metadata));

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[identity/canceled] ABORT — user_id missing from metadata");
    return;
  }

  const admin = getSupabaseAdmin();

  const updatePayload = { stripe_identity_status: "canceled", identity_status: "none" };
  console.log("[identity/canceled] updating teachers row with:", JSON.stringify(updatePayload));

  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("id, stripe_identity_status");

  if (updateErr) {
    console.error("[identity/canceled] DB UPDATE FAILED:", JSON.stringify(updateErr));
  } else {
    console.log("[identity/canceled] DB update succeeded. Rows affected:", updateData?.length ?? 0);
    if (!updateData?.length) {
      console.warn("[identity/canceled] UPDATE matched 0 rows — no teacher row with user_id:", userId);
    }
  }
}
