import { formatLocalISODate, parseHHMMToMinutes, slotStartMinutes } from "@/lib/slots";

/** Status values a student may cancel via the structured cancel API (released slot, before or after acceptance). */
export const STUDENT_CANCEL_STATUSES = ["confirmed", "booked", "pending_payment", "pending_teacher", "pending"] as const;

/** Status values a teacher may cancel only once the class is firmly scheduled — pending requests stay on accept/decline. */
export const TEACHER_CANCEL_SCHEDULE_STATUSES = ["confirmed", "booked"] as const;

/** Hours before lesson under which a student cancellation is treated as late (refund pending review). */
export const LATE_CANCEL_HOURS = 24;

/** Slugs for the structured reason picker in the cancel modal. Map to i18n via `cancelReason_<slug>`. */
export const STUDENT_CANCEL_REASONS = [
  "schedule_conflict",
  "illness",
  "family_emergency",
  "no_longer_needed",
  "found_other",
  "other",
] as const;

export const TEACHER_CANCEL_REASONS = [
  "schedule_conflict",
  "illness",
  "family_emergency",
  "tech_or_logistics",
  "student_unresponsive",
  "other",
] as const;

export type StudentCancelReason = (typeof STUDENT_CANCEL_REASONS)[number];
export type TeacherCancelReason = (typeof TEACHER_CANCEL_REASONS)[number];

export type CancellerRole = "student" | "teacher";

export type RefundStatus = "not_required" | "pending" | "pending_review" | "refunded" | "rejected";
export type RefundMethod = "original_payment" | "pratiqo_credit";

export type BookingDateFields = {
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
};

function lessonCalendarDateIso(row: BookingDateFields): string | null {
  const raw = String(row.slot_date || row.date || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function lessonTimeMinutes(row: BookingDateFields): number {
  const t = String(row.time_slot || row.time || "").trim();
  if (!t) return -1;
  const mh = slotStartMinutes(t);
  if (mh >= 0) return mh;
  return parseHHMMToMinutes(t) ?? -1;
}

/** Lesson is strictly in the future (today only if slot start time ≥ now). */
export function isBookingLessonDateOnOrAfterToday(row: BookingDateFields): boolean {
  const d = lessonCalendarDateIso(row);
  if (!d) return false;
  const today = formatLocalISODate(new Date());
  if (d > today) return true;
  if (d < today) return false;
  const mins = lessonTimeMinutes(row);
  if (mins < 0) return true;
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  return mins >= nowM;
}

/**
 * Local-clock Date for the lesson start, or `null` if the row doesn't carry a usable
 * date/time pair. Times are interpreted in the local timezone — the same as the rest
 * of the agenda UI (Pratiqo doesn't yet store IANA tz per booking).
 */
export function bookingLessonStartDate(row: BookingDateFields): Date | null {
  const d = lessonCalendarDateIso(row);
  if (!d) return null;
  const mins = lessonTimeMinutes(row);
  if (mins < 0) return null;
  const [y, mo, day] = d.split("-").map(Number);
  if (!y || !mo || !day) return null;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return new Date(y, mo - 1, day, hh, mm, 0, 0);
}

/**
 * Returns true if the lesson is closer than `LATE_CANCEL_HOURS` from `now`.
 * Past lessons also count as "late" — but the API blocks past lessons before this is consulted.
 */
export function isLateCancellation(row: BookingDateFields, now: Date = new Date()): boolean {
  const start = bookingLessonStartDate(row);
  if (!start) return false;
  const diffMs = start.getTime() - now.getTime();
  return diffMs < LATE_CANCEL_HOURS * 60 * 60 * 1000;
}

export type RefundPlan = {
  refund_status: RefundStatus;
  refund_method: RefundMethod | null;
  refund_amount: number | null;
};

/**
 * Resolve refund_status / method / amount from the cancellation context.
 *
 * Trust-first marketplace policy:
 * - Teacher cancels → student gets a full refund (or full Pratiqo credit if no Stripe PI on file).
 * - Student >24h     → full refund / full credit.
 * - Student <24h     → support review; tentative path is Pratiqo credit, final amount decided by support.
 *
 * `bookingPrice` may be null (legacy or free bookings) — refund_amount is then null.
 */
export function computeRefundPlan(opts: {
  cancellerRole: CancellerRole;
  isLate: boolean;
  hasStripePaymentIntent: boolean;
  bookingPrice: number | null | undefined;
}): RefundPlan {
  const price =
    typeof opts.bookingPrice === "number" && Number.isFinite(opts.bookingPrice) ? opts.bookingPrice : null;

  if (opts.cancellerRole === "teacher") {
    return {
      refund_status: "pending",
      refund_method: opts.hasStripePaymentIntent ? "original_payment" : "pratiqo_credit",
      refund_amount: price,
    };
  }

  if (opts.isLate) {
    return {
      refund_status: "pending_review",
      refund_method: "pratiqo_credit",
      refund_amount: price,
    };
  }

  return {
    refund_status: "pending",
    refund_method: opts.hasStripePaymentIntent ? "original_payment" : "pratiqo_credit",
    refund_amount: price,
  };
}

export function interpolateBookingCancelledMessage(template: string, date: string, time: string): string {
  return template.replace(/\{date\}/g, date).replace(/\{time\}/g, time);
}
