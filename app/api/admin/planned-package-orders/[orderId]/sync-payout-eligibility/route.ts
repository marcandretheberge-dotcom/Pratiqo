// Admin → Sync planned package payout eligibility (ledger only, no Stripe transfer)
//
//   POST /api/admin/planned-package-orders/[orderId]/sync-payout-eligibility

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
import { adminSyncPlannedPackagePayoutEligibility } from "@/lib/admin/plannedPackagePayoutEligibilityOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  if (!canUsePlannedPackageAdminOps()) {
    return NextResponse.json({ error: "admin_ops_disabled" }, { status: 403 });
  }

  const { orderId } = await context.params;

  try {
    const result = await adminSyncPlannedPackagePayoutEligibility({
      admin: auth.admin,
      orderId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      entries: result.entries,
      noStripeTransferCreated: true,
      noPayoutReleased: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/sync-payout-eligibility] POST failed", e);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
