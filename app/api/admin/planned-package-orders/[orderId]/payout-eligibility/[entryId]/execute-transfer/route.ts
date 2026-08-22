// Admin → Execute manual Stripe transfer for eligible planned package payout entry

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
import { adminExecutePlannedPackageManualTransfer } from "@/lib/admin/plannedPackageTransferOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string; entryId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  if (!canUsePlannedPackageAdminOps()) {
    return NextResponse.json({ error: "admin_ops_disabled" }, { status: 403 });
  }

  const { orderId, entryId } = await context.params;

  let body: { confirm?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.confirm !== "TRANSFER") {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }

  try {
    const result = await adminExecutePlannedPackageManualTransfer({
      admin: auth.admin,
      orderId,
      entryId,
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
      reusedExisting: result.reusedExisting,
      noTransferReversalExecuted: true,
      noPayoutReleased: true,
      noStripeRefundExecuted: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/payout-eligibility/execute-transfer] POST failed", e);
    return NextResponse.json({ error: "transfer_execution_failed" }, { status: 500 });
  }
}
