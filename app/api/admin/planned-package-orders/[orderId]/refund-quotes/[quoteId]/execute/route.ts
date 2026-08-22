// Admin → Execute approved planned package refund quote (Stripe refund, admin-only)

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminExecutePlannedPackageManualRefund } from "@/lib/admin/plannedPackageRefundOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string; quoteId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  const { orderId, quoteId } = await context.params;

  let body: { confirm?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.confirm !== "REFUND") {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }

  try {
    const result = await adminExecutePlannedPackageManualRefund({
      admin: auth.admin,
      orderId,
      quoteId,
      adminUserId: auth.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, blockers: result.blockers },
        { status: result.status },
      );
    }

    return NextResponse.json({
      execution: result.execution,
      order: result.order,
      reusedExisting: result.reusedExisting,
      noTransferReversalExecuted: true,
      noPayoutReleased: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/refund-quotes/execute] POST failed", e);
    return NextResponse.json({ error: "refund_execution_failed" }, { status: 500 });
  }
}
