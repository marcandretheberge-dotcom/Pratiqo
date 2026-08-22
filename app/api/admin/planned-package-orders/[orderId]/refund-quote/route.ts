// Admin → Generate planned package refund quote (estimate only, no Stripe refund)

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminGeneratePlannedPackageRefundQuote } from "@/lib/admin/plannedPackageRefundOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  const { orderId } = await context.params;
  let body: {
    supersedeExisting?: boolean;
    adminAdjustmentCents?: number;
    adminAdjustmentReason?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const result = await adminGeneratePlannedPackageRefundQuote({
      admin: auth.admin,
      orderId,
      adminUserId: auth.user.id,
      supersedeExisting: body.supersedeExisting === true,
      adminAdjustmentCents: body.adminAdjustmentCents,
      adminAdjustmentReason: body.adminAdjustmentReason,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          blockers: result.blockers,
          noStripeRefundExecuted: true,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      quote: result.quote,
      request: result.request,
      noStripeRefundExecuted: true,
      noAutomaticRefund: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/refund-quote] POST failed", e);
    return NextResponse.json({ error: "quote_failed" }, { status: 500 });
  }
}
