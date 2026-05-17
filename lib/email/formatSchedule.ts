import { bookingStartAt, type BookingTimingInput } from "@/lib/bookingLifecycle";
import { localeToBcp47 } from "@/lib/i18n/types";
import {
  EMAIL_FALLBACK_LOCALE,
  resolveEmailLocaleFromOptional,
  type EmailLocale,
} from "@/lib/email/locale";

const PENDING_DATE_LABEL: Record<EmailLocale, string> = {
  fr: "Date à confirmer",
  en: "Date to be confirmed",
  es: "Fecha por confirmar",
};

/** Formats YYYY-MM-DD using the same local wall-date semantics as booking slots. */
export function formatEmailLessonDateLabel(
  slotDate: string,
  locale?: EmailLocale,
): string {
  const resolved = resolveEmailLocaleFromOptional(locale);
  const [y, m, d] = slotDate.split("-").map(Number);
  if (!y || !m || !d) return slotDate;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return slotDate;
  return new Intl.DateTimeFormat(localeToBcp47(resolved), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Formats lesson start time using booking wall-clock fields (no timezone conversion). */
export function formatEmailLessonTimeLabel(
  booking: BookingTimingInput,
  locale?: EmailLocale,
): string {
  const resolved = resolveEmailLocaleFromOptional(locale);
  const start = bookingStartAt(booking);
  if (!start) {
    const raw = String(booking.time_slot || booking.time || "").trim();
    return raw || "—";
  }

  const bcp47 = localeToBcp47(resolved);
  const options: Intl.DateTimeFormatOptions =
    resolved === "en"
      ? { hour: "numeric", minute: "2-digit", hour12: true }
      : { hour: "numeric", minute: "2-digit", hour12: false };

  return new Intl.DateTimeFormat(bcp47, options).format(start);
}

export function formatEmailLessonScheduleLabels(
  booking: BookingTimingInput,
  locale?: EmailLocale,
): { dateLabel: string; timeLabel: string } {
  const resolved = resolveEmailLocaleFromOptional(locale);
  const slotDate = String(booking.slot_date || booking.date || "").trim();
  return {
    dateLabel: slotDate
      ? formatEmailLessonDateLabel(slotDate, resolved)
      : PENDING_DATE_LABEL[resolved],
    timeLabel: formatEmailLessonTimeLabel(booking, resolved),
  };
}

export { EMAIL_FALLBACK_LOCALE };
