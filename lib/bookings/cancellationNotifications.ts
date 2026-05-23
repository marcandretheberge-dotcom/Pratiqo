/**
 * Email notifications for booking decline and cancellation.
 *
 * Both routes that import this module rely on an atomic `UPDATE … WHERE
 * status IN (…)` having already succeeded — they only call the helpers
 * *after* that update returns one or more affected rows. The DB transition
 * therefore serves as the idempotency gate: a retry against an
 * already-cancelled/declined booking won't reach this code at all.
 *
 * Errors thrown by Resend or the lookups below are caught locally and
 * logged. Per the existing email philosophy in `lib/email/transport.ts`,
 * email failures must never reverse a successful booking status change.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  sendBookingCancelledStudent,
  sendBookingCancelledTeacherEmail,
  sendBookingDeclinedStudent,
} from "@/lib/email/templates/booking";
import { formatEmailLessonScheduleLabels } from "@/lib/email/formatSchedule";
import { resolveEmailLocaleForUser, type EmailLocale } from "@/lib/email/locale";

/** Booking shape required to resolve participants and labels. */
type BookingLookup = {
  id: string;
  teacher_id: string;
  student_id: string;
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
};

type StudentContact = {
  email: string | null;
  name: string;
  locale: EmailLocale;
};

type TeacherContact = {
  email: string | null;
  name: string;
  locale: EmailLocale;
};

async function resolveStudentContact(
  admin: SupabaseClient,
  studentUserId: string,
): Promise<StudentContact> {
  const { data: profile } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", studentUserId)
    .maybeSingle();

  const profileEmail = typeof profile?.email === "string" ? profile.email.trim() : "";
  const { data: authStudent } = profileEmail
    ? { data: null }
    : await admin.auth.admin.getUserById(studentUserId);
  const authEmail = authStudent?.user?.email?.trim() ?? "";
  const email = profileEmail || authEmail || null;
  const name =
    typeof profile?.name === "string" && profile.name.trim() ? profile.name.trim() : "élève";
  const locale = await resolveEmailLocaleForUser(admin, studentUserId);
  return { email, name, locale };
}

async function resolveTeacherContact(
  admin: SupabaseClient,
  teacherId: string,
): Promise<TeacherContact & { teacherUserId: string | null }> {
  // Two-step lookup keeps the contract identical to other booking flows:
  // teachers.id is the booking foreign key, teachers.user_id is the auth
  // user, profiles.email is the canonical email.
  const { data: teacherRow } = await admin
    .from("teachers")
    .select("user_id, name")
    .eq("id", teacherId)
    .maybeSingle();

  const teacherUserId =
    typeof teacherRow?.user_id === "string" && teacherRow.user_id.trim()
      ? teacherRow.user_id.trim()
      : null;

  const fallbackName =
    typeof teacherRow?.name === "string" && teacherRow.name.trim()
      ? teacherRow.name.trim()
      : "Professeur";

  if (!teacherUserId) {
    return { email: null, name: fallbackName, locale: "fr", teacherUserId: null };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, name")
    .eq("id", teacherUserId)
    .maybeSingle();

  const profileEmail = typeof profile?.email === "string" ? profile.email.trim() : "";
  const { data: authTeacher } = profileEmail
    ? { data: null }
    : await admin.auth.admin.getUserById(teacherUserId);
  const authEmail = authTeacher?.user?.email?.trim() ?? "";
  const email = profileEmail || authEmail || null;

  const profileName = typeof profile?.name === "string" && profile.name.trim() ? profile.name.trim() : "";
  const name = profileName || fallbackName;
  const locale = await resolveEmailLocaleForUser(admin, teacherUserId);
  return { email, name, locale, teacherUserId };
}

/**
 * Notify the student that a pending booking request was declined by the teacher.
 *
 * Only called from `app/api/bookings/[id]/decline/route.ts` after the
 * `pending|pending_teacher|pending_payment → cancelled` transition has
 * already been confirmed by the DB.
 */
export async function notifyBookingDeclined(
  admin: SupabaseClient,
  booking: BookingLookup,
): Promise<void> {
  try {
    const [student, teacher] = await Promise.all([
      resolveStudentContact(admin, booking.student_id),
      resolveTeacherContact(admin, booking.teacher_id),
    ]);

    if (!student.email) {
      console.warn("[bookings/decline] no student email — skipping decline notification", {
        bookingId: booking.id,
      });
      return;
    }

    await sendBookingDeclinedStudent({
      email: student.email,
      studentName: student.name,
      teacherName: teacher.name,
      locale: student.locale,
    });
  } catch (e) {
    console.error("[bookings/decline] notification failed", e);
  }
}

/**
 * Notify the opposite participant when a confirmed booking is cancelled.
 *
 * Routing rule (mirrors the route's `cancellerRole`):
 *   - teacher cancels → notify the student (a "lesson cancelled — {teacher}" email)
 *   - student cancels → notify the teacher (a "lesson cancelled — {student}" email)
 *
 * Wording deliberately avoids promising a refund — the cancel route stamps
 * a refund plan into `bookings.refund_status / refund_amount` but does NOT
 * execute Stripe refunds today (see the TODO in cancel/route.ts). The
 * neutral "If a payment is involved, you can follow its status…" copy is
 * truthful regardless of which path the support team eventually runs.
 */
export async function notifyBookingCancelled(
  admin: SupabaseClient,
  booking: BookingLookup,
  cancellerRole: "student" | "teacher",
): Promise<void> {
  try {
    const [student, teacher] = await Promise.all([
      resolveStudentContact(admin, booking.student_id),
      resolveTeacherContact(admin, booking.teacher_id),
    ]);

    if (cancellerRole === "teacher") {
      if (!student.email) {
        console.warn("[bookings/cancel] no student email — skipping cancellation notification", {
          bookingId: booking.id,
        });
        return;
      }
      const schedule = formatEmailLessonScheduleLabels(booking, student.locale);
      await sendBookingCancelledStudent({
        email: student.email,
        studentName: student.name,
        teacherName: teacher.name,
        dateLabel: schedule.dateLabel,
        timeLabel: schedule.timeLabel,
        locale: student.locale,
      });
      return;
    }

    // cancellerRole === "student"
    if (!teacher.email) {
      console.warn("[bookings/cancel] no teacher email — skipping cancellation notification", {
        bookingId: booking.id,
      });
      return;
    }
    const schedule = formatEmailLessonScheduleLabels(booking, teacher.locale);
    await sendBookingCancelledTeacherEmail({
      email: teacher.email,
      teacherName: teacher.name,
      studentName: student.name,
      dateLabel: schedule.dateLabel,
      timeLabel: schedule.timeLabel,
      locale: teacher.locale,
    });
  } catch (e) {
    console.error("[bookings/cancel] notification failed", e);
  }
}
