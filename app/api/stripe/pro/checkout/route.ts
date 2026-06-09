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
import {
  MEMBRE_PRO_BILLING_CYCLE,
  MEMBRE_PRO_CONSENT_VERSION,
  MEMBRE_PRO_PLAN,
  getMembreProRenewalConsentText,
} from "@/lib/config/membrePro";
import type { Locale } from "@/lib/i18n/types";

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
 * Read the JSON body and extract the required V9 R02 consent flags.
 *
 * Missing, malformed, non-JSON, or non-boolean values return null so
 * the POST handler can fail closed before any Stripe call. Both consent
 * flags must be true. We never start a Pro subscription
 * unless the automatic-renewal disclosure and legal acceptance were
 * explicitly accepted in the request body.
 */
async function readConsentBody(
  req: Request,
): Promise<{
  renewalAccepted: boolean | null;
  legalAccepted: boolean | null;
  locale: Locale;
}> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { renewalAccepted: null, legalAccepted: null, locale: "fr" };
  }
  try {
    const raw = (await req.json()) as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") {
      return { renewalAccepted: null, legalAccepted: null, locale: "fr" };
    }
    const requestedLocale = raw.locale === "en" || raw.locale === "es" ? raw.locale : "fr";
    return {
      renewalAccepted:
        typeof raw.renewalAccepted === "boolean" ? raw.renewalAccepted : null,
      legalAccepted:
        typeof raw.legalAccepted === "boolean" ? raw.legalAccepted : null,
      locale: requestedLocale,
    };
  } catch {
    return { renewalAccepted: null, legalAccepted: null, locale: "fr" };
  }
}

export const RENEWAL_CONSENT_REQUIRED_ERROR_CODE =
  "renewal_consent_required" as const;
export const LEGAL_ACCEPTANCE_REQUIRED_ERROR_CODE =
  "legal_acceptance_required" as const;

export async function POST(req: Request) {
  try {
    const { renewalAccepted, legalAccepted, locale } = await readConsentBody(req);
    if (renewalAccepted !== true) {
      return NextResponse.json(
        {
          error:
            "Membre Pro automatic-renewal consent is required before checkout can start.",
          code: RENEWAL_CONSENT_REQUIRED_ERROR_CODE,
        },
        { status: 400 },
      );
    }
    if (legalAccepted !== true) {
      return NextResponse.json(
        {
          error:
            "Membre Pro legal acceptance is required before checkout can start.",
          code: LEGAL_ACCEPTANCE_REQUIRED_ERROR_CODE,
        },
        { status: 400 },
      );
    }

    const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim();
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRO_MONTHLY_PRICE_ID is not configured." }, { status: 500 });
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
    const consentAcceptedAt = new Date().toISOString();
    const renewalConsentText = getMembreProRenewalConsentText(locale);
    const userAgent = req.headers.get("user-agent")?.slice(0, 240) ?? "";
    const requestIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    const priceCents = String(Math.round(MEMBRE_PRO_PLAN.proMonthlyPriceCad * 100));
    const consentMetadata = {
      user_id: user.id,
      teacher_id: teacher.id as string,
      plan: "membre_pro",
      checkout_kind: "pratiqo_pro",
      price_cents: priceCents,
      currency: "CAD",
      billing_cycle: MEMBRE_PRO_BILLING_CYCLE,
      renewal_consent_version: MEMBRE_PRO_CONSENT_VERSION,
      renewal_consent_text: renewalConsentText,
      renewal_accepted: "true",
      legal_accepted: "true",
      consent_accepted_at: consentAcceptedAt,
      consent_locale: locale,
      user_agent: userAgent,
      request_ip: requestIp.slice(0, 80),
    } satisfies Record<string, string>;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${base}/teacher/settings?pro=success`,
      cancel_url: `${base}/teacher/settings?pro=cancelled`,
      client_reference_id: user.id,
      metadata: consentMetadata,
      subscription_data: {
        metadata: {
          user_id: user.id,
          teacher_id: teacher.id as string,
          plan: "membre_pro",
          product: "pratiqo_pro",
          renewal_consent_version: MEMBRE_PRO_CONSENT_VERSION,
          renewal_accepted: "true",
          legal_accepted: "true",
          consent_accepted_at: consentAcceptedAt,
        },
      },
      line_items: [{ price: priceId, quantity: 1 }],
    });

    console.info("[stripe/pro/checkout] membre pro consent proof recorded", {
      userId: user.id,
      teacherId: teacher.id,
      checkoutSessionId: session.id,
      plan: "membre_pro",
      priceCents,
      currency: "CAD",
      billingCycle: MEMBRE_PRO_BILLING_CYCLE,
      renewalConsentVersion: MEMBRE_PRO_CONSENT_VERSION,
      renewalAccepted: true,
      legalAccepted: true,
      consentAcceptedAt,
      locale,
      hasUserAgent: Boolean(userAgent),
      hasRequestIp: Boolean(requestIp),
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
