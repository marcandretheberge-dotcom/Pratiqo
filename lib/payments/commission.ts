export type TeacherPaymentPlan = "free" | "pro" | "business" | "enterprise";
export type BookingPaymentType = "individual" | "group";
export type LoyaltyTier = "bronze" | "argent" | "or" | "platine";

export type PlatformFeeRateInput = {
  teacherPlan?: string | null;
  bookingType?: BookingPaymentType;
  annualVolumeCents?: number | null;
  loyaltyTier?: string | null;
};

export type BookingAmountInput = PlatformFeeRateInput & {
  /** Pre-tax lesson subtotal in cents; platform fee is calculated on this amount. */
  subtotalCents?: number;
  /** Included sales tax in cents (0 in Phase 1; Stripe Tax not enabled). */
  taxTotalCents?: number;
  /** @deprecated Use subtotalCents. Treated as subtotal when subtotalCents is omitted. */
  priceCents?: number;
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
  bronze: 1000,
  argent: 900,
  or: 800,
  platine: 700,
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

export function calculateBookingAmounts(input: BookingAmountInput): BookingAmountBreakdown {
  const taxTotalCents = safeCents(input.taxTotalCents);
  const subtotalCents = safeCents(
    input.subtotalCents ?? input.priceCents,
  );
  const amountCents = subtotalCents + taxTotalCents;
  const teacherPlan = normalizeTeacherPaymentPlan(input.teacherPlan);
  const loyaltyTier = resolveLoyaltyTier(input);
  const feeBasisPoints = getPlatformFeeBasisPoints(input);
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
