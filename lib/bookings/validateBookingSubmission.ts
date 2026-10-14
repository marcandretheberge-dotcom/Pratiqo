import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedCreateBookingRequest } from "./parseCreateBookingRequest";
import { TEACHERS_PUBLIC_TABLE, TEACHERS_LIST_SELECT } from "@/lib/supabase/queries";
import { isLaunchEligibleTeacherRow } from "@/lib/teacherMapper";
import { computeBookingChargeCents } from "@/lib/pricing/bookingCharge";
import { validateMinimumLessonPrice } from "@/lib/pricing/validateMinimumLessonPrice";
import { resolveOfferSnapshotForBookingCreate } from "./createPendingPaymentBooking";
import type { BookingOfferSnapshotSupabase } from "@/lib/offers/bookingOfferSnapshot";
import { isOfferSnapshotCheckoutEnabled } from "@/lib/offers/offerSnapshotCheckout";
import { fetchBookedSlotsByDate, fetchBlockedByDate } from "@/lib/teacherSlotQueries";
import { generateBookableSlotsForTeacherDay, mapDbRowsToNormalized, mapDbRowsToExceptions } from "./bookableSlotsForDay";
import { isTeacherScheduleExceptionsEnabled } from "@/lib/schedule/dateExceptions";
import { isTeacherPreciseScheduleBookingEnabled } from "@/lib/schedule/preciseScheduleActivation";
import { holdRowsToBookedIntervals, listActiveHoldsForTeacherDay } from "@/lib/offers/plannedPackageHoldQueries";
import { slotStartMinutes, intervalsOverlap, expandBookingInterval } from "@/lib/slots";

/** Shared preflight for paid bookings AND deferred requests. Never writes or pays. */
export async function validateBookingSubmission(admin: SupabaseClient, studentId: string, request: ParsedCreateBookingRequest, now = new Date()) {
  const fail = (error: string, status = 409) => ({ ok: false as const, error, status });
  const publicResult = await admin.from(TEACHERS_PUBLIC_TABLE).select(TEACHERS_LIST_SELECT).eq("id", request.teacherId).maybeSingle();
  if (publicResult.error) return fail("server_error", 503);
  if (!publicResult.data || !isLaunchEligibleTeacherRow(publicResult.data)) return fail("invalid_teacher", 404);
  const teacher = publicResult.data;
  const mode = teacher.teaching_mode;
  if ((request.teachingMode === "online" && !["online", "both", "all"].includes(mode)) ||
      (request.teachingMode === "person" && !["person", "both", "all"].includes(mode)) ||
      (request.teachingMode === "domicile" && teacher.home_lesson_enabled !== true)) return fail("invalid_teaching_mode", 400);
  if (request.learnerProfileId) {
    const learner = await admin.from("learner_profiles").select("id, archived_at").eq("id", request.learnerProfileId).eq("owner_user_id", studentId).maybeSingle();
    if (learner.error) return fail("server_error", 503);
    if (!learner.data || learner.data.archived_at) return fail("invalid_learner_profile", 400);
  }
  const snapshot = await resolveOfferSnapshotForBookingCreate({ admin: admin as unknown as BookingOfferSnapshotSupabase, teacherId: request.teacherId, teacherOfferId: request.teacherOfferId });
  if (!snapshot.ok) return snapshot;
  if (snapshot.snapshot) {
    const offer = snapshot.snapshot;
    const expectedFormat = request.teachingMode === "online" ? "online" : request.teachingMode === "domicile" ? "home" : "in_person";
    if (offer.teacher_offer_format_snapshot !== "hybrid" && offer.teacher_offer_format_snapshot !== expectedFormat) return fail("invalid_teaching_mode", 400);
  } else if (request.lessonType === "intro" && request.durationMinutes !== Number(teacher.intro_session_duration_minutes ?? 45)) {
    return fail("invalid_duration", 400);
  }
  const legacyCents = computeBookingChargeCents(teacher, {
    lesson_type: request.lessonType, teaching_mode: request.teachingMode, duration_minutes: request.durationMinutes,
  });
  const cents = isOfferSnapshotCheckoutEnabled() && snapshot.snapshot
    ? snapshot.snapshot.teacher_offer_price_cents_snapshot : legacyCents;
  if (!validateMinimumLessonPrice(cents).ok) return fail("invalid_price", 400);
  // The existing offer checkout owns snapshot pricing. Its modal still submits
  // the legacy display amount; never mistake that value for the charged amount.
  if (Math.round(request.price * 100) !== legacyCents) return fail("price_changed");
  const calendar = await admin.from("teachers").select("timezone, availability, available_from_date, schedule_mode, booking_buffer_before_minutes, booking_buffer_after_minutes").eq("id", request.teacherId).maybeSingle();
  if (calendar.error || !calendar.data) return fail("server_error", 503);
  const booked = await fetchBookedSlotsByDate(admin, request.teacherId, request.slotDate, request.slotDate);
  const blocked = await fetchBlockedByDate(admin, request.teacherId, request.slotDate, request.slotDate);
  const weekly = await admin.from("teacher_weekly_availability_intervals").select("day_of_week, start_time, end_time, is_active").eq("teacher_id", request.teacherId).eq("is_active", true);
  const exceptions = isTeacherScheduleExceptionsEnabled()
    ? await admin.from("teacher_schedule_exceptions").select("exception_date, exception_type, start_time, end_time, is_active").eq("teacher_id", request.teacherId).eq("exception_date", request.slotDate).eq("is_active", true)
    : { data: [], error: null };
  if (weekly.error || exceptions.error) return fail("server_error", 503);
  const holds = await listActiveHoldsForTeacherDay({ admin, teacherId: request.teacherId, slotDate: request.slotDate, now, timeZone: calendar.data.timezone });
  const occupied = [...(booked.intervalsByDate[request.slotDate] ?? []), ...holdRowsToBookedIntervals(holds, calendar.data.timezone)];
  const day = generateBookableSlotsForTeacherDay({ teacher: calendar.data, date: request.slotDate, now, durationMinutes: request.durationMinutes,
    weeklyIntervals: mapDbRowsToNormalized(weekly.data ?? []), exceptions: mapDbRowsToExceptions(exceptions.data ?? []),
    bookedSlots: booked.timeLabelsByDate[request.slotDate] ?? [], bookedIntervals: occupied, blockedDayRows: blocked[request.slotDate] ?? [],
    preciseBookingEnabled: isTeacherPreciseScheduleBookingEnabled() });
  const start = slotStartMinutes(request.timeSlot);
  if (start < 0 || !day.slots.some(slot => slotStartMinutes(slot) === start) || occupied.some(slot => intervalsOverlap(
    expandBookingInterval(start, request.durationMinutes, 0, 0), expandBookingInterval(slot.startMin, slot.durationMin, 0, 0)))) return fail("slot_booked");
  return { ok: true as const };
}
