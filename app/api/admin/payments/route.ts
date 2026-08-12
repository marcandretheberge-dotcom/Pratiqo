// Admin → Payments operations (read-only)
//
//   GET /api/admin/payments
//
// Security:
//   1. Bearer JWT required
//   2. requireAdminApi() verifies profiles.role === "admin"
//   3. Service-role reads of booking_payments + bookings + profiles
//
// What this does NOT do:
//   - No refunds / payouts / payment capture
//   - No Stripe secrets or metadata dumps
//   - No checkout/payment math changes
//   - No promo-code application

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  ADMIN_PAYMENT_STATUSES,
  listAdminPayments,
} from "@/lib/admin/bookingPaymentOperations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  try {
    const url = new URL(req.url);
    const result = await listAdminPayments(auth.admin, {
      paymentStatus: url.searchParams.get("status"),
      q: url.searchParams.get("q"),
      studentId: url.searchParams.get("studentId"),
      teacherId: url.searchParams.get("teacherId"),
      needsAttention: url.searchParams.get("needsAttention") === "1",
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      limit: Number(url.searchParams.get("limit") ?? 100) || 100,
    });

    return NextResponse.json({
      payments: result.payments,
      summary: result.summary,
      statuses: ADMIN_PAYMENT_STATUSES,
      readOnly: true,
    });
  } catch (e) {
    console.error("[admin/payments] GET failed", e);
    return NextResponse.json(
      { error: "Impossible de charger les paiements." },
      { status: 500 },
    );
  }
}
