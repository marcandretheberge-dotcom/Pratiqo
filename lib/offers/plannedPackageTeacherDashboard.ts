/**
 * Teacher planned package dashboard flags — read-only teacher visibility.
 */

export const ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD_FLAG =
  "ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD";
export const NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD_FLAG =
  "NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD";

export function isTeacherPlannedPackageDashboardEnabled(): boolean {
  return process.env.ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD === "true";
}

export function isTeacherPlannedPackageDashboardUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD === "true";
}
