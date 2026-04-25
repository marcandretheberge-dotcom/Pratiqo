import type { Locale } from "@/lib/i18n";

export type Currency = "CAD" | "USD" | "MXN" | "EUR" | "COP" | "ARS" | "CLP" | "PEN";

export interface GeoConfig {
  locale: Locale;
  currency: Currency;
  currencySymbol: string;
  country: string;
}

export const GEO_CONFIGS: Record<string, GeoConfig> = {
  // French Canada
  CA: { locale: "fr-CA", currency: "CAD", currencySymbol: "CA$", country: "Canada" },

  // English (USA + rest of Canada)
  US: { locale: "en-CA", currency: "USD", currencySymbol: "US$", country: "United States" },

  // Spanish - Mexico + Latin America
  MX: { locale: "es", currency: "MXN", currencySymbol: "MX$", country: "México" },
  CO: { locale: "es", currency: "COP", currencySymbol: "COP$", country: "Colombia" },
  AR: { locale: "es", currency: "ARS", currencySymbol: "AR$", country: "Argentina" },
  CL: { locale: "es", currency: "CLP", currencySymbol: "CLP$", country: "Chile" },
  PE: { locale: "es", currency: "PEN", currencySymbol: "S/", country: "Perú" },
  ES: { locale: "es", currency: "EUR", currencySymbol: "€", country: "España" },

  // Default French for other countries
  FR: { locale: "fr-CA", currency: "EUR", currencySymbol: "€", country: "France" },
  BE: { locale: "fr-CA", currency: "EUR", currencySymbol: "€", country: "Belgique" },
  CH: { locale: "fr-CA", currency: "EUR", currencySymbol: "€", country: "Suisse" },
};

export function getDefaultGeoConfig(): GeoConfig {
  return GEO_CONFIGS["CA"];
}

export function getGeoConfig(countryCode: string): GeoConfig {
  return GEO_CONFIGS[countryCode] ?? getDefaultGeoConfig();
}

export function formatPrice(amount: number, currency: Currency, locale: string): string {
  const fmtLocale = locale === "fr-CA" ? "fr-CA" : locale === "es" ? "es-MX" : "en-CA";
  return new Intl.NumberFormat(fmtLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

