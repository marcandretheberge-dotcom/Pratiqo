// Student → get own planned package order detail (read-only)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isStudentPlannedPackageDashboardEnabled } from "@/lib/offers/plannedPackageStudentDashboard";
import { getStudentPlannedPackageForOwner } from "@/lib/offers/plannedPackageStudentDto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

/**
 * GET /api/student/planned-packages/[orderId]
 *
 * Own order only. Returns 404 for other students' orders (no leak).
 */
export async function GET(req: Request, context: RouteContext): Promise<Response> {
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

  const { orderId } = await context.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const pkg = await getStudentPlannedPackageForOwner({
    admin: admin as never,
    studentId: user.id,
    orderId: orderId.trim(),
  });

  if (!pkg) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    package: pkg,
    readOnly: true,
    noPayoutDetails: true,
    noSelfServeRefund: true,
  });
}
