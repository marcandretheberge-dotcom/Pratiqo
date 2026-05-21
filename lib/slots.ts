export const PERIODS = {
  matin: { start: 8, end: 12 },
  apresmidi: { start: 12, end: 17 },
  soir: { start: 17, end: 21 },
} as const;

export type PeriodKey = keyof typeof PERIODS;

export type DayAvailability = { matin: boolean; apresmidi: boolean; soir: boolean };

export const JS_DOW_TO_KEY = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;

/** Short day key (lun…dim) for a calendar YYYY-MM-DD interpreted in local time. */
export function dayShortKeyForISODate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "lun";
  const dt = new Date(y, m - 1, d);
  return JS_DOW_TO_KEY[dt.getDay()];
}

const FRENCH_DAY_TO_KEY: Record<string, string> = {
  Lun: "lun",
  Mar: "mar",
  Mer: "mer",
  Jeu: "jeu",
  Ven: "ven",
  Sam: "sam",
  Dim: "dim",
};

const SLOT_LABEL_TO_PERIOD: Record<string, PeriodKey> = {
  Matin: "matin",
  "Après-midi": "apresmidi",
  Soir: "soir",
};

/** Local calendar date YYYY-MM-DD */
export function formatLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatSlotLabel(hours: number, minutes: number): string {
  return `${hours}h${minutes.toString().padStart(2, "0")}`;
}

