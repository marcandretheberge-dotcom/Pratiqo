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

type TeacherRowAdmin = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: {
            id?: string;
            available_from_date?: string | null;
            schedule_mode?: string | null;
          } | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
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

  const { data: teacher, error: teacherErr } = await (admin as unknown as TeacherRowAdmin)
    .from("teachers")
    .select("id, available_from_date, schedule_mode")
    .eq("id", teacherId)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return { ok: false, error: "offer_not_found" };
  }

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
