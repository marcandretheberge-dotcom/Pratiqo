/**
 * Allowed values for teachers.location_verification_* (migration 046).
 * Do not write values outside these sets — Postgres CHECK constraints will reject them.
 */

export const TEACHER_LOCATION_VERIFICATION_METHODS = [
  "manual",
  "booking_history",
  "document",
  "other",
] as const;

export type TeacherLocationVerificationMethod = (typeof TEACHER_LOCATION_VERIFICATION_METHODS)[number];

export const TEACHER_LOCATION_VERIFICATION_STATUSES = [
  "missing",
  "pending",
  "verified",
  "rejected",
] as const;

export type TeacherLocationVerificationStatus = (typeof TEACHER_LOCATION_VERIFICATION_STATUSES)[number];

/** Map geocoding outcome → DB-safe status + method pair. */
export function resolveLocationVerificationWrite(geocoded: boolean): {
  status: TeacherLocationVerificationStatus;
  method: TeacherLocationVerificationMethod;
} {
  if (geocoded) {
    // Geocoded address (Google Places or server-side Nominatim) — not manual review.
    return { status: "verified", method: "other" };
  }
  // City/address saved without coordinates — pending manual review.
  return { status: "pending", method: "manual" };
}
