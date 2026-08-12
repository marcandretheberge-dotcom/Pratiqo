// Admin → Promo codes foundation
//
//   GET  /api/admin/promotions          → list promo codes
//   POST /api/admin/promotions          → create a promo code
//
// Security model (defense in depth):
//   1. Bearer JWT required
//   2. requireAdminApi() verifies profiles.role === "admin" via service-role
//   3. Writes go through service-role only; admin_promo_codes has RLS with
//      zero JWT policies (deny-by-default)
//   4. Every create writes admin_audit_log
//
// What this does NOT do (intentional):
//   - Does not create Stripe coupons / promotion codes
//   - Does not change checkout / PaymentIntent math
//   - Does not change booking or commission rules
//   - Does not expose promo data publicly

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { createAdminPromoCode, listAdminPromoCodes } from "@/lib/admin/promotions";

export const runtime = "nodejs";

type PostBody = {
  code?: unknown;
  description?: unknown;
  discountType?: unknown;
  amountCents?: unknown;
  percentOff?: unknown;
  currency?: unknown;
  startsAt?: unknown;
  expiresAt?: unknown;
  maxTotalRedemptions?: unknown;
  maxRedemptionsPerUser?: unknown;
  newStudentsOnly?: unknown;
  marketCode?: unknown;
};

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin } = auth;

  try {
    const promos = await listAdminPromoCodes(admin);
    return NextResponse.json({
      promos,
      // Redemption counting is not wired yet — checkout does not apply these codes.
      usageCountAvailable: false,
    });
  } catch (e) {
    console.error("[admin/promotions] GET failed", e);
    return NextResponse.json(
      { error: "Impossible de charger les codes promo." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const result = await createAdminPromoCode(admin, actor, {
    code: body.code,
    description: body.description,
    discountType: body.discountType,
    amountCents: body.amountCents,
    percentOff: body.percentOff,
    currency: body.currency,
    startsAt: body.startsAt,
    expiresAt: body.expiresAt,
    maxTotalRedemptions: body.maxTotalRedemptions,
    maxRedemptionsPerUser: body.maxRedemptionsPerUser,
    newStudentsOnly: body.newStudentsOnly,
    marketCode: body.marketCode,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(
    `[admin/promotions] create actor=${actor.id} promo=${result.promo.id} code=${result.promo.code}`,
  );

  return NextResponse.json({ ok: true, promo: result.promo });
}
