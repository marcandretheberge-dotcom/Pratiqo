import { isBookingAtLeast24hAhead } from "@/lib/bookingCancellation";
import { isBookingOfferSelectionEnabled } from "@/lib/offers/bookingOfferSelection";
import {
  loadPublishedTeacherOfferSnapshotForBooking,
  type BookingOfferSnapshotSupabase,
  type BookingTeacherOfferSnapshot,
} from "@/lib/offers/bookingOfferSnapshot";
import { isPostgresUniqueViolation } from "@/lib/offers/teacherOfferDto";
import type { ParsedCreateBookingRequest } from "@/lib/bookings/parseCreateBookingRequest";
import {
  canBookTeacherOnDate,
  normalizeAvailableFromDate,
} from "@/lib/teachers/availabilityStartDate";
import { rejectIfOutsideWeeklyIntervals } from "@/lib/bookings/weeklyIntervalGuard";
import type { WeeklyIntervalAdmin } from "@/lib/bookings/weeklyIntervalGuard";
import { applyDateExceptionToBooking } from "@/lib/bookings/dateExceptionGuard";
import type { DateExceptionAdmin } from "@/lib/bookings/dateExceptionGuard";

export type CreateBookingFailure = {
  ok: false;
  status: number;
  error: string;
  availableFromDate?: string;
};

export type CreateBookingSuccess = {
  ok: true;
  bookingId: string;
};

/** Minimal Supabase-js surface used by booking creation. */
export type BookingCreateAdmin = {
  from: (table: string) => {
    select: (
      columns: string,
      options?: { head?: boolean; count?: "exact" },
    ) => BookingCreateFilter;
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: { id?: string } | null;
          error: { code?: string; message?: string } | null;
        }>;
      };
    };
  };
};

type BookingCreateFilter = {
  eq: (column: string, value: string) => BookingCreateFilter;
  maybeSingle: () => Promise<{
    data: {
      id?: string;
      archived_at?: string | null;
      available_from_date?: string | null;
    } | null;
    error: { message?: string } | null;
  }>;
  then?: (
    resolve: (value: { count: number | null; error: { message?: string } | null }) => unknown,
  ) => Promise<unknown>;
};

export async function resolveOfferSnapshotForBookingCreate(args: {
  admin: BookingOfferSnapshotSupabase;
  teacherId: string;
  teacherOfferId: string | null;
}): Promise<{ ok: true; snapshot: BookingTeacherOfferSnapshot | null } | CreateBookingFailure> {
  if (!args.teacherOfferId) {
    return { ok: true, snapshot: null };
  }
  if (!isBookingOfferSelectionEnabled()) {
    return { ok: false, status: 400, error: "offer_selection_disabled" };
  }

  const loaded = await loadPublishedTeacherOfferSnapshotForBooking({
    supabase: args.admin,
    teacherId: args.teacherId,
    teacherOfferId: args.teacherOfferId,
  });
  if (!loaded.ok) {
    if (loaded.error === "offer_not_found") {
      return { ok: false, status: 404, error: "offer_not_found" };
    }
    return { ok: false, status: 409, error: "offer_not_bookable" };
  }
  return { ok: true, snapshot: loaded.snapshot };
}

export function buildCreateBookingInsertRow(args: {
  studentId: string;
  request: ParsedCreateBookingRequest;
  snapshot: BookingTeacherOfferSnapshot | null;
}): Record<string, unknown> {
  const row: Record<string, unknown> = {
    teacher_id: args.request.teacherId,
    student_id: args.studentId,
    date: args.request.date,
    time: args.request.time,
    slot_date: args.request.slotDate,
    time_slot: args.request.timeSlot,
    student_level: args.request.studentLevel,
    teaching_mode: args.request.teachingMode,
    status: "pending_payment",
    lesson_type: args.request.lessonType,
    price: args.request.price,
    duration_minutes: args.request.durationMinutes,
    student_address: args.request.studentAddress,
    learner_profile_id: args.request.learnerProfileId,
  };
  if (args.snapshot) {
    Object.assign(row, args.snapshot);
  }
  return row;
}

