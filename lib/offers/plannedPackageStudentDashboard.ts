/**
 * Student planned package dashboard flags — read-only learner visibility.
 * Separate from entitlement-based ENABLE_STUDENT_PACKAGE_DASHBOARD.
 */

export const ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD_FLAG =
  "ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD";
export const NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD_FLAG =
  "NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD";

export function isStudentPlannedPackageDashboardEnabled(): boolean {
  return process.env.ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD === "true";
}

export function isStudentPlannedPackageDashboardUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD === "true";
}
