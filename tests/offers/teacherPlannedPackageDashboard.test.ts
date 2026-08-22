/**
 * Teacher planned package dashboard — read-only teacher visibility.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  isTeacherPlannedPackageDashboardEnabled,
  isTeacherPlannedPackageDashboardUiEnabled,
} from "@/lib/offers/plannedPackageTeacherDashboard";
import {
  buildTeacherPlannedPackageDto,
  mapTeacherPlannedPackageSessionDto,
  TEACHER_PLANNED_PACKAGES_READ_ONLY,
} from "@/lib/offers/plannedPackageTeacherDto";
import {
  mapTeacherPlannedPackageDisplayStatus,
  mapTeacherSessionPayoutDisplayStatus,
  teacherPlannedPackageStatusLabelKey,
  TEACHER_PLANNED_PACKAGE_STATUS_READ_ONLY,
} from "@/lib/offers/plannedPackageTeacherStatus";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function resetFlags() {
  delete process.env.ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD;
  delete process.env.NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD;
}

test("planned package teacher dashboard flags default OFF", () => {
  resetFlags();
  assert.equal(isTeacherPlannedPackageDashboardEnabled(), false);
  assert.equal(isTeacherPlannedPackageDashboardUiEnabled(), false);
  assert.equal(TEACHER_PLANNED_PACKAGES_READ_ONLY, true);
  assert.equal(TEACHER_PLANNED_PACKAGE_STATUS_READ_ONLY, true);
});

test("status mapping — pending / sessions / payouts / transfers", () => {
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "pending_payment",
      completedSessionCount: 0,
      sessionCount: 3,
      eligibleCount: 0,
      underReviewCount: 0,
      transferredCount: 0,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "package_pending_confirmation",
  );
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "payment_confirmed",
      completedSessionCount: 0,
      sessionCount: 3,
      eligibleCount: 0,
      underReviewCount: 0,
      transferredCount: 0,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "package_pending_confirmation",
  );
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 0,
      sessionCount: 3,
      eligibleCount: 0,
      underReviewCount: 0,
      transferredCount: 0,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "sessions_confirmed",
  );
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 1,
      sessionCount: 3,
      eligibleCount: 1,
      underReviewCount: 0,
      transferredCount: 0,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "payout_eligible",
  );
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 1,
      sessionCount: 3,
      eligibleCount: 0,
      underReviewCount: 1,
      transferredCount: 0,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "payout_under_review",
  );
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 2,
      sessionCount: 2,
      eligibleCount: 0,
      underReviewCount: 0,
      transferredCount: 2,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "transfer_sent",
  );
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 1,
      sessionCount: 2,
      eligibleCount: 0,
      underReviewCount: 0,
      transferredCount: 1,
      reversedCount: 1,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "transfer_reversed",
  );
});

test("status mapping — cancellation, refund, payment setup", () => {
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      latestCancellationStatus: "requested",
      completedSessionCount: 0,
      sessionCount: 2,
      eligibleCount: 0,
      underReviewCount: 0,
      transferredCount: 0,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "cancellation_under_review",
  );
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      latestQuoteStatus: "approved_for_manual_refund",
      completedSessionCount: 0,
      sessionCount: 2,
      eligibleCount: 0,
      underReviewCount: 0,
      transferredCount: 0,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: false,
    }),
    "refund_under_review",
  );
  assert.equal(
    mapTeacherPlannedPackageDisplayStatus({
      orderStatus: "fulfilled",
      completedSessionCount: 1,
      sessionCount: 2,
      eligibleCount: 1,
      underReviewCount: 0,
      transferredCount: 0,
      reversedCount: 0,
      transferPendingCount: 0,
      paymentSetupRequired: true,
    }),
    "payment_setup_required",
  );
});

test("session payout status maps eligibility and transfer", () => {
  assert.equal(
    mapTeacherSessionPayoutDisplayStatus({
      bookingStatus: "confirmed",
    }),
    "payout_not_yet_eligible",
  );
  assert.equal(
    mapTeacherSessionPayoutDisplayStatus({
      bookingStatus: "completed",
      eligibilityStatus: "eligible",
    }),
    "payout_eligible",
  );
  assert.equal(
    mapTeacherSessionPayoutDisplayStatus({
      bookingStatus: "completed",
      eligibilityStatus: "admin_review_required",
    }),
    "payout_under_review",
  );
  assert.equal(
    mapTeacherSessionPayoutDisplayStatus({
      bookingStatus: "completed",
      eligibilityStatus: "eligible",
      transferExecutionStatus: "succeeded",
      transferAmountCents: 5000,
      reversedCents: 0,
    }),
    "transfer_sent",
  );
  assert.equal(
    mapTeacherSessionPayoutDisplayStatus({
      bookingStatus: "completed",
      transferExecutionStatus: "succeeded",
      transferAmountCents: 5000,
      reversedCents: 5000,
    }),
    "transfer_reversed",
  );
});

test("safe DTO excludes Stripe and admin internals; counts correct", () => {
  const sessions = [
    mapTeacherPlannedPackageSessionDto({
      booking: {
        id: "b1",
        status: "completed",
        lesson_date: "2026-08-01",
        time_slot: "10:00",
        planned_package_session_index: 1,
      },
      durationMinutes: 60,
      eligibilityStatus: "eligible",
    })!,
    mapTeacherPlannedPackageSessionDto({
      booking: {
        id: "b2",
        status: "confirmed",
        lesson_date: "2030-08-10",
        time_slot: "11:00",
        planned_package_session_index: 2,
      },
      durationMinutes: 60,
    })!,
  ];

  const dto = buildTeacherPlannedPackageDto({
    order: {
      id: "order-1",
      title_snapshot: "Forfait piano 2",
      status: "fulfilled",
      session_count: 2,
      duration_minutes: 60,
      currency_snapshot: "CAD",
      refund_status: null,
    },
    student: { id: "stu-1", name: "Alex" },
    sessions,
    paymentSetupRequired: false,
    estimatedTeacherAmountCents: 4500,
  });
  assert.ok(dto);
  assert.equal(dto!.sessionCount, 2);
  assert.equal(dto!.completedSessionCount, 1);
  assert.equal(dto!.remainingSessionCount, 1);
  assert.equal(dto!.nextSession?.bookingId, "b2");
  assert.equal(dto!.studentName, "Alex");
  assert.equal(dto!.payoutSummary.eligibleCount, 1);
  assert.equal(dto!.payoutSummary.estimatedTeacherAmountCents, 4500);

  const json = JSON.stringify(dto);
  assert.doesNotMatch(json, /stripe_payment_intent|stripe_checkout_session|stripe_refund/i);
  assert.doesNotMatch(json, /stripe_transfer_id|stripe_transfer_reversal/i);
  assert.doesNotMatch(json, /platform_fee|blocker_details|admin_note|reconciliation|teacher_net_cents/i);
});

test("API routes require owned teacher and gate flag; no mutation", () => {
  const list = read("app/api/teacher/planned-packages/route.ts");
  assert.match(list, /isTeacherPlannedPackageDashboardEnabled/);
  assert.match(list, /requireOwnedTeacher/);
  assert.match(list, /listTeacherPlannedPackagesForOwner/);
  assert.match(list, /teacher_planned_package_dashboard_disabled/);
  assert.doesNotMatch(list, /refunds\.create|transfers\.create|createReversal|\.insert\(|\.update\(/);

  const detail = read("app/api/teacher/planned-packages/[orderId]/route.ts");
  assert.match(detail, /getTeacherPlannedPackageForOwner/);
  assert.match(detail, /not_found/);
  assert.doesNotMatch(detail, /refunds\.create|transfers\.create|createReversal/);
});

test("dashboard UI and nav gate planned package flags", () => {
  const dash = read("components/teacher/TeacherPackageDashboard.tsx");
  assert.match(dash, /isTeacherPlannedPackageDashboardUiEnabled/);
  assert.match(dash, /\/api\/teacher\/planned-packages/);
  assert.match(dash, /TeacherPlannedPackageCard/);
  assert.doesNotMatch(dash, /execute-transfer|execute refund|execute.?reversal/i);

  const card = read("components/teacher/TeacherPlannedPackageCard.tsx");
  assert.match(card, /teacherPlannedPackagesProposedByYou/);
  assert.match(card, /plannedPackageDashboardNoFinancialAction/);
  assert.doesNotMatch(card, /stripe_|teacher_net|platform_fee|Salaire|Employeur/);

  const nav = read("components/teacher/teacherNavConfig.ts");
  assert.match(nav, /isTeacherPlannedPackageDashboardUiEnabled/);
  assert.match(nav, /teacherPlannedPackagesNav/);
});

test("admin readiness shows teacher planned package dashboard layer", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.teacherPlannedPackageDashboardPresent, true);
  assert.equal(readiness.checks.teacherPlannedPackageDashboardSafeDto, true);
  assert.equal(
    readiness.checks.teacherPlannedPackageDashboardNoTeacherTransferExecution,
    true,
  );
  assert.equal(
    readiness.checks.teacherPlannedPackageDashboardNoTeacherRefundExecution,
    true,
  );
  assert.equal(
    readiness.checks.teacherPlannedPackageDashboardNoTeacherReversalExecution,
    true,
  );
  assert.equal(typeof readiness.flags.teacherPlannedPackageDashboard, "boolean");
  assert.equal(readiness.flags.teacherPlannedPackageDashboard, false);

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /forfaits planifiés vendus gated/i);
  assert.match(page, /pas d.exécution de versement/i);
});

test("docs and i18n present; marketplace-safe copy", () => {
  assert.equal(existsSync(path.join(root, "docs/product/teacher-planned-package-dashboard.md")), true);
  assert.match(read("docs/product/teacher-planned-package-dashboard.md"), /read-only/i);
  assert.match(read("docs/product/teacher-planned-package-dashboard.md"), /self-serve payout/i);

  for (const loc of ["fr", "en", "es"]) {
    const j = JSON.parse(read(`lib/i18n/locales/${loc}.json`)) as Record<string, string>;
    assert.ok(j.teacherPlannedPackagesProposedByYou);
    assert.ok(j.teacherPlannedPackagesNoTransferExecution);
    assert.ok(j.teacherPlannedPackagesNoAdminDetails);
  }

  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Mes forfaits vendus/);
  assert.match(fr, /Forfait proposé par vous/);
  assert.match(fr, /Admissible au versement/);
  assert.doesNotMatch(fr, /Forfait Pratiqo|Banque d’heures Pratiqo|Nos forfaits|Salaire|Employeur/);
});

test("status label keys resolve", () => {
  assert.equal(
    teacherPlannedPackageStatusLabelKey("payout_eligible"),
    "teacherPlannedPackagesStatusPayoutEligible",
  );
  assert.equal(
    teacherPlannedPackageStatusLabelKey("cancellation_under_review"),
    "teacherPlannedPackagesStatusCancellationUnderReview",
  );
});

test("no teacher transfer/refund/reversal execution routes added", () => {
  assert.doesNotMatch(
    read("app/api/teacher/planned-packages/route.ts"),
    /execute|refunds\.create|transfers\.create/,
  );
  assert.doesNotMatch(
    read("lib/offers/plannedPackageTeacherDto.ts"),
    /executePlannedPackage|transfers\.create|refunds\.create|createReversal/,
  );
  assert.equal(existsSync(path.join(root, "app/api/teacher/planned-packages/execute-transfer")), false);
  assert.equal(existsSync(path.join(root, "app/api/teacher/planned-packages/refund")), false);
});

test("no public package launch enabled by this PR", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.checks.legalReviewMarkedRequired, true);
  assert.equal(readiness.checks.legalReviewCompletedSignal, false);
});
