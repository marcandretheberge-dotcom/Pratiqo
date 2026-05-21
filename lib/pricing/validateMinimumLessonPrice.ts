import { MIN_LESSON_PRICE_CENTS } from "@/lib/pricing/constants";

export type MinimumLessonPriceValidation =
  | { ok: true }
  | { ok: false; priceCents: number };

export function validateMinimumLessonPrice(priceCents: number): MinimumLessonPriceValidation {
  const cents = Math.round(Number(priceCents));
  if (!Number.isFinite(cents) || cents < MIN_LESSON_PRICE_CENTS) {
    return { ok: false, priceCents: Number.isFinite(cents) ? cents : 0 };
  }
  return { ok: true };
}

export function validateMinimumLessonPriceDollars(dollars: number): MinimumLessonPriceValidation {
  const parsed = Number(dollars);
  if (!Number.isFinite(parsed)) {
    return { ok: false, priceCents: 0 };
  }
  return validateMinimumLessonPrice(Math.round(parsed * 100));
}

export function dollarsToLessonPriceCents(dollars: number): number {
  const parsed = Number(dollars);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}
