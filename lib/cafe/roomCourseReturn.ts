import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";

/** Course-return deep link for café room pages — rejects protocol-relative/external paths. */
export function resolveCafeRoomCourseReturn(
  yoReturn: string | string[] | undefined,
): string | null {
  const raw = typeof yoReturn === "string" ? yoReturn : null;
  return sanitizeRelativeRedirectPath(raw);
}
