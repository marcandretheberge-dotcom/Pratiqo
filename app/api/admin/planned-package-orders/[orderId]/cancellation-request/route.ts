// Admin → Create planned package cancellation request (no refund execution)

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCreatePlannedPackageCancellationRequest } from "@/lib/admin/plannedPackageRefundOperations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  const { orderId } = await context.params;
  let body: { reasonCode?: string; reasonNote?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const result = await adminCreatePlannedPackageCancellationRequest({
      admin: auth.admin,
      orderId,
      adminUserId: auth.user.id,
      reasonCode: body.reasonCode,
      reasonNote: body.reasonNote,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, noStripeRefundExecuted: true },
        { status: result.status },
      );
    }

    return NextResponse.json({
      request: result.request,
      noStripeRefundExecuted: true,
      noAutomaticRefund: true,
    });
  } catch (e) {
    console.error("[admin/planned-package-orders/cancellation-request] POST failed", e);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
