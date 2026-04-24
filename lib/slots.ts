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

export function generateSlots(
  availability: DayAvailability,
  durationMinutes: number,
  _date: string,
  bookedSlots: string[],
  blockedPeriods: string[],
): string[] {
  const slots: string[] = [];
  if (blockedPeriods.includes("all")) return slots;

  (Object.entries(PERIODS) as [PeriodKey, { start: number; end: number }][]).forEach(([period, range]) => {
    if (!availability[period]) return;
    if (blockedPeriods.includes(period)) return;

    let timeMinutes = range.start * 60;
    const endMinutes = range.end * 60;
    while (timeMinutes + durationMinutes <= endMinutes) {
      const hours = Math.floor(timeMinutes / 60);
      const mins = timeMinutes % 60;
      const slot = formatSlotLabel(hours, mins);
      if (!bookedSlots.includes(slot)) slots.push(slot);
      timeMinutes += durationMinutes;
    }
  });

  slots.sort((a, b) => slotStartMinutes(a) - slotStartMinutes(b));
  return slots;
}

export function getAvailableDays(
  weeklyAvailability: Record<string, DayAvailability>,
  durationMinutes: number,
  bookedByDate: Record<string, string[]>,
  blockedByDate: Record<string, string[]>,
  weeks = 4,
): Record<string, number> {
  const result: Record<string, number> = {};
  const daysTotal = Math.max(1, weeks) * 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysTotal; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = formatLocalISODate(date);
    const dayKey = JS_DOW_TO_KEY[date.getDay()];
    const avail = weeklyAvailability[dayKey];
    if (!avail) continue;

    const booked = bookedByDate[dateStr] || [];
    const blocked = normalizeBlockedPeriodList(blockedByDate[dateStr] || []);
    const slots = generateSlots(avail, durationMinutes, dateStr, booked, blocked);
    if (slots.length > 0) result[dateStr] = slots.length;
  }

  return result;
}

export function blockedPeriodsFromRows(rows: { period: string | null }[]): string[] {
  const p = rows.map((r) => (r.period || "").trim().toLowerCase()).filter(Boolean);
  return normalizeBlockedPeriodList(p);
}

export function normalizeBlockedPeriodList(blocked: string[]): string[] {
  const b = blocked.map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (b.includes("all")) return ["all"];
  return Array.from(new Set(b));
}
