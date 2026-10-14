/**
 * Teacher availability booking preview (read-only).
 *
 * Reuses generateBookableSlotsForTeacherDay — same pipeline as learner slots API.
 * Does not mutate schedule, bookings, package balances, or Stripe.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addLocalISODays,
  bookedIntervalsFromRows,
  generateBookableSlotsForTeacherDay,
  mapDbRowsToExceptions,
  mapDbRowsToNormalized,
  type BookableDayBlockedReason,
  type BookableSlotSource,
} from "@/lib/bookings/bookableSlotsForDay";
import { isValidLessonDurationMinutes } from "@/lib/pricing/lessonDuration";
import { isTeacherPreciseScheduleBookingEnabled } from "@/lib/schedule/preciseScheduleActivation";
import { minutesToHHMM } from "@/lib/schedule/weeklyIntervals";
import { slotStartMinutes } from "@/lib/slots";
import { normalizeAvailableFromDate } from "@/lib/teachers/availabilityStartDate";
import {
  deriveTeacherReadinessContract,
  type TeacherStripeReadinessInput,
} from "@/lib/teachers/readinessContracts";
import { defaultLessonDurationMinutes } from "@/lib/teacherSlotQueries";
import { dateInTeacherTimeZone } from "@/lib/timezones";

export const TEACHER_AVAILABILITY_PREVIEW_FLAG = "ENABLE_TEACHER_AVAILABILITY_PREVIEW";
export const TEACHER_AVAILABILITY_PREVIEW_UI_FLAG =
  "NEXT_PUBLIC_ENABLE_TEACHER_AVAILABILITY_PREVIEW";

/** Preview duration choices shown in the Horaire UI (subset of lesson options). */
export const AVAILABILITY_PREVIEW_DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

/** Preview horizon choices (days ahead from today, inclusive of today). */
export const AVAILABILITY_PREVIEW_DAY_OPTIONS = [7, 14, 30] as const;

export function isTeacherAvailabilityPreviewEnabled(): boolean {
  return process.env.ENABLE_TEACHER_AVAILABILITY_PREVIEW === "true";
}

export function isTeacherAvailabilityPreviewUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEACHER_AVAILABILITY_PREVIEW === "true";
}

export type AvailabilityPreviewSlot = {
  start: string;
  end: string;
  /** Internal slot label used by booking APIs ("9h00"). */
  timeSlot: string;
  source: BookableSlotSource;
};

export type AvailabilityPreviewDay = {
  date: string;
  bookable: boolean;
  slots: AvailabilityPreviewSlot[];
  blockedReasons: BookableDayBlockedReason[];
  source: BookableSlotSource;
};

export type AvailabilityPreviewResult = {
  startDate: string;
  daysRequested: number;
  durationMinutes: number;
  availableFromDate: string | null;
  scheduleMode: string;
  days: AvailabilityPreviewDay[];
  paymentReadiness: {
    ready: boolean;
    reason: "teacher_payment_not_ready" | null;
  };
};

function slotLabelToHHMM(slot: string): string | null {
  const startMin = slotStartMinutes(slot);
  if (startMin < 0) return null;
  return minutesToHHMM(startMin);
}

function toPreviewSlots(
  slots: string[],
  durationMinutes: number,
  source: BookableSlotSource,
): AvailabilityPreviewSlot[] {
  const out: AvailabilityPreviewSlot[] = [];
  for (const timeSlot of slots) {
    const start = slotLabelToHHMM(timeSlot);
    if (!start) continue;
    const startMin = slotStartMinutes(timeSlot);
    const end = minutesToHHMM(startMin + durationMinutes);
    out.push({ start, end, timeSlot, source });
  }
  return out;
}

export function parseAvailabilityPreviewQuery(args: {
  startDate: string | null;
  days: string | null;
  durationMinutes: string | null;
  teacherDefaultDuration: number | null | undefined;
  today?: string;
  timeZone?: string | null;
  now?: Date;
}):
  | { ok: true; startDate: string; days: number; durationMinutes: number }
  | { ok: false; error: "invalid_start_date" | "invalid_days" | "invalid_duration" } {
  const today = args.today ?? dateInTeacherTimeZone(args.now ?? new Date(), args.timeZone);
  const startDate = args.startDate && /^\d{4}-\d{2}-\d{2}$/.test(args.startDate) ? args.startDate : today;
  if (startDate < today) {
    return { ok: false, error: "invalid_start_date" };
  }

  const daysRaw = args.days != null ? Number(args.days) : 14;
  const days = Math.round(daysRaw);
  if (![7, 14, 30].includes(days)) {
    return { ok: false, error: "invalid_days" };
  }

  const durRaw = args.durationMinutes != null ? Number(args.durationMinutes) : NaN;
  const durationMinutes =
    Number.isFinite(durRaw) && isValidLessonDurationMinutes(durRaw)
      ? Math.round(durRaw)
      : defaultLessonDurationMinutes(args.teacherDefaultDuration);

  return { ok: true, startDate, days, durationMinutes };
}

/**
 * Read-only multi-day availability preview for the authenticated teacher.
 */
