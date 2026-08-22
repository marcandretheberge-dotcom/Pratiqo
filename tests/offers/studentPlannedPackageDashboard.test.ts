/**
 * Student planned package dashboard — read-only learner visibility.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  isStudentPlannedPackageDashboardEnabled,
  isStudentPlannedPackageDashboardUiEnabled,
} from "@/lib/offers/plannedPackageStudentDashboard";
import {
  buildStudentPlannedPackageDto,
  mapStudentPlannedPackageSessionDto,
  STUDENT_PLANNED_PACKAGES_READ_ONLY,
} from "@/lib/offers/plannedPackageStudentDto";
import {
  mapStudentPlannedPackageDisplayStatus,
  studentPlannedPackageStatusLabelKey,
  STUDENT_PLANNED_PACKAGE_STATUS_READ_ONLY,
} from "@/lib/offers/plannedPackageStudentStatus";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";
import { mapStudentPackageTeacherDto } from "@/lib/offers/studentPackages";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function resetFlags() {
  delete process.env.ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD;
  delete process.env.NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD;
}

test("planned package student dashboard flags default OFF", () => {
  resetFlags();
  assert.equal(isStudentPlannedPackageDashboardEnabled(), false);
  assert.equal(isStudentPlannedPackageDashboardUiEnabled(), false);
  assert.equal(STUDENT_PLANNED_PACKAGES_READ_ONLY, true);
  assert.equal(STUDENT_PLANNED_PACKAGE_STATUS_READ_ONLY, true);
});

test("status mapping — pending payment / payment received / sessions", () => {
  assert.equal(
    mapStudentPlannedPackageDisplayStatus({
      orderStatus: "pending_payment",
      completedSessionCount: 0,
      sessionCount: 3,
      hasUpcomingSession: false,
    }),
    "payment_pending",
  );
  assert.equal(
    mapStudentPlannedPackageDisplayStatus({
      orderStatus: "payment_confirmed",
      completedSessionCount: 0,
      sessionCount: 3,
      hasUpcomingSession: false,
    }),
    "payment_received",
  );
  assert.equal(
    mapStudentPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 0,
      sessionCount: 3,
      hasUpcomingSession: true,
    }),
    "sessions_confirmed",
  );
  assert.equal(
    mapStudentPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 1,
      sessionCount: 3,
      hasUpcomingSession: true,
    }),
    "in_progress",
  );
  assert.equal(
    mapStudentPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 3,
      sessionCount: 3,
      hasUpcomingSession: false,
    }),
    "completed",
  );
});

test("status mapping — cancellation and refund review", () => {
  assert.equal(
    mapStudentPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      latestCancellationStatus: "requested",
      completedSessionCount: 0,
      sessionCount: 2,
      hasUpcomingSession: true,
    }),
    "cancellation_under_review",
  );
  assert.equal(
    mapStudentPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      latestQuoteStatus: "approved_for_manual_refund",
      completedSessionCount: 0,
      sessionCount: 2,
      hasUpcomingSession: true,
    }),
    "refund_under_review",
  );
  assert.equal(
    mapStudentPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      latestRefundExecutionStatus: "succeeded",
      completedSessionCount: 0,
      sessionCount: 2,
      hasUpcomingSession: false,
    }),
    "refunded",
  );
});

test("safe DTO excludes Stripe and payout internals", () => {
  const teacher = mapStudentPackageTeacherDto({
    id: "teacher-1",
    name: "Marie",
    public_profile_slug: "marie-piano",
    image_url: "https://example.com/m.jpg",
  });
  assert.ok(teacher);

  const sessions = [
    mapStudentPlannedPackageSessionDto(
      {
        id: "b1",
        status: "completed",
        lesson_date: "2026-08-01",
        time_slot: "10:00",
        planned_package_session_index: 1,
      },
      60,
    )!,
    mapStudentPlannedPackageSessionDto(
      {
        id: "b2",
        status: "confirmed",
        lesson_date: "2030-08-10",
        time_slot: "11:00",
        planned_package_session_index: 2,
      },
      60,
    )!,
  ];

  const dto = buildStudentPlannedPackageDto({
    order: {
      id: "order-1",
      title_snapshot: "Forfait piano 2",
      status: "fulfilled",
      session_count: 2,
      duration_minutes: 60,
      price_cents_snapshot: 10000,
      currency_snapshot: "CAD",
      refund_status: null,
    },
    teacher: teacher!,
    sessions,
  });
  assert.ok(dto);
  assert.equal(dto!.sessionCount, 2);
  assert.equal(dto!.completedSessionCount, 1);
  assert.equal(dto!.remainingSessionCount, 1);
  assert.equal(dto!.nextSession?.bookingId, "b2");
  assert.equal(dto!.status, "in_progress");

  const json = JSON.stringify(dto);
  assert.doesNotMatch(json, /stripe_payment_intent|stripe_checkout_session|stripe_refund|stripe_transfer/i);
  assert.doesNotMatch(json, /teacher_net|platform_fee|blocker|admin_note|reconciliation/i);
  assert.equal(dto!.supportUrl, "/resolution");
});

test("API routes require auth and gate flag; no mutation", () => {
  const list = read("app/api/student/planned-packages/route.ts");
  assert.match(list, /isStudentPlannedPackageDashboardEnabled/);
  assert.match(list, /listStudentPlannedPackagesForOwner/);
  assert.match(list, /student_planned_package_dashboard_disabled/);
  assert.match(list, /unauthenticated/);
  assert.doesNotMatch(list, /refunds\.create|transfers\.create|createReversal|\.insert\(|\.update\(/);

  const detail = read("app/api/student/planned-packages/[orderId]/route.ts");
  assert.match(detail, /getStudentPlannedPackageForOwner/);
  assert.match(detail, /not_found/);
  assert.doesNotMatch(detail, /refunds\.create|transfers\.create/);
});

test("dashboard UI and nav gate planned package flags", () => {
  const dash = read("components/student/StudentPackageDashboard.tsx");
  assert.match(dash, /isStudentPlannedPackageDashboardUiEnabled/);
  assert.match(dash, /\/api\/student\/planned-packages/);
  assert.match(dash, /StudentPlannedPackageCard/);
  assert.doesNotMatch(dash, /execute-transfer|execute refund|teacher_net/);

  const card = read("components/student/StudentPlannedPackageCard.tsx");
  assert.match(card, /studentPlannedPackagesProposedByTeacher/);
  assert.match(card, /plannedPackageDashboardNoFinancialAction/);
  assert.doesNotMatch(card, /stripe_|teacher_net|platform_fee|Salaire|Employeur/);

  const shell = read("components/AppShell.tsx");
  assert.match(shell, /isStudentPlannedPackageDashboardUiEnabled/);
  assert.match(shell, /studentTabPackages/);
});

test("admin readiness shows student planned package dashboard layer", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.studentPlannedPackageDashboardPresent, true);
  assert.equal(readiness.checks.studentPlannedPackageDashboardSafeDto, true);
  assert.equal(readiness.checks.studentPlannedPackageDashboardNoSelfServeRefund, true);
  assert.equal(typeof readiness.flags.studentPlannedPackageDashboard, "boolean");
  assert.equal(readiness.flags.studentPlannedPackageDashboard, false);

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /forfaits planifiés gated/i);
  assert.match(page, /pas de remboursement self-serve/i);
});

test("docs and i18n present; marketplace-safe copy", () => {
  assert.match(read("docs/product/student-planned-package-dashboard.md"), /read-only/i);
  assert.match(read("docs/product/student-planned-package-dashboard.md"), /self-serve refund/i);

  for (const loc of ["fr", "en", "es"]) {
    const j = JSON.parse(read(`lib/i18n/locales/${loc}.json`)) as Record<string, string>;
    assert.ok(j.studentPlannedPackagesProposedByTeacher);
    assert.ok(j.studentPlannedPackagesNoPayoutDetails);
    assert.ok(j.studentPlannedPackagesNeedHelp);
  }

  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Forfait proposé par le professeur/);
  assert.match(fr, /Paiement facilité par Pratiqo/);
  assert.doesNotMatch(fr, /Forfait Pratiqo|Banque d’heures Pratiqo|Nos forfaits|Salaire|Employeur/);
});

test("status label keys resolve", () => {
  assert.equal(
    studentPlannedPackageStatusLabelKey("payment_received"),
    "studentPlannedPackagesStatusPaymentReceived",
  );
  assert.equal(
    studentPlannedPackageStatusLabelKey("cancellation_under_review"),
    "studentPlannedPackagesStatusCancellationUnderReview",
  );
});

test("no student refund execution route added", () => {
  assert.doesNotMatch(
    read("app/api/student/planned-packages/route.ts"),
    /execute|refunds\.create/,
  );
  assert.doesNotMatch(
    read("lib/offers/plannedPackageStudentDto.ts"),
    /executePlannedPackage|transfers\.create|refunds\.create/,
  );
});
