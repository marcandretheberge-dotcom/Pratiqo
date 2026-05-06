import { slotStartMinutes } from "@/lib/slots";

export type BookingLifecycleState = "upcoming" | "ready" | "needs_review" | "completed" | "inactive";

export type BookingTimingInput = {
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
  duration_minutes?: number | string | null;
  status?: string | null;
};

const INACTIVE_STATUSES = new Set(["cancelled", "cancelled_conflict", "declined", "refunded"]);
const COMPLETED_STATUSES = new Set(["completed", "reviewed"]);

function parseLegacyTimeMinutes(raw: string): number | null {
  const trimmed = raw.trim();
  const compact = slotStartMinutes(trimmed);
  if (compact >= 0) return compact;
  const hhmm = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (!hhmm) return null;
  return Number(hhmm[1]) * 60 + Number(hhmm[2]);
}

export function bookingStartAt(booking: BookingTimingInput): Date | null {
  const date = String(booking.slot_date || booking.date || "").trim();
  const time = String(booking.time_slot || booking.time || "").trim();
  if (!date || !time) return null;
  const minutes = parseLegacyTimeMinutes(time);
  if (minutes == null) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
  return Number.isNaN(start.getTime()) ? null : start;
}

export function bookingEndAt(booking: BookingTimingInput): Date | null {
  const start = bookingStartAt(booking);
  if (!start) return null;
  const duration = Number(booking.duration_minutes ?? 60);
  const minutes = Number.isFinite(duration) && duration > 0 ? duration : 60;
  return new Date(start.getTime() + minutes * 60 * 1000);
}

export function getBookingLifecycleState(booking: BookingTimingInput, now = new Date()): BookingLifecycleState {
  const status = String(booking.status || "").toLowerCase();
  if (COMPLETED_STATUSES.has(status)) return "completed";
  if (INACTIVE_STATUSES.has(status)) return "inactive";

  const start = bookingStartAt(booking);
  const end = bookingEndAt(booking);
  if (!start || !end) return "upcoming";

  const readyAt = new Date(start.getTime() - 15 * 60 * 1000);
  if (now < readyAt) return "upcoming";
  if (now <= end) return "ready";
  return "needs_review";
}

export function isBookingVisibleForTeacher(booking: BookingTimingInput, now = new Date()): boolean {
  return getBookingLifecycleState(booking, now) !== "inactive";
}

export function bookingLifecycleRank(state: BookingLifecycleState): number {
  if (state === "ready") return 0;
  if (state === "needs_review") return 1;
  if (state === "upcoming") return 2;
  if (state === "completed") return 3;
  return 4;
}
