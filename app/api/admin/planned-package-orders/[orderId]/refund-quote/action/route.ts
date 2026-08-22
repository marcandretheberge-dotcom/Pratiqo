// Admin → Approve refund quote for manual refund (marks only — no Stripe refund)

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  adminApprovePlannedPackageRefundQuote,
  adminMarkPlannedPackageRefundQuoteForReview,
} from "@/lib/admin/plannedPackageRefundOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  const { orderId } = await context.params;
  let body: { action?: string; quoteId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim() : "";
  if (!quoteId) {
    return NextResponse.json({ error: "quote_id_required" }, { status: 400 });
  }

  try {
    if (body.action === "mark_for_review") {
      const result = await adminMarkPlannedPackageRefundQuoteForReview({
        admin: auth.admin,
        orderId,
        quoteId,
        adminUserId: auth.user.id,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, noStripeRefundExecuted: true },
          { status: result.status },
        );
      }
      return NextResponse.json({
        quote: result.quote,
        noStripeRefundExecuted: true,
        actualRefundNotAvailable: true,
      });
    }

    const result = await adminApprovePlannedPackageRefundQuote({
      admin: auth.admin,
      orderId,
      quoteId,
      adminUserId: auth.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, noStripeRefundExecuted: true },
        { status: result.status },
      );
    }

    return NextResponse.json({
      quote: result.quote,
      request: result.request,
      noStripeRefundExecuted: true,
      actualRefundNotAvailable: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/refund-quote-action] POST failed", e);
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }
}
