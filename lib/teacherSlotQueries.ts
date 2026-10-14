import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbRowsToNormalized } from "@/lib/schedule/weeklyIntervals";
import { isTeacherScheduleExceptionsEnabled, mapDbRowsToExceptions } from "@/lib/schedule/dateExceptions";
import { slotStartMinutes, type BlockedSlotDayRow, type BookedSlotInterval } from "@/lib/slots";
import { matchesLearnerAvailability } from "./learnerAvailability";
import { normalizeLessonDurationMinutes } from "@/lib/pricing/lessonDuration";
import { addCalendarDays, dateInTeacherTimeZone } from "@/lib/timezones";
import { generateBookableSlotsForTeacherDay } from "@/lib/bookings/bookableSlotsForDay";
import { holdRowsToBookedIntervals, listActiveHoldsForTeacherDay } from "@/lib/offers/plannedPackageHoldQueries";

type Admin = SupabaseClient;

/** Default lesson duration in minutes when the candidate booking does not specify one. */
const DEFAULT_LESSON_DURATION_MIN = 60;

export function defaultLessonDurationMinutes(
  teacherDefaultMinutes: number | null | undefined,
): number {
  return normalizeLessonDurationMinutes(teacherDefaultMinutes, DEFAULT_LESSON_DURATION_MIN);
}

/**
 * Buffer settings stored on `public.teachers` (migration 066).
 * Defaults to 0/0 (no behavior change).
 */
export type TeacherBufferSettings = {
  bookingBufferBeforeMinutes: number;
  bookingBufferAfterMinutes: number;
};

export function normalizeTeacherBufferSettings(
  row: { booking_buffer_before_minutes?: number | null; booking_buffer_after_minutes?: number | null } | null | undefined,
): TeacherBufferSettings {
  const clamp = (n: unknown): number => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return 0;
    return Math.min(240, Math.round(v));
  };
  return {
    bookingBufferBeforeMinutes: clamp(row?.booking_buffer_before_minutes),
    bookingBufferAfterMinutes: clamp(row?.booking_buffer_after_minutes),
  };
}

/**
 * Fetch active bookings for a teacher in [fromIso, toIso] and return both
 * a date → time labels map (back-compat for legacy callers) and a date →
 * interval map (start minute + duration). The interval map is used by
 * buffer-aware availability generation.
 *
 * Only `pending_payment` and `confirmed` count as blocking.
 */
export async function fetchBookedSlotsByDate(
  admin: Admin,
  teacherId: string,
  fromIso: string,
  toIso: string,
): Promise<{
  timeLabelsByDate: Record<string, string[]>;
  intervalsByDate: Record<string, BookedSlotInterval[]>;
}> {
  const { data, error } = await admin
    .from("bookings")
    .select("slot_date, time_slot, duration_minutes, status")
    .eq("teacher_id", teacherId)
    .in("status", ["pending_payment", "confirmed"])
    .not("slot_date", "is", null)
    .not("time_slot", "is", null)
    .gte("slot_date", fromIso)
    .lte("slot_date", toIso);

  if (error) throw new Error("booking_calendar_lookup_failed");
  if (!data) return { timeLabelsByDate: {}, intervalsByDate: {} };

  const timeLabelsByDate: Record<string, string[]> = {};
  const intervalsByDate: Record<string, BookedSlotInterval[]> = {};
  for (const row of data as { slot_date?: string; time_slot?: string; duration_minutes?: number | null }[]) {
    const ds = row.slot_date as string;
    const ts = row.time_slot as string;
    if (!ds || !ts) continue;
    if (!timeLabelsByDate[ds]) timeLabelsByDate[ds] = [];
    timeLabelsByDate[ds].push(ts);

    const startMin = slotStartMinutes(ts);
    if (startMin < 0) continue;
    const rawDuration = Number(row.duration_minutes);
    const durationMin =
      Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration) : DEFAULT_LESSON_DURATION_MIN;
    if (!intervalsByDate[ds]) intervalsByDate[ds] = [];
    intervalsByDate[ds].push({ startMin, durationMin });
  }
  return { timeLabelsByDate, intervalsByDate };
}

