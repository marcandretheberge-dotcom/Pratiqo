// Student → list own planned packages (read-only)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isStudentPlannedPackageDashboardEnabled } from "@/lib/offers/plannedPackageStudentDashboard";
import { listStudentPlannedPackagesForOwner } from "@/lib/offers/plannedPackageStudentDto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/student/planned-packages
 *
 * Authenticated student only. Own planned package orders — safe DTO.
 * No Stripe/payout/refund execution internals. No mutations.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isStudentPlannedPackageDashboardEnabled()) {
    return NextResponse.json(
      { error: "student_planned_package_dashboard_disabled" },
      { status: 400 },
    );
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

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const packages = await listStudentPlannedPackagesForOwner({
    admin: admin as never,
    studentId: user.id,
  });

  return NextResponse.json({
    packages,
    readOnly: true,
    noPayoutDetails: true,
    noSelfServeRefund: true,
  });
}
