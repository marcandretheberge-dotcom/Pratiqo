// Teacher → get one own planned package order (read-only)

import { NextResponse } from "next/server";
import { isTeacherPlannedPackageDashboardEnabled } from "@/lib/offers/plannedPackageTeacherDashboard";
import { getTeacherPlannedPackageForOwner } from "@/lib/offers/plannedPackageTeacherDto";
import { requireOwnedTeacher } from "@/lib/offers/requireOwnedTeacher";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ orderId: string }> };

/**
 * GET /api/teacher/planned-packages/[orderId]
 *
 * Authenticated teacher only. Own order — 404 if another teacher's.
 */
export async function GET(req: Request, context: RouteContext): Promise<Response> {
  if (!isTeacherPlannedPackageDashboardEnabled()) {
    return NextResponse.json(
      { error: "teacher_planned_package_dashboard_disabled" },
      { status: 400 },
    );
  }

  const owned = await requireOwnedTeacher(req);
  if (!owned.ok) return owned.response;

  const { orderId } = await context.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const pkg = await getTeacherPlannedPackageForOwner({
    admin: owned.context.admin as never,
    teacherId: owned.context.teacherId,
    orderId: orderId.trim(),
  });

  if (!pkg) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    package: pkg,
    readOnly: true,
    noTeacherTransferExecution: true,
    noTeacherRefundExecution: true,
    noTeacherReversalExecution: true,
  });
}
