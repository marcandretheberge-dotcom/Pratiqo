import { MIN_LESSON_PRICE_CENTS } from "@/lib/pricing/constants";
import { validateMinimumLessonPrice } from "@/lib/pricing/validateMinimumLessonPrice";

export function isLessonSessionBookable(priceDollars: number): boolean {
  const cents = Math.round(Number(priceDollars) * 100);
  return validateMinimumLessonPrice(cents).ok;
}

/**
 * Credits may only be applied up to the amount that keeps payable total at the session minimum.
 */
export function maxCreditsApplicableDollars(basePriceDollars: number, creditBalanceDollars: number): number {
  const baseCents = Math.round(Number(basePriceDollars) * 100);
  if (!validateMinimumLessonPrice(baseCents).ok) {
    return 0;
  }

  const balanceCents = Math.floor(Math.max(0, Number(creditBalanceDollars)) * 100);
  const maxDiscountCents = Math.max(0, baseCents - MIN_LESSON_PRICE_CENTS);
  return Math.min(balanceCents, maxDiscountCents) / 100;
}

export function payableAmountCents(basePriceDollars: number, creditsAppliedDollars: number): number {
  const baseCents = Math.round(Number(basePriceDollars) * 100);
  const creditCents = Math.round(Math.max(0, Number(creditsAppliedDollars)) * 100);
  return Math.max(0, baseCents - creditCents);
}
