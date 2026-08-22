// Teacher → list own planned packages sold (read-only)

import { NextResponse } from "next/server";
import { isTeacherPlannedPackageDashboardEnabled } from "@/lib/offers/plannedPackageTeacherDashboard";
import { listTeacherPlannedPackagesForOwner } from "@/lib/offers/plannedPackageTeacherDto";
import { requireOwnedTeacher } from "@/lib/offers/requireOwnedTeacher";

export const runtime = "nodejs";

/**
 * GET /api/teacher/planned-packages
 *
 * Authenticated teacher only. Own planned package orders — safe DTO.
 * No teacher-triggered transfer/refund/reversal. No mutations.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isTeacherPlannedPackageDashboardEnabled()) {
    return NextResponse.json(
      { error: "teacher_planned_package_dashboard_disabled" },
      { status: 400 },
    );
  }

  const owned = await requireOwnedTeacher(req);
  if (!owned.ok) return owned.response;

  const packages = await listTeacherPlannedPackagesForOwner({
    admin: owned.context.admin as never,
    teacherId: owned.context.teacherId,
  });

  return NextResponse.json({
    packages,
    readOnly: true,
    noTeacherTransferExecution: true,
    noTeacherRefundExecution: true,
    noTeacherReversalExecution: true,
  });
}
