/**
 * lib/pricing/hourlyRatePreview.ts
 *
 * Single source of truth for the teacher-facing hourly-rate preview.
 *
 * Why this exists
 * ----------------
 * Pratiqo stores `teachers.price_per_lesson` and `teachers.home_lesson_price`
 * as CAD **hourly** rates (despite the legacy column name). The
 * checkout/payout pipeline in `lib/pricing/bookingCharge.ts` already prorates
 * those rates by the booking's `duration_minutes`:
 *
 *     lessonCents = round(hourly × duration / 60 × 100)
 *
 * But before this helper, the teacher-facing preview component
 * (`components/teacher/TeacherPayoutPreview.tsx`) was fed the *hourly* value
 * as if it were a flat session price. That made the commission/net numbers
 * accidentally correct only for 60-minute lessons and quietly misleading for
 * every other duration.
 *
 * This helper bakes the prorating into the preview so the numbers shown in
 * "Offre et tarifs" mirror exactly what the booking pipeline will charge.
 *
 * Restrictions honoured: this module performs NO Stripe / payment / tax /
 * checkout write. It is a pure display helper that REUSES the existing
 * `calculateBookingAmounts` commission logic — no fee math is duplicated.
 */

import {
  calculateBookingAmounts,
  type LoyaltyTier,
} from "@/lib/payments/commission";
import type { FounderPromoSnapshot } from "@/lib/payments/founderPromo";
import { normalizeLessonDurationMinutes } from "@/lib/pricing/lessonDuration";

export type HourlyRatePreviewInput = {
  /** CAD hourly rate as typed by the teacher (number or numeric string). */
  hourlyRate: number | string | null | undefined;
  /** Duration used to prorate the rate. Defaults to 60 if invalid/missing. */
  durationMinutes: number | string | null | undefined;
  /** Teacher's current plan ("free" | "pro" | …). Default "free". */
  teacherPlan?: string | null;
  /** Optional annual volume to drive loyalty tier inference. */
  annualVolumeCents?: number | null;
  /** Optional explicit loyalty tier override. */
  loyaltyTier?: string | null;
  /**
   * Optional active founder-promotion snapshot. The teacher dashboard is
   * a client component today and intentionally does NOT fetch this — its
   * preview is therefore an estimate at the standard plan rate. The actual
   * commission applied at checkout uses the same precedence (paid Pro >
   * founder promo > standard) and may be lower while a founder promo is
   * active. Server-side callers that have already loaded the row may pass
   * it here to make their preview match checkout exactly.
   */
  founderPromo?: FounderPromoSnapshot;
};

export type HourlyRatePreview = {
  /** True when the input hourly rate is a positive finite number. */
  isPositive: boolean;
  /** Normalized duration used for the preview (always 30 / 45 / 60 / … / 180). */
  durationMinutes: number;
  /** Hourly rate in CAD dollars after numeric normalization (0 if invalid). */
  hourlyDollars: number;
  /** Prorated lesson price in cents — exactly what the booking pipeline charges. */
  lessonPriceCents: number;
  /** Prorated lesson price in CAD dollars. */
  lessonPriceDollars: number;
  /** Pratiqo commission for the prorated lesson, in cents. */
  commissionCents: number;
  /** Pratiqo commission in CAD dollars. */
  commissionDollars: number;
  /** Teacher net payout in cents. */
  teacherNetCents: number;
  /** Teacher net payout in CAD dollars. */
  teacherNetDollars: number;
  /** Effective fee rate (0..1). */
  feeRate: number;
  /** Effective fee in basis points. */
  feeBasisPoints: number;
  /** Loyalty tier used for the commission row. */
  tier: LoyaltyTier;
  /** Whether the caller provided a real plan signal. */
  isPlanKnown: boolean;
  /** Normalized plan name ("free" | "pro" | "business" | "enterprise"). */
  plan: string;
};

function asPositiveNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

/**
 * Compute the prorated lesson price in cents using the SAME formula
 * `lib/pricing/bookingCharge.ts` uses at checkout. Centralizing it here
 * guarantees the preview can never drift from the actual charge.
 *
 * IMPORTANT: This helper is display-only. The booking pipeline does NOT
 * import this function — it has its own copy in `bookingCharge.ts` so the
 * charging path is never reshaped from a UI module.
 */
export function proratedLessonPriceCents(
  hourlyRate: number | string | null | undefined,
  durationMinutes: number | string | null | undefined,
): number {
  const hourly = asPositiveNumber(hourlyRate);
  if (hourly === 0) return 0;
  const duration = normalizeLessonDurationMinutes(durationMinutes);
  return Math.round(hourly * (duration / 60) * 100);
}

/**
 * Build the full hourly-rate preview (price + commission + net) for the
 * teacher UI. The commission row is sourced from
 * `lib/payments/commission.ts → calculateBookingAmounts`; we do NOT
 * duplicate the bps-per-tier table.
 */
export function getHourlyRatePreview(
  input: HourlyRatePreviewInput,
): HourlyRatePreview {
  const hourly = asPositiveNumber(input.hourlyRate);
  const durationMinutes = normalizeLessonDurationMinutes(input.durationMinutes);
  const lessonPriceCents = hourly === 0
    ? 0
    : Math.round(hourly * (durationMinutes / 60) * 100);
  const isPlanKnown = Boolean(input.teacherPlan && String(input.teacherPlan).trim());
  const plan = isPlanKnown ? String(input.teacherPlan).trim().toLowerCase() : "free";

  const amounts = calculateBookingAmounts({
    subtotalCents: lessonPriceCents,
    taxTotalCents: 0,
    teacherPlan: plan,
    bookingType: "individual",
    annualVolumeCents: input.annualVolumeCents ?? null,
    loyaltyTier: input.loyaltyTier ?? null,
    founderPromo: input.founderPromo ?? null,
  });

  return {
    isPositive: hourly > 0,
    durationMinutes,
    hourlyDollars: hourly,
    lessonPriceCents: amounts.subtotalCents,
    lessonPriceDollars: amounts.subtotalCents / 100,
    commissionCents: amounts.platformFeeCents,
    commissionDollars: amounts.platformFeeCents / 100,
    teacherNetCents: amounts.teacherNetCents,
    teacherNetDollars: amounts.teacherNetCents / 100,
    feeRate: amounts.feeRate,
    feeBasisPoints: amounts.feeBasisPoints,
    tier: amounts.loyaltyTier,
    isPlanKnown,
    plan: amounts.teacherPlan,
  };
}