export async function fetchBlockedByDate(
  admin: Admin,
  teacherId: string,
  fromIso: string,
  toIso: string,
): Promise<Record<string, BlockedSlotDayRow[]>> {
  const { data, error } = await admin
    .from("blocked_slots")
    .select("blocked_date, period, start_time, end_time")
    .eq("teacher_id", teacherId)
    .gte("blocked_date", fromIso)
    .lte("blocked_date", toIso);

  if (error) throw new Error("blocked_calendar_lookup_failed");
  if (!data) return {};

  const map: Record<string, BlockedSlotDayRow[]> = {};
  for (const row of data as {
    blocked_date?: string;
    period?: string | null;
    start_time?: string | null;
    end_time?: string | null;
  }[]) {
    const ds = row.blocked_date as string;
    if (!ds) continue;
    if (!map[ds]) map[ds] = [];
    map[ds].push({
      period: row.period ?? null,
      start_time: row.start_time ?? null,
      end_time: row.end_time ?? null,
    });
  }
  return map;
}

export async function computeAvailableDaysForTeacher(
  admin: Admin,
  teacherId: string,
  weeks: number,
  durationOverride?: number | null,
  availability: import("./learnerAvailability").LearnerAvailability = "any",
): Promise<{ days: Record<string, number>; durationMinutes: number }> {
  const { data: teacher, error } = await admin.from("teachers")
    .select("timezone, availability, default_lesson_duration_minutes, available_from_date, booking_buffer_before_minutes, booking_buffer_after_minutes, schedule_mode")
    .eq("id", teacherId).maybeSingle();
  if (error) throw new Error("teacher_calendar_lookup_failed");
  if (!teacher) return { days: {}, durationMinutes: 60 };
  const durationMinutes = typeof durationOverride === "number" && Number.isFinite(durationOverride) &&
    durationOverride >= 30 && durationOverride <= 180 && durationOverride % 15 === 0
    ? durationOverride : defaultLessonDurationMinutes(teacher.default_lesson_duration_minutes);
  const now = new Date();
  const from = dateInTeacherTimeZone(now, teacher.timezone);
  const to = addCalendarDays(from, Math.max(1, weeks) * 7 - 1);
  const booked = await fetchBookedSlotsByDate(admin, teacherId, from, to);
  const blocked = await fetchBlockedByDate(admin, teacherId, from, to);
  const intervals = await admin.from("teacher_weekly_availability_intervals")
    .select("day_of_week, start_time, end_time, is_active").eq("teacher_id", teacherId).eq("is_active", true);
  const exceptions = isTeacherScheduleExceptionsEnabled()
    ? await admin.from("teacher_schedule_exceptions").select("exception_date, exception_type, start_time, end_time, is_active")
      .eq("teacher_id", teacherId).eq("is_active", true).gte("exception_date", from).lte("exception_date", to)
    : { data: [], error: null };
  if (intervals.error || exceptions.error) throw new Error("teacher_schedule_lookup_failed");
  const days: Record<string, number> = {};
  for (let i = 0; i < Math.max(1, weeks) * 7; i++) {
    const date = addCalendarDays(from, i);
    const holds = await listActiveHoldsForTeacherDay({ admin, teacherId, slotDate: date, now, timeZone: teacher.timezone });
    const result = generateBookableSlotsForTeacherDay({
      teacher, date, now, durationMinutes,
      weeklyIntervals: mapDbRowsToNormalized(intervals.data ?? []),
      exceptions: mapDbRowsToExceptions(exceptions.data ?? []),
      bookedSlots: booked.timeLabelsByDate[date] ?? [],
      bookedIntervals: [...(booked.intervalsByDate[date] ?? []), ...holdRowsToBookedIntervals(holds, teacher.timezone)],
      blockedDayRows: blocked[date] ?? [],
    });
    const count = result.slots.filter(slot => matchesLearnerAvailability(availability, date, slotStartMinutes(slot), durationMinutes)).length;
    if (count) days[date] = count;
  }
  return { days, durationMinutes };
}
