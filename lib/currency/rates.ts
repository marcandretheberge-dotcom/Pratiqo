/**
 * Display-only FX rates, anchored to USD.
 *
 * IMPORTANT: these are NOT used for transactions. Stripe always charges in
 * the teacher's native currency. We use them solely to render an approximate
 * conversion next to the primary price so a viewer browsing in CAD can grasp
 * what a UY teacher's quote means without leaving the page.
 *
 * Rates can be overridden via env vars at build time (NEXT_PUBLIC_FX_*),
 * which lets ops adjust without redeploying app code. Defaults are picked
 * to be conservative mid-market estimates; refresh on a quarterly cadence.
 *
 * Convention: `USD_PER_<CCY>` = how many USD one unit of <CCY> buys.
 *   Example: USD_PER_CAD = 0.73  → 100 CAD ≈ 73 USD.
 */

import type { Currency } from "@/lib/geoLocale";

function envRate(name: string, fallback: number): number {
  const raw = typeof process !== "undefined" ? process.env?.[name] : undefined;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * USD value of 1 unit of the given currency.
 * Source: indicative mid-market rates (refresh quarterly).
 * Last updated: 2026-Q2.
 */
export const USD_PER_CURRENCY: Record<Currency, number> = {
  USD: 1,
  CAD: envRate("NEXT_PUBLIC_FX_USD_PER_CAD", 0.73),
  EUR: envRate("NEXT_PUBLIC_FX_USD_PER_EUR", 1.08),
  MXN: envRate("NEXT_PUBLIC_FX_USD_PER_MXN", 0.058),
  UYU: envRate("NEXT_PUBLIC_FX_USD_PER_UYU", 0.025),
  COP: envRate("NEXT_PUBLIC_FX_USD_PER_COP", 0.00025),
  ARS: envRate("NEXT_PUBLIC_FX_USD_PER_ARS", 0.001),
  CLP: envRate("NEXT_PUBLIC_FX_USD_PER_CLP", 0.0011),
  PEN: envRate("NEXT_PUBLIC_FX_USD_PER_PEN", 0.27),
};

/**
 * Convert an amount between currencies using the static FX table.
 * Returns the converted amount; precision is up to the caller to format.
 */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const fromRate = USD_PER_CURRENCY[from];
  const toRate = USD_PER_CURRENCY[to];
  if (!fromRate || !toRate) return amount;
  const usd = amount * fromRate;
  return usd / toRate;
}

/** True when both currencies are in the FX table and a conversion can be shown. */
export function canConvert(from: Currency, to: Currency): boolean {
  return Boolean(USD_PER_CURRENCY[from]) && Boolean(USD_PER_CURRENCY[to]);
}
