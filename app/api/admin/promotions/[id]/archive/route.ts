// Admin → Archive a promo code
//
//   POST /api/admin/promotions/:id/archive
//
// Security: requireAdminApi + service-role update + audit log.
// Does not touch Stripe or checkout.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { setAdminPromoCodeStatus } from "@/lib/admin/promotions";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Params) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;
  const { admin, user: actor } = auth;

  const { id } = await ctx.params;
  const result = await setAdminPromoCodeStatus(admin, actor, id, "archived");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  console.log(`[admin/promotions] archive actor=${actor.id} promo=${result.promo.id}`);
  return NextResponse.json({ ok: true, promo: result.promo });
}
