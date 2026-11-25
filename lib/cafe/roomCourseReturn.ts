import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";

/** Course-return deep link for café room pages — rejects protocol-relative/external paths. */
export function resolveCafeRoomCourseReturn(
  yoReturn: string | string[] | undefined,
): string | null {
  const raw = typeof yoReturn === "string" ? yoReturn : null;
  return sanitizeRelativeRedirectPath(raw);
}

/** Preserve the course destination when moving from a confirmed seat to its room. */
export function buildCafeRoomHref(input: {
  slug: string;
  title: string;
  yoReturn?: string | null;
}): string {
  const query = new URLSearchParams({ title: input.title.trim().slice(0, 120) });
  const courseReturn = resolveCafeRoomCourseReturn(input.yoReturn ?? undefined);
  if (courseReturn) query.set("yoReturn", courseReturn);
  return `/cafe/${encodeURIComponent(input.slug)}/salle?${query.toString()}`;
}
