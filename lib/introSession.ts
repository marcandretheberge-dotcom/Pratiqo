export const INTRO_SESSION_DEFAULT_DURATION_MINUTES = 45;
export const INTRO_SESSION_DEFAULT_DISCOUNT_PERCENT = 50;

export function calculateIntroSessionPriceCents(input: {
  hourlyPrice: number | string | null | undefined;
  durationMinutes?: number | string | null;
  discountPercent?: number | string | null;
  explicitPriceCents?: number | string | null;
}): number {
  const explicit = Number(input.explicitPriceCents);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);

  const hourly = Number(input.hourlyPrice);
  if (!Number.isFinite(hourly) || hourly <= 0) return 0;

  const duration = Number(input.durationMinutes ?? INTRO_SESSION_DEFAULT_DURATION_MINUTES);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : INTRO_SESSION_DEFAULT_DURATION_MINUTES;
  const discount = Number(input.discountPercent ?? INTRO_SESSION_DEFAULT_DISCOUNT_PERCENT);
  const safeDiscount = Number.isFinite(discount) ? Math.min(100, Math.max(0, discount)) : INTRO_SESSION_DEFAULT_DISCOUNT_PERCENT;

  const proratedDollars = hourly * (safeDuration / 60);
  const discountedDollars = proratedDollars * ((100 - safeDiscount) / 100);
  return Math.max(50, Math.round(discountedDollars) * 100);
}

export function centsToDisplayAmount(cents: number): number {
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.round(cents) / 100;
}
