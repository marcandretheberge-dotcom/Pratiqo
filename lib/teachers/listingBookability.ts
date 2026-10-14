import type { SupabaseClient } from "@supabase/supabase-js";
import { teacherPaymentReadinessFailureReasons, teacherPayoutReadinessContractFailureReasons, type TeacherStripeReadinessInput } from "./readinessContracts";
import { validateMinimumLessonPriceDollars } from "@/lib/pricing/validateMinimumLessonPrice";
import { bookedIntervalsFromRows, generateBookableSlotsForTeacherDay, mapDbRowsToExceptions, mapDbRowsToNormalized, type BookableSlotsForDayInput } from "@/lib/bookings/bookableSlotsForDay";
import { defaultLessonDurationMinutes } from "@/lib/teacherSlotQueries";
import { slotStartMinutes, intervalsOverlap, expandBookingInterval } from "@/lib/slots";
import { addCalendarDays, dateInTeacherTimeZone, teacherDayBounds } from "@/lib/timezones";
import { deriveTeacherBookingCapability, type TeacherBookingCapability } from "./bookingCapability";
import { isTeacherScheduleExceptionsEnabled } from "@/lib/schedule/dateExceptions";
import { isTeacherPreciseScheduleBookingEnabled } from "@/lib/schedule/preciseScheduleActivation";
import { isPlannedPackageTemporaryHoldsEnabled } from "@/lib/offers/plannedPackageTemporaryHolds";
import { holdRowsToBookedIntervals, type HoldIntervalRow } from "@/lib/offers/plannedPackageHoldQueries";

type ListingBookingRow = TeacherStripeReadinessInput & BookableSlotsForDayInput["teacher"] & {
  id: string;
  user_id?: string | null;
  price_per_lesson: number | string | null;
  default_lesson_duration_minutes?: number | null;
  teaching_mode?: string | null;
  home_lesson_min_duration?: number | null;
};

export function hasListingBookingPrerequisites(row: ListingBookingRow): boolean {
  return validateMinimumLessonPriceDollars(Number(row.price_per_lesson)).ok &&
    teacherPaymentReadinessFailureReasons(row).length === 0 &&
    teacherPayoutReadinessContractFailureReasons(row).length === 0;
}

/** Read-only batch projection for already-public teachers. Never returns private fields.
 * Uses the regular lesson duration and the same four-week window as BookingModal.
 * A concrete booking is still revalidated by the booking API at submission time.
 */
export async function getTeacherListingBookability(
  admin: SupabaseClient,
  publicTeacherIds: string[],
  now = new Date(),
): Promise<Record<string, boolean | null>> {
  const capabilities = await getTeacherListingCapabilities(admin, publicTeacherIds, now);
  return Object.fromEntries(Object.entries(capabilities).map(([id, state]) => [id, state ? state.action === "book" : null]));
}

