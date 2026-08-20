import { NextResponse } from "next/server";
import { requireOwnedTeacher } from "@/lib/offers/requireOwnedTeacher";
import {
  isTeacherPackageVisibilityEnabled,
  listTeacherPackagesForOwner,
} from "@/lib/offers/teacherPackages";

export const runtime = "nodejs";

/**
 * GET /api/teacher/packages
 *
 * Read-only list of forfaits purchased with the authenticated teacher.
 * Snapshot fields only; never live teacher_offers. No balance mutations.
 *
 * See docs/product/marketplace-independent-teacher-guardrails.md.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isTeacherPackageVisibilityEnabled()) {
    return NextResponse.json({ error: "teacher_package_visibility_disabled" }, { status: 400 });
  }

  const owned = await requireOwnedTeacher(req);
  if (!owned.ok) return owned.response;

  const packages = await listTeacherPackagesForOwner({
    admin: owned.context.admin as never,
    teacherId: owned.context.teacherId,
  });

  return NextResponse.json({ packages });
}
