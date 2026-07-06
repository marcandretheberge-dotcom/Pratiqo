import {
  calculateIntroSessionPriceCents,
  INTRO_SESSION_DEFAULT_DISCOUNT_PERCENT,
  INTRO_SESSION_DEFAULT_DURATION_MINUTES,
} from "@/lib/introSession";
import { validateMinimumLessonPrice, type MinimumLessonPriceValidation } from "@/lib/pricing/validateMinimumLessonPrice";

export type TeacherLessonOfferInput = {
  price_per_lesson?: number | string | null;
  home_lesson_enabled?: boolean | null;
  home_lesson_price?: number | string | null;
  home_lesson_min_duration?: number | string | null;
  intro_session_enabled?: boolean | null;
  intro_session_price_cents?: number | string | null;
  intro_session_duration_minutes?: number | string | null;
  intro_session_discount_percent?: number | string | null;
};

function positiveNumber(value: number | string | null | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Standard individual lesson (60 min) session price in cents from hourly studio/online rate. */
export function standardLessonSessionPriceCents(
  input: Pick<TeacherLessonOfferInput, "price_per_lesson">,
): number {
  const hourly = positiveNumber(input.price_per_lesson);
  if (hourly == null) return 0;
  return Math.round(hourly * 100);
}

/** Home lesson session price in cents using configured minimum duration. */
export function homeLessonSessionPriceCents(
  input: Pick<TeacherLessonOfferInput, "home_lesson_price" | "home_lesson_min_duration">,
): number {
  const hourly = positiveNumber(input.home_lesson_price);
  if (hourly == null) return 0;
  const minutes = Number(input.home_lesson_min_duration ?? 60);
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
  return Math.round(hourly * 100 * (safeMinutes / 60));
}

/**
 * Resolves intro session price in cents (explicit custom price or derived formula).
 */
export function resolveIntroSessionPriceCents(input: TeacherLessonOfferInput): number {
  const explicit = positiveNumber(input.intro_session_price_cents);
  if (explicit != null) {
    return Math.round(explicit);
  }

  return calculateIntroSessionPriceCents({
    hourlyPrice: input.price_per_lesson,
    durationMinutes: input.intro_session_duration_minutes ?? INTRO_SESSION_DEFAULT_DURATION_MINUTES,
    discountPercent: input.intro_session_discount_percent ?? INTRO_SESSION_DEFAULT_DISCOUNT_PERCENT,
    explicitPriceCents: null,
  });
}

/** When intro is enabled, explicit and derived intro prices must meet the per-session minimum. */
export function validateEnabledIntroSessionOffer(input: TeacherLessonOfferInput): MinimumLessonPriceValidation {
  if (!input.intro_session_enabled) {
    return { ok: true };
  }

  const explicit = positiveNumber(input.intro_session_price_cents);
  if (explicit == null) return { ok: false, priceCents: 0 };
  return validateMinimumLessonPrice(Math.round(explicit));
}

/**
 * Validates enabled individual lesson offers (standard, home, intro) against per-session minimum.
 */
export function validateTeacherLessonOffers(input: TeacherLessonOfferInput): MinimumLessonPriceValidation {
  const standardCents = standardLessonSessionPriceCents(input);
  if (standardCents > 0) {
    const standardCheck = validateMinimumLessonPrice(standardCents);
    if (!standardCheck.ok) return standardCheck;
  }

  if (input.home_lesson_enabled) {
    const homeCents = homeLessonSessionPriceCents(input);
    if (homeCents <= 0) {
      return { ok: false, priceCents: 0 };
    }
    const homeCheck = validateMinimumLessonPrice(homeCents);
    if (!homeCheck.ok) return homeCheck;
  }

  return validateEnabledIntroSessionOffer(input);
}
