import { blockUnsupportedNativePurchase } from "@/lib/mobile/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPlannedPackageStripeCheckoutSession } from "@/lib/offers/createPlannedPackageStripeCheckoutSession";
import { canUsePlannedPackageStripeCheckout } from "@/lib/offers/plannedPackageStripeCheckout";

export const runtime = "nodejs";

type Params = { params: Promise<{ orderId: string }> };

async function requireStudentUser(req: Request): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, response: NextResponse.json({ error: "server_error" }, { status: 500 }) };
  }
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  return { ok: true, userId: data.user.id };
}

/**
 * POST /api/planned-packages/pending-orders/[orderId]/checkout
 *
 * Creates a gated Stripe Checkout Session for the student's pending order.
 * No transfer, payout, entitlement, or booking at creation time.
 */
export async function POST(req: Request, ctx: Params) {
  const nativeBlock = blockUnsupportedNativePurchase(req);
  if (nativeBlock) return nativeBlock;
  if (!canUsePlannedPackageStripeCheckout()) {
    return NextResponse.json({ error: "planned_package_checkout_disabled" }, { status: 403 });
  }

  const auth = await requireStudentUser(req);
  if (!auth.ok) return auth.response;

  const { orderId } = await ctx.params;
  if (!orderId) {
    return NextResponse.json({ error: "order_not_found" }, { status: 400 });
  }

  let learnerPackageTermsAccepted = false;
  try {
    const body = (await req.json()) as { learnerPackageTermsAccepted?: unknown };
    learnerPackageTermsAccepted = body?.learnerPackageTermsAccepted === true;
  } catch {
    // Empty body is allowed only when terms were already stored on the order.
  }

  try {
    const result = await createPlannedPackageStripeCheckoutSession({
      orderId,
      studentId: auth.userId,
      learnerPackageTermsAccepted,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      url: result.url,
      sessionId: result.sessionId,
      reused: result.reused,
    });
  } catch {
    return NextResponse.json({ error: "stripe_checkout_failed" }, { status: 500 });
  }
}
