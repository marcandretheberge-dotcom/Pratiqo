import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingStartAt, type BookingTimingInput } from "@/lib/bookingLifecycle";
import { hasOpenPayoutHold } from "@/lib/bookings/completeBooking";
import {
  lessonLocationLabel,
  sendLessonReminderStudent,
  sendLessonReminderTeacher,
  sendPostClassReviewRequest,
} from "@/lib/email";
import { resolveEmailLocaleForUser, type EmailLocale } from "@/lib/email/locale";
import { getDictionary } from "@/lib/i18n/server";

export const REMINDER_24H_MIN_MS = 23 * 60 * 60 * 1000;
export const REMINDER_24H_MAX_MS = 25 * 60 * 60 * 1000;
export const REMINDER_1H_MIN_MS = 50 * 60 * 1000;
export const REMINDER_1H_MAX_MS = 70 * 60 * 1000;

const INACTIVE_BOOKING_STATUSES = new Set([
  "cancelled",
  "cancelled_conflict",
  "declined",
  "completed",
  "pending_payment",
]);

const BLOCKED_REFUND_STATUSES = new Set(["refunded", "pending", "pending_review"]);
const BLOCKED_PAYMENT_STATUSES = new Set(["disputed", "refunded", "partially_refunded", "failed", "cancelled"]);

export type ReminderWindow = "24h" | "1h";

export type BookingRowForReminders = BookingTimingInput & {
  id: string;
  teacher_id: string;
  student_id: string;
  status?: string | null;
  teaching_mode?: string | null;
  meeting_url?: string | null;
  refund_status?: string | null;
  reminder_24h_sent_at?: string | null;
  reminder_1h_sent_at?: string | null;
  review_request_email_sent_at?: string | null;
  completed_at?: string | null;
  completion_outcome?: string | null;
};

export type ReminderSentColumn =
  | "reminder_24h_sent_at"
  | "reminder_1h_sent_at"
  | "review_request_email_sent_at";

export function formatLessonDateLabel(slotDate: string): string {
  const [y, m, d] = slotDate.split("-").map(Number);
  if (!y || !m || !d) return slotDate;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return slotDate;
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatLessonTimeLabel(booking: BookingTimingInput): string {
  const raw = String(booking.time_slot || booking.time || "").trim();
  if (!raw) return "—";
  const compact = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!compact) return raw;
  const hh = Number(compact[1]);
  const mm = compact[2];
  return `${String(hh).padStart(2, "0")}:${mm}`;
}

export function lessonScheduleLabels(booking: BookingTimingInput): {
  dateLabel: string;
  timeLabel: string;
} {
  const slotDate = String(booking.slot_date || booking.date || "").trim();
  return {
    dateLabel: slotDate ? formatLessonDateLabel(slotDate) : "Date à confirmer",
    timeLabel: formatLessonTimeLabel(booking),
  };
}

export function bookingStartsInWindow(
  booking: BookingTimingInput,
  now: Date,
  minOffsetMs: number,
  maxOffsetMs: number,
): boolean {
  const start = bookingStartAt(booking);
  if (!start) return false;
  const min = now.getTime() + minOffsetMs;
  const max = now.getTime() + maxOffsetMs;
  const t = start.getTime();
  return t >= min && t <= max;
}

export function isConfirmedReminderCandidate(booking: {
  status?: string | null;
  refund_status?: string | null;
}): boolean {
  const status = String(booking.status ?? "").toLowerCase();
  if (status !== "confirmed") return false;
  if (INACTIVE_BOOKING_STATUSES.has(status)) return false;
  const refund = String(booking.refund_status ?? "").toLowerCase();
  if (BLOCKED_REFUND_STATUSES.has(refund)) return false;
  return true;
}

export function paymentBlocksReminder(paymentStatus?: string | null): boolean {
  const status = String(paymentStatus ?? "").toLowerCase();
  return BLOCKED_PAYMENT_STATUSES.has(status);
}

export function selectBookingsForReminderWindow(
  bookings: BookingRowForReminders[],
  now: Date,
  window: ReminderWindow,
): BookingRowForReminders[] {
  const [minMs, maxMs, sentColumn] =
    window === "24h"
      ? [REMINDER_24H_MIN_MS, REMINDER_24H_MAX_MS, "reminder_24h_sent_at" as const]
      : [REMINDER_1H_MIN_MS, REMINDER_1H_MAX_MS, "reminder_1h_sent_at" as const];

  return bookings.filter((booking) => {
    if (!isConfirmedReminderCandidate(booking)) return false;
    if (booking[sentColumn]) return false;
    return bookingStartsInWindow(booking, now, minMs, maxMs);
  });
}

function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function claimBookingEmailSlot(
  admin: SupabaseClient,
  bookingId: string,
  column: ReminderSentColumn,
  sentAt: string,
): Promise<boolean> {
  const patch = { [column]: sentAt };
  const { data, error } = await admin
    .from("bookings")
    .update(patch)
    .eq("id", bookingId)
    .is(column, null)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}

