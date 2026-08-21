/**
 * Teacher availability start date ("Cours à partir de…").
 *
 * Visibility (search/public profile) is independent of this date.
 * Booking eligibility requires the requested slot date to be on/after
 * available_from_date when set. Null means normal schedule rules only.
 *
 * Date-only (YYYY-MM-DD). Compare as calendar strings in local booking convention
 * (same as formatLocalISODate / slot_date) to avoid UTC off-by-one.
 */

import type { Locale } from "@/lib/i18n/types";
import { localeToBcp47 } from "@/lib/i18n/types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Normalize DB / client values to YYYY-MM-DD or null. */
export function normalizeAvailableFromDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Postgres date may arrive as "2026-09-01" or ISO timestamp.
  const datePart = trimmed.slice(0, 10);
  if (!ISO_DATE_RE.test(datePart)) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return datePart;
}

export function isValidAvailableFromDateInput(value: unknown): boolean {
  if (value === null || value === "") return true;
  return normalizeAvailableFromDate(value) != null;
}

/** True when the teacher can accept bookings on `todayIso` (or has no start date). */
export function isTeacherAvailableNow(
  availableFromDate: string | null | undefined,
  todayIso: string,
): boolean {
  const from = normalizeAvailableFromDate(availableFromDate);
  if (!from) return true;
  return todayIso >= from;
}

/** True when `bookingDateIso` is on or after available_from_date (or date is unset). */
export function canBookTeacherOnDate(
  availableFromDate: string | null | undefined,
  bookingDateIso: string,
): boolean {
  const from = normalizeAvailableFromDate(availableFromDate);
  const booking = normalizeAvailableFromDate(bookingDateIso);
  if (!from) return true;
  if (!booking) return false;
  return booking >= from;
}

export type AvailableFromBadgeKind = "month" | "day";

export type AvailableFromBadgeModel = {
  kind: AvailableFromBadgeKind;
  dateIso: string;
  monthLabel: string;
  day: number;
};

function monthLabelForLocale(dateIso: string, locale: Locale): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(localeToBcp47(locale), { month: "long" });
}

export function getAvailableFromBadge(
  availableFromDate: string | null | undefined,
  locale: Locale,
  todayIso: string,
): AvailableFromBadgeModel | null {
  const from = normalizeAvailableFromDate(availableFromDate);
  if (!from) return null;
  if (todayIso >= from) return null;
  const day = Number(from.slice(8, 10));
  const monthLabel = monthLabelForLocale(from, locale);
  return {
    kind: day === 1 ? "month" : "day",
    dateIso: from,
    monthLabel,
    day,
  };
}

/** Medium display of the start date for forms / admin (localized). */
export function formatAvailableFromDisplayDate(dateIso: string, locale: Locale): string {
  const normalized = normalizeAvailableFromDate(dateIso);
  if (!normalized) return "";
  const [y, m, d] = normalized.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(localeToBcp47(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Filter day-count map so dates before available_from_date are removed.
 * Mutates a copy; does not change teacher weekly schedule config.
 */
export function filterAvailableDaysByStartDate(
  days: Record<string, number>,
  availableFromDate: string | null | undefined,
): Record<string, number> {
  const from = normalizeAvailableFromDate(availableFromDate);
  if (!from) return days;
  const next: Record<string, number> = {};
  for (const [iso, count] of Object.entries(days)) {
    if (iso >= from) next[iso] = count;
  }
  return next;
}
