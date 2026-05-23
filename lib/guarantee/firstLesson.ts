// First-lesson satisfaction guarantee — eligibility helper.
//
// Product contract for v1:
//   - Applies ONLY to the student's first completed paid lesson on Pratiqo.
//   - Claim must be filed within 24h after lesson completion (completed_at).
//   - One use per student account (tracked on profiles.first_lesson_guarantee_used_at).
//   - Opens a support_case for manual review. Does NOT execute any refund.
//
// This helper does NOT touch Stripe, booking_payments, or refund state. It is
// purely a read-side eligibility check used by the claim API and the student
// payments UI. The actual support_case insert + profile stamp happens in the
// API route.
//
// The "first completed lesson" definition is intentionally reused from the
// companion-rewards filter (`status.eq.completed,completed_at.not.is.null`)
// so all "first lesson" semantics stay aligned across features.

import type { SupabaseClient } from "@supabase/supabase-js";

export const FIRST_LESSON_CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Marker prefix that the claim API prepends to the support_cases.description
 * field so we can defensively detect prior guarantee claims even if the
 * profile stamp is missing (e.g. partial-failure recovery).
 */
export const FIRST_LESSON_GUARANTEE_MARKER = "[FIRST_LESSON_GUARANTEE]";

export type FirstLessonEligibilityReason =
  | "not_first_lesson"
  | "outside_window"
  | "already_claimed"
  | "not_completed"
  | "student_no_show";

export type FirstLessonEligibilityResult =
  | { eligible: true; completedAt: string }
  | { eligible: false; reason: FirstLessonEligibilityReason };

export type FirstLessonEligibilityInput = {
  studentId: string;
  bookingId: string;
  /** Defaults to Date.now() — overridable for tests. */
  now?: number;
};

type AdminLike = Pick<SupabaseClient, "from">;

type BookingRow = {
  id: string;
  student_id: string | null;
  status: string | null;
  completed_at: string | null;
  completion_outcome: string | null;
};

type ProfileRow = {
  first_lesson_guarantee_used_at: string | null;
};

type CompletedBookingIdRow = { id: string; completed_at: string | null };

type SupportCaseMarkerRow = { id: string };

function isCompletedBooking(row: { status: string | null; completed_at: string | null }): boolean {
  const status = String(row.status ?? "").toLowerCase();
  return status === "completed" || Boolean(row.completed_at);
}

export async function firstLessonGuaranteeEligibility(
  admin: AdminLike,
  input: FirstLessonEligibilityInput,
): Promise<FirstLessonEligibilityResult> {
  const studentId = input.studentId.trim();
  const bookingId = input.bookingId.trim();
  const now = typeof input.now === "number" ? input.now : Date.now();

  if (!studentId || !bookingId) {
    return { eligible: false, reason: "not_completed" };
  }

  // 1) Profile-side single-use stamp. If present, the student has already
  //    used (or had marked-used) the guarantee — short-circuit.
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("first_lesson_guarantee_used_at")
    .eq("id", studentId)
    .maybeSingle();
  if (profileErr) {
    // Treat opaque profile-fetch errors as "already claimed" to fail closed.
    // The caller still gets a structured reason so the UI does not silently
    // unlock the CTA.
    return { eligible: false, reason: "already_claimed" };
  }
  const profileRow = (profile ?? null) as ProfileRow | null;
  if (profileRow?.first_lesson_guarantee_used_at) {
    return { eligible: false, reason: "already_claimed" };
  }

  // 2) Booking must belong to the student and be completed.
  const { data: bookingData, error: bookingErr } = await admin
    .from("bookings")
    .select("id, student_id, status, completed_at, completion_outcome")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingErr) {
    return { eligible: false, reason: "not_completed" };
  }
  const booking = (bookingData ?? null) as BookingRow | null;
  if (!booking || booking.student_id !== studentId) {
    return { eligible: false, reason: "not_completed" };
  }
  if (!isCompletedBooking(booking)) {
    return { eligible: false, reason: "not_completed" };
  }

  // 3) If the teacher marked the student absent, the guarantee does not apply.
  const outcome = String(booking.completion_outcome ?? "").toLowerCase();
  if (outcome === "absent") {
    return { eligible: false, reason: "student_no_show" };
  }

  // 4) Claim window: 24h after completed_at.
  const completedAt = booking.completed_at;
  if (!completedAt) {
    return { eligible: false, reason: "not_completed" };
  }
  const completedAtMs = Date.parse(completedAt);
  if (!Number.isFinite(completedAtMs)) {
    return { eligible: false, reason: "not_completed" };
  }
  if (now - completedAtMs > FIRST_LESSON_CLAIM_WINDOW_MS) {
    return { eligible: false, reason: "outside_window" };
  }

  // 5) Must be the student's FIRST completed booking. We fetch the earliest
  //    completed booking for this student (oldest completed_at first) and
  //    confirm the IDs match. This uses the same definition as
  //    COMPLETED_LESSON_FOR_COMPANION_FILTER.
  const { data: firstCompletedData, error: firstCompletedErr } = await admin
    .from("bookings")
    .select("id, completed_at")
    .eq("student_id", studentId)
    .or("status.eq.completed,completed_at.not.is.null")
    .order("completed_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (firstCompletedErr) {
    return { eligible: false, reason: "not_first_lesson" };
  }
  const firstCompleted = (firstCompletedData ?? null) as CompletedBookingIdRow | null;
  if (!firstCompleted || firstCompleted.id !== bookingId) {
    return { eligible: false, reason: "not_first_lesson" };
  }

  // 6) Defense-in-depth: scan support_cases for the marker. If a prior claim
  //    case exists for this student we treat it as already-claimed even when
  //    the profile stamp is missing (e.g. partial-failure recovery scenario).
  const { data: existingCases, error: caseErr } = await admin
    .from("support_cases")
    .select("id")
    .eq("student_id", studentId)
    .ilike("description", `${FIRST_LESSON_GUARANTEE_MARKER}%`)
    .limit(1);
  if (caseErr) {
    return { eligible: false, reason: "already_claimed" };
  }
  const cases = (existingCases ?? []) as SupportCaseMarkerRow[];
  if (cases.length > 0) {
    return { eligible: false, reason: "already_claimed" };
  }

  return { eligible: true, completedAt };
}
