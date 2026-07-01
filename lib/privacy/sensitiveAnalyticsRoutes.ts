/**
 * Routes where product analytics must stay off or minimal even when the user
 * accepted optional analytics. Prevents capturing auth, messaging, booking,
 * payment, onboarding, or private student surfaces.
 */

const SENSITIVE_EXACT = new Set([
  "/login",
  "/connexion",
  "/student/choose-companion",
  "/student/consent",
  "/messages",
]);

const SENSITIVE_PREFIXES = [
  "/admin",
  "/booking",
  "/dashboard",
  "/loyalty",
  "/student/progress",
  "/student/search",
  "/student/settings",
  "/student/profile",
  "/profile",
  "/settings",
  "/account",
  "/onboarding",
  "/teacher",
  "/upgrade",
  "/checkout",
  "/payment",
  "/payments",
  "/stripe",
] as const;

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || "/";
}

export function isSensitiveAnalyticsRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = normalizePath(pathname);
  if (SENSITIVE_EXACT.has(path)) return true;
  return SENSITIVE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
