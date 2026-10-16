import { CANADIAN_PLACES, normalizePlaceQuery } from "@/lib/search/canadianPlaces";
import type { TeacherBookingCapability } from "@/lib/teachers/bookingCapability";

export const TEACHER_SETUP_STEPS = ["course", "availability", "payments"] as const;
export type TeacherSetupStep = typeof TEACHER_SETUP_STEPS[number];

export function teacherSetupStep(value: unknown): TeacherSetupStep {
  return TEACHER_SETUP_STEPS.includes(value as TeacherSetupStep) ? value as TeacherSetupStep : "course";
}

export function teacherSetupHref(step: TeacherSetupStep): string {
  const paths = { course: "/teacher/verification", availability: "/teacher/schedule", payments: "/teacher/setup-payments" };
  return `${paths[step]}?setup=1`;
}

export function resumeTeacherSetupHref(userId: string): string {
  try {
    return teacherSetupHref(teacherSetupStep(window.localStorage.getItem(`pratiqo:teacher-setup:${userId}`)));
  } catch { return teacherSetupHref("course"); }
}

export function hasTeacherSetupProgress(userId: string): boolean {
  try { return TEACHER_SETUP_STEPS.includes(window.localStorage.getItem(`pratiqo:teacher-setup:${userId}`) as TeacherSetupStep); }
  catch { return false; }
}

export function finishTeacherSetup(userId: string): void {
  try { window.localStorage.removeItem(`pratiqo:teacher-setup:${userId}`); } catch { /* Server progress is unaffected. */ }
}

export function validTeacherSetupTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 80) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); return true; } catch { return false; }
}

/** Never guess a timezone for ambiguous places or overwrite a teacher's choice. */
export function suggestTeacherRegion(city: string, current: { region?: string; country?: string; timezone?: string }) {
  const matches = CANADIAN_PLACES.filter(place => normalizePlaceQuery(place.name) === normalizePlaceQuery(city));
  if (matches.length !== 1 || (current.country && current.country !== "CA")) return current;
  const place = matches[0];
  // Quebec includes timezone exceptions: only the verified launch municipalities.
  const torontoCities = new Set(["saint georges", "levis", "quebec"]);
  return {
    region: current.region || place.provinceCode,
    country: current.country || place.country,
    timezone: current.timezone || (place.provinceCode === "QC" && torontoCities.has(normalizePlaceQuery(place.name)) ? "America/Toronto" : ""),
  };
}

export function guidedBookingState(capability: TeacherBookingCapability | null, discoverable: boolean) {
  if (!discoverable) return "not_public" as const;
  if (!capability) return "unknown" as const;
  return capability.action;
}