export async function createPendingPaymentBooking(args: {
  admin: BookingCreateAdmin;
  studentId: string;
  request: ParsedCreateBookingRequest;
}): Promise<CreateBookingSuccess | CreateBookingFailure> {
  if (!isBookingAtLeast24hAhead({ slot_date: args.request.slotDate, time_slot: args.request.timeSlot })) {
    return { ok: false, status: 400, error: "booking_minimum_notice" };
  }

  const { data: teacher, error: teacherErr } = await args.admin
    .from("teachers")
    .select("id, available_from_date")
    .eq("id", args.request.teacherId)
    .maybeSingle();
  if (teacherErr) {
    return { ok: false, status: 500, error: "server_error" };
  }
  if (!teacher?.id) {
    return { ok: false, status: 400, error: "invalid_teacher" };
  }

  const availableFromDate = normalizeAvailableFromDate(teacher.available_from_date);
  if (!canBookTeacherOnDate(availableFromDate, args.request.slotDate)) {
    return {
      ok: false,
      status: 409,
      error: "teacher_not_available_yet",
      availableFromDate: availableFromDate ?? undefined,
    };
  }

  const exceptionResult = await applyDateExceptionToBooking({
    admin: args.admin as unknown as DateExceptionAdmin,
    teacherId: args.request.teacherId,
    slotDate: args.request.slotDate,
    timeSlot: args.request.timeSlot,
    durationMinutes: args.request.durationMinutes,
  });
  if (!exceptionResult.ok) {
    return { ok: false, status: exceptionResult.status, error: exceptionResult.error };
  }

  if (!exceptionResult.skipWeeklyIntervals) {
    const outside = await rejectIfOutsideWeeklyIntervals({
      admin: args.admin as unknown as WeeklyIntervalAdmin,
      teacherId: args.request.teacherId,
      slotDate: args.request.slotDate,
      timeSlot: args.request.timeSlot,
      durationMinutes: args.request.durationMinutes,
    });
    if (outside) {
      return { ok: false, status: outside.status, error: outside.error };
    }
  }

  if (args.request.learnerProfileId) {
    const { data: learner, error: learnerErr } = await args.admin
      .from("learner_profiles")
      .select("id, archived_at")
      .eq("id", args.request.learnerProfileId)
      .eq("owner_user_id", args.studentId)
      .maybeSingle();
    if (learnerErr) {
      return { ok: false, status: 500, error: "server_error" };
    }
    if (!learner?.id || learner.archived_at) {
      return { ok: false, status: 400, error: "invalid_learner_profile" };
    }
  }

  if (args.request.lessonType === "intro") {
    let introQuery = args.admin
      .from("bookings")
      .select("id", { head: true, count: "exact" })
      .eq("teacher_id", args.request.teacherId)
      .eq("lesson_type", "intro");
    introQuery = args.request.learnerProfileId
      ? introQuery.eq("learner_profile_id", args.request.learnerProfileId)
      : introQuery.eq("student_id", args.studentId);
    const introResult = await Promise.resolve(introQuery as PromiseLike<{ count: number | null; error: unknown }>);
    if (introResult.error) {
      return { ok: false, status: 500, error: "server_error" };
    }
    if ((introResult.count ?? 0) > 0) {
      return { ok: false, status: 409, error: "intro_session_already_used" };
    }
  }

  const snapshotResult = await resolveOfferSnapshotForBookingCreate({
    admin: args.admin as BookingOfferSnapshotSupabase,
    teacherId: args.request.teacherId,
    teacherOfferId: args.request.teacherOfferId,
  });
  if (!snapshotResult.ok) return snapshotResult;

  // Admin insert is required so service-role can write server-owned snapshot
  // columns that authenticated clients cannot set (see migration 099 trigger).
  // student_id is always the authenticated user. RLS-equivalent checks:
  // teacher exists, learner profile owned by student, status pending_payment.
  //
  // Checkout charges from immutable booking snapshots when ENABLE_OFFER_SNAPSHOT_CHECKOUT
  // is ON (PR 8). Legacy bookings without snapshots keep teacher DB pricing.
  const insertRow = buildCreateBookingInsertRow({
    studentId: args.studentId,
    request: args.request,
    snapshot: snapshotResult.snapshot,
  });

  const { data: inserted, error: insertErr } = await args.admin
    .from("bookings")
    .insert(insertRow)
    .select("id")
    .single();
  if (insertErr) {
    if (isPostgresUniqueViolation(insertErr)) {
      return { ok: false, status: 409, error: "slot_booked" };
    }
    return { ok: false, status: 500, error: "server_error" };
  }
  const bookingId = inserted?.id;
  if (!bookingId) {
    return { ok: false, status: 500, error: "server_error" };
  }
  return { ok: true, bookingId };
}
