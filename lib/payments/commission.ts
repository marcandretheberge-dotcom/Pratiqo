import {
  isFounderPromoCurrentlyActive,
  type FounderPromoSnapshot,
} from "@/lib/payments/founderPromo";

export type TeacherPaymentPlan = "free" | "pro" | "business" | "enterprise";
export type BookingPaymentType = "individual" | "group";
export type LoyaltyTier = "bronze" | "argent" | "or" | "platine";

export type PlatformFeeRateInput = {
  teacherPlan?: string | null;
  bookingType?: BookingPaymentType;
  annualVolumeCents?: number | null;
  loyaltyTier?: string | null;
};

/**
 * Effective-fee input. Wraps the standard plan/tier inputs with an
 * optional founder-promotion snapshot. The promotion is ONLY consulted
 * when the teacher is NOT on a paid Membre Pro plan — paid Pro always
 * wins, by design (see `getEffectivePlatformFeeBasisPoints`).
 */
export type EffectivePlatformFeeRateInput = PlatformFeeRateInput & {
  founderPromo?: FounderPromoSnapshot;
  /** Override for tests; defaults to `new Date()`. */
  now?: Date;
};

export type BookingAmountInput = PlatformFeeRateInput & {
  /** Pre-tax lesson subtotal in cents; platform fee is calculated on this amount. */
  subtotalCents?: number;
  /** Included sales tax in cents (0 in Phase 1; Stripe Tax not enabled). */
  taxTotalCents?: number;
  /** @deprecated Use subtotalCents. Treated as subtotal when subtotalCents is omitted. */
  priceCents?: number;
  /**
   * Optional founder-promotion snapshot. When present AND the promo is
   * currently active AND the teacher is NOT on a paid Pro plan, the fee
   * basis points are sourced from the promo (default 500 bps = 5 %)
   * instead of the standard free-plan tier table.
   *
   * Default `null` keeps every existing call-site behaviorally identical
   * to before this field existed. Live amount-creating server routes
   * (`/api/stripe/checkout`, `/booking/success`) opt in by loading the
   * snapshot through `loadActiveFounderPromo` + `rowToSnapshot` and
   * passing it here.
   */
  founderPromo?: FounderPromoSnapshot;
  /** Override for tests; defaults to `new Date()`. */
  now?: Date;
};

export type BookingAmountBreakdown = {
  subtotalCents: number;
  taxTotalCents: number;
  amountCents: number;
  platformFeeCents: number;
  teacherNetCents: number;
  feeRate: number;
  feeBasisPoints: number;
  loyaltyTier: LoyaltyTier;
  teacherPlan: TeacherPaymentPlan;
};

const TIER_THRESHOLDS_CENTS: Array<{ tier: LoyaltyTier; minCents: number; maxCents: number }> = [
  { tier: "bronze", minCents: 0, maxCents: 500_000 },
  { tier: "argent", minCents: 500_000, maxCents: 1_500_000 },
  { tier: "or", minCents: 1_500_000, maxCents: 3_000_000 },
  { tier: "platine", minCents: 3_000_000, maxCents: Number.POSITIVE_INFINITY },
];

const FREE_PLAN_BPS: Record<LoyaltyTier, number> = {
  bronze: 1500,
  argent: 1400,
  or: 1300,
  platine: 1200,
};

const PRO_PLAN_BPS: Record<LoyaltyTier, number> = {
  bronze: 500,
  argent: 450,
  or: 400,
  platine: 350,
};

function safeCents(value: number | undefined): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? (value as number) : 0));
}

export function normalizeTeacherPaymentPlan(plan: string | null | undefined): TeacherPaymentPlan {
  const p = String(plan ?? "free").trim().toLowerCase();
  if (p === "pro") return "pro";
  if (p === "business") return "business";
  if (p === "enterprise") return "enterprise";
  return "free";
}

export function normalizeLoyaltyTier(tier: string | null | undefined): LoyaltyTier | null {
  const t = String(tier ?? "").trim().toLowerCase();
  if (t === "bronze") return "bronze";
  if (t === "argent" || t === "silver") return "argent";
  if (t === "or" || t === "gold") return "or";
  if (t === "platine" || t === "platinum") return "platine";
  return null;
}

export function loyaltyTierFromAnnualVolumeCents(annualVolumeCents: number | null | undefined): LoyaltyTier {
  const cents = Math.max(0, Math.round(Number(annualVolumeCents ?? 0)));
  return TIER_THRESHOLDS_CENTS.find((tier) => cents >= tier.minCents && cents < tier.maxCents)?.tier ?? "bronze";
}

