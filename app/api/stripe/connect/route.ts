import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { logError } from "@/lib/log";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  connectStatusFromStripeAccount,
  summarizeConnectStatus,
  syncTeacherConnectStatus,
} from "@/lib/payments/connect";
import { SITE_URL } from "@/lib/seo/site";
import {
  isPayoutMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";

export const runtime = "nodejs";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function publicBase(): string {
  const raw = process.env.APP_BASE_URL?.trim() || process.env.STRIPE_CHECKOUT_BASE_URL?.trim() || SITE_URL;
  return trimTrailingSlash(raw);
}

async function authenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { user: null, error: NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { user: null, error: NextResponse.json({ error: "Missing Supabase env." }, { status: 500 }) };
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return { user: null, error: NextResponse.json({ error: "Invalid or expired session." }, { status: 401 }) };
  }

  return { user, error: null };
}

export async function GET(req: Request) {
  try {
    const auth = await authenticatedUser(req);
    if (auth.error) return auth.error;
    const user = auth.user!;

    const admin = getSupabaseAdmin();
    const { data: teacher, error: teacherErr } = await admin
      .from("teachers")
      .select(
        "id, country_code, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_requirements_due, stripe_connect_disabled_reason, stripe_connect_last_synced_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (teacherErr || !teacher) {
      return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
    }

    const teacherCountryCode = (teacher as { country_code?: string | null }).country_code ?? "";
    if (!isPayoutMarketSupported(teacherCountryCode)) {
      return NextResponse.json({
        ...marketNotSupportedPayload(teacherCountryCode),
        stripe_account_id: null,
        canReceivePayments: false,
        stripe_connect_onboarding_complete: false,
        stripe_connect_charges_enabled: false,
        stripe_connect_payouts_enabled: false,
        stripe_connect_requirements_due: [],
        stripe_connect_disabled_reason: "market_not_supported",
        stripe_connect_last_synced_at: null,
      });
    }

    const accountId = (teacher as { stripe_account_id?: string | null }).stripe_account_id?.trim();
    if (!accountId) {
      return NextResponse.json({
        stripe_account_id: null,
        canReceivePayments: false,
        stripe_connect_onboarding_complete: false,
        stripe_connect_charges_enabled: false,
        stripe_connect_payouts_enabled: false,
        stripe_connect_requirements_due: [],
        stripe_connect_disabled_reason: null,
        stripe_connect_last_synced_at: null,
      });
    }

    const account = await stripe.accounts.retrieve(accountId);
    const status = await syncTeacherConnectStatus(admin, account, {
      teacherId: (teacher as { id: string }).id,
      userId: user.id,
    });

    return NextResponse.json(status);
  } catch (e) {
    console.error("[stripe/connect][GET]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Stripe Connect status error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticatedUser(req);
    if (auth.error) return auth.error;
    const user = auth.user!;

    const base = publicBase();
    const admin = getSupabaseAdmin();

    // Ensure teacher row exists (id is text; we use user.id as stable string id)
    const [{ data: existingTeacher }, { data: profile }] = await Promise.all([
      admin
      .from("teachers")
      .select("id, stripe_account_id, name, user_id, country_code")
      .eq("user_id", user.id)
        .maybeSingle(),
      admin.from("profiles").select("country_code").eq("id", user.id).maybeSingle(),
    ]);

    const teacherCountryCode =
      (existingTeacher as { country_code?: string | null } | null)?.country_code ??
      (profile as { country_code?: string | null } | null)?.country_code ??
      "";
    if (!isPayoutMarketSupported(teacherCountryCode)) {
      return NextResponse.json(marketNotSupportedPayload(teacherCountryCode), { status: 403 });
    }

    const teacherId = (existingTeacher as { id?: string } | null)?.id ?? user.id;
    const teacherName = (existingTeacher as { name?: string } | null)?.name ?? (user.user_metadata?.full_name as string) ?? "Professeur";

    let stripeAccountId = (existingTeacher as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;
    let connectStatus = null;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "CA",
        email: user.email ?? undefined,
        business_profile: {
          name: teacherName,
        },
        metadata: {
          pratiqo_user_id: user.id,
          pratiqo_teacher_id: teacherId,
        },
      });
      stripeAccountId = account.id;
      connectStatus = summarizeConnectStatus(connectStatusFromStripeAccount(account));

      // Create teacher row if missing, otherwise update connect id
      if (!existingTeacher) {
        await admin.from("teachers").insert({
          id: teacherId,
          user_id: user.id,
          name: teacherName,
          discipline: "—",
          category: "Musique",
          price_per_lesson: 50,
          bio: "",
          image_url: (user.user_metadata?.avatar_url as string) || "https://picsum.photos/seed/teacher/400/400",
          availability: [],
          location: {},
          is_verified: false,
          teaching_mode: "both",
          languages: [],
          levels: [],
          ...connectStatusFromStripeAccount(account),
        });
      } else {
        await syncTeacherConnectStatus(admin, account, { teacherId, userId: user.id });
      }
    } else {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      connectStatus = await syncTeacherConnectStatus(admin, account, { teacherId, userId: user.id });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      refresh_url: `${base}/onboarding?stripe=refresh`,
      return_url: `${base}/onboarding?stripe=success`,
    });

    return NextResponse.json({ url: accountLink.url, stripe_account_id: stripeAccountId, connect_status: connectStatus });
  } catch (e: unknown) {
    if (e instanceof Stripe.errors.StripeInvalidRequestError) {
      logError("[stripe/connect][POST] StripeInvalidRequestError", {
        type: e.type,
        statusCode: e.statusCode ?? null,
        requestId: e.requestId ?? null,
        message: e.message,
      });
      const msg = e.message.toLowerCase();
      const connectNotEnabled =
        msg.includes("signed up for connect") ||
        msg.includes("dashboard.stripe.com/connect") ||
        /create new accounts.*connect/i.test(e.message);
      if (connectNotEnabled) {
        return NextResponse.json(
          {
            error:
              "Stripe Connect is not enabled for this platform account. Enable Connect in Stripe Dashboard, then try again.",
          },
          { status: 502 },
        );
      }
      return NextResponse.json({ error: "Stripe Connect request could not be completed." }, { status: 400 });
    }

    const message = e instanceof Error ? e.message : "Stripe Connect error";
    logError("[stripe/connect][POST] unexpected error", {
      message,
      name: e instanceof Error ? e.name : typeof e,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

