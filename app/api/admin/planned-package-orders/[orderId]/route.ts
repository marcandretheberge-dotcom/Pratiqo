// Admin → Planned package order detail (read-only)
//
//   GET /api/admin/planned-package-orders/[orderId]

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
import { getAdminPlannedPackageOrderDetail } from "@/lib/admin/plannedPackageOrderOperations";
import { getAdminPlannedPackageRefundContext } from "@/lib/admin/plannedPackageRefundOperations";
import { getAdminPlannedPackagePayoutEligibilityContext } from "@/lib/admin/plannedPackagePayoutEligibilityOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  if (!canUsePlannedPackageAdminOps()) {
    return NextResponse.json({ error: "admin_ops_disabled" }, { status: 403 });
  }

  const { orderId } = await context.params;

  try {
    const order = await getAdminPlannedPackageOrderDetail(auth.admin, orderId);
    if (!order) {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    const refund = await getAdminPlannedPackageRefundContext(auth.admin, orderId);
    const payout = await getAdminPlannedPackagePayoutEligibilityContext(auth.admin, orderId);

    return NextResponse.json({
      order,
      refund,
      payout,
      readOnly: true,
      noTeacherTransferMade: true,
      noRefundMade: true,
      noStripeRefundExecuted: true,
      noStripeTransferCreated: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/detail] GET failed", e);
    return NextResponse.json(
      { error: "Impossible de charger la commande." },
      { status: 500 },
    );
  }
}
