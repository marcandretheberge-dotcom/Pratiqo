/**
 * Safe planned-package dashboard links — owner-gated existing routes only.
 * Never points students/teachers at admin ops or financial execution.
 */

export const PLANNED_PACKAGE_SUPPORT_EMAIL = "support@pratiqo.ca";
export const PLANNED_PACKAGE_SUPPORT_MAILTO = "mailto:support@pratiqo.ca";
export const PLANNED_PACKAGE_RESOLUTION_HREF = "/resolution";
export const PLANNED_PACKAGE_OWNER_BOOKING_HREF = "/dashboard";
export const PLANNED_PACKAGE_TEACHER_PAYMENT_SETUP_HREF = "/teacher/settings#payouts";
export const PLANNED_PACKAGE_STUDENT_EXPLORE_HREF = "/student/search";
export const PLANNED_PACKAGE_TEACHER_OFFERS_HREF = "/teacher/offers";
export const PLANNED_PACKAGE_ADMIN_READINESS_HREF = "/admin/package-launch-readiness";
export const PLANNED_PACKAGE_ADMIN_ORDERS_HREF = "/admin/planned-package-orders";
export const PLANNED_PACKAGE_STUDENT_DASHBOARD_HREF = "/student/packages";
export const PLANNED_PACKAGE_TEACHER_DASHBOARD_HREF = "/teacher/packages";

export function isSafeStudentTeacherProfileHref(href: string): boolean {
  const value = href.trim();
  return value.startsWith("/professeurs/") || value.startsWith("/teacher/profile/");
}

export function ownerBookingDashboardHref(): string {
  return PLANNED_PACKAGE_OWNER_BOOKING_HREF;
}

export function adminBookingSearchHref(shortId: string): string {
  const q = shortId.trim();
  if (!q) return "/admin/bookings";
  return `/admin/bookings?q=${encodeURIComponent(q)}`;
}

export function adminUserHref(userId: string): string {
  return `/admin/users/${encodeURIComponent(userId.trim())}`;
}

export const PLANNED_PACKAGE_DASHBOARD_LINKS_READ_ONLY = true;
