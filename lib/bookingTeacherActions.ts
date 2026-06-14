export type TeacherBookingActionInput = {
  status?: string | null;
};

const TEACHER_DECISION_STATUSES = new Set(["pending", "pending_teacher", "manual_request"]);

export function normalizeBookingActionStatus(status: string | null | undefined): string {
  return String(status || "").trim().toLowerCase();
}

export function canTeacherAcceptBooking(booking: TeacherBookingActionInput): boolean {
  return TEACHER_DECISION_STATUSES.has(normalizeBookingActionStatus(booking.status));
}

export function canTeacherRejectBooking(booking: TeacherBookingActionInput): boolean {
  return canTeacherAcceptBooking(booking);
}
