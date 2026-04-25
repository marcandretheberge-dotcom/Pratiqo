import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type BlockedSlotDayRow,
  formatLocalISODate,
  getAvailableDays,
  weeklyAvailabilityFromTeacherRows,
} from "@/lib/slots";

type Admin = SupabaseClient;

export function defaultLessonDurationMinutes(homeMin: number | null | undefined): number {
  const n = Number(homeMin);
  return Number.isFinite(n) && n >= 30 && n <= 180 ? Math.round(n) : 60;
}

export async function fetchBookedSlotsByDate(
  admin: Admin,
  teacherId: string,
  fromIso: string,
  toIso: string,
): Promise<Record<string, string[]>> {
  const { data, error } = await admin
    .from("bookings")
    .select("slot_date, time_slot, status")
    .eq("teacher_id", teacherId)
    .in("status", ["pending_payment", "confirmed", "booked"])
    .not("slot_date", "is", null)
    .not("time_slot", "is", null)
    .gte("slot_date", fromIso)
    .lte("slot_date", toIso);

  if (error || !data) return {};

  const map: Record<string, string[]> = {};
  for (const row of data as { slot_date?: string; time_slot?: string }[]) {
    const ds = row.slot_date as string;
    const ts = row.time_slot as string;
    if (!ds || !ts) continue;
    if (!map[ds]) map[ds] = [];
    map[ds].push(ts);
  }
  return map;
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
    .select("availability, home_lesson_min_duration")
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

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, weeks) * 7 - 1);
  const fromIso = formatLocalISODate(start);
  const toIso = formatLocalISODate(end);

  const bookedByDate = await fetchBookedSlotsByDate(admin, teacherId, fromIso, toIso);
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

  const days = getAvailableDays(weekly, durationMinutes, bookedByDate, blockedByDate, weeks);
  return { days, durationMinutes };
}
