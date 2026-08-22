// Admin → Safe planned package fulfillment retry
//
//   POST /api/admin/planned-package-orders/[orderId]/retry-fulfillment
//
// Creates no transfer, refund, or duplicate bookings when idempotent.

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminRetryPlannedPackageFulfillment } from "@/lib/admin/plannedPackageOrderOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  const { orderId } = await context.params;

  try {
    const result = await adminRetryPlannedPackageFulfillment({
      admin: auth.admin,
      orderId,
      adminUserId: auth.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          blockers: result.blockers,
          noTeacherTransferMade: true,
          noRefundMade: true,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      fulfillment: result.fulfillment,
      noTeacherTransferMade: true,
      noRefundMade: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/retry] POST failed", e);
    return NextResponse.json(
      { error: "Impossible de réessayer le fulfillment." },
      { status: 500 },
    );
  }
}
