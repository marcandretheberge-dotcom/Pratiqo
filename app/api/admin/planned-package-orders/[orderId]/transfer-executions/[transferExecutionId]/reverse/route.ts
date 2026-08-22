// Admin → Execute manual Stripe transfer reversal for succeeded planned package transfer

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
import { adminExecutePlannedPackageTransferReversal } from "@/lib/admin/plannedPackageTransferReversalOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string; transferExecutionId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  if (!canUsePlannedPackageAdminOps()) {
    return NextResponse.json({ error: "admin_ops_disabled" }, { status: 403 });
  }

  const { orderId, transferExecutionId } = await context.params;

  let body: {
    amountCents?: number;
    reversalReason?: string;
    adminNote?: string;
    confirm?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.confirm !== "REVERSE") {
    return NextResponse.json({ error: "reversal_confirmation_required" }, { status: 400 });
  }

  if (!body.reversalReason?.trim()) {
    return NextResponse.json({ error: "reversal_reason_required" }, { status: 400 });
  }

  try {
    const result = await adminExecutePlannedPackageTransferReversal({
      admin: auth.admin,
      orderId,
      transferExecutionId,
      amountCents:
        body.amountCents === undefined || body.amountCents === null
          ? undefined
          : Number(body.amountCents),
      reversalReason: body.reversalReason.trim(),
      adminNote: body.adminNote?.trim(),
      adminUserId: auth.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, blockers: result.blockers },
        { status: result.status },
      );
    }

    return NextResponse.json({
      reversalExecution: result.reversalExecution,
      reusedExisting: result.reusedExisting,
      noStripeRefundExecuted: true,
      noNewTransferCreated: true,
      noPayoutReleased: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/transfer-executions/reverse] POST failed", e);
    return NextResponse.json({ error: "transfer_reversal_execution_failed" }, { status: 500 });
  }
}
