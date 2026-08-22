import { NextResponse } from "next/server";
import { requireOwnedTeacher } from "@/lib/offers/requireOwnedTeacher";
import {
  loadTeacherPackageTerms,
  recordTeacherPackageTermsAcknowledgment,
} from "@/lib/offers/plannedPackagePublicTerms";
import { PLANNED_PACKAGE_PUBLIC_TERMS_VERSION } from "@/lib/offers/plannedPackagePublicLaunchGate";
import { isPlannedPackagesEnabled } from "@/lib/offers/plannedPackages";

export const runtime = "nodejs";

/**
 * GET /api/teacher/planned-packages/terms
 * Read-only teacher package terms acknowledgment status.
 */
export async function GET(req: Request) {
  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  const terms = await loadTeacherPackageTerms(auth.context.teacherId);
  return NextResponse.json({
    termsVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
    acceptedAt: terms.acceptedAt,
    policyVersion: terms.policyVersion,
    accepted: Boolean(
      terms.acceptedAt && terms.policyVersion === PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
    ),
  });
}

/**
 * POST /api/teacher/planned-packages/terms
 * Record teacher acknowledgment of planned package terms (no offer publish side-effect).
 */
export async function POST(req: Request) {
  if (!isPlannedPackagesEnabled()) {
    return NextResponse.json({ error: "planned_packages_disabled" }, { status: 403 });
  }

  const auth = await requireOwnedTeacher(req);
  if (!auth.ok) return auth.response;

  let accepted = false;
  try {
    const body = (await req.json()) as { accepted?: unknown };
    accepted = body?.accepted === true;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (!accepted) {
    return NextResponse.json({ error: "teacher_package_terms_required" }, { status: 400 });
  }

  const result = await recordTeacherPackageTermsAcknowledgment(auth.context.teacherId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({
    termsVersion: result.policyVersion,
    acceptedAt: result.acceptedAt,
    policyVersion: result.policyVersion,
    accepted: true,
  });
}
