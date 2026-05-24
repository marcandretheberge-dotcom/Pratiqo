import { calculateIntroSessionPriceCents } from "@/lib/introSession";

export type BookingChargeTeacher = {
  price_per_lesson: number | string | null;
  home_lesson_enabled?: boolean | null;
  home_lesson_price?: number | string | null;
  intro_session_enabled?: boolean | null;
  intro_session_price_cents?: number | string | null;
  intro_session_duration_minutes?: number | string | null;
  intro_session_discount_percent?: number | string | null;
};

export type BookingChargeInput = {
  lesson_type?: string | null;
  teaching_mode?: string | null;
  duration_minutes?: number | string | null;
};

/** Allowed lesson durations for checkout (matches slots API bounds). */
export function normalizeBookingDurationMinutes(raw: unknown, fallback = 60): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 30 && n <= 180) return Math.round(n);
  return fallback;
}

/**
 * Derive the Stripe subtotal (before credits) from teacher DB rates and booking
 * fields. Never trust client-written bookings.price for charging.
 */
export function computeBookingChargeCents(
  teacher: BookingChargeTeacher,
  booking: BookingChargeInput,
): number {
  const lessonType = (booking.lesson_type || "regular").toLowerCase();
  const teachingMode = (booking.teaching_mode || "person").toLowerCase();

  if (lessonType === "intro") {
    if (teacher.intro_session_enabled !== true) return 0;
    return calculateIntroSessionPriceCents({
      hourlyPrice: teacher.price_per_lesson,
      durationMinutes:
        booking.duration_minutes ?? teacher.intro_session_duration_minutes ?? undefined,
      discountPercent: teacher.intro_session_discount_percent ?? undefined,
      explicitPriceCents: teacher.intro_session_price_cents ?? null,
    });
  }

  const durationMinutes = normalizeBookingDurationMinutes(booking.duration_minutes);

  if (teachingMode === "domicile") {
    if (teacher.home_lesson_enabled !== true) return 0;
    const hourly = Number(teacher.home_lesson_price);
    if (!Number.isFinite(hourly) || hourly <= 0) return 0;
    return Math.round(hourly * (durationMinutes / 60) * 100);
  }

  const hourly = Number(teacher.price_per_lesson);
  if (!Number.isFinite(hourly) || hourly <= 0) return 0;
  return Math.round(hourly * (durationMinutes / 60) * 100);
}
