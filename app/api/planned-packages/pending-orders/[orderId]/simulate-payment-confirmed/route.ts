import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  canSimulatePlannedPackagePaymentConfirmed,
  canUsePlannedPackageFulfillmentEngine,
  simulatePlannedPackagePaymentConfirmedAndFulfill,
} from "@/lib/offers/plannedPackageFulfillment";

export const runtime = "nodejs";

/**
 * POST /api/planned-packages/pending-orders/[orderId]/simulate-payment-confirmed
 *
 * Trusted admin/dev simulation only. Never for learners.
 * No Stripe Checkout / PaymentIntent / transfer.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
): Promise<Response> {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  if (!canUsePlannedPackageFulfillmentEngine()) {
    return NextResponse.json({ error: "fulfillment_engine_disabled" }, { status: 403 });
  }
  if (!canSimulatePlannedPackagePaymentConfirmed()) {
    return NextResponse.json({ error: "payment_simulation_disabled" }, { status: 403 });
  }

  const { orderId } = await ctx.params;
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });
  }

  let body: { paymentReference?: string; idempotencyKey?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const paymentReference =
    typeof body.paymentReference === "string" && body.paymentReference.trim()
      ? body.paymentReference.trim()
      : `sim_${orderId}_${Date.now()}`;
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim().length >= 8
      ? body.idempotencyKey.trim()
      : `sim-fulfill-${orderId}`;

  const result = await simulatePlannedPackagePaymentConfirmedAndFulfill({
    orderId,
    paymentReference,
    idempotencyKey,
    actor: { kind: "admin", userId: auth.user.id },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        fulfillment: result.fulfillment ?? null,
        publicMessageKey: "plannedPackageFulfillmentNotPublic",
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    simulated: true,
    messageKey: "plannedPackagePaymentSimulationConfirmed",
    fulfillment: result.fulfillment,
    publicMessageKey: "plannedPackageSessionsConfirmed",
  });
}
