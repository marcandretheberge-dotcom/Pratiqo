// Admin → Planned package payout eligibility (read-only ledger, no Stripe transfer)
//
//   GET /api/admin/planned-package-orders/[orderId]/payout-eligibility

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { canUsePlannedPackageAdminOps } from "@/lib/offers/plannedPackageAdminOps";
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
    const payout = await getAdminPlannedPackagePayoutEligibilityContext(auth.admin, orderId);

    if (!payout.enabled) {
      return NextResponse.json(
        { error: "payout_eligibility_disabled", payout },
        { status: 403 },
      );
    }

    return NextResponse.json({
      payout,
      readOnly: true,
      noStripeTransferCreated: true,
      noPayoutReleased: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/payout-eligibility] GET failed", e);
    return NextResponse.json({ error: "payout_eligibility_load_failed" }, { status: 500 });
  }
}