export async function computeTeacherAvailabilityPreview(
  admin: SupabaseClient,
  teacherId: string,
  args: {
    startDate: string;
    days: number;
    durationMinutes: number;
    now?: Date;
  },
): Promise<AvailabilityPreviewResult | { error: "teacher_not_found" | "server_error" }> {
  const { data: teacherRow, error: teacherErr } = await admin
    .from("teachers")
    .select(
      "id, timezone, availability, available_from_date, schedule_mode, default_lesson_duration_minutes, booking_buffer_before_minutes, booking_buffer_after_minutes, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_requirements_due, stripe_connect_disabled_reason, is_listed",
    )
    .eq("id", teacherId)
    .maybeSingle();

  if (teacherErr) return { error: "server_error" };
  const teacher = teacherRow as Record<string, unknown> | null;
  if (!teacher || typeof teacher.id !== "string") return { error: "teacher_not_found" };

  const endDate = addLocalISODays(args.startDate, args.days - 1);

  const [{ data: intervalRows, error: intervalErr }, { data: bookedRows, error: bookedErr }, { data: blockedRows, error: blockedErr }, exceptionResult] =
    await Promise.all([
      admin
        .from("teacher_weekly_availability_intervals")
        .select("day_of_week, start_time, end_time, is_active")
        .eq("teacher_id", teacherId)
        .eq("is_active", true),
      admin
        .from("bookings")
        .select("slot_date, time_slot, duration_minutes")
        .eq("teacher_id", teacherId)
        .gte("slot_date", args.startDate)
        .lte("slot_date", endDate)
        .in("status", ["pending_payment", "confirmed"])
        .not("time_slot", "is", null),
      admin
        .from("blocked_slots")
        .select("blocked_date, period, start_time, end_time")
        .eq("teacher_id", teacherId)
        .gte("blocked_date", args.startDate)
        .lte("blocked_date", endDate),
      admin
        .from("teacher_schedule_exceptions")
        .select("exception_date, exception_type, start_time, end_time, is_active")
        .eq("teacher_id", teacherId)
        .gte("exception_date", args.startDate)
        .lte("exception_date", endDate)
        .eq("is_active", true),
    ]);

  if (intervalErr || bookedErr || blockedErr || exceptionResult.error) {
    return { error: "server_error" };
  }

  const weeklyIntervals = mapDbRowsToNormalized(intervalRows ?? []);
  // Never include private notes — select omits note column.
  const allExceptions = mapDbRowsToExceptions(exceptionResult.data ?? []);

  const bookedByDate = new Map<string, Array<{ time_slot?: string | null; duration_minutes?: number | null }>>();
  for (const row of bookedRows ?? []) {
    const date = typeof row.slot_date === "string" ? row.slot_date : null;
    if (!date) continue;
    const list = bookedByDate.get(date) ?? [];
    list.push(row);
    bookedByDate.set(date, list);
  }

  const blockedByDate = new Map<
    string,
    Array<{ period: string | null; start_time?: string | null; end_time?: string | null }>
  >();
  for (const row of blockedRows ?? []) {
    const date = typeof (row as { blocked_date?: string }).blocked_date === "string"
      ? (row as { blocked_date: string }).blocked_date
      : null;
    if (!date) continue;
    const list = blockedByDate.get(date) ?? [];
    list.push(row as { period: string | null; start_time?: string | null; end_time?: string | null });
    blockedByDate.set(date, list);
  }

  const preciseBookingEnabled = isTeacherPreciseScheduleBookingEnabled();
  const days: AvailabilityPreviewDay[] = [];

  for (let i = 0; i < args.days; i++) {
    const date = addLocalISODays(args.startDate, i);
    const booked = bookedIntervalsFromRows(bookedByDate.get(date) ?? []);
    const dayExceptions = allExceptions.filter((ex) => ex.exceptionDate === date);
    const dayResult = generateBookableSlotsForTeacherDay({
      date,
      durationMinutes: args.durationMinutes,
      teacher: teacher as {
        availability?: unknown;
        available_from_date?: string | null;
        schedule_mode?: string | null;
        booking_buffer_before_minutes?: number | null;
        booking_buffer_after_minutes?: number | null;
      },
      weeklyIntervals,
      exceptions: dayExceptions,
      bookedSlots: booked.bookedSlots,
      bookedIntervals: booked.bookedIntervals,
      blockedDayRows: blockedByDate.get(date) ?? [],
      now: args.now,
      preciseBookingEnabled,
    });

    days.push({
      date,
      bookable: dayResult.slots.length > 0,
      slots: toPreviewSlots(dayResult.slots, args.durationMinutes, dayResult.source),
      blockedReasons: dayResult.blockedReasons,
      source: dayResult.source,
    });
  }

  const stripeInput: TeacherStripeReadinessInput = {
    stripe_account_id: teacher.stripe_account_id as string | null | undefined,
    stripe_connect_onboarding_complete: teacher.stripe_connect_onboarding_complete as
      | boolean
      | null
      | undefined,
    stripe_connect_charges_enabled: teacher.stripe_connect_charges_enabled as boolean | null | undefined,
    stripe_connect_payouts_enabled: teacher.stripe_connect_payouts_enabled as boolean | null | undefined,
    stripe_connect_requirements_due: teacher.stripe_connect_requirements_due,
    stripe_connect_disabled_reason: teacher.stripe_connect_disabled_reason as string | null | undefined,
  };

  const readiness = deriveTeacherReadinessContract({
    ...stripeInput,
    profileVisibilityReady: Boolean(teacher.is_listed),
    hasBookableAvailability: days.some((d) => d.bookable),
    requiresOnlinePayment: true,
  });

  return {
    startDate: args.startDate,
    daysRequested: args.days,
    durationMinutes: args.durationMinutes,
    availableFromDate: normalizeAvailableFromDate(
      teacher.available_from_date as string | null | undefined,
    ),
    scheduleMode: String(teacher.schedule_mode ?? "legacy_blocks"),
    days,
    paymentReadiness: {
      ready: readiness.paymentReady && readiness.payoutReady,
      reason:
        readiness.paymentReady && readiness.payoutReady ? null : "teacher_payment_not_ready",
    },
  };
}

export type { BookableDayBlockedReason };
