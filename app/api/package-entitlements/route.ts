import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isPackageRedemptionBookingEnabled,
  listActivePackageEntitlementsForTeacher,
} from "@/lib/offers/packageRedemptions";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/package-entitlements?teacher_id=...
 *
 * Lists the authenticated learner's active forfaits with remaining sessions
 * for one independent teacher. Used by BookingModal when redemption UI is ON.
 * Never assigns a different teacher.
 */
export async function GET(req: Request): Promise<Response> {
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

  const teacherId = new URL(req.url).searchParams.get("teacher_id")?.trim() ?? "";
  if (!teacherId || !UUID_RE.test(teacherId)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const entitlements = await listActivePackageEntitlementsForTeacher({
    admin: admin as never,
    studentId: user.id,
    teacherId,
  });

  return NextResponse.json({ entitlements });
}
