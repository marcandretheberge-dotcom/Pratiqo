import { slotStartMinutes, parseHHMMToMinutes } from "@/lib/slots";

export type TimeZoneBookingLabels = {
  userLabel: string;
  teacherLabel: string;
  showTeacherTime: boolean;
};

export function getBrowserTimeZone(): string {
  try {
    if (typeof Intl === "undefined") return "UTC";
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function areTimeZonesDifferent(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = String(a || "").trim();
  const right = String(b || "").trim();
  return Boolean(left && right && left !== right);
}

function safeTimeZone(timeZone?: string | null): string | undefined {
  const tz = String(timeZone || "").trim();
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return undefined;
  }
}

function toDate(input: string | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

export function formatDateTimeForUser({
  input,
  locale,
  timeZone,
  options,
}: {
  input: string | Date;
  locale: string;
  timeZone?: string | null;
  options?: Intl.DateTimeFormatOptions;
}): string {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
    timeZone: safeTimeZone(timeZone),
  }).format(date);
}

export function formatTimeRangeForUser(
  startIso: string | Date,
  endIso: string | Date,
  locale: string,
  timeZone?: string | null,
): string {
  const start = toDate(startIso);
  const end = toDate(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const tz = safeTimeZone(timeZone);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: tz,
  }).format(start);
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
  return `${dateLabel}, ${timeFormatter.format(start)}-${timeFormatter.format(end)}`;
}

export function formatBookingTimeForBothZones({
  startIso,
  endIso,
  userTimeZone,
  teacherTimeZone,
  locale,
}: {
  startIso: string | Date;
  endIso: string | Date;
  userTimeZone?: string | null;
  teacherTimeZone?: string | null;
  locale: string;
}): TimeZoneBookingLabels {
  const userTz = safeTimeZone(userTimeZone) || safeTimeZone(teacherTimeZone) || "UTC";
  const teacherTz = safeTimeZone(teacherTimeZone) || userTz;
  return {
    userLabel: formatTimeRangeForUser(startIso, endIso, locale, userTz),
    teacherLabel: formatTimeRangeForUser(startIso, endIso, locale, teacherTz),
    showTeacherTime: areTimeZonesDifferent(userTz, teacherTz),
  };
}

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = partsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

export function zonedWallTimeToUtc({
  dateIso,
  slot,
  timeZone,
}: {
  dateIso: string;
  slot: string;
  timeZone?: string | null;
}): Date | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!date) return null;
  const minutes = slot.includes(":") ? parseHHMMToMinutes(slot) ?? -1 : slotStartMinutes(slot);
  if (minutes < 0 || minutes >= 1440) return null;
  const tz = safeTimeZone(timeZone) || "UTC";
  const year = Number(date[1]);
  const month = Number(date[2]);
  const day = Number(date[3]);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const first = new Date(utcGuess.getTime() - getTimeZoneOffsetMs(utcGuess, tz));
  const second = new Date(utcGuess.getTime() - getTimeZoneOffsetMs(first, tz));
  if (Number.isNaN(second.getTime())) return null;
  const actual = partsInTimeZone(second, tz);
  // A spring-forward gap is not a real appointment; never silently shift it.
  return actual.year === year && actual.month === month && actual.day === day &&
    actual.hour === hour && actual.minute === minute ? second : null;
}

/** Legacy Quebec schedules have no stored booking zone; Toronto is their business default. */
export function teacherBookingTimeZone(value?: string | null): string {
  return safeTimeZone(value) || "America/Toronto";
}

export function dateInTeacherTimeZone(now: Date, zone?: string | null): string {
  const p = partsInTimeZone(now, teacherBookingTimeZone(zone));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addCalendarDays(date: string, offset: number): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

export function teacherDayBounds(date: string, zone?: string | null) {
  const timeZone = teacherBookingTimeZone(zone);
  const start = zonedWallTimeToUtc({ dateIso: date, slot: "0h00", timeZone });
  const end = zonedWallTimeToUtc({ dateIso: addCalendarDays(date, 1), slot: "0h00", timeZone });
  if (!start || !end) throw new Error("invalid_teacher_calendar_day");
  return { start, end };
}

export function teacherSlotMeetsNotice(date: string, slot: string, now: Date, zone?: string | null): boolean {
  const start = zonedWallTimeToUtc({ dateIso: date, slot, timeZone: teacherBookingTimeZone(zone) });
  return start !== null && start.getTime() - now.getTime() >= 24 * 60 * 60 * 1000;
}

export function bookingWallTimeRangeToUtc({
  dateIso,
  slot,
  durationMinutes,
  timeZone,
}: {
  dateIso: string;
  slot: string;
  durationMinutes?: number | string | null;
  timeZone?: string | null;
}): { start: Date; end: Date } | null {
  const start = zonedWallTimeToUtc({ dateIso, slot, timeZone });
  if (!start) return null;
  const duration = Number(durationMinutes ?? 60);
  const minutes = Number.isFinite(duration) && duration > 0 ? duration : 60;
  return { start, end: new Date(start.getTime() + minutes * 60_000) };
}
