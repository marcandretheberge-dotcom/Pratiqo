/**
 * Validate planned package draft session times against the same booking availability path.
 * Does not create bookings or holds.
 */

import { applyDateExceptionToBooking } from "@/lib/bookings/dateExceptionGuard";
import type { DateExceptionAdmin } from "@/lib/bookings/dateExceptionGuard";
import { rejectIfOutsideWeeklyIntervals } from "@/lib/bookings/weeklyIntervalGuard";
import type { WeeklyIntervalAdmin } from "@/lib/bookings/weeklyIntervalGuard";
import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";
import { formatLocalISODate, formatSlotLabel } from "@/lib/slots";
import { canBookTeacherOnDate } from "@/lib/teachers/availabilityStartDate";

export type PlannedPackageSlotAdmin = DateExceptionAdmin & WeeklyIntervalAdmin;

export type PlannedPackageTeacherRow = {
  id?: string;
  available_from_date?: string | null;
  schedule_mode?: string | null;
};

/** Narrow query shape after `.eq(...)` — mirrors weeklyIntervalGuard maybeSingle access. */
type PlannedPackageTeacherQuery = {
  maybeSingle?: () => PromiseLike<{
    data: PlannedPackageTeacherRow | null;
    error: { message?: string } | null;
  }>;
};

export type ParsedDraftSlot = {
  startsAtIso: string;
  endsAtIso: string;
  slotDate: string;
  timeSlot: string;
};

export function parseStartsAtToBookingSlot(
  startsAtIso: string,
  durationMinutes: number,
): ParsedDraftSlot | null {
  const start = new Date(startsAtIso);
  if (Number.isNaN(start.getTime())) return null;
  if (start.getMinutes() % 15 !== 0 || start.getSeconds() !== 0) {
    // Allow seconds=0 from toISOString rounding; minutes should align to slot grid.
  }
  const slotDate = formatLocalISODate(start);
  const timeSlot = formatSlotLabel(start.getHours(), start.getMinutes());
  if (!/^\d{1,2}h\d{2}$/.test(timeSlot)) return null;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    startsAtIso: start.toISOString(),
    endsAtIso: end.toISOString(),
    slotDate,
    timeSlot,
  };
}

/**
 * Load teacher row for draft slot validation without chaining maybeSingle on
 * the DateExceptionAdmin ∩ WeeklyIntervalAdmin intersection (which resolves
 * `.eq(...)` as DateExceptionFilter without maybeSingle).
 */
export async function loadPlannedPackageTeacherForSlot(
  admin: PlannedPackageSlotAdmin,
  teacherId: string,
): Promise<
  | { ok: true; teacher: PlannedPackageTeacherRow }
  | { ok: false; error: "offer_not_found" | "server_error" }
> {
  const teacherQuery = admin
    .from("teachers")
    .select("id, available_from_date, schedule_mode")
    .eq("id", teacherId) as unknown as PlannedPackageTeacherQuery;

  const maybeSingle = teacherQuery.maybeSingle;
  if (typeof maybeSingle !== "function") {
    return { ok: false, error: "server_error" };
  }

  const { data: teacher, error: teacherErr } = await maybeSingle.call(teacherQuery);
  if (teacherErr) {
    return { ok: false, error: "server_error" };
  }
  if (!teacher?.id) {
    return { ok: false, error: "offer_not_found" };
  }
  return { ok: true, teacher };
}

export async function validatePlannedPackageDraftSlot(args: {
  admin: PlannedPackageSlotAdmin;
  teacherId: string;
  slot: ParsedDraftSlot;
  durationMinutes: number;
}): Promise<{ ok: true; availabilitySource: string } | { ok: false; error: string }> {
  const { admin, teacherId, slot, durationMinutes } = args;

  if (
    !isBookingAtLeast24hAhead({
      slot_date: slot.slotDate,
      time_slot: slot.timeSlot,
    })
  ) {
    return { ok: false, error: "slot_outside_teacher_availability" };
  }

  const loaded = await loadPlannedPackageTeacherForSlot(admin, teacherId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error === "server_error" ? "server_error" : "offer_not_found" };
  }
  const teacher = loaded.teacher;

  if (!canBookTeacherOnDate(teacher.available_from_date ?? null, slot.slotDate)) {
    return { ok: false, error: "slot_outside_teacher_availability" };
  }

  const scheduleMode =
    typeof teacher.schedule_mode === "string" ? teacher.schedule_mode : null;

  const exceptionResult = await applyDateExceptionToBooking({
    admin,
    teacherId,
    slotDate: slot.slotDate,
    timeSlot: slot.timeSlot,
    durationMinutes,
    scheduleMode,
  });
  if (!exceptionResult.ok) {
    return { ok: false, error: "slot_outside_teacher_availability" };
  }

  if (!exceptionResult.skipWeeklyIntervals) {
    const intervalReject = await rejectIfOutsideWeeklyIntervals({
      admin,
      teacherId,
      slotDate: slot.slotDate,
      timeSlot: slot.timeSlot,
      durationMinutes,
      scheduleMode,
    });
    if (intervalReject) {
      return { ok: false, error: "slot_outside_teacher_availability" };
    }
  }

  const availabilitySource = exceptionResult.skipWeeklyIntervals
    ? "exception_custom_hours"
    : "weekly_intervals_or_legacy";

  return { ok: true, availabilitySource };
}
