import { localeToBcp47 } from "@/lib/i18n/types";
import type { Currency } from "@/lib/geoLocale";
import { convertCurrencyAmount } from "@/lib/currency/convert";
import { normalizeCurrency } from "@/lib/currency/rates";

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