async function resolveStudentEmail(
  admin: SupabaseClient,
  studentId: string,
): Promise<{ email: string | null; name: string; locale: EmailLocale }> {
  const { data: student } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", studentId)
    .maybeSingle();

  const profileEmail = typeof student?.email === "string" ? student.email.trim() : "";
  const { data: authStudent } = profileEmail
    ? { data: null }
    : await admin.auth.admin.getUserById(studentId);
  const authEmail = authStudent?.user?.email?.trim() ?? "";
  const email = profileEmail || authEmail || null;
  const name =
    typeof student?.name === "string" && student.name.trim() ? student.name.trim() : "élève";
  const locale = await resolveEmailLocaleForUser(admin, studentId);
  return { email, name, locale };
}

async function resolveTeacherEmail(
  admin: SupabaseClient,
  teacherUserId: string,
): Promise<{ email: string | null; locale: EmailLocale }> {
  const { data: teacherProf } = await admin
    .from("profiles")
    .select("email")
    .eq("id", teacherUserId)
    .maybeSingle();

  const profileEmail = typeof teacherProf?.email === "string" ? teacherProf.email.trim() : "";
  if (profileEmail) {
    return { email: profileEmail, locale: await resolveEmailLocaleForUser(admin, teacherUserId) };
  }

  const { data: authTeacher } = await admin.auth.admin.getUserById(teacherUserId);
  return {
    email: authTeacher?.user?.email?.trim() ?? null,
    locale: await resolveEmailLocaleForUser(admin, teacherUserId),
  };
}

type TeacherMeta = {
  id: string;
  user_id: string;
  name?: string | null;
  discipline?: string | null;
};

async function loadTeachersById(
  admin: SupabaseClient,
  teacherIds: string[],
): Promise<Map<string, TeacherMeta>> {
  const map = new Map<string, TeacherMeta>();
  if (teacherIds.length === 0) return map;

  const { data, error } = await admin
    .from("teachers")
    .select("id, user_id, name, discipline")
    .in("id", teacherIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as TeacherMeta[]) {
    map.set(row.id, row);
  }
  return map;
}

async function loadPaymentStatuses(
  admin: SupabaseClient,
  bookingIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (bookingIds.length === 0) return map;

  const { data, error } = await admin
    .from("booking_payments")
    .select("booking_id, payment_status")
    .in("booking_id", bookingIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const id = String((row as { booking_id?: string }).booking_id ?? "");
    const status = String((row as { payment_status?: string }).payment_status ?? "");
    if (id) map.set(id, status);
  }
  return map;
}

async function sendReminderPair(
  admin: SupabaseClient,
  booking: BookingRowForReminders,
  teacher: TeacherMeta,
  window: ReminderWindow,
  sentAt: string,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const sentColumn = window === "24h" ? "reminder_24h_sent_at" : "reminder_1h_sent_at";

  if (await hasOpenPayoutHold(admin, booking.id)) {
    return { ok: false, skipped: "payout_hold" };
  }

  const claimed = await claimBookingEmailSlot(admin, booking.id, sentColumn, sentAt);
  if (!claimed) {
    return { ok: false, skipped: "already_sent" };
  }

  const { dateLabel, timeLabel } = lessonScheduleLabels(booking);
  const teacherName =
    typeof teacher.name === "string" && teacher.name.trim() ? teacher.name.trim() : "Professeur";

  const student = await resolveStudentEmail(admin, booking.student_id);
  const teacherContact = await resolveTeacherEmail(admin, teacher.user_id);
  const studentLocation = lessonLocationLabel(
    booking.teaching_mode,
    booking.meeting_url,
    student.locale,
  );
  const teacherLocation = lessonLocationLabel(
    booking.teaching_mode,
    booking.meeting_url,
    teacherContact.locale,
  );
  const studentDiscipline =
    typeof teacher.discipline === "string" && teacher.discipline.trim()
      ? teacher.discipline.trim()
      : getDictionary(student.locale).bookingFallbackDiscipline;
  const teacherDiscipline =
    typeof teacher.discipline === "string" && teacher.discipline.trim()
      ? teacher.discipline.trim()
      : getDictionary(teacherContact.locale).bookingFallbackDiscipline;

  let studentSent = false;
  let teacherSent = false;

  try {
    if (student.email) {
      studentSent = await sendLessonReminderStudent({
        email: student.email,
        studentName: student.name,
        teacherName,
        discipline: studentDiscipline,
        dateLabel,
        timeLabel,
        location: studentLocation,
        window,
        locale: student.locale,
      });
    }

    if (teacherContact.email) {
      teacherSent = await sendLessonReminderTeacher({
        email: teacherContact.email,
        teacherName,
        studentName: student.name,
        discipline: teacherDiscipline,
        dateLabel,
        timeLabel,
        location: teacherLocation,
        window,
        locale: teacherContact.locale,
      });
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Reminder send failed",
    };
  }

  if (!studentSent && !teacherSent) {
    return { ok: false, skipped: "no_recipients" };
  }

  return { ok: true };
}

