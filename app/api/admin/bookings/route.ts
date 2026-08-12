// Admin → Bookings operations (read-only)
//
//   GET /api/admin/bookings
//
// Security:
//   1. Bearer JWT required
//   2. requireAdminApi() verifies profiles.role === "admin"
//   3. Service-role reads of bookings + booking_payments + profiles
//
// What this does NOT do:
//   - No booking state transitions
//   - No refunds / cancellations / payouts
//   - No Stripe secrets or metadata dumps
//   - No checkout/payment math changes

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  ADMIN_BOOKING_STATUSES,
  listAdminBookings,
} from "@/lib/admin/bookingPaymentOperations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth.status === "error") return auth.response;

  try {
    const url = new URL(req.url);
    const result = await listAdminBookings(auth.admin, {
      status: url.searchParams.get("status"),
      q: url.searchParams.get("q"),
      studentId: url.searchParams.get("studentId"),
      teacherId: url.searchParams.get("teacherId"),
      needsAttention: url.searchParams.get("needsAttention") === "1",
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      limit: Number(url.searchParams.get("limit") ?? 100) || 100,
    });

    return NextResponse.json({
      bookings: result.bookings,
      summary: result.summary,
      statuses: ADMIN_BOOKING_STATUSES,
      readOnly: true,
    });
  } catch (e) {
    console.error("[admin/bookings] GET failed", e);
    return NextResponse.json(
      { error: "Impossible de charger les réservations." },
      { status: 500 },
    );
  }
}
