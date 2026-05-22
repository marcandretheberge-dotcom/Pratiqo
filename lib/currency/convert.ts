import type { Currency } from "@/lib/geoLocale";
import { CAD_DISPLAY_RATES, FX_RATES_AS_OF, normalizeCurrency } from "@/lib/currency/rates";

export interface ConvertedCurrencyAmount {
  amount: number;
  sourceCurrency: Currency;
  displayCurrency: Currency;
  approximate: boolean;
  asOf: string;
}

export function convertCurrencyAmount(
  amount: number,
  sourceCurrencyInput: Currency | string | null | undefined,
  displayCurrencyInput: Currency | string | null | undefined,
): ConvertedCurrencyAmount | null {
  if (!Number.isFinite(amount)) return null;

  const sourceCurrency = normalizeCurrency(sourceCurrencyInput, "CAD");
  const displayCurrency = normalizeCurrency(displayCurrencyInput, "CAD");
  const sourceRate = CAD_DISPLAY_RATES[sourceCurrency];
  const displayRate = CAD_DISPLAY_RATES[displayCurrency];

  if (!sourceRate || !displayRate) return null;

  if (sourceCurrency === displayCurrency) {
    return {
      amount,
      sourceCurrency,
      displayCurrency,
      approximate: false,
      asOf: FX_RATES_AS_OF,
    };
  }

  return {
    amount: (amount / sourceRate) * displayRate,
    sourceCurrency,
    displayCurrency,
    approximate: true,
    asOf: FX_RATES_AS_OF,
  };
}
