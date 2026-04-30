import type { Teacher } from "@/types";
import { normalizeLocationToken } from "@/lib/studentLocationSearch";

/** Reserved for progressive wiring of marketplace filters — keep UI uncluttered until needed. */
export type TeacherDiscoveryFilters = {
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
  /** Student preferred_learning_format codes or coarse UI filter buckets. */
  teachingFormat?:
    | "no_preference"
    | "at_home"
    | "in_person"
    | "online"
    | "hybrid";
};

function normalizedCityTeacher(t: Teacher): string | null {
  const c = String(t.city ?? "").trim();
  if (c) return c;
  const n = String(t.location?.neighborhood ?? "").trim();
  return n ? n : null;
}

export function teacherMatchesDiscoveryCountry(t: Teacher, code: string | null | undefined): boolean {
  if (!code?.trim()) return true;
  const want = code.trim().toUpperCase();
  const got = String(t.countryCode ?? "").trim().toUpperCase();
  return !got || got === want;
}

export function teacherMatchesDiscoveryCity(t: Teacher, city: string | null | undefined): boolean {
  const want = normalizeLocationToken(city);
  if (!want) return true;
  const got = normalizeLocationToken(normalizedCityTeacher(t));
  return !got || got === want || got.includes(want) || want.includes(got);
}

export function teacherMatchesDiscoveryRegion(t: Teacher, region: string | null | undefined): boolean {
  const want = normalizeLocationToken(region);
  if (!want) return true;
  const got = normalizeLocationToken(t.region);
  return !got || got === want;
}

/**
 * Loose format gate for filter chips later on — aligns with profiles.preferred_learning_format codes.
 * Callers typically combine with geo / search text; skipping when filters are blank keeps parity with “no preference”.
 */
export function teacherMatchesDiscoveryTeachingFormat(t: Teacher, fmt: TeacherDiscoveryFilters["teachingFormat"]): boolean {
  if (!fmt || fmt === "no_preference") return true;
  const mode = String(t.teachingMode ?? "").toLowerCase().trim();
  const hl = Boolean(t.homeLessonEnabled);

  switch (fmt) {
    case "online":
      return mode === "online" || mode === "both" || mode === "all";
    case "at_home":
      return mode === "home" || mode === "all" || hl;
    case "in_person":
      return mode !== "online" && (mode === "person" || mode === "both" || mode === "all" || mode === "home");
    case "hybrid":
      return mode === "both" || mode === "all";
    default:
      return true;
  }
}

export function teacherMatchesDiscoveryFilters(t: Teacher, f: TeacherDiscoveryFilters | null | undefined): boolean {
  if (!f) return true;
  return (
    teacherMatchesDiscoveryCountry(t, f.countryCode ?? null) &&
    teacherMatchesDiscoveryCity(t, f.city ?? null) &&
    teacherMatchesDiscoveryRegion(t, f.region ?? null) &&
    teacherMatchesDiscoveryTeachingFormat(t, f.teachingFormat ?? "no_preference")
  );
}
