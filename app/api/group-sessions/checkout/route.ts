import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { GroupSessionRow } from "@/lib/groupSessions";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function checkoutPublicBase(): string {
  const raw = process.env.STRIPE_CHECKOUT_BASE_URL?.trim() || "https://pratiqo.vercel.app";
  return trimTrailingSlash(raw);
}

const GROUP_COMMISSION = 0.05;

type Body = { group_session_id?: string };

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY missing." }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Missing Supabase env." }, { status: 500 });
    }

    const supabaseUser = createClient(url, anonKey);
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const groupSessionId = body?.group_session_id?.trim();
    if (!groupSessionId) {
      return NextResponse.json({ error: "Expected group_session_id." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: session, error: sErr } = await admin
      .from("group_sessions")
      .select("*")
      .eq("id", groupSessionId)
      .maybeSingle();

    if (sErr || !session) {
      return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
    }

    const gs = session as GroupSessionRow;
    if (gs.status !== "open") {
      return NextResponse.json({ error: "Cette séance n'accepte plus d'inscriptions." }, { status: 400 });
    }

    const current = Number(gs.current_participants);
    const max = Number(gs.max_participants);
    if (!Number.isFinite(current) || !Number.isFinite(max) || current >= max) {
      return NextResponse.json({ error: "Séance complète." }, { status: 400 });
    }

    const { data: existing } = await admin
      .from("group_registrations")
      .select("id")
      .eq("session_id", groupSessionId)
      .eq("student_id", user.id)
      .eq("status", "confirmed")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Tu es déjà inscrit à cette séance." }, { status: 400 });
    }

    const dollars = Number(gs.price_per_person);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
    }
    const unitAmountCents = Math.round(dollars * 100);
    if (unitAmountCents < 50) {
      return NextResponse.json({ error: "Montant minimum Stripe non atteint." }, { status: 400 });
    }

    const { data: teacher } = await admin
      .from("teachers")
      .select("id, name, stripe_account_id, user_id")
      .eq("id", gs.teacher_id)
      .maybeSingle();

    const typed = teacher as { id: string; name: string; stripe_account_id?: string | null; user_id?: string | null };
    const destination = typed?.stripe_account_id?.trim() || null;
    const applicationFeeAmount = Math.max(0, Math.round(unitAmountCents * GROUP_COMMISSION));

    if (!destination) {
      console.warn("[group-sessions/checkout] Missing teacher.stripe_account_id; skipping Connect fees.");
    }

    const baseUrl = checkoutPublicBase();
    const successUrl = encodeURI(`${baseUrl}/group-sessions/${groupSessionId}/success?session_id={CHECKOUT_SESSION_ID}`);
    const cancelUrl = encodeURI(`${baseUrl}/group-sessions/${groupSessionId}`);

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: groupSessionId,
      metadata: {
        checkout_kind: "group_session",
        group_session_id: groupSessionId,
        student_id: user.id,
        teacher_id: gs.teacher_id,
        price_paid_dollars: String(dollars),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: unitAmountCents,
            product_data: {
              name: `Cours de groupe — ${gs.title}`,
              description: [gs.date, gs.time].filter(Boolean).join(" · ") || undefined,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: {
          checkout_kind: "group_session",
          group_session_id: groupSessionId,
          student_id: user.id,
          teacher_id: gs.teacher_id,
          price_paid_dollars: String(dollars),
        },
        ...(destination
          ? {
              application_fee_amount: applicationFeeAmount,
              transfer_data: { destination },
            }
          : {}),
      },
    });

    if (!stripeSession.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return NextResponse.json({ url: stripeSession.url });
  } catch (e: unknown) {
    if (e instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[group-sessions/checkout]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout error" }, { status: 500 });
  }
}
