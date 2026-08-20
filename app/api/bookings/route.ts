import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPendingPaymentBooking, type BookingCreateAdmin } from "@/lib/bookings/createPendingPaymentBooking";
import { parseCreateBookingRequest } from "@/lib/bookings/parseCreateBookingRequest";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/bookings
 *
 * Server-owned booking creation. Replaces the previous BookingModal client
 * insert so teacher_offer_id can be validated and snapshotted server-side.
 *
 * The client may send teacher_offer_id only. Snapshot columns are ignored
 * and rejected if present.
 *
 * Checkout charges from immutable booking snapshots when ENABLE_OFFER_SNAPSHOT_CHECKOUT
 * is ON (PR 8). Legacy bookings without snapshots keep teacher DB pricing.
 */
export async function POST(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = parseCreateBookingRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const created = await createPendingPaymentBooking({
    admin: admin as unknown as BookingCreateAdmin,
    studentId: user.id,
    request: parsed.data,
  });
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  return NextResponse.json({ id: created.bookingId });
}
