/**
 * Planned package dashboard polish — shared UX, no financial logic.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  isSafeStudentTeacherProfileHref,
  ownerBookingDashboardHref,
  adminBookingSearchHref,
  PLANNED_PACKAGE_SUPPORT_EMAIL,
  PLANNED_PACKAGE_SUPPORT_MAILTO,
  PLANNED_PACKAGE_OWNER_BOOKING_HREF,
  PLANNED_PACKAGE_TEACHER_PAYMENT_SETUP_HREF,
  PLANNED_PACKAGE_ADMIN_READINESS_HREF,
} from "@/lib/offers/plannedPackageDashboardLinks";
import {
  plannedPackageBadgeTone,
  studentPlannedPackageProgressCounts,
  teacherPlannedPackageProgressCounts,
  formatPlannedPackageSessionOfTotal,
  PLANNED_PACKAGE_DASHBOARD_UI_READ_ONLY,
} from "@/lib/offers/plannedPackageDashboardUi";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";
import {
  buildStudentPlannedPackageDto,
  mapStudentPlannedPackageSessionDto,
} from "@/lib/offers/plannedPackageStudentDto";
import {
  buildTeacherPlannedPackageDto,
  mapTeacherPlannedPackageSessionDto,
} from "@/lib/offers/plannedPackageTeacherDto";
import { mapStudentPackageTeacherDto } from "@/lib/offers/studentPackages";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

test("shared helpers stay read-only and map statuses", () => {
  assert.equal(PLANNED_PACKAGE_DASHBOARD_UI_READ_ONLY, true);
  assert.equal(plannedPackageBadgeTone("payment_pending"), "warning");
  assert.equal(plannedPackageBadgeTone("sessions_confirmed"), "success");
  assert.equal(plannedPackageBadgeTone("payout_eligible"), "success");
  assert.equal(plannedPackageBadgeTone("transfer_sent"), "success");
  assert.equal(plannedPackageBadgeTone("cancellation_under_review"), "review");
  assert.equal(plannedPackageBadgeTone("refund_under_review"), "review");
  assert.equal(plannedPackageBadgeTone("issue_under_review"), "review");
  assert.equal(plannedPackageBadgeTone("payment_setup_required"), "warning");
  assert.equal(
    formatPlannedPackageSessionOfTotal("Session {current} of {total}", 1, 4),
    "Session 1 of 4",
  );
});

test("progress summary counts student and teacher sessions", () => {
  const student = studentPlannedPackageProgressCounts({
    sessionCount: 4,
    completedSessionCount: 1,
    remainingSessionCount: 3,
  });
  assert.equal(student.sessionCount, 4);
  assert.equal(student.completedSessionCount, 1);
  assert.equal(student.remainingSessionCount, 3);
  assert.equal(student.eligibleCount, undefined);

  const teacher = teacherPlannedPackageProgressCounts({
    sessionCount: 4,
    completedSessionCount: 2,
    remainingSessionCount: 2,
    eligibleCount: 1,
    transferredCount: 1,
    underReviewCount: 0,
  });
  assert.equal(teacher.eligibleCount, 1);
  assert.equal(teacher.transferredCount, 1);
  assert.equal(teacher.underReviewCount, 0);
});

test("shared components render badges, timeline, empty, loading, support", () => {
  const badge = read("components/packages/PlannedPackageStatusBadge.tsx");
  assert.match(badge, /planned-package-status-badge/);
  assert.doesNotMatch(badge, /<table/);

  const timeline = read("components/packages/PlannedPackageSessionTimeline.tsx");
  assert.match(timeline, /planned-package-session-timeline/);
  assert.match(timeline, /data-next/);
  assert.match(timeline, /ownerBookingDashboardHref/);
  assert.doesNotMatch(timeline, /<table/);

  const empty = read("components/packages/PlannedPackageEmptyState.tsx");
  assert.match(empty, /ctaHref/);
  assert.doesNotMatch(empty, /<table/);

  const load = read("components/packages/PlannedPackageLoadState.tsx");
  assert.match(load, /planned-package-loading/);
  assert.match(load, /planned-package-load-error/);
  assert.match(load, /PLANNED_PACKAGE_SUPPORT_EMAIL/);
  assert.doesNotMatch(load, /stack|error\.message|blocker_details/);

  const support = read("components/packages/PlannedPackageSupportCta.tsx");
  assert.match(support, /PLANNED_PACKAGE_SUPPORT_EMAIL/);
  assert.match(support, /PLANNED_PACKAGE_SUPPORT_MAILTO/);
});

test("student dashboard polish: empty/loading/error and safe teacher link", () => {
  const dash = read("components/student/StudentPackageDashboard.tsx");
  assert.match(dash, /PlannedPackageEmptyState/);
  assert.match(dash, /PlannedPackageLoadingState/);
  assert.match(dash, /PlannedPackageLoadError/);
  assert.match(dash, /student-packages-empty/);
  assert.match(dash, /overflow-x-hidden/);
  assert.doesNotMatch(dash, /\/admin\//);
  assert.doesNotMatch(dash, /execute-transfer|refunds\.create/);

  const card = read("components/student/StudentPlannedPackageCard.tsx");
  assert.match(card, /isSafeStudentTeacherProfileHref/);
  assert.match(card, /PlannedPackageProgressSummary/);
  assert.match(card, /PlannedPackageSessionTimeline/);
  assert.match(card, /plannedPackageDashboardNoFinancialAction/);
  assert.doesNotMatch(card, /\/admin\//);

  assert.equal(isSafeStudentTeacherProfileHref("/professeurs/marie-piano"), true);
  assert.equal(isSafeStudentTeacherProfileHref("/teacher/profile/abc"), true);
  assert.equal(isSafeStudentTeacherProfileHref("/admin/planned-package-orders/1"), false);
});

test("teacher dashboard polish: empty/loading/error and booking/payment links", () => {
  const dash = read("components/teacher/TeacherPackageDashboard.tsx");
  assert.match(dash, /PlannedPackageEmptyState/);
  assert.match(dash, /PlannedPackageLoadingState/);
  assert.match(dash, /overflow-x-hidden/);
  assert.doesNotMatch(dash, /\/admin\//);
  assert.doesNotMatch(dash, /execute-transfer|createReversal/);

  const card = read("components/teacher/TeacherPlannedPackageCard.tsx");
  assert.match(card, /PLANNED_PACKAGE_TEACHER_PAYMENT_SETUP_HREF/);
  assert.match(card, /PlannedPackageSessionTimeline/);
  assert.doesNotMatch(card, /\/admin\//);

  assert.equal(ownerBookingDashboardHref(), "/dashboard");
  assert.equal(PLANNED_PACKAGE_OWNER_BOOKING_HREF, "/dashboard");
  assert.equal(PLANNED_PACKAGE_TEACHER_PAYMENT_SETUP_HREF, "/teacher/settings#payouts");
});

test("admin cross-links remain admin-only", () => {
  const detail = read("app/(app)/admin/planned-package-orders/[orderId]/page.tsx");
  assert.match(detail, /admin-planned-package-cross-links/);
  assert.match(detail, /adminBookingSearchHref/);
  assert.match(detail, /PLANNED_PACKAGE_ADMIN_READINESS_HREF/);
  assert.match(detail, /adminUserHref/);
  assert.doesNotMatch(detail, /href=\{PLANNED_PACKAGE_STUDENT_DASHBOARD_HREF\}/);

  const list = read("app/(app)/admin/planned-package-orders/page.tsx");
  assert.match(list, /admin-planned-packages-empty/);
  assert.match(list, /\/admin\/package-launch-readiness/);

  assert.equal(adminBookingSearchHref("bk_1"), "/admin/bookings?q=bk_1");
  assert.equal(PLANNED_PACKAGE_ADMIN_READINESS_HREF, "/admin/package-launch-readiness");
});

test("nav items remain flag-gated", () => {
  const shell = read("components/AppShell.tsx");
  assert.match(shell, /isStudentPlannedPackageDashboardUiEnabled/);
  assert.match(shell, /studentTabPackages/);

  const nav = read("components/teacher/teacherNavConfig.ts");
  assert.match(nav, /isTeacherPlannedPackageDashboardUiEnabled/);
  assert.match(nav, /teacherPlannedPackagesNav/);
});

test("student and teacher DTOs still exclude Stripe/payment internals", () => {
  const teacher = mapStudentPackageTeacherDto({
    id: "teacher-1",
    name: "Marie",
    public_profile_slug: "marie-piano",
  });
  const studentDto = buildStudentPlannedPackageDto({
    order: {
      id: "order-1",
      title_snapshot: "Piano",
      status: "fulfilled",
      session_count: 2,
      duration_minutes: 60,
      currency_snapshot: "CAD",
    },
    teacher: teacher!,
    sessions: [
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
    ],
  });
  assert.ok(studentDto);
  assert.equal(studentDto!.nextSession?.bookingId, "b2");
  const studentJson = JSON.stringify(studentDto);
  assert.doesNotMatch(
    studentJson,
    /stripe_payment_intent|stripe_checkout_session|stripe_refund|stripe_transfer|teacher_net|platform_fee/,
  );

  const teacherDto = buildTeacherPlannedPackageDto({
    order: {
      id: "order-2",
      title_snapshot: "Piano",
      status: "fulfilled",
      session_count: 2,
      duration_minutes: 60,
      currency_snapshot: "CAD",
    },
    student: { id: "stu-1", name: "Alex" },
    sessions: [
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
    ],
    paymentSetupRequired: false,
  });
  assert.ok(teacherDto);
  const teacherJson = JSON.stringify(teacherDto);
  assert.doesNotMatch(
    teacherJson,
    /stripe_payment_intent|stripe_checkout_session|stripe_refund_id|stripe_transfer_id|stripe_transfer_reversal/,
  );
});

test("no financial action routes added; Stripe money logic unchanged by polish files", () => {
  const polishFiles = [
    "components/packages/PlannedPackageStatusBadge.tsx",
    "components/packages/PlannedPackageSessionTimeline.tsx",
    "components/packages/PlannedPackageProgressSummary.tsx",
    "components/packages/PlannedPackageEmptyState.tsx",
    "components/packages/PlannedPackageSupportCta.tsx",
    "components/packages/PlannedPackageLoadState.tsx",
    "lib/offers/plannedPackageDashboardLinks.ts",
    "lib/offers/plannedPackageDashboardUi.ts",
  ];
  for (const file of polishFiles) {
    const src = read(file);
    assert.doesNotMatch(src, /refunds\.create|transfers\.create|createReversal/);
    assert.doesNotMatch(src, /executePlannedPackage|stripe\.refunds|stripe\.transfers/);
  }
  assert.equal(existsSync(path.join(root, "app/api/student/planned-packages/refund")), false);
  assert.equal(existsSync(path.join(root, "app/api/teacher/planned-packages/execute-transfer")), false);
});

test("admin readiness shows polish/cross-link checks; legal/public launch still blocked", () => {
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageDashboardPolishComplete, true);
  assert.equal(readiness.checks.plannedPackageDashboardSafeCrossLinks, true);
  assert.equal(readiness.checks.plannedPackageDashboardMobileEmptyLoadingError, true);
  assert.equal(readiness.checks.plannedPackageDashboardNoSelfServeFinancialActions, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.checks.legalReviewCompletedSignal, false);

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /polish élève\/professeur/i);
  assert.match(page, /liens croisés sûrs/i);
});

test("docs and i18n include polish copy; marketplace-safe", () => {
  assert.equal(
    existsSync(path.join(root, "docs/product/planned-package-dashboard-polish.md")),
    true,
  );
  assert.match(read("docs/product/planned-package-dashboard-polish.md"), /No self-serve financial/);
  assert.match(read("docs/product/student-planned-package-dashboard.md"), /planned-package-dashboard-polish/);
  assert.match(read("docs/product/teacher-planned-package-dashboard.md"), /planned-package-dashboard-polish/);

  for (const loc of ["fr", "en", "es"]) {
    const j = JSON.parse(read(`lib/i18n/locales/${loc}.json`)) as Record<string, string>;
    assert.ok(j.plannedPackageDashboardLoading);
    assert.ok(j.plannedPackageDashboardLoadError);
    assert.ok(j.plannedPackageDashboardNoFinancialAction);
    assert.ok(j.plannedPackageDashboardStudentSupportCta);
  }
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Chargement des forfaits/);
  assert.match(fr, /Cette page ne permet aucune action financière/);
  assert.doesNotMatch(fr, /Forfait Pratiqo|Banque d’heures Pratiqo|Nos forfaits|Salaire|Employeur/);
});

test("support CTA uses canonical support email", () => {
  assert.equal(PLANNED_PACKAGE_SUPPORT_EMAIL, "info@pratiqo.ca");
  assert.equal(PLANNED_PACKAGE_SUPPORT_MAILTO, "mailto:info@pratiqo.ca");
});
