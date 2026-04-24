import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

async function confirmBookingAndNotify(bookingId: string, paymentIntentId: string) {
  const admin = getSupabaseAdmin();

  const { data: booking, error: fetchErr } = await admin
    .from("bookings")
    .select("id, teacher_id, student_id, status, date, time")
    .eq("id", bookingId)
    .maybeSingle();

  if (fetchErr || !booking) {
    console.error("[stripe/webhook] booking fetch", fetchErr);
    return;
  }

  if (booking.status === "confirmed") {
    return;
  }

  const { error: updErr } = await admin
    .from("bookings")
    .update({ status: "confirmed", stripe_payment_intent_id: paymentIntentId })
    .eq("id", bookingId);

  if (updErr) {
    console.error("[stripe/webhook] booking update", updErr);
    return;
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("user_id, name")
    .eq("id", booking.teacher_id)
    .maybeSingle();

  const { data: studentProfile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", booking.student_id)
    .maybeSingle();

  const studentName = (studentProfile?.name as string) || "Élève";
  const teacherName = (teacher?.name as string) || "Professeur";
  const when = [booking.date, booking.time].filter(Boolean).join(" · ");

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
}

async function setUserPlanFromSubscription(subscription: Stripe.Subscription) {
  const userId = (subscription.metadata?.user_id as string | undefined) ?? undefined;
  if (!userId) return;

  const isPro =
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due";

  const admin = getSupabaseAdmin();
  const plan = isPro ? "pro" : "free";
  // Stripe API 2026+: period bounds live on subscription items, not the subscription root.
  const currentPeriodEnd = subscription.items?.data?.[0]?.current_period_end ?? null;
  const expiresAt =
    subscription.cancel_at_period_end && typeof currentPeriodEnd === "number"
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null;

  const { error } = await admin
    .from("profiles")
    .update({ plan, plan_expires_at: expiresAt })
    .eq("id", userId);
  if (error) console.error("[stripe/webhook] plan update failed", error);
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
          await confirmBookingAndNotify(bookingId, pi.id);
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
          await confirmBookingAndNotify(bookingId, piId);
        }
      }

      // Pro plan: subscription checkout completion
      if (sess.mode === "subscription") {
        const subId = typeof sess.subscription === "string" ? sess.subscription : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await setUserPlanFromSubscription(sub);
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await setUserPlanFromSubscription(sub);
    }
  } catch (e) {
    console.error("[stripe/webhook] handler error", e);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
