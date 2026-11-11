const RFC3339_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/;

export function parseCafeStartsAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.length > 80) return null;

  const match = v.match(RFC3339_RE);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zoneText, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = zoneText === "Z" ? 0 : Number(offsetHourText);
  const offsetMinute = zoneText === "Z" ? 0 : Number(offsetMinuteText);

  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) return null;

  const utcProbe = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    utcProbe.getUTCFullYear() !== year ||
    utcProbe.getUTCMonth() !== month - 1 ||
    utcProbe.getUTCDate() !== day
  ) return null;

  const parsed = Date.parse(v);
  return Number.isFinite(parsed) ? v : null;
}
