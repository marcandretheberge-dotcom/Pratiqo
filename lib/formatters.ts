export function formatCurrencyCents(cents: number, currency = "CAD", locale = "fr-CA"): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return formatCurrencyAmount(safe / 100, currency, locale);
}

export function formatCurrencyAmount(amount: number, currency = "CAD", locale = "fr-CA"): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "CAD",
  }).format(safe);
}

export function formatNumber(value: number, locale = "fr-CA"): string {
  return new Intl.NumberFormat(locale).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, locale = "fr-CA"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(date: string | Date, locale = "fr-CA", timeZone?: string | null): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: timeZone || undefined,
  }).format(d);
}

export function formatTime(date: string | Date, locale = "fr-CA", timeZone?: string | null): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || undefined,
  }).format(d);
}