export function resolveLoyaltyTier(input: Pick<PlatformFeeRateInput, "annualVolumeCents" | "loyaltyTier">): LoyaltyTier {
  return normalizeLoyaltyTier(input.loyaltyTier) ?? loyaltyTierFromAnnualVolumeCents(input.annualVolumeCents);
}

export function getPlatformFeeBasisPoints(input: PlatformFeeRateInput): number {
  const plan = normalizeTeacherPaymentPlan(input.teacherPlan);
  const tier = resolveLoyaltyTier(input);
  return plan === "free" ? FREE_PLAN_BPS[tier] : PRO_PLAN_BPS[tier];
}

export function getPlatformFeeRate(input: PlatformFeeRateInput): number {
  return getPlatformFeeBasisPoints(input) / 10_000;
}

/**
 * Effective platform fee with explicit precedence:
 *   1. Paid Membre Pro (`teacherPlan === "pro"|"business"|"enterprise"`)
 *      → existing PRO_PLAN_BPS path. The Stripe-driven subscription
 *        always wins; admins cannot override it through this layer.
 *   2. Active founder promotion → `founderPromo.commissionRateBps`.
 *      The promotion's lifecycle is checked dynamically against `now`,
 *      so an expired or early-terminated promo is automatically ignored.
 *   3. Otherwise → existing free-plan path (FREE_PLAN_BPS by tier).
 *
 * Existing call-sites that don't know about founder promos continue to
 * call `getPlatformFeeBasisPoints` directly and get exactly the same
 * answer they did before this layer was added — that's intentional;
 * payment-critical paths (Stripe checkout, webhooks, payouts) opt-in
 * to the founder layer only when they are wired to the snapshot.
 */
export function getEffectivePlatformFeeBasisPoints(
  input: EffectivePlatformFeeRateInput,
): number {
  const plan = normalizeTeacherPaymentPlan(input.teacherPlan);
  if (plan !== "free") {
    return getPlatformFeeBasisPoints(input);
  }
  const promo = input.founderPromo ?? null;
  if (promo && isFounderPromoCurrentlyActive(promo, input.now ?? new Date())) {
    const bps = Math.max(0, Math.min(10_000, Math.round(promo.commissionRateBps)));
    return bps;
  }
  return getPlatformFeeBasisPoints(input);
}

export function getEffectivePlatformFeeRate(
  input: EffectivePlatformFeeRateInput,
): number {
  return getEffectivePlatformFeeBasisPoints(input) / 10_000;
}

/**
 * Identifies which precedence branch applied. Useful for admin UI
 * ("Membre Pro payé" / "Promotion fondateur" / "Taux standard") and
 * for tests pinning the precedence contract.
 */
export type EffectiveCommissionSource = "paid_pro" | "founder_promo" | "standard";

export function resolveEffectiveCommissionSource(
  input: EffectivePlatformFeeRateInput,
): EffectiveCommissionSource {
  const plan = normalizeTeacherPaymentPlan(input.teacherPlan);
  if (plan !== "free") return "paid_pro";
  const promo = input.founderPromo ?? null;
  if (promo && isFounderPromoCurrentlyActive(promo, input.now ?? new Date())) {
    return "founder_promo";
  }
  return "standard";
}

export function calculateBookingAmounts(input: BookingAmountInput): BookingAmountBreakdown {
  const taxTotalCents = safeCents(input.taxTotalCents);
  const subtotalCents = safeCents(
    input.subtotalCents ?? input.priceCents,
  );
  const amountCents = subtotalCents + taxTotalCents;
  const teacherPlan = normalizeTeacherPaymentPlan(input.teacherPlan);
  const loyaltyTier = resolveLoyaltyTier(input);
  // Route through the precedence-aware helper so callers that pass a
  // `founderPromo` snapshot get the active-promo rate. Callers that don't
  // pass one (the vast majority — display previews, tests, etc.) fall
  // straight through to the legacy `getPlatformFeeBasisPoints` path.
  const feeBasisPoints = getEffectivePlatformFeeBasisPoints(input);
  const platformFeeCents = Math.min(
    subtotalCents,
    Math.floor((subtotalCents * feeBasisPoints + 5_000) / 10_000),
  );

  return {
    subtotalCents,
    taxTotalCents,
    amountCents,
    platformFeeCents,
    teacherNetCents: subtotalCents - platformFeeCents,
    feeRate: feeBasisPoints / 10_000,
    feeBasisPoints,
    loyaltyTier,
    teacherPlan,
  };
}
