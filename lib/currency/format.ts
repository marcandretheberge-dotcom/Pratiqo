/**
 * Teacher-price formatter — multi-currency aware.
 *
 * Returns the price in the teacher's NATIVE currency (the source of truth for
 * billing) plus an optional approximation in the viewer's currency. This
 * decouples honest pricing ("I see CA$25/h, that's what gets charged") from
 * UX helpfulness ("≈ US$18/h so I know it's not a fortune").
 *
 * The approximation is suffixed with "≈" to signal it's a non-binding
 * estimate. Stripe ALWAYS charges in the teacher's native currency.
 */

import { localeToBcp47 } from "@/lib/i18n/types";
import { type Currency, UYU_USD_RATE } from "@/lib/geoLocale";
import { canConvert, convertCurrency } from "@/lib/currency/rates";

export type TeacherPriceParts = {
  /** Always rendered. Formatted in the teacher's native currency. */
  primary: string;
  /** Faint converted line; null when no conversion is needed/possible. */
  approximation: string | null;
  /** True when `approximation` is shown. */
  isApproximate: boolean;
  /** ISO 4217 currency code of `primary` (for aria labels / debugging). */
  primaryCurrency: Currency;
};

type FormatTeacherPriceInput = {
  /** Amount in `teacherCurrency` (NOT in USD or in viewer currency). */
  amount: number;
  /** Teacher's native currency — what gets charged. Defaults to viewer's. */
  teacherCurrency: Currency | null | undefined;
  /** Viewer's chosen display currency. */
  viewerCurrency: Currency;
  /** BCP-47 / locale code used for number formatting. */
  locale: string;
};

function formatAmount(amount: number, currency: Currency, locale: string): string {
  const fmtLocale = localeToBcp47(locale);
  return new Intl.NumberFormat(fmtLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a teacher's price for display.
 *
 * Special case: when teacherCurrency is UYU we use the legacy "dual pricing"
 * convention (UYU primary, USD secondary in parentheses) so the existing
 * `PriceDisplay` UX continues to work for the UY market.
 */
export function formatTeacherPrice(input: FormatTeacherPriceInput): TeacherPriceParts {
  const teacherCcy: Currency = (input.teacherCurrency || input.viewerCurrency) as Currency;
  const viewerCcy = input.viewerCurrency;
  const locale = input.locale;

  // UY market keeps its bespoke dual-currency convention: prices in DB are USD,
  // primary is UYU, secondary is USD (handled by formatGeoDualPrice elsewhere).
  if (teacherCcy === "UYU") {
    const uyu = Math.round(input.amount * UYU_USD_RATE);
    const primary = formatAmount(uyu, "UYU", locale);
    const approx =
      viewerCcy !== "UYU" && viewerCcy !== "USD" && canConvert("USD", viewerCcy)
        ? formatAmount(Math.round(convertCurrency(input.amount, "USD", viewerCcy)), viewerCcy, locale)
        : viewerCcy === "USD"
          ? formatAmount(input.amount, "USD", locale)
          : null;
    return {
      primary,
      approximation: approx ? `≈ ${approx}` : `(${formatAmount(input.amount, "USD", "en")})`,
      isApproximate: viewerCcy !== "UYU",
      primaryCurrency: "UYU",
    };
  }

  const primary = formatAmount(input.amount, teacherCcy, locale);

  if (teacherCcy === viewerCcy || !canConvert(teacherCcy, viewerCcy)) {
    return {
      primary,
      approximation: null,
      isApproximate: false,
      primaryCurrency: teacherCcy,
    };
  }

  const converted = Math.round(convertCurrency(input.amount, teacherCcy, viewerCcy));
  return {
    primary,
    approximation: `≈ ${formatAmount(converted, viewerCcy, locale)}`,
    isApproximate: true,
    primaryCurrency: teacherCcy,
  };
}
