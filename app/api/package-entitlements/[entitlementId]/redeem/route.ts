import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isPackageRedemptionBookingEnabled,
  parsePackageRedemptionRequest,
  redeemPackageSessionBooking,
} from "@/lib/offers/packageRedemptions";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Params = { params: Promise<{ entitlementId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/package-entitlements/[entitlementId]/redeem
 *
 * Redeems one session from a forfait purchased from the same independent teacher.
 * Creates a confirmed booking without Stripe checkout. Atomic via Postgres RPC.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md.
 */
export async function POST(req: Request, ctx: Params): Promise<Response> {
  if (!isPackageRedemptionBookingEnabled()) {
    return NextResponse.json({ error: "package_redemption_disabled" }, { status: 400 });
  }

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

  const { entitlementId } = await ctx.params;
  if (!entitlementId || !UUID_RE.test(entitlementId)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = parsePackageRedemptionRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const result = await redeemPackageSessionBooking({
    admin: {
      rpc: async (fn, args) => {
        const { data, error } = await admin.rpc(fn, args);
        return {
          data,
          error: error
            ? { message: error.message, code: error.code }
            : null,
        };
      },
    },
    entitlementId,
    studentId: user.id,
    request: parsed.data,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    booking: { id: result.bookingId },
    redemption: {
      id: result.redemptionId,
      sessionNumber: result.sessionNumber,
    },
    entitlement: {
      id: result.entitlementId,
      remainingSessions: result.remainingSessions,
      usedSessions: result.usedSessions,
      status: result.entitlementStatus,
    },
    idempotent: result.idempotent,
  });
}
