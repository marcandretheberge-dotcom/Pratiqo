import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type BlockedSlotDayRow,
  type BookedSlotInterval,
  formatLocalISODate,
  getAvailableDays,
  slotStartMinutes,
  weeklyAvailabilityFromTeacherRows,
} from "@/lib/slots";

type Admin = SupabaseClient;

/** Default lesson duration in minutes when the candidate booking does not specify one. */
const DEFAULT_LESSON_DURATION_MIN = 60;

export function defaultLessonDurationMinutes(homeMin: number | null | undefined): number {
  const n = Number(homeMin);
  return Number.isFinite(n) && n >= 30 && n <= 180 ? Math.round(n) : 60;
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

  if (error || !data) return { timeLabelsByDate: {}, intervalsByDate: {} };

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

  if (error || !data) return {};

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
): Promise<{ days: Record<string, number>; durationMinutes: number }> {
  const { data: teacher, error } = await admin
    .from("teachers")
    .select(
      "availability, home_lesson_min_duration, booking_buffer_before_minutes, booking_buffer_after_minutes",
    )
    .eq("id", teacherId)
    .maybeSingle();

  if (error || !teacher) {
    return { days: {}, durationMinutes: 60 };
  }

  const base = defaultLessonDurationMinutes(
    (teacher as { home_lesson_min_duration?: number | null }).home_lesson_min_duration,
  );
  const durationMinutes =
    typeof durationOverride === "number" &&
    Number.isFinite(durationOverride) &&
    durationOverride >= 30 &&
    durationOverride <= 180
      ? Math.round(durationOverride)
      : base;
  const weekly = weeklyAvailabilityFromTeacherRows((teacher as { availability?: unknown }).availability);
  const buffers = normalizeTeacherBufferSettings(teacher as Parameters<typeof normalizeTeacherBufferSettings>[0]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, weeks) * 7 - 1);
  const fromIso = formatLocalISODate(start);
  const toIso = formatLocalISODate(end);

  const { timeLabelsByDate, intervalsByDate } = await fetchBookedSlotsByDate(admin, teacherId, fromIso, toIso);
  const blockedRows = await admin
    .from("blocked_slots")
    .select("blocked_date, period, start_time, end_time")
    .eq("teacher_id", teacherId)
    .gte("blocked_date", fromIso)
    .lte("blocked_date", toIso);
  const blockedRaw = (blockedRows.data || []) as {
    blocked_date?: string;
    period?: string | null;
    start_time?: string | null;
    end_time?: string | null;
  }[];
  const blockedByDate: Record<string, BlockedSlotDayRow[]> = {};
  for (const row of blockedRaw) {
    const ds = row.blocked_date as string;
    if (!ds) continue;
    if (!blockedByDate[ds]) blockedByDate[ds] = [];
    blockedByDate[ds].push({
      period: row.period ?? null,
      start_time: row.start_time ?? null,
      end_time: row.end_time ?? null,
    });
  }

  const days = getAvailableDays(weekly, durationMinutes, timeLabelsByDate, blockedByDate, weeks, {
    bookedIntervalsByDate: intervalsByDate,
    bufferBeforeMin: buffers.bookingBufferBeforeMinutes,
    bufferAfterMin: buffers.bookingBufferAfterMinutes,
  });
  return { days, durationMinutes };
}
