import { localeToBcp47, type Locale } from "@/lib/i18n/types";

export type Currency = "CAD" | "USD" | "MXN" | "EUR" | "COP" | "ARS" | "CLP" | "PEN" | "UYU";

// ── Uruguay exchange rate ─────────────────────────────────────────────────────
//
// DB prices for Uruguayan teachers are always stored in USD (de-facto private-
// lesson currency). The UYU display is derived on the fly by multiplying by this
// rate.  Override via NEXT_PUBLIC_UYU_USD_RATE env var when the market rate
// shifts. The NEXT_PUBLIC_ prefix makes the value available on the client too.
//
// Convention: 1 USD ≈ 40 UYU (adjust in .env.local as needed).
export const UYU_USD_RATE = Number(process.env.NEXT_PUBLIC_UYU_USD_RATE) || 40;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeoConfig {
  locale: Locale;
  currency: Currency;
  currencySymbol: string;
  country: string;
  /** Secondary currency shown alongside the primary (UY dual-price strategy). */
  secondaryCurrency?: Currency;
  secondaryCurrencySymbol?: string;
}

// ── Market configurations ─────────────────────────────────────────────────────

export const GEO_CONFIGS: Record<string, GeoConfig> = {
  // French Canada
  CA: { locale: "fr", currency: "CAD", currencySymbol: "CA$", country: "Canada" },

  // English (USA + rest of Canada)
  US: { locale: "en", currency: "USD", currencySymbol: "US$", country: "United States" },

  // Spanish - Mexico + Latin America
  MX: { locale: "es", currency: "MXN", currencySymbol: "MX$", country: "México" },
  CO: { locale: "es", currency: "COP", currencySymbol: "COP$", country: "Colombia" },
  AR: { locale: "es", currency: "ARS", currencySymbol: "AR$", country: "Argentina" },
  CL: { locale: "es", currency: "CLP", currencySymbol: "CLP$", country: "Chile" },
  PE: { locale: "es", currency: "PEN", currencySymbol: "S/",   country: "Perú" },
  ES: { locale: "es", currency: "EUR", currencySymbol: "€",    country: "España" },

  // Uruguay — "Local First" dual-pricing strategy
  //   Primary:   UYU ($U)  — what local parents search for / understand first
  //   Secondary: USD (US$) — what teachers typically quote (stored in DB)
  //   DB values are always in USD; the UYU figure is computed via UYU_USD_RATE.
  UY: {
    locale: "es",
    currency: "UYU",
    currencySymbol: "$U",
    country: "Uruguay",
    secondaryCurrency: "USD",
    secondaryCurrencySymbol: "US$",
  },

  // Default French for other countries
  FR: { locale: "fr", currency: "EUR", currencySymbol: "€", country: "France" },
  BE: { locale: "fr", currency: "EUR", currencySymbol: "€", country: "Belgique" },
  CH: { locale: "fr", currency: "EUR", currencySymbol: "€", country: "Suisse" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getDefaultGeoConfig(): GeoConfig {
  return GEO_CONFIGS["CA"];
}

export function getGeoConfig(countryCode: string): GeoConfig {
  return GEO_CONFIGS[countryCode] ?? getDefaultGeoConfig();
}

// ── formatPrice ───────────────────────────────────────────────────────────────
//
// Single-currency formatter. Conversion now lives in lib/currency/* so this
// helper never changes the numeric amount behind the caller's back.

export function formatPrice(amount: number, currency: Currency, locale: string): string {
  const fmtLocale = localeToBcp47(locale);

  return new Intl.NumberFormat(fmtLocale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── formatDualPrice ───────────────────────────────────────────────────────────
//
// Returns the dual-price string for UY: "$U 1.000 (US$ 25)"
// Returns null for all other markets (caller should fall back to formatPrice).
//
// `amountUSD` — price as stored in the DB (always in USD for UY teachers).

export function formatDualPrice(
  amountUSD: number,
  currency: Currency,
  locale: string,
): string | null {
  if (currency !== "UYU") return null;

  const amountUYU = Math.round(amountUSD * UYU_USD_RATE);
  const fmtLocale = localeToBcp47(locale);

  const uyuStr = new Intl.NumberFormat(fmtLocale, {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amountUYU);

  const usdStr = new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUSD);

  return `${uyuStr} (${usdStr})`;
}

// ── Conversion utilities ──────────────────────────────────────────────────────
//
// Teachers on the UY market can enter their rate in either USD or UYU.
// These helpers convert between the two using the configured rate.

/** Convert a USD amount to Uruguayan pesos (rounded to nearest integer). */
export function usdToUyu(amountUSD: number): number {
  return Math.round(amountUSD * UYU_USD_RATE);
}

/** Convert a UYU amount to USD (rounded to nearest integer). */
export function uyuToUsd(amountUYU: number): number {
  return Math.round(amountUYU / UYU_USD_RATE);
}