export function slotStartMinutes(slot: string): number {
  const m = /^(\d{1,2})h(\d{2})$/.exec(slot.trim());
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Parse "14:30" or "14:30:00" → minutes from midnight, or null if invalid. */
export function parseHHMMToMinutes(s: string): number | null {
  const t = s.trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export type BlockedSlotDayRow = {
  period: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

export type BlockedTimeRange = { start: number; end: number };

/**
 * Half-open interval [startMin, endMin) in minutes-from-midnight.
 * Used by buffer-aware availability and checkout overlap checks.
 */
export type BookingInterval = { startMin: number; endMin: number };

/**
 * Existing booking expressed as a starting minute + duration.
 * Used when generating availability with buffers so that we can reason about
 * the booking's full interval (not just its start label).
 */
export type BookedSlotInterval = { startMin: number; durationMin: number };

/**
 * Expand a booking [start, start+duration) by per-side buffer minutes.
 *
 * The same expansion is applied symmetrically to existing bookings and to the
 * candidate booking, which matches the product spec:
 *   existingBlocked = [existingStart - bufferBefore, existingEnd + bufferAfter]
 *   candidateBlocked = [candidateStart - bufferBefore, candidateEnd + bufferAfter]
 * Two bookings conflict iff their expanded intervals overlap.
 *
 * - Negative buffers are clamped to 0.
 * - Duration is clamped to >= 1 so a zero/negative duration cannot collapse.
 * - The lower bound is clamped to 0 (midnight) so we never produce negative
 *   minutes; this never hides a conflict because the upper bound still extends.
 */
export function expandBookingInterval(
  startMin: number,
  durationMin: number,
  bufferBeforeMin: number,
  bufferAfterMin: number,
): BookingInterval {
  const before = Math.max(0, Math.floor(bufferBeforeMin || 0));
  const after = Math.max(0, Math.floor(bufferAfterMin || 0));
  const duration = Math.max(1, Math.floor(durationMin || 0));
  return {
    startMin: Math.max(0, startMin - before),
    endMin: startMin + duration + after,
  };
}

/** Half-open overlap test for two BookingIntervals. */
export function intervalsOverlap(a: BookingInterval, b: BookingInterval): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Rows with both start_time and end_time contribute only as ranges (period ignored for slot exclusion). */
export function blockedTimeRangesFromRows(rows: BlockedSlotDayRow[]): BlockedTimeRange[] {
  const out: BlockedTimeRange[] = [];
  for (const r of rows) {
    const st = r.start_time?.trim();
    const en = r.end_time?.trim();
    if (!st || !en) continue;
    const a = parseHHMMToMinutes(st);
    const b = parseHHMMToMinutes(en);
    if (a == null || b == null || b <= a) continue;
    out.push({ start: a, end: b });
  }
  return out;
}

function slotOverlapsBlockedRange(
  slot: string,
  durationMinutes: number,
  rangeStart: number,
  rangeEnd: number,
): boolean {
  const slotStart = slotStartMinutes(slot);
  if (slotStart < 0) return false;
  const slotEnd = slotStart + durationMinutes;
  return slotStart < rangeEnd && slotEnd > rangeStart;
}

export function periodForSlot(slot: string): PeriodKey | null {
  const t = slotStartMinutes(slot);
  if (t < 0) return null;
  if (t >= PERIODS.matin.start * 60 && t < PERIODS.matin.end * 60) return "matin";
  if (t >= PERIODS.apresmidi.start * 60 && t < PERIODS.apresmidi.end * 60) return "apresmidi";
  if (t >= PERIODS.soir.start * 60 && t < PERIODS.soir.end * 60) return "soir";
  return null;
}

/**
 * Parse `teachers.availability` JSON string entries like "Lun Matin", "Mer Après-midi".
 */
export function weeklyAvailabilityFromTeacherRows(avail: unknown): Record<string, DayAvailability> {
  const empty = (): DayAvailability => ({ matin: false, apresmidi: false, soir: false });
  const out: Record<string, DayAvailability> = {};
  for (const k of JS_DOW_TO_KEY) {
    out[k] = empty();
  }
  const list = Array.isArray(avail) ? avail : [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const idx = raw.indexOf(" ");
    if (idx === -1) continue;
    const dayFr = raw.slice(0, idx).trim();
    const slotFr = raw.slice(idx + 1).trim();
    const dayKey = FRENCH_DAY_TO_KEY[dayFr];
    const period = SLOT_LABEL_TO_PERIOD[slotFr];
    if (!dayKey || !period || !out[dayKey]) continue;
    out[dayKey][period] = true;
  }
  return out;
}

/**
 * Optional buffer-aware inputs for {@link generateSlots}.
 *
 * When both buffers are 0 (or `bookedIntervals` is undefined), the function
 * walks the legacy code path bit-for-bit: it only filters by exact string
 * match on `bookedSlots`. This preserves current production behavior.
 *
 * When at least one buffer is > 0, the candidate's expanded interval is also
 * tested against every `bookedIntervals` entry's expanded interval. Admin
 * `blockedTimeRanges` are intentionally NOT expanded with buffer — those are
 * explicit teacher blocks and should be honored as-is.
 */
export interface GenerateSlotsOptions {
  bookedIntervals?: BookedSlotInterval[];
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
}

export function generateSlots(
  availability: DayAvailability,
  durationMinutes: number,
  _date: string,
  bookedSlots: string[],
  blockedPeriods: string[],
  blockedTimeRanges: BlockedTimeRange[] = [],
  options: GenerateSlotsOptions = {},
): string[] {
  const slots: string[] = [];
  if (blockedPeriods.includes("all")) return slots;

  const bufferBeforeMin = Math.max(0, Math.floor(options.bufferBeforeMin ?? 0));
  const bufferAfterMin = Math.max(0, Math.floor(options.bufferAfterMin ?? 0));
  const useBufferAware = bufferBeforeMin > 0 || bufferAfterMin > 0;
  const bookedIntervals: BookedSlotInterval[] = useBufferAware ? options.bookedIntervals ?? [] : [];

  (Object.entries(PERIODS) as [PeriodKey, { start: number; end: number }][]).forEach(([period, range]) => {
    if (!availability[period]) return;
    if (blockedPeriods.includes(period)) return;

    let timeMinutes = range.start * 60;
    const endMinutes = range.end * 60;
    while (timeMinutes + durationMinutes <= endMinutes) {
      const hours = Math.floor(timeMinutes / 60);
      const mins = timeMinutes % 60;
      const slot = formatSlotLabel(hours, mins);
      if (bookedSlots.includes(slot)) {
        timeMinutes += durationMinutes;
        continue;
      }
      if (blockedTimeRanges.some((br) => slotOverlapsBlockedRange(slot, durationMinutes, br.start, br.end))) {
        timeMinutes += durationMinutes;
        continue;
      }
      if (useBufferAware) {
        const candidate = expandBookingInterval(timeMinutes, durationMinutes, bufferBeforeMin, bufferAfterMin);
        const conflicts = bookedIntervals.some((b) => {
          const existing = expandBookingInterval(b.startMin, b.durationMin, bufferBeforeMin, bufferAfterMin);
          return intervalsOverlap(candidate, existing);
        });
        if (conflicts) {
          timeMinutes += durationMinutes;
          continue;
        }
      }
      slots.push(slot);
      timeMinutes += durationMinutes;
    }
  });

  slots.sort((a, b) => slotStartMinutes(a) - slotStartMinutes(b));
  return slots;
}

export interface GetAvailableDaysOptions {
  /**
   * Existing booked intervals keyed by YYYY-MM-DD. Used by buffer-aware
   * generation when at least one buffer is > 0. Optional for back-compat.
   */
  bookedIntervalsByDate?: Record<string, BookedSlotInterval[]>;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
}

export function getAvailableDays(
  weeklyAvailability: Record<string, DayAvailability>,
  durationMinutes: number,
  bookedByDate: Record<string, string[]>,
  blockedByDate: Record<string, BlockedSlotDayRow[]>,
  weeks = 4,
  options: GetAvailableDaysOptions = {},
): Record<string, number> {
  const result: Record<string, number> = {};
  const daysTotal = Math.max(1, weeks) * 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const bufferBeforeMin = Math.max(0, Math.floor(options.bufferBeforeMin ?? 0));
  const bufferAfterMin = Math.max(0, Math.floor(options.bufferAfterMin ?? 0));
  const bookedIntervalsByDate = options.bookedIntervalsByDate ?? {};

  for (let i = 0; i < daysTotal; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = formatLocalISODate(date);
    const dayKey = JS_DOW_TO_KEY[date.getDay()];
    const avail = weeklyAvailability[dayKey];
    if (!avail) continue;

    const booked = bookedByDate[dateStr] || [];
    const blockedRows = blockedByDate[dateStr] || [];
    const blocked = blockedPeriodsFromRows(blockedRows);
    const ranges = blockedTimeRangesFromRows(blockedRows);
    const slots = generateSlots(avail, durationMinutes, dateStr, booked, blocked, ranges, {
      bookedIntervals: bookedIntervalsByDate[dateStr] ?? [],
      bufferBeforeMin,
      bufferAfterMin,
    });
    if (slots.length > 0) result[dateStr] = slots.length;
  }

  return result;
}

/** Period-only contribution: rows with a valid start+end time range are excluded here (handled as ranges). */
export function blockedPeriodsFromRows(rows: BlockedSlotDayRow[]): string[] {
  const periods: string[] = [];
  for (const r of rows) {
    const st = r.start_time?.trim();
    const en = r.end_time?.trim();
    if (st && en && parseHHMMToMinutes(st) != null && parseHHMMToMinutes(en) != null) {
      const a = parseHHMMToMinutes(st)!;
      const b = parseHHMMToMinutes(en)!;
      if (b > a) continue;
    }
    const p = (r.period || "").trim().toLowerCase();
    if (p) periods.push(p);
  }
  return normalizeBlockedPeriodList(periods);
}

export function normalizeBlockedPeriodList(blocked: string[]): string[] {
  const b = blocked.map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (b.includes("all")) return ["all"];
  return Array.from(new Set(b));
}
