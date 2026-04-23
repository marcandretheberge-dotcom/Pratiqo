import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function checkoutPublicBase(): string {
  const raw = process.env.STRIPE_CHECKOUT_BASE_URL?.trim() || "https://pratiqo.vercel.app";
  return trimTrailingSlash(raw);
}

type Body =
  | { action?: "start" }
  | { action: "cancel"; subscriptionId: string };

export async function POST(req: Request) {
  try {
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
    if (body?.action === "cancel") {
      // Best-effort immediate downgrade: cancel at Stripe and flip plan to free.
      const subscriptionId = body.subscriptionId;
      await stripe.subscriptions.cancel(subscriptionId);
      const admin = getSupabaseAdmin();
      await admin.from("profiles").update({ plan: "free" }).eq("id", user.id);
      return NextResponse.json({ ok: true });
    }

    const baseUrl = checkoutPublicBase();
    const successUrl = encodeURI(`${baseUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`);
    const cancelUrl = encodeURI(`${baseUrl}/upgrade`);

    // Stripe Checkout subscription (CAD $29/mo) without requiring pre-created Price.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      metadata: {
        user_id: user.id,
        purpose: "pratiqo_pro",
      },
      subscription_data: {
        metadata: { user_id: user.id, purpose: "pratiqo_pro" },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: 2900,
            recurring: { interval: "month" },
            product_data: { name: "Pratiqo Pro" },
          },
        },
      ],
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    if (e instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: e.message, stripeType: e.type, stripeCode: e.code ?? null },
        { status: 400 },
      );
    }
    const message = e instanceof Error ? e.message : "Stripe subscription error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