export async function getTeacherListingCapabilities(admin: SupabaseClient, publicTeacherIds: string[], now = new Date()): Promise<Record<string, TeacherBookingCapability | null>> {
  const result: Record<string, TeacherBookingCapability | null> = Object.fromEntries(publicTeacherIds.map((id) => [id, null]));
  if (!publicTeacherIds.length) return result;
  try {
    const teachers = await admin.from("teachers").select(
      "id, user_id, timezone, price_per_lesson, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_requirements_due, stripe_connect_disabled_reason, availability, available_from_date, schedule_mode, default_lesson_duration_minutes, teaching_mode, home_lesson_min_duration, booking_buffer_before_minutes, booking_buffer_after_minutes",
    ).in("id", publicTeacherIds);
    if (teachers.error) throw new Error("teacher_readiness_lookup");
    const eligible = (teachers.data as ListingBookingRow[] ?? []).filter((row) => {
      if (validateMinimumLessonPriceDollars(Number(row.price_per_lesson)).ok) return true;
      result[row.id] = deriveTeacherBookingCapability({ validRate: false, paymentReady: false, hasSlot: false, canContact: Boolean(row.user_id) });
      return false;
    });
    if (!eligible.length) return result;
    const ids = eligible.map((row) => row.id);
    const datesFor = (teacher: ListingBookingRow) => Array.from({ length: 28 }, (_, i) => addCalendarDays(dateInTeacherTimeZone(now, teacher.timezone), i));
    const dates = [...new Set(eligible.flatMap(datesFor))].sort();
    const from = dates[0];
    const to = dates[dates.length - 1];
    const bookings = await admin.from("bookings").select("teacher_id, slot_date, time_slot, duration_minutes", { count: "exact" })
      .in("teacher_id", ids).in("status", ["pending_payment", "confirmed"]).gte("slot_date", from).lte("slot_date", to);
    const blocks = await admin.from("blocked_slots").select("teacher_id, blocked_date, period, start_time, end_time", { count: "exact" })
      .in("teacher_id", ids).gte("blocked_date", from).lte("blocked_date", to);
    const intervals = await admin.from("teacher_weekly_availability_intervals").select("teacher_id, day_of_week, start_time, end_time, is_active", { count: "exact" })
      .in("teacher_id", ids).eq("is_active", true);
    const exceptions = isTeacherScheduleExceptionsEnabled()
      ? await admin.from("teacher_schedule_exceptions").select("teacher_id, exception_date, exception_type, start_time, end_time, is_active", { count: "exact" })
        .in("teacher_id", ids).eq("is_active", true).gte("exception_date", from).lte("exception_date", to)
      : { data: [], error: null, count: 0 };
    // Read holds without the opportunistic expiry writes used in the booking flow.
    const bounds = eligible.map(teacher => ({ start: teacherDayBounds(from, teacher.timezone).start, end: teacherDayBounds(to, teacher.timezone).end }));
    const start = new Date(Math.min(...bounds.map(bound => bound.start.getTime())));
    const end = new Date(Math.max(...bounds.map(bound => bound.end.getTime())));
    const holds = isPlannedPackageTemporaryHoldsEnabled()
      ? await admin.from("planned_package_session_holds").select("teacher_id, starts_at, ends_at", { count: "exact" })
        .in("teacher_id", ids).eq("status", "active").gt("expires_at", now.toISOString())
        .lt("starts_at", end.toISOString()).gt("ends_at", start.toISOString())
      : { data: [], error: null, count: 0 };
    // A truncated conflict query must never create a false positive availability.
    if ([bookings, blocks, intervals, exceptions, holds].some((query) =>
      query.error || query.count == null || query.count > (query.data?.length ?? 0))) {
      throw new Error("calendar_lookup");
    }
    for (const teacher of eligible) {
      const weeklyIntervals = mapDbRowsToNormalized((intervals.data ?? []).filter((row) => row.teacher_id === teacher.id));
      const hasSlot = datesFor(teacher).some((date) => {
        const booked = bookedIntervalsFromRows((bookings.data ?? []).filter((row) => row.teacher_id === teacher.id && row.slot_date === date));
        const { start: dayStart, end: dayEnd } = teacherDayBounds(date, teacher.timezone);
        const dayHolds = (holds.data ?? []).filter((row) => row.teacher_id === teacher.id &&
          new Date(row.starts_at) < dayEnd && new Date(row.ends_at) > dayStart);
        const durationMinutes = teacher.teaching_mode === "home"
          ? teacher.home_lesson_min_duration ?? 60
          : defaultLessonDurationMinutes(teacher.default_lesson_duration_minutes);
        const occupied = [...booked.bookedIntervals, ...holdRowsToBookedIntervals(dayHolds as HoldIntervalRow[], teacher.timezone)];
        const day = generateBookableSlotsForTeacherDay({
          date, now, teacher, weeklyIntervals,
          durationMinutes,
          exceptions: mapDbRowsToExceptions((exceptions.data ?? []).filter((row) => row.teacher_id === teacher.id && row.exception_date === date)),
          bookedSlots: booked.bookedSlots,
          bookedIntervals: occupied,
          blockedDayRows: (blocks.data ?? []).filter((row) => row.teacher_id === teacher.id && row.blocked_date === date),
          preciseBookingEnabled: isTeacherPreciseScheduleBookingEnabled(),
        });
        // Legacy zero-buffer generation checks labels only. A partial overlap or
        // active hold must not turn into a positive public readiness signal.
        return day.slots.some((slot) => !occupied.some((interval) => intervalsOverlap(
          expandBookingInterval(slotStartMinutes(slot), durationMinutes, 0, 0),
          expandBookingInterval(interval.startMin, interval.durationMin, 0, 0),
        )));
      });
      result[teacher.id] = deriveTeacherBookingCapability({ validRate: true, paymentReady: hasListingBookingPrerequisites(teacher), hasSlot, canContact: Boolean(teacher.user_id) });
    }
  } catch {
    // Unknown is not a positive signal; discovery must survive metadata failures.
    console.error("[teacher-listing-bookability] readiness lookup failed");
  }
  return result;
}
