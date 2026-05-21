import type { Currency } from "@/lib/geoLocale";

export const DISPLAY_CURRENCIES = [
  "CAD",
  "USD",
  "MXN",
  "EUR",
  "COP",
  "ARS",
  "CLP",
  "PEN",
  "UYU",
] as const satisfies readonly Currency[];

export const FX_RATES_AS_OF = "2026-05-21";

/**
 * MVP display-only FX table.
 * Values mean: 1 CAD ~= n target currency units.
 */
export const CAD_DISPLAY_RATES: Record<Currency, number> = {
  CAD: 1,
  USD: 0.73,
  MXN: 13.55,
  EUR: 0.67,
  COP: 2830,
  ARS: 820,
  CLP: 680,
  PEN: 2.7,
  UYU: 29.2,
};

export function isSupportedCurrency(value: unknown): value is Currency {
  return typeof value === "string" && DISPLAY_CURRENCIES.includes(value as Currency);
}

export function normalizeCurrency(value: unknown, fallback: Currency = "CAD"): Currency {
  return isSupportedCurrency(value) ? value : fallback;
}
