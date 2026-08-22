/**
 * Shared planned-package dashboard UI helpers — safe DTO only, no money movement.
 */

import type { StudentPlannedPackageDisplayStatus } from "./plannedPackageStudentStatus";
import type {
  TeacherPlannedPackageDisplayStatus,
  TeacherSessionPayoutDisplayStatus,
} from "./plannedPackageTeacherStatus";

export type PlannedPackageBadgeTone = "neutral" | "info" | "success" | "warning" | "review";

export type PlannedPackageSharedSessionStatus = "upcoming" | "completed" | "under_review";

export type PlannedPackageBadgeStatus =
  | StudentPlannedPackageDisplayStatus
  | TeacherPlannedPackageDisplayStatus
  | TeacherSessionPayoutDisplayStatus
  | PlannedPackageSharedSessionStatus;

const REVIEW_STATUSES = new Set<string>([
  "cancellation_under_review",
  "refund_under_review",
  "payout_under_review",
  "issue_under_review",
  "under_review",
]);

const WARNING_STATUSES = new Set<string>([
  "payment_pending",
  "package_pending_confirmation",
  "payment_setup_required",
  "payout_not_yet_eligible",
  "transfer_processing",
]);

const SUCCESS_STATUSES = new Set<string>([
  "completed",
  "sessions_confirmed",
  "payout_eligible",
  "transfer_sent",
  "refunded",
]);

export function isPlannedPackageReviewStatus(status: string): boolean {
  return REVIEW_STATUSES.has(status);
}

export function plannedPackageBadgeTone(status: string): PlannedPackageBadgeTone {
  if (REVIEW_STATUSES.has(status) || status === "transfer_reversed") return "review";
  if (WARNING_STATUSES.has(status)) return "warning";
  if (SUCCESS_STATUSES.has(status)) return "success";
  if (status === "in_progress" || status === "payment_received" || status === "upcoming") {
    return "info";
  }
  return "neutral";
}

export function formatPlannedPackageSessionOfTotal(
  template: string,
  current: number,
  total: number,
): string {
  return template
    .replace("{current}", String(current))
    .replace("{total}", String(total))
    .replace("{n}", String(current));
}

export function formatPlannedPackageDateLabel(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
      const dateOnly = new Date(`${iso.slice(0, 10)}T12:00:00`);
      if (!Number.isNaN(dateOnly.getTime())) {
        return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(dateOnly);
      }
    }
    return iso;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: iso.includes("T") ? "short" : undefined,
  }).format(d);
}

export type PlannedPackageProgressCounts = {
  sessionCount: number;
  completedSessionCount: number;
  remainingSessionCount: number;
  eligibleCount?: number;
  transferredCount?: number;
  underReviewCount?: number;
};

export function studentPlannedPackageProgressCounts(input: {
  sessionCount: number;
  completedSessionCount: number;
  remainingSessionCount: number;
}): PlannedPackageProgressCounts {
  return {
    sessionCount: input.sessionCount,
    completedSessionCount: input.completedSessionCount,
    remainingSessionCount: input.remainingSessionCount,
  };
}

export function teacherPlannedPackageProgressCounts(input: {
  sessionCount: number;
  completedSessionCount: number;
  remainingSessionCount: number;
  eligibleCount: number;
  transferredCount: number;
  underReviewCount: number;
}): PlannedPackageProgressCounts {
  return {
    sessionCount: input.sessionCount,
    completedSessionCount: input.completedSessionCount,
    remainingSessionCount: input.remainingSessionCount,
    eligibleCount: input.eligibleCount,
    transferredCount: input.transferredCount,
    underReviewCount: input.underReviewCount,
  };
}

export const PLANNED_PACKAGE_DASHBOARD_UI_READ_ONLY = true;
