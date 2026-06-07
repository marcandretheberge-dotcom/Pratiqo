import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SITE_URL } from "@/lib/seo/site";
import {
  isMembreProMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";

export const runtime = "nodejs";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function publicBase(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.STRIPE_CHECKOUT_BASE_URL?.trim() ||
    SITE_URL;
  return trimTrailingSlash(raw);
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { user: null, error: "Missing Authorization bearer token." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { user: null, error: "Missing Supabase env." };

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(token);
  if (error || !user) return { user: null, error: "Invalid or expired session." };
  return { user, error: null };
}

/**
 * Read the JSON body if present and extract the V9 R02 consent flags.
 *
 * The body is *optional* for backward compatibility (legacy callers /
 * automated checks may POST without a JSON body), but when present the
 * `renewalAccepted` flag is treated as authoritative — a request that
 * sends `{ renewalAccepted: false }` is rejected even if the client UI
 * also has its own gating. We never start a Pro subscription on behalf
 * of a teacher who explicitly declined the auto-renewal disclosure.
 */
async function readConsentBody(
  req: Request,
): Promise<{ renewalAccepted: boolean | null; legalAccepted: boolean | null }> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { renewalAccepted: null, legalAccepted: null };
  }
  try {
    const raw = (await req.json()) as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") {
      return { renewalAccepted: null, legalAccepted: null };
    }
    return {
      renewalAccepted:
        typeof raw.renewalAccepted === "boolean" ? raw.renewalAccepted : null,
      legalAccepted:
        typeof raw.legalAccepted === "boolean" ? raw.legalAccepted : null,
    };
  } catch {
    return { renewalAccepted: null, legalAccepted: null };
  }
}

export const RENEWAL_CONSENT_REQUIRED_ERROR_CODE =
  "renewal_consent_required" as const;

export async function POST(req: Request) {
  try {
    const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim();
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRO_MONTHLY_PRICE_ID is not configured." }, { status: 500 });
    }

    // V9 R02 — explicit auto-renewal consent gate.
    // We accept legacy callers (no body) for backward compatibility, but
    // a body that explicitly says `renewalAccepted: false` is rejected
    // before any Stripe call.
    const { renewalAccepted, legalAccepted } = await readConsentBody(req);
    if (renewalAccepted === false || legalAccepted === false) {
      return NextResponse.json(
        {
          error:
            "Membre Pro automatic-renewal consent is required before checkout can start.",
          code: RENEWAL_CONSENT_REQUIRED_ERROR_CODE,
        },
        { status: 400 },
      );
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const [{ data: profile }, { data: teacher }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, email, name, role, country_code, stripe_customer_id, stripe_subscription_id, subscription_status")
        .eq("id", user.id)
        .maybeSingle(),
      admin.from("teachers").select("id,country_code").eq("user_id", user.id).maybeSingle(),
    ]);

    const role = String((profile as { role?: string | null } | null)?.role ?? "");
    if (role !== "teacher" || !teacher?.id) {
      return NextResponse.json({ error: "Only teacher accounts can start a Pro subscription." }, { status: 403 });
    }

    const teacherCountryCode =
      (teacher as { country_code?: string | null } | null)?.country_code ??
      (profile as { country_code?: string | null } | null)?.country_code ??
      "";
    if (!isMembreProMarketSupported(teacherCountryCode)) {
      return NextResponse.json(marketNotSupportedPayload(teacherCountryCode), { status: 403 });
    }

    let customerId = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id?.trim() ?? "";
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? (profile as { email?: string | null } | null)?.email ?? undefined,
        name: (profile as { name?: string | null } | null)?.name ?? undefined,
        metadata: {
          user_id: user.id,
          teacher_id: teacher.id as string,
          product: "pratiqo_pro",
        },
      });
      customerId = customer.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const base = publicBase();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${base}/teacher/settings?pro=success`,
      cancel_url: `${base}/teacher/settings?pro=cancelled`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        teacher_id: teacher.id as string,
        plan: "pro",
        checkout_kind: "pratiqo_pro",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          teacher_id: teacher.id as string,
          plan: "pro",
          product: "pratiqo_pro",
        },
      },
      line_items: [{ price: priceId, quantity: 1 }],
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
    const message = e instanceof Error ? e.message : "Stripe Pro checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