async function processReminderWindow(
  admin: SupabaseClient,
  bookings: BookingRowForReminders[],
  paymentByBooking: Map<string, string>,
  teachersById: Map<string, TeacherMeta>,
  window: ReminderWindow,
  now: Date,
): Promise<{
  selected: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const candidates = selectBookingsForReminderWindow(bookings, now, window);
  const sentAt = now.toISOString();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of candidates) {
    const paymentStatus = paymentByBooking.get(booking.id);
    if (paymentBlocksReminder(paymentStatus)) {
      skipped += 1;
      continue;
    }

    const teacher = teachersById.get(booking.teacher_id);
    if (!teacher) {
      skipped += 1;
      continue;
    }

    try {
      const result = await sendReminderPair(admin, booking, teacher, window, sentAt);
      if (result.ok) sent += 1;
      else if (result.error) failed += 1;
      else skipped += 1;
    } catch {
      failed += 1;
    }
  }

  return { selected: candidates.length, sent, skipped, failed };
}

export type ReminderBatchSummary = {
  scanned: number;
  reminder_24h: { selected: number; sent: number; skipped: number; failed: number };
  reminder_1h: { selected: number; sent: number; skipped: number; failed: number };
  review_backfill: { selected: number; sent: number; skipped: number; failed: number };
};

export async function processBookingReminders(
  admin: SupabaseClient,
  options: { now?: Date; lookbackDays?: number; lookforwardDays?: number } = {},
): Promise<ReminderBatchSummary> {
  const now = options.now ?? new Date();
  const lookbackDays = options.lookbackDays ?? 1;
  const lookforwardDays = options.lookforwardDays ?? 3;

  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - lookbackDays);
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + lookforwardDays);

  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, teacher_id, student_id, status, slot_date, date, time_slot, time, duration_minutes, teaching_mode, meeting_url, refund_status, reminder_24h_sent_at, reminder_1h_sent_at",
    )
    .eq("status", "confirmed")
    .gte("slot_date", formatDateYmd(rangeStart))
    .lte("slot_date", formatDateYmd(rangeEnd))
    .order("slot_date", { ascending: true })
    .limit(300);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (bookings ?? []) as BookingRowForReminders[];
  const bookingIds = rows.map((row) => row.id);
  const teacherIds = [...new Set(rows.map((row) => row.teacher_id))];

  const [teachersById, paymentByBooking] = await Promise.all([
    loadTeachersById(admin, teacherIds),
    loadPaymentStatuses(admin, bookingIds),
  ]);

  const reminder24h = await processReminderWindow(
    admin,
    rows,
    paymentByBooking,
    teachersById,
    "24h",
    now,
  );
  const reminder1h = await processReminderWindow(
    admin,
    rows,
    paymentByBooking,
    teachersById,
    "1h",
    now,
  );

  const reviewBackfill = await processReviewRequestBackfill(admin, now);

  return {
    scanned: rows.length,
    reminder_24h: reminder24h,
    reminder_1h: reminder1h,
    review_backfill: reviewBackfill,
  };
}

const REVIEW_BACKFILL_MIN_AFTER_COMPLETE_MS = 30 * 60 * 1000;

export async function processReviewRequestBackfill(
  admin: SupabaseClient,
  now = new Date(),
): Promise<{ selected: number; sent: number; skipped: number; failed: number }> {
  const cutoff = new Date(now.getTime() - REVIEW_BACKFILL_MIN_AFTER_COMPLETE_MS).toISOString();

  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, teacher_id, student_id, status, completed_at, completion_outcome, review_request_email_sent_at",
    )
    .eq("status", "completed")
    .is("review_request_email_sent_at", null)
    .not("completed_at", "is", null)
    .lte("completed_at", cutoff)
    .order("completed_at", { ascending: true })
    .limit(30);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (bookings ?? []) as BookingRowForReminders[];
  const eligible = rows.filter((row) => {
    const outcome = String(row.completion_outcome ?? "held").toLowerCase();
    return outcome === "held" || outcome === "";
  });

  const teacherIds = [...new Set(eligible.map((row) => row.teacher_id))];
  const teachersById = await loadTeachersById(admin, teacherIds);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of eligible) {
    const teacher = teachersById.get(booking.teacher_id);
    if (!teacher) {
      skipped += 1;
      continue;
    }

    try {
      const claimed = await claimBookingEmailSlot(
        admin,
        booking.id,
        "review_request_email_sent_at",
        now.toISOString(),
      );
      if (!claimed) {
        skipped += 1;
        continue;
      }

      const student = await resolveStudentEmail(admin, booking.student_id);
      if (!student.email) {
        skipped += 1;
        continue;
      }

      const teacherName =
        typeof teacher.name === "string" && teacher.name.trim()
          ? teacher.name.trim()
          : "votre professeur";

      const emailSent = await sendPostClassReviewRequest({
        email: student.email,
        studentName: student.name,
        teacherName,
        bookingId: booking.id,
        locale: student.locale,
      });

      if (emailSent) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { selected: eligible.length, sent, skipped, failed };
}
