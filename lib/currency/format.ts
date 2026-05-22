import { localeToBcp47 } from "@/lib/i18n/types";
import type { Currency } from "@/lib/geoLocale";
import { convertCurrencyAmount } from "@/lib/currency/convert";
import { CAD_DISPLAY_RATES, normalizeCurrency } from "@/lib/currency/rates";

export function formatCurrencyAmount(
  amount: number,
  currencyInput: Currency | string | null | undefined,
  locale: string,
  options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {},
): string {
  const currency = normalizeCurrency(currencyInput, "CAD");
  const abs = Math.abs(amount);
  const maximumFractionDigits =
    options.maximumFractionDigits ??
    (abs >= 100 || Number.isInteger(amount) ? 0 : 2);

  const formatted = new Intl.NumberFormat(localeToBcp47(locale), {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);

  return formatted.replace(/\s+/g, " ").trim();
}

export interface DisplayPrice {
  primary: string;
  original: string;
  approximate: boolean;
  sourceCurrency: Currency;
  displayCurrency: Currency;
  asOf: string;
}

export function formatDisplayPrice({
  amount,
  sourceCurrency,
  displayCurrency,
  locale,
}: {
  amount: number;
  sourceCurrency?: Currency | string | null;
  displayCurrency?: Currency | string | null;
  locale: string;
}): DisplayPrice {
  const source = normalizeCurrency(sourceCurrency, "CAD");
  const display = normalizeCurrency(displayCurrency, "CAD");
  const converted = convertCurrencyAmount(amount, source, display);
  const safe = converted ?? convertCurrencyAmount(amount, source, source);
  const original = formatCurrencyAmount(amount, source, locale);

  if (!safe) {
    return {
      primary: original,
      original,
      approximate: false,
      sourceCurrency: source,
      displayCurrency: source,
      asOf: "",
    };
  }

  return {
    primary: formatCurrencyAmount(safe.amount, safe.displayCurrency, locale),
    original,
    approximate: safe.approximate,
    sourceCurrency: safe.sourceCurrency,
    displayCurrency: safe.displayCurrency,
    asOf: safe.asOf,
  };
}

export interface AccountingDisplay {
  /** Always rendered in the source/accounting currency (e.g. CAD). */
  primary: string;
  /**
   * Optional secondary line in the viewer's display currency, formatted as
   * "≈ {currency} {amount}". Null when the display currency equals the
   * accounting currency, or when a rate is missing.
   */
  approx: string | null;
  sourceCurrency: Currency;
  displayCurrency: Currency;
}

/**
 * Accounting-first formatter for teacher-facing money surfaces
 * (revenue, history, payout preview, "this month" tile).
 *
 * Unlike `formatDisplayPrice`, this NEVER replaces the accounting amount
 * with a converted figure. The primary string is always in the actual
 * source currency (CAD today). The optional `approx` line is a *secondary*
 * estimate in the viewer's selected currency, shown only when it differs
 * from the source and a rate is available.
 *
 * This shape is intentional for legal/accounting screens: the truthful
 * payout number stays prominent, conversion is informational only.
 */
export function formatAccountingDisplay({
  amount,
  sourceCurrency,
  displayCurrency,
  locale,
}: {
  amount: number;
  sourceCurrency?: Currency | string | null;
  displayCurrency?: Currency | string | null;
  locale: string;
}): AccountingDisplay {
  const source = normalizeCurrency(sourceCurrency, "CAD");
  const display = normalizeCurrency(displayCurrency, source);
  const primary = formatCurrencyAmount(amount, source, locale);

  if (display === source) {
    return { primary, approx: null, sourceCurrency: source, displayCurrency: source };
  }

  // Skip the secondary when we don't have a usable rate — surfacing a stale
  // or missing conversion on an accounting screen is worse than silence.
  if (!CAD_DISPLAY_RATES[display] || !CAD_DISPLAY_RATES[source]) {
    return { primary, approx: null, sourceCurrency: source, displayCurrency: source };
  }

  const converted = convertCurrencyAmount(amount, source, display);
  if (!converted || !converted.approximate) {
    return { primary, approx: null, sourceCurrency: source, displayCurrency: source };
  }

  const approx = formatCurrencyAmount(converted.amount, converted.displayCurrency, locale);
  return {
    primary,
    approx,
    sourceCurrency: source,
    displayCurrency: converted.displayCurrency,
  };
}
